import { NextResponse } from "next/server";
import { requireApiTeacherOrAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { decryptWebhookUrl } from "@/lib/teams-crypto";
import { publishScoresToTeams, type RosterRow } from "@/lib/teams-publish";
import type { QuizQuestion, QuizSettings } from "@/types/quiz";

// POST /api/admin/quizzes/:id/publish-scores — posts every completed
// submission's student ID + score for this quiz into the linked Teams
// channel. Gated to the quiz's OWNING teacher or an admin (not just "any
// teacher") — an admin publishing on a teacher's behalf still uses that
// teacher's linked channel, not their own, since the channel is scoped to
// whoever owns the quiz's class, not whoever clicked the button.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: { id: true, title: true, creatorId: true, questions: true, settings: true },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  if (user.role !== "admin" && quiz.creatorId !== user.id) {
    return NextResponse.json({ error: "You can only publish scores for quizzes you created" }, { status: 403 });
  }
  if (!quiz.creatorId) {
    return NextResponse.json({ error: "This quiz has no owning teacher, so there's no linked Teams channel to publish to" }, { status: 400 });
  }

  const integration = await prisma.teamsIntegration.findUnique({
    where: { ownerId: quiz.creatorId },
    select: { webhookUrlEnc: true },
  });
  if (!integration) {
    return NextResponse.json(
      { error: "No Teams channel is linked for this quiz's teacher yet — set one up under Teams Settings first" },
      { status: 400 }
    );
  }

  const submissions = await prisma.submission.findMany({
    where: { quizId: id, status: "completed" },
    select: { score: true, user: { select: { username: true, userCode: true } } },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
  });
  if (submissions.length === 0) {
    return NextResponse.json({ error: "No completed submissions yet — nothing to publish" }, { status: 400 });
  }

  const questions = (quiz.questions ?? []) as unknown as QuizQuestion[];
  const settings = (quiz.settings ?? {}) as unknown as QuizSettings;
  const total = (settings.showCount || questions.length || 0) * (settings.pointsPerCorrect || 1) || null;

  const rows: RosterRow[] = submissions
    .filter((s) => s.user)
    .map((s) => ({
      name: s.user!.username,
      studentId: s.user!.userCode || "—",
      score: s.score,
      total,
    }));

  const resultsUrl = `${new URL(req.url).origin}/leaderboard?quizId=${id}`;
  const webhookUrl = decryptWebhookUrl(integration.webhookUrlEnc);
  const result = await publishScoresToTeams(webhookUrl, quiz.title, rows, resultsUrl);

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Teams rejected the request" }, { status: 502 });
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data: { scoresPublishedAt: new Date() },
    select: { scoresPublishedAt: true },
  });

  return NextResponse.json({
    success: true,
    studentCount: rows.length,
    messagesSent: result.messagesSent,
    usedSummaryFallback: result.usedSummaryFallback,
    publishedAt: updated.scoresPublishedAt,
  });
}

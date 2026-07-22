import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { QuizSettings } from "@/types/quiz";

// POST /api/submissions/start — ported from SubmissionController.startAttempt.
// Issues a replay-protection nonce and upserts a draft submission row.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const quizId: string | undefined = body?.quizId;
  if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { status: true, settings: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  if (quiz.status !== "live") return NextResponse.json({ error: "Quiz is not live" }, { status: 403 });

  const settings = (quiz.settings ?? {}) as unknown as QuizSettings;
  const now = new Date();
  if (settings.startAt && new Date(settings.startAt) > now) {
    return NextResponse.json({ error: "Quiz has not opened yet", startAt: settings.startAt }, { status: 403 });
  }
  if (settings.endAt && new Date(settings.endAt) < now) {
    return NextResponse.json({ error: "Quiz window has closed", endAt: settings.endAt }, { status: 403 });
  }

  const alreadyCompleted = await prisma.submission.findFirst({
    where: { userId: user.id, quizId, status: "completed" },
  });
  if (alreadyCompleted) return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  const nonce = crypto.randomBytes(24).toString("hex");
  const draft = await prisma.submission.findFirst({ where: { userId: user.id, quizId, status: "draft" } });
  if (draft) {
    await prisma.submission.update({ where: { id: draft.id }, data: { attemptNonce: nonce } });
  } else {
    await prisma.submission.create({
      data: { userId: user.id, quizId, score: 0, status: "draft", attemptNonce: nonce },
    });
  }

  return NextResponse.json({ nonce });
}

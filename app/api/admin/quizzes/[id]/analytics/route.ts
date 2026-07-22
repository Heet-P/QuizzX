import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { scoreQuestion } from "@/lib/answer-matching";
import type { QuizQuestion, QuestionAnswer } from "@/types/quiz";

// GET /api/admin/quizzes/:id/analytics — per-question accuracy + top wrong
// answer, ported from AdminService.getQuizAnalytics. Uses the shared
// type-aware `scoreQuestion` (2026-07-23) so mcq_multi/fill_blank/
// match_columns questions get sensible accuracy numbers too, not just
// mcq_single. "Top wrong answer" only really applies to single-string
// answer types (mcq_single/fill_blank) — skipped for the others.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id }, select: { questions: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const questions = (quiz.questions ?? []) as unknown as QuizQuestion[];
  const submissions = await prisma.submission.findMany({ where: { quizId: id, status: "completed" }, select: { answers: true } });

  const stats = questions.map((q, idx) => ({
    idx,
    text: (q.prompt || q.text || "").substring(0, 80),
    correct: 0,
    wrong: 0,
    total: 0,
    wrongAnswers: {} as Record<string, number>,
  }));

  for (const sub of submissions) {
    const answers = sub.answers as Record<string, QuestionAnswer> | null;
    if (!answers) continue;
    questions.forEach((q, idx) => {
      const submitted = answers[String(idx)] ?? (answers as unknown as QuestionAnswer[])[idx];
      if (submitted === undefined || submitted === null || submitted === "") return;
      stats[idx].total++;
      const fraction = scoreQuestion(q, submitted);
      if (fraction >= 1) {
        stats[idx].correct++;
      } else {
        stats[idx].wrong++;
        if (typeof submitted === "string") {
          stats[idx].wrongAnswers[submitted] = (stats[idx].wrongAnswers[submitted] || 0) + 1;
        }
      }
    });
  }

  const result = stats.map((s) => ({
    ...s,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : null,
    topWrongAnswer: Object.entries(s.wrongAnswers).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
  }));

  return NextResponse.json(result);
}

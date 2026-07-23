import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sanitizeQuestion } from "@/lib/quiz-sanitize";
import type { QuizQuestion, QuestionAnswer } from "@/types/quiz";

// GET /api/quizzes/:id/review — added 2026-07-23 per explicit user request:
// after finishing a quiz, let the user see their own submitted answer next
// to the correct one for every question. Only ever available for the
// user's OWN completed submission — no risk of leaking the answer key
// early, since a completed submission is already locked in and can't be
// resubmitted (see app/api/submissions/route.ts's conflict check).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { id } = await params;

  const submission = await prisma.submission.findFirst({
    where: { userId: user.id, quizId: id, status: "completed" },
    select: { answers: true, score: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Complete this quiz first to review your answers" }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({ where: { id }, select: { title: true, questions: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // revealAnswers=true — same sanitized shape used for practice mode,
  // populated with the answer key since this submission is already final.
  const questions = ((quiz.questions ?? []) as unknown as QuizQuestion[]).map((q) => sanitizeQuestion(q, true));

  return NextResponse.json({
    title: quiz.title,
    score: submission.score,
    submittedAnswers: (submission.answers ?? {}) as Record<string, QuestionAnswer>,
    questions,
  });
}

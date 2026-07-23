import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { seededShuffle, questionSeed } from "@/lib/seeded-shuffle";
import { sanitizeQuestion, shuffleMcqOptions, shuffleMatchColumnsRight } from "@/lib/quiz-sanitize";
import type { QuizQuestion, QuizSettings } from "@/types/quiz";

// GET /api/quizzes/:id — ported from QuizController.getQuiz. Applies the
// seeded per-(quiz,user) shuffle/pool logic and strips the answer key unless
// the quiz is in practice mode (timer==='none' && tabSwitch==='disabled').
// Answer-stripping and options-shuffling are type-aware (mcq_single/
// mcq_multi/fill_blank/match_columns) — see lib/quiz-sanitize.ts.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { id } = await params;

  const submitted = await prisma.submission.findFirst({
    where: { userId: user.id, quizId: id, status: "completed" },
    select: { score: true },
  });
  if (submitted) {
    return NextResponse.json({ error: "Quiz already completed", score: submitted.score, completed: true }, { status: 403 });
  }

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const settings = (quiz.settings ?? {}) as unknown as QuizSettings;
  const now = new Date();
  if (settings.startAt && new Date(settings.startAt) > now) {
    return NextResponse.json({ error: "Quiz has not opened yet", startAt: settings.startAt }, { status: 403 });
  }
  if (settings.endAt && new Date(settings.endAt) < now) {
    return NextResponse.json({ error: "Quiz window has closed", endAt: settings.endAt }, { status: 403 });
  }

  let questions = (quiz.questions ?? []) as unknown as QuizQuestion[];
  const seed = questionSeed(id, user.id);

  if (settings.poolSize && settings.showCount && questions.length > settings.showCount) {
    questions = seededShuffle(questions, seed).slice(0, settings.showCount);
  } else if (settings.shuffleQuestions) {
    questions = seededShuffle(questions, seed);
  }

  const isPractice = settings.timer === "none" && settings.tabSwitch === "disabled";

  const result = questions.map((q, i) => {
    let sanitized = sanitizeQuestion(q, isPractice);
    const qSeed = seed + i + 1;
    if (settings.shuffleOptions) sanitized = shuffleMcqOptions(sanitized, qSeed);
    // Match-columns' right column is always shuffled — never optional, see
    // lib/quiz-sanitize.ts's shuffleMatchColumnsRight doc comment.
    sanitized = shuffleMatchColumnsRight(sanitized, qSeed);
    return sanitized;
  });

  return NextResponse.json({ id: quiz.id, title: quiz.title, settings: quiz.settings, questions: result });
}

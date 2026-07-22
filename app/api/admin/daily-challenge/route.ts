import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateQuestions } from "@/lib/ai-clients";

// POST /api/admin/daily-challenge — AI-generates 5 questions and immediately
// publishes them as today's daily challenge, ported from
// AdminController.publishDailyChallenge. Fully implemented per explicit user
// instruction even though GROQ_API_KEY isn't configured yet — this will
// start working the moment the key is added, no code changes needed.
export async function POST(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const topic: string | undefined = body?.topic;
  const notes: string | undefined = body?.notes;
  if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });

  try {
    const questions = await generateQuestions(topic, notes, 5);
    if (!questions.length) throw new Error("AI returned no valid questions");

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const title = `Daily Challenge: ${topic} — ${dateStr}`;

    const settings = {
      timer: "per_question",
      secondsPerQuestion: 30,
      visibility: "single",
      navigation: "forward_only",
      answerLock: "lock_on_next",
      shuffleOptions: true,
      shuffleQuestions: false,
      pointsPerCorrect: 1,
      negativeMarking: 0,
      tabSwitch: "three_strikes",
      copyProtection: false,
      quiz_mode: "individual",
      is_daily: true,
      daily_date: dateStr,
      daily_topic: topic,
    };

    const quiz = await prisma.quiz.create({
      data: {
        title,
        questions: questions as unknown as object,
        settings,
        isActive: true,
        status: "live",
        startedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json(
      { success: true, quizId: quiz.id, title, questionCount: questions.length, date: dateStr },
      { status: 201 }
    );
  } catch (err) {
    console.error("Publish daily challenge error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to publish daily challenge" }, { status: 500 });
  }
}

// GET /api/admin/daily-challenge — ported from AdminController.getDailyChallenge.
export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const challenges = await prisma.$queryRaw<{ id: string; title: string; status: string; settings: unknown; created_at: Date }[]>`
    SELECT id, title, status, settings, created_at FROM quizzes
    WHERE settings->>'is_daily' = 'true'
    ORDER BY settings->>'daily_date' DESC
    LIMIT 5
  `;

  return NextResponse.json({ today: dateStr, challenges });
}

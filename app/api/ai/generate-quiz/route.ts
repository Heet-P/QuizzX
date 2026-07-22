import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { generateQuestions } from "@/lib/ai-clients";

// POST /api/ai/generate-quiz — full quiz from a topic + optional syllabus,
// ported from AIController.generateQuiz. Admin-only.
export async function POST(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const topic: string | undefined = body?.topic;
  const syllabus: string | undefined = body?.syllabus;
  const count: number = body?.count ?? 10;
  if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });

  try {
    const questions = await generateQuestions(topic, syllabus, count);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI generateQuiz error:", err);
    return NextResponse.json({ error: "Failed to generate quiz", detail: err instanceof Error ? err.message : undefined }, { status: 500 });
  }
}

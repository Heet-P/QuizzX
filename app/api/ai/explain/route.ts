import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { nim, NIM_MODEL, streamToText } from "@/lib/ai-clients";

// POST /api/ai/explain — practice-mode "why was I wrong", ported from
// AIController.explain. Any signed-in user (not admin-only).
export async function POST(req: Request) {
  const { error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const questionText: string | undefined = body?.questionText;
  const options: string[] | undefined = body?.options;
  const correctAnswer: string | undefined = body?.correctAnswer;
  const chosenAnswer: string | undefined = body?.chosenAnswer;
  if (!questionText || !correctAnswer) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const prompt = `A student answered a quiz question incorrectly.

Question: ${questionText}
Options: ${(options || []).join(" | ")}
Correct answer: ${correctAnswer}
Student chose: ${chosenAnswer || "(nothing)"}

Explain in 2-3 sentences why "${correctAnswer}" is correct and why "${chosenAnswer}" is wrong (if applicable). Be concise and educational. Do not use markdown.`;

  try {
    const stream = await nim.chat.completions.create({
      model: NIM_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 256,
      stream: true,
    });

    const explanation = await streamToText(stream);
    return NextResponse.json({ explanation });
  } catch (err) {
    console.error("AI explain error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}

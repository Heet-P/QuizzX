import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { nim, NIM_MODEL, streamToText, stripFences } from "@/lib/ai-clients";

// POST /api/ai/distractors — 3 plausible wrong options, ported from
// AIController.generateDistractors. Admin-only.
export async function POST(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const questionText: string | undefined = body?.questionText;
  const correctAnswer: string | undefined = body?.correctAnswer;
  const existingOptions: string[] | undefined = body?.existingOptions;
  if (!questionText || !correctAnswer) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const prompt = `Generate exactly 3 plausible but wrong answer options for this multiple-choice question.
Question: ${questionText}
Correct answer: ${correctAnswer}
Existing options (do not repeat): ${(existingOptions || []).join(", ")}

Output ONLY a JSON array of 3 strings. No markdown, no explanation.`;

  try {
    const stream = await nim.chat.completions.create({
      model: NIM_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 256,
      stream: true,
    });

    const raw = stripFences(await streamToText(stream));
    const distractors = JSON.parse(raw);
    return NextResponse.json({ distractors });
  } catch (err) {
    console.error("AI distractors error:", err);
    return NextResponse.json({ error: "Failed to generate distractors" }, { status: 500 });
  }
}

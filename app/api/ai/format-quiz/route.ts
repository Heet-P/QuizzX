import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { groq, GROQ_MODEL, stripFences } from "@/lib/ai-clients";

// POST /api/ai/format-quiz — normalize pasted/uploaded text into quiz JSON,
// ported from AIController.formatQuiz. Admin-only.
export async function POST(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const rawText: string | undefined = body?.rawText;
  if (!rawText) return NextResponse.json({ error: "rawText required" }, { status: 400 });

  const prompt = `Convert the following raw quiz text into a valid JSON array of question objects.
Each object must have: text (string), options (string[]), answer (string matching one option exactly).
Optionally include: explanation (string), topic (string).
Output ONLY the JSON array, no markdown, no commentary.

Raw text:
${rawText.substring(0, 6000)}`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const raw = stripFences(completion.choices[0]?.message?.content || "");
    const questions = JSON.parse(raw);
    if (!Array.isArray(questions)) throw new Error("Not an array");

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI format error:", err);
    return NextResponse.json({ error: "Failed to format quiz with AI", detail: err instanceof Error ? err.message : undefined }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { requireApiAdmin } from "@/lib/api-auth";
import { parseQuizDocumentWithAI } from "@/lib/ai-quiz-parser";

// POST /api/ai/parse-quiz-doc — new 2026-07-23. Extracts text the same way
// /api/admin/quizzes/upload does (.md/.txt/.docx), then classifies each
// question into one of 4 types via AI instead of the regex parser. Returns
// questions for preview only — the quiz is created via the existing
// POST /api/admin/quizzes/create once the admin reviews/confirms, same flow
// as the AI Generate tab. Admin-only.
export async function POST(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const form = await req.formData();
  const file = form.get("quizFile");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  try {
    const origName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    if (origName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      text = buffer.toString("utf8");
    }

    const questions = await parseQuizDocumentWithAI(text);
    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions could be extracted from this document" }, { status: 422 });
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI parse-quiz-doc error:", err);
    return NextResponse.json({ error: "Failed to parse quiz document with AI", detail: err instanceof Error ? err.message : undefined }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { mapAnswerLetter } from "@/lib/answer-matching";
import { questionType, type QuizQuestion } from "@/types/quiz";

// POST /api/admin/quizzes/:id/answer-key — ported from AdminController.uploadAnswerKey.
// Parses "Q1: D" / "1: A" style text and maps letters onto stored questions.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const form = await req.formData();
  const file = form.get("answerFile");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  try {
    const origName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let content: string;
    if (origName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else {
      content = buffer.toString("utf8");
    }

    const answerMap: Record<number, string> = {};
    for (const line of content.split("\n")) {
      const m = line.trim().match(/^(?:Q)?(\d+)[.:)\s]+\s*([A-Za-z])\s*$/i);
      if (m) answerMap[parseInt(m[1]) - 1] = m[2].toUpperCase();
    }

    const quiz = await prisma.quiz.findUnique({ where: { id }, select: { questions: true } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    const questions = (quiz.questions ?? []) as unknown as QuizQuestion[];
    let mapped = 0;
    for (const [idxStr, letter] of Object.entries(answerMap)) {
      const idx = parseInt(idxStr);
      const q = questions[idx];
      // Letter->option mapping only makes sense for single-correct MCQ —
      // other question types (added 2026-07-23) have no "options" to map onto.
      if (!q || questionType(q) !== "mcq_single") continue;
      const mcq = q as Extract<QuizQuestion, { answer: string; options: string[] }>;
      const resolved = mapAnswerLetter(letter, mcq.options);
      if (resolved) {
        mcq.answer = resolved;
        mapped++;
      }
    }

    await prisma.quiz.update({ where: { id }, data: { questions: questions as unknown as object } });

    return NextResponse.json({ success: true, totalAnswers: Object.keys(answerMap).length, mappedToQuestions: mapped });
  } catch (err) {
    console.error("Answer key error:", err);
    return NextResponse.json({ error: "Failed to process answer key" }, { status: 500 });
  }
}

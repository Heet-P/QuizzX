import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { normalizeQuizSettings } from "@/types/quiz";

// POST /api/admin/quizzes/create — create a quiz from pre-built questions
// (the AI-generate path), ported from AdminController.createQuizFromQuestions.
export async function POST(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const title: string | undefined = body?.title;
  const questions = body?.questions;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "title and questions array are required" }, { status: 400 });
  }

  const settings = normalizeQuizSettings(body?.settings ?? {});

  try {
    const quiz = await prisma.quiz.create({
      data: { title, questions, settings: settings as unknown as object, isActive: false, status: "draft" },
    });
    return NextResponse.json({ success: true, quizId: quiz.id, questionCount: questions.length }, { status: 201 });
  } catch (err) {
    console.error("Create quiz from questions error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create quiz" }, { status: 500 });
  }
}

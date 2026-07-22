import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/quizzes/:id/archive — ported from AdminService.archiveQuiz.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.quiz.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const quiz = await prisma.quiz.update({
    where: { id },
    data: { status: "archived", isActive: false, endedAt: new Date() },
    select: { id: true, title: true, status: true, endedAt: true },
  });

  return NextResponse.json({
    success: true,
    quiz: { id: quiz.id, title: quiz.title, status: quiz.status, ended_at: quiz.endedAt },
    message: "Quiz archived",
  });
}

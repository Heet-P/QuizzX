import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/quizzes/:id/publish — ported from AdminService.publishQuiz.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.quiz.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const quiz = await prisma.quiz.update({
    where: { id },
    data: { status: "live", isActive: true, startedAt: new Date() },
    select: { id: true, title: true, status: true, startedAt: true },
  });

  return NextResponse.json({
    success: true,
    quiz: { id: quiz.id, title: quiz.title, status: quiz.status, started_at: quiz.startedAt },
    message: "Quiz is now LIVE",
  });
}

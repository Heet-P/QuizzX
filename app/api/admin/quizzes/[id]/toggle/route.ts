import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/quizzes/:id/toggle — ported from AdminService.toggleQuiz.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const isActive = !!body?.isActive;
  const newStatus = isActive ? "live" : "archived";

  try {
    const existing = await prisma.quiz.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        isActive,
        status: newStatus,
        ...(newStatus === "live" ? { startedAt: new Date() } : {}),
        ...(newStatus === "archived" ? { endedAt: new Date() } : {}),
      },
      select: { id: true, title: true, isActive: true, status: true },
    });

    return NextResponse.json({ success: true, quiz: { id: quiz.id, title: quiz.title, is_active: quiz.isActive, status: quiz.status } });
  } catch {
    return NextResponse.json({ error: "Failed to toggle quiz" }, { status: 500 });
  }
}

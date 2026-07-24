import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/quizzes/:id/clone — ported from AdminService.cloneQuiz.
// Not currently wired to any UI button (QuizManager.jsx never called it in
// v1 either — see MIGRATION_AUDIT.md), ported for REST parity regardless.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const orig = await prisma.quiz.findUnique({ where: { id } });
  if (!orig) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const clone = await prisma.quiz.create({
    data: {
      title: `${orig.title} (Copy)`,
      description: orig.description,
      questions: orig.questions ?? undefined,
      settings: orig.settings ?? {},
      isActive: false,
      status: "draft",
      creatorId: user.id,
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ success: true, quiz: clone, message: "Quiz cloned" }, { status: 201 });
}

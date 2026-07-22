import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/quizzes/:id — ported from AdminService.deleteQuiz.
// Cascade order matches v1 minus `game_sessions` (that table doesn't exist —
// GameController was dropped, see MEMORY.md Section 5.4).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      await tx.submissionEvent.deleteMany({ where: { quizId: id } });
      await tx.submission.deleteMany({ where: { quizId: id } });
      await tx.room.deleteMany({ where: { quizId: id } });
      const result = await tx.quiz.findUnique({ where: { id }, select: { id: true, title: true } });
      if (!result) return null;
      await tx.quiz.delete({ where: { id } });
      return result;
    });

    if (!deleted) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}

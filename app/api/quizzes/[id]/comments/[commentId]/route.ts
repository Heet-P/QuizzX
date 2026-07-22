import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/quizzes/:id/comments/:commentId — admin or comment owner only.
// Ported from CommentController.deleteComment.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { commentId } = await params;

  const isAdmin = user.role === "admin";
  const result = await prisma.quizComment.deleteMany({
    where: { id: commentId, ...(isAdmin ? {} : { userId: user.id }) },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not allowed or not found" }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}

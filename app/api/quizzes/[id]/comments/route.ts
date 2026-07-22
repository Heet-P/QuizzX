import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET/POST /api/quizzes/:id/comments — ported from CommentController.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiUser();
  if (error) return error;
  const { id } = await params;

  const comments = await prisma.quizComment.findMany({
    where: { quizId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json(
    comments.map((c) => ({ id: c.id, body: c.body, created_at: c.createdAt, username: c.user.username }))
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const text: string = typeof body?.body === "string" ? body.body.trim() : "";
  if (text.length < 1) {
    return NextResponse.json({ error: "Comment body required" }, { status: 400 });
  }

  const comment = await prisma.quizComment.create({
    data: { quizId: id, userId: user.id, body: text.substring(0, 1000) },
  });

  return NextResponse.json(
    { id: comment.id, body: comment.body, created_at: comment.createdAt, username: user.username },
    { status: 201 }
  );
}

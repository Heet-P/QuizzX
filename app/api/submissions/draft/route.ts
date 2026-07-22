import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/submissions/draft — auto-save, ported from SubmissionController.saveDraft.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const quizId: string | undefined = body?.quizId;
  const answers = body?.answers;
  if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

  const existing = await prisma.submission.findFirst({ where: { userId: user.id, quizId } });
  if (existing) {
    if (existing.status === "completed") {
      return NextResponse.json({ error: "Quiz already completed" }, { status: 409 });
    }
    await prisma.submission.update({
      where: { id: existing.id },
      data: { answers, submittedAt: new Date() },
    });
  } else {
    await prisma.submission.create({
      data: { userId: user.id, quizId, score: 0, answers, status: "draft" },
    });
  }

  return NextResponse.json({ success: true });
}

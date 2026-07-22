import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/submissions/draft/:quizId — ported from SubmissionController.getDraft.
export async function GET(_req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { quizId } = await params;

  const draft = await prisma.submission.findFirst({
    where: { userId: user.id, quizId, status: "draft" },
    select: { answers: true },
  });

  return NextResponse.json({ draft: draft?.answers ?? null });
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/submissions/events — proctor event log, ported from
// SubmissionController.logEvent.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const quizId: string | undefined = body?.quizId;
  const eventType: string | undefined = body?.eventType;
  if (!quizId || !eventType) {
    return NextResponse.json({ error: "quizId and eventType required" }, { status: 400 });
  }

  await prisma.submissionEvent.create({
    data: { userId: user.id, quizId, eventType, eventData: body?.eventData ?? {} },
  });

  return NextResponse.json({ ok: true });
}

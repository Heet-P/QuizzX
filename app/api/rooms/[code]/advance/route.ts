import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/rooms/:code/advance — host advances the question index (or
// starts the quiz), ported from RoomController.advanceQuestion. Body may be
// empty (axios omits Content-Type on a bodyless PATCH) — just increments.
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, hostId: true, questionIndex: true, state: true },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== user.id) return NextResponse.json({ error: "Not host" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const newIdx: number = body?.question_index !== undefined ? body.question_index : (room.questionIndex ?? 0) + 1;
  const newState: string = body?.state || room.state || "active";

  await prisma.room.update({ where: { id: room.id }, data: { questionIndex: newIdx, state: newState } });

  return NextResponse.json({ question_index: newIdx, state: newState });
}

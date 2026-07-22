import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/:code/join — idempotent, ported from RoomController.joinRoom.
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { code } = await params;

  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() }, select: { id: true, state: true } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.state === "ended") return NextResponse.json({ error: "Room ended" }, { status: 410 });

  await prisma.roomParticipant.upsert({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    create: { roomId: room.id, userId: user.id },
    update: {},
  });

  return NextResponse.json({ ok: true, roomId: room.id });
}

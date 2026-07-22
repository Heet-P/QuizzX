import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// POST /api/rooms — create a live lobby, ported from RoomController.createRoom.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const quizId: string | undefined = body?.quiz_id || body?.quizId;
  if (!quizId) return NextResponse.json({ error: "quiz_id required" }, { status: 400 });

  let code = "";
  for (let attempts = 0; attempts < 10; attempts++) {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const exists = await prisma.room.findUnique({ where: { code } });
    if (!exists) break;
  }

  const room = await prisma.room.create({
    data: { code, quizId, hostId: user.id, state: "waiting" },
    select: { id: true, code: true },
  });

  return NextResponse.json(room, { status: 201 });
}

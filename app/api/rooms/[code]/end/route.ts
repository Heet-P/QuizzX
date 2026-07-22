import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { broadcastLeaderboardUpdate } from "@/lib/leaderboard-broadcast";

// POST /api/rooms/:code/end — ported from RoomController.endRoom. Finalizes
// participant scores into `submissions` (only improves an existing score),
// so lobby results feed into the global leaderboard.
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { code } = await params;

  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() }, select: { id: true, hostId: true, quizId: true } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== user.id) return NextResponse.json({ error: "Not host" }, { status: 403 });

  await prisma.room.update({ where: { id: room.id }, data: { state: "ended" } });

  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: room.id, score: { gt: 0 } },
  });

  for (const p of participants) {
    const existing = await prisma.submission.findFirst({
      where: { userId: p.userId, quizId: room.quizId! },
      select: { id: true, score: true },
    });
    if (!existing) {
      await prisma.submission.create({
        data: { userId: p.userId, quizId: room.quizId!, score: p.score, answers: p.answers ?? {}, status: "completed" },
      });
    } else if (p.score > existing.score) {
      await prisma.submission.update({
        where: { id: existing.id },
        data: { score: p.score, answers: p.answers ?? {}, status: "completed", submittedAt: new Date() },
      });
    }
  }

  try {
    broadcastLeaderboardUpdate(room.quizId!, { type: "room_ended", quizId: room.quizId });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true });
}

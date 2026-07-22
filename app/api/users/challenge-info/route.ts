import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/users/challenge-info?challengerId=<clerkId>&quizId=<uuid>
// Ported from UserController.getChallengeInfo — challenger's username + best
// completed score for the given quiz, used by the peer-challenge banner.
export async function GET(req: Request) {
  const { error } = await requireApiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const challengerId = searchParams.get("challengerId");
  const quizId = searchParams.get("quizId");
  if (!challengerId || !quizId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const best = await prisma.submission.findFirst({
    where: { quizId, status: "completed", user: { clerkId: challengerId } },
    orderBy: { score: "desc" },
    select: { score: true, user: { select: { username: true } } },
  });

  if (!best || !best.user) {
    return NextResponse.json({ error: "Challenger not found" }, { status: 404 });
  }

  return NextResponse.json({ username: best.user.username, score: best.score });
}

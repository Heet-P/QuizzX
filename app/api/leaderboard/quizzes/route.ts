import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/leaderboard/quizzes — filter-dropdown list, ported from
// LeaderboardController.getLeaderboardQuizzes.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const isAdmin = user.role === "admin";
  const quizzes = await prisma.quiz.findMany({
    where: isAdmin ? {} : { status: { in: ["live", "archived"] } },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, status: true, settings: true, startedAt: true },
  });

  return NextResponse.json(quizzes);
}

import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { csvResponse, csvField } from "@/lib/csv-response";

// GET /api/leaderboard/export — ported from LeaderboardController.exportLeaderboard.
export async function GET(req: Request) {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");
  const mode = searchParams.get("mode") || "individual";
  const today = new Date().toISOString().split("T")[0];

  if (mode === "team" && quizId) {
    const rows = await prisma.$queryRaw<{ team_name: string; avg_score: number; member_count: number; updated_at: Date }[]>`
      SELECT t.name AS team_name, tqs.avg_score, tqs.member_count, tqs.updated_at
      FROM teams t JOIN team_quiz_scores tqs ON tqs.team_id=t.id AND tqs.quiz_id=${quizId}::uuid
      ORDER BY tqs.avg_score DESC
    `;
    const csv = [
      "Rank,Team,Avg Score,Members,Updated At",
      ...rows.map((row, i) => `${i + 1},${csvField(row.team_name)},${row.avg_score},${row.member_count},${csvField(row.updated_at.toISOString())}`),
    ];
    return csvResponse(csv, `leaderboard_team_${today}.csv`);
  }

  const rows = quizId
    ? await prisma.$queryRaw<{ username: string; score: number; submitted_at: Date | null }[]>`
        SELECT u.username, COALESCE(s.score,0) AS score, s.submitted_at
        FROM users u JOIN submissions s ON s.user_id=u.id AND s.status='completed' AND s.quiz_id=${quizId}::uuid
        WHERE u.role != 'admin' AND u.username NOT LIKE 'ADMIN%'
        ORDER BY s.score DESC, s.submitted_at ASC
      `
    : await prisma.$queryRaw<{ username: string; score: number; submitted_at: Date | null }[]>`
        SELECT u.username, COALESCE(s.score,0) AS score, s.submitted_at
        FROM users u JOIN submissions s ON s.user_id=u.id AND s.status='completed'
        WHERE u.role != 'admin' AND u.username NOT LIKE 'ADMIN%'
        ORDER BY s.score DESC, s.submitted_at ASC
      `;

  const csv = [
    "Rank,User,Score,Submitted At",
    ...rows.map((row, i) => `${i + 1},${csvField(row.username)},${row.score},${csvField(row.submitted_at ? row.submitted_at.toISOString() : "N/A")}`),
  ];
  return csvResponse(csv, `leaderboard_${today}.csv`);
}

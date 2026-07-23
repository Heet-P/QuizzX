import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { QuizSettings } from "@/types/quiz";

interface IndividualRow {
  user_id: string;
  username: string;
  xp: number;
  streak_count: number;
  score: number;
  submitted_at: Date | null;
}

interface TeamRow {
  team_id: string;
  team_name: string;
  team_code: string;
  avg_score: number;
  member_count: number;
  updated_at: Date | null;
}

// GET /api/leaderboard?quizId&mode=individual|team — ported from
// LeaderboardController.getLeaderboard. The `scope=global|campus` param from
// v1 is intentionally NOT ported — this app has no college/university
// integration, so "campus" scope never had real data behind it (explicit
// user decision, 2026-07-23; the frontend no longer sends it either). Not
// cached (v1 cached 5s/10s/3s via Redis-or-in-memory) — Redis isn't
// provisioned yet, correctness over that optimization for now.
export async function GET(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  let quizId = searchParams.get("quizId");
  const mode = searchParams.get("mode") || "individual";
  const isAdmin = user.role === "admin";

  if (!quizId) {
    const liveQuiz = await prisma.quiz.findFirst({
      where: { status: "live" },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    quizId = liveQuiz?.id ?? null;
  }

  // These are meaningful states the client renders specially (not fetch
  // failures), so they're 200s carrying a flag — not 403/error statuses.
  // They used to be 403s, which meant lib/api-client.ts's apiFetch (every
  // non-2xx throws) discarded the body and threw before the client ever saw
  // `hidden`/`notPublished`/`archived`, so those branches in
  // LeaderboardClient were dead code and users just saw a generic "No
  // scores yet" instead (found + fixed 2026-07-23).
  if (quizId && !isAdmin) {
    const q = await prisma.quiz.findUnique({ where: { id: quizId }, select: { status: true } });
    if (q?.status === "draft") {
      return NextResponse.json({ notPublished: true, message: "This quiz hasn't been published yet" });
    }
    if (q?.status === "archived") {
      return NextResponse.json({ archived: true, message: "This quiz has ended" });
    }
  }

  if (!isAdmin) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "leaderboard_visible" } });
    const isVisible = !setting || setting.value === true;
    if (!isVisible) {
      const ownUser = quizId
        ? await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              username: true,
              submissions: { where: { quizId, status: "completed" }, select: { score: true }, take: 1 },
            },
          })
        : null;
      return NextResponse.json({
        hidden: true,
        message: "Leaderboard is hidden",
        ownUser: ownUser ? { user_id: ownUser.id, username: ownUser.username, score: ownUser.submissions[0]?.score ?? 0 } : null,
      });
    }
  }

  let quizMode = mode;
  if (quizId) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { settings: true } });
    const qs = (quiz?.settings ?? {}) as unknown as QuizSettings;
    if (qs.quiz_mode === "individual") quizMode = "individual";
  }

  if (quizMode === "team" && quizId) {
    const rows = await prisma.$queryRaw<TeamRow[]>`
      SELECT t.id AS team_id, t.name AS team_name, t.team_code,
             COALESCE(tqs.avg_score,0) AS avg_score, COALESCE(tqs.member_count,0) AS member_count, tqs.updated_at
      FROM teams t LEFT JOIN team_quiz_scores tqs ON tqs.team_id=t.id AND tqs.quiz_id=${quizId}::uuid
      WHERE tqs.avg_score IS NOT NULL AND tqs.avg_score > 0
      ORDER BY tqs.avg_score DESC, tqs.updated_at ASC LIMIT 100
    `;
    return NextResponse.json({ mode: "team", quizId, rows });
  }

  if (!quizId) return NextResponse.json({ mode: "individual", quizId: null, rows: [] });

  const rows = await prisma.$queryRaw<IndividualRow[]>`
    SELECT u.id AS user_id, u.username, u.xp, u.streak_count,
           COALESCE(s.score,0) AS score, s.submitted_at
    FROM users u
    JOIN submissions s ON s.user_id=u.id AND s.quiz_id=${quizId}::uuid AND s.status='completed'
    WHERE u.role != 'admin' AND u.username NOT LIKE 'ADMIN%'
    ORDER BY s.score DESC, s.submitted_at ASC LIMIT 100
  `;

  return NextResponse.json({ mode: "individual", quizId, rows });
}

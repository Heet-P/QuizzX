import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

interface SummaryRow {
  username: string;
  email: string;
  tab_switches: bigint;
  fullscreen_exits: bigint;
  copy_attempts: bigint;
  score: number | null;
  tab_strikes: number | null;
  submitted_at: Date | null;
}

// GET /api/proctor/:quizId/summary — aggregated per-user event counts,
// ported from proctorRoutes.js.
export async function GET(_req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { quizId } = await params;

  const rows = await prisma.$queryRaw<SummaryRow[]>`
    SELECT u.username, u.email,
           COUNT(*) FILTER (WHERE se.event_type='tab_switch') AS tab_switches,
           COUNT(*) FILTER (WHERE se.event_type='fullscreen_exit') AS fullscreen_exits,
           COUNT(*) FILTER (WHERE se.event_type='copy_attempt') AS copy_attempts,
           s.score, s.tab_strikes, s.submitted_at
    FROM submission_events se
    JOIN users u ON u.id=se.user_id
    LEFT JOIN submissions s ON s.user_id=se.user_id AND s.quiz_id=se.quiz_id AND s.status='completed'
    WHERE se.quiz_id=${quizId}::uuid
    GROUP BY u.username, u.email, s.score, s.tab_strikes, s.submitted_at
    ORDER BY tab_switches DESC
  `;

  return NextResponse.json(
    rows.map((r) => ({
      username: r.username,
      email: r.email,
      tab_switches: Number(r.tab_switches),
      fullscreen_exits: Number(r.fullscreen_exits),
      copy_attempts: Number(r.copy_attempts),
      score: r.score,
      tab_strikes: r.tab_strikes,
      submitted_at: r.submitted_at,
    }))
  );
}

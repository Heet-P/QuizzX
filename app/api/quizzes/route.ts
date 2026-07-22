import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

interface QuizListRow {
  id: string;
  title: string;
  settings: unknown;
  is_active: boolean;
  status: string;
  created_at: Date;
  user_score: number | null;
  submitted_at: Date | null;
  completed: boolean;
  room_code: string | null;
  room_state: string | null;
}

// GET /api/quizzes — ported from QuizController.listQuizzes. Raw SQL (rather
// than the query builder) to match v1's DISTINCT ON + LEFT JOIN exactly —
// this shape isn't cleanly expressible in Prisma's builder. v1 cached this
// 5s per-user (Redis/in-memory); not cached here since Redis isn't
// provisioned yet (Section 11/15) — correctness over that optimization.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const rows = await prisma.$queryRaw<QuizListRow[]>`
    SELECT q.id, q.title, q.settings, q.is_active, q.status, q.created_at,
        s.score AS user_score, s.submitted_at,
        CASE WHEN s.id IS NOT NULL AND s.status='completed' THEN true ELSE false END AS completed,
        active_room.room_code,
        active_room.room_state
    FROM quizzes q
    LEFT JOIN submissions s ON s.quiz_id=q.id AND s.user_id=${user.id}::uuid AND s.status='completed'
    LEFT JOIN (
        SELECT DISTINCT ON (quiz_id) quiz_id,
            code AS room_code,
            state AS room_state
        FROM rooms
        WHERE state IN ('waiting', 'active')
        ORDER BY quiz_id, created_at DESC
    ) active_room ON active_room.quiz_id = q.id
    WHERE q.status='live'
    ORDER BY q.created_at DESC
  `;

  return NextResponse.json(rows);
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { getRecentSubmissions } from "@/lib/dashboard-data";

// GET /api/users/me/submissions — ported from UserController.getMySubmissions.
// Reuses the same Prisma query the Server Component pages (/dashboard,
// /profile) already call directly — this route exists for client-side
// consumers (none of this app's own pages call it; kept for REST parity
// with v1's documented API).
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const rows = await getRecentSubmissions(user.id);
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      quiz_id: r.quizId,
      score: r.score,
      status: r.status,
      tab_strikes: r.tabStrikes,
      submitted_at: r.submittedAt,
      quiz_title: r.quizTitle,
      quiz_settings: r.quizSettings,
    }))
  );
}

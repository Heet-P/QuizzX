import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { getFeaturedQuiz } from "@/lib/dashboard-data";

// GET /api/quizzes/featured — ported from AdminController.getFeaturedQuiz,
// mounted on quizRoutes in v1 (any authenticated user, not admin-only) — see
// MIGRATION_AUDIT.md Section 4.
export async function GET() {
  const { error } = await requireApiUser();
  if (error) return error;

  const quiz = await getFeaturedQuiz();
  if (!quiz) return NextResponse.json(null);

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    settings: quiz.settings,
    submission_count: quiz.submissionCount,
  });
}

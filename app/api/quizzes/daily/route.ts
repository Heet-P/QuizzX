import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { getDailyQuizForUser } from "@/lib/dashboard-data";

// GET /api/quizzes/daily — ported from QuizController.getDailyQuiz.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const quiz = await getDailyQuizForUser(user.id);
  if (!quiz) return NextResponse.json(null);

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    settings: quiz.settings,
    created_at: quiz.createdAt,
    completedToday: quiz.completedToday,
    isOfficialDaily: quiz.isOfficialDaily,
    dailyDate: quiz.dailyDate,
    dailyTopic: quiz.dailyTopic,
  });
}

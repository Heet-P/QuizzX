import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { QuizQuestion } from "@/types/quiz";

// GET /api/admin/quizzes — ported from AdminService.listAllQuizzes.
export async function GET() {
  const { error } = await requireApiAdmin();
  if (error) return error;

  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: { where: { status: "completed" } } } } },
  });

  return NextResponse.json(
    quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      is_active: q.isActive,
      status: q.status,
      settings: q.settings,
      created_at: q.createdAt,
      started_at: q.startedAt,
      ended_at: q.endedAt,
      submission_count: q._count.submissions,
      questionCount: Array.isArray(q.questions) ? (q.questions as unknown as QuizQuestion[]).length : 0,
    }))
  );
}

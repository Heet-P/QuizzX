import { NextResponse } from "next/server";
import { requireApiTeacherOrAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { csvResponse, csvField } from "@/lib/csv-response";

// GET /api/admin/quizzes/:id/gradebook — CSV of completed submissions shaped
// for LMS gradebook import (Canvas/Moodle/Schoology all match students by a
// name/email column when bulk-importing grades). Same ownership rule as
// publish-scores: the quiz's owning teacher, or an admin.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: { id: true, title: true, creatorId: true },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  if (user.role !== "admin" && quiz.creatorId !== user.id) {
    return NextResponse.json({ error: "You can only export the gradebook for quizzes you created" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: { quizId: id, status: "completed" },
    select: { score: true, user: { select: { username: true, email: true } } },
    orderBy: { user: { username: "asc" } },
  });

  const csv = [
    `Student,Email,${csvField(quiz.title)}`,
    ...submissions.filter((s) => s.user).map((s) => `${csvField(s.user!.username)},${csvField(s.user!.email)},${s.score}`),
  ];

  const filename = `gradebook_${quiz.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  return csvResponse(csv, filename);
}

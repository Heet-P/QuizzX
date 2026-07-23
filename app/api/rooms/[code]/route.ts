import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sanitizeQuestion, shuffleMatchColumnsRight } from "@/lib/quiz-sanitize";
import { questionSeed } from "@/lib/seeded-shuffle";
import type { QuizQuestion } from "@/types/quiz";

// GET /api/rooms/:code — ported from RoomController.getRoom. Strips
// `answer` from questions (participants shouldn't see it), and tells the
// client authoritatively whether they're the host.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      quiz: { select: { title: true, questions: true, settings: true } },
      host: { select: { username: true } },
      _count: { select: { participants: true } },
    },
  });
  if (!room || !room.quiz || !room.host) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Same room seed for every participant (not per-user) — everyone in a
  // live room shares one synchronized view of each question. Match-columns'
  // right column is always shuffled regardless — see
  // lib/quiz-sanitize.ts's shuffleMatchColumnsRight doc comment.
  const roomSeed = questionSeed(room.id, room.hostId ?? room.id);
  const questions = ((room.quiz.questions ?? []) as unknown as QuizQuestion[]).map((q, i) =>
    shuffleMatchColumnsRight(sanitizeQuestion(q), roomSeed + i + 1)
  );

  return NextResponse.json({
    id: room.id,
    code: room.code,
    quiz_id: room.quizId,
    host_id: room.hostId,
    state: room.state,
    question_index: room.questionIndex,
    created_at: room.createdAt,
    quiz_title: room.quiz.title,
    quiz_questions: questions,
    quiz_settings: room.quiz.settings,
    host_name: room.host.username,
    participant_count: room._count.participants,
    is_host: room.hostId === user.id,
  });
}

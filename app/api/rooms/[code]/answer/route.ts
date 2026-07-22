import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { scoreQuestion } from "@/lib/answer-matching";
import { broadcastLeaderboardUpdate } from "@/lib/leaderboard-broadcast";
import type { QuizQuestion, QuizSettings, QuestionAnswer } from "@/types/quiz";

// POST /api/rooms/:code/answer — ported from RoomController.answerQuestion.
// v1 pushed live rankings via Socket.IO (`emitRoomLeaderboard`, scoped to the
// leaderboard page's socket room) — Socket.IO is dropped (Section 5.1), so
// this pings the same SSE channel /api/leaderboard/stream listeners already
// use, nudging any open leaderboard view to refetch. Uses the shared
// type-aware `scoreQuestion` (2026-07-23) so live-lobby answers grade
// consistently with regular quiz submissions across all 4 question types;
// `RoomParticipant.score` is an integer column, so fractional partial-credit
// results are rounded before being added.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { user, error } = await requireApiUser();
  if (error) return error;
  const { code } = await params;

  const body = await req.json().catch(() => null);
  const questionIndex: number | undefined = body?.question_index;
  const answer: QuestionAnswer | undefined = body?.answer;

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { quiz: { select: { questions: true, settings: true } } },
  });
  if (!room || !room.quiz) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.state !== "active") return NextResponse.json({ error: "Room not active" }, { status: 400 });
  if (questionIndex !== room.questionIndex) {
    return NextResponse.json({ error: "Answer is for wrong question" }, { status: 400 });
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Not in room — call /join first" }, { status: 403 });

  const currentAnswers = (participant.answers as Record<string, QuestionAnswer>) ?? {};
  if (currentAnswers[String(questionIndex)] !== undefined) {
    return NextResponse.json({ error: "Already answered this question" }, { status: 409 });
  }

  const questions = (room.quiz.questions ?? []) as unknown as QuizQuestion[];
  const settings = (room.quiz.settings ?? {}) as unknown as QuizSettings;
  const q = questions[questionIndex!];
  if (!q) return NextResponse.json({ error: "Question not found" }, { status: 400 });

  const pointsPerCorrect = settings.pointsPerCorrect || 1;
  const fraction = answer ? scoreQuestion(q, answer) : 0;
  const pointsEarned = Math.round(fraction * pointsPerCorrect);

  const newScore = (participant.score || 0) + pointsEarned;
  const newAnswers = { ...currentAnswers, [String(questionIndex)]: answer };

  await prisma.roomParticipant.update({
    where: { id: participant.id },
    data: { score: newScore, answers: newAnswers },
  });

  try {
    broadcastLeaderboardUpdate(room.quizId!, { type: "room_answer", quizId: room.quizId, roomCode: room.code });
  } catch {
    // non-fatal if no listeners
  }

  return NextResponse.json({ ok: true, correct: fraction >= 1, score: newScore });
}

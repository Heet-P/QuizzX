import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { scoreQuestion } from "@/lib/answer-matching";
import { getLevel } from "@/lib/xp";
import type { QuizQuestion, QuizSettings, QuestionAnswer } from "@/types/quiz";

type Tx = Prisma.TransactionClient;

type SubmitResult =
  | { conflict: { score: number } }
  | { forbidden: string }
  | { notFound: true }
  | {
      success: true;
      score: number;
      correct: number;
      total: number;
      streak: number;
      xpGained: number;
      newAchievements: string[];
      leveledUp: boolean;
      newLevel: number;
      oldLevel: number;
    };

interface AchievementInputs {
  isFirstQuiz: boolean;
  isPerfect: boolean;
  streakCount: number;
  isLockdownClean: boolean;
  isSpeedRound: boolean;
  rank: number | null;
}

// Ported from SubmissionController.js's awardAchievements — inserts each
// newly-earned achievement (ON CONFLICT DO NOTHING equivalent via catching
// the unique-constraint error) and sums the XP for ones actually inserted.
async function awardAchievements(tx: Tx, userId: string, inputs: AchievementInputs): Promise<{ xpGained: number; newSlugs: string[] }> {
  const toAward: string[] = [];
  if (inputs.isFirstQuiz) toAward.push("first_quiz");
  if (inputs.isPerfect) toAward.push("perfect_score");
  if (inputs.streakCount >= 3) toAward.push("streak_3");
  if (inputs.streakCount >= 7) toAward.push("streak_7");
  if (inputs.isLockdownClean) toAward.push("lockdown_clean");
  if (inputs.isSpeedRound) toAward.push("speed_demon");
  if (inputs.rank !== null && inputs.rank <= 3) toAward.push("top_3");

  let xpGained = 0;
  const newSlugs: string[] = [];
  for (const slug of toAward) {
    try {
      await tx.userAchievement.create({ data: { userId, achievement: slug } });
      const def = await tx.achievement.findUnique({ where: { slug }, select: { xpReward: true } });
      xpGained += def?.xpReward ?? 0;
      newSlugs.push(slug);
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      // already earned — ignore, matching v1's ON CONFLICT DO NOTHING
    }
  }
  return { xpGained, newSlugs };
}

// Ported from SubmissionController.js's updateStreakAndXp.
async function updateStreakAndXp(tx: Tx, userId: string, baseXp: number): Promise<{ newStreak: number; oldXp: number }> {
  const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { lastQuizAt: true, streakCount: true, xp: true } });
  const now = new Date();
  const last = u.lastQuizAt;

  let newStreak = 1;
  if (last) {
    const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
    if (diffDays === 0) newStreak = u.streakCount;
    else if (diffDays === 1) newStreak = u.streakCount + 1;
    else newStreak = 1;
  }

  await tx.user.update({
    where: { id: userId },
    data: { streakCount: newStreak, xp: { increment: baseXp }, lastQuizAt: now },
  });

  return { newStreak, oldXp: u.xp };
}

// POST /api/submissions — the full grading transaction, ported from
// SubmissionController.submitQuiz. See MIGRATION_AUDIT.md Section 4/8 for the
// exact scoring formula, achievement rules, and streak logic this replicates.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const quizId: string | undefined = body?.quizId;
  const answers: Record<string, string> = body?.answers ?? {};
  const nonce: string | null = body?.nonce ?? null;
  const tabStrikes: number = body?.tabStrikes ?? 0;
  if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx): Promise<SubmitResult> => {
      const existing = await tx.submission.findFirst({
        where: { userId: user.id, quizId },
        select: { id: true, score: true, status: true, attemptNonce: true },
      });

      if (existing?.status === "completed") {
        return { conflict: { score: existing.score } };
      }
      if (existing?.attemptNonce && nonce && existing.attemptNonce !== nonce) {
        return { forbidden: "Invalid attempt nonce" };
      }

      const draftId = existing?.id ?? null;
      if (draftId) {
        await tx.submission.update({ where: { id: draftId }, data: { attemptNonce: null } });
      }

      const quiz = await tx.quiz.findUnique({ where: { id: quizId }, select: { questions: true, settings: true } });
      if (!quiz) return { notFound: true };

      const questions = (quiz.questions ?? []) as unknown as QuizQuestion[];
      const settings = (quiz.settings ?? {}) as unknown as QuizSettings;

      const now = new Date();
      if (settings.endAt && new Date(settings.endAt) < now) {
        return { forbidden: "Quiz window has closed" };
      }

      const pointsPerCorrect = settings.pointsPerCorrect || 1;
      const negativeMarking = settings.negativeMarking || 0;

      // Type-aware scoring (2026-07-23): scoreQuestion returns a 0..1 fraction
      // of pointsPerCorrect for any question type. `correct`/`wrong` (used
      // for the negative-marking term and the "X/Y correct" stat shown to
      // the user) are based on that fraction: 1 = fully correct, 0 = fully
      // wrong (attempted but earned nothing), anything in between is partial
      // credit (mcq_multi/match_columns) — counted in the score but not in
      // either bucket, matching the explicit partial-credit decisions this
      // grading was built against.
      let correct = 0;
      let wrong = 0;
      let pointsFromCorrect = 0;
      questions.forEach((q, idx) => {
        const submitted = (answers[String(idx)] ?? (answers as unknown as QuestionAnswer[])[idx]) as QuestionAnswer | undefined;
        if (submitted === undefined || submitted === null || submitted === "") return;
        const fraction = scoreQuestion(q, submitted);
        pointsFromCorrect += fraction * pointsPerCorrect;
        if (fraction >= 1) correct++;
        else if (fraction === 0) wrong++;
      });

      const score = Math.max(0, Math.round(pointsFromCorrect + wrong * negativeMarking));

      if (draftId) {
        await tx.submission.update({
          where: { id: draftId },
          data: { score, answers, status: "completed", tabStrikes, submittedAt: new Date() },
        });
      } else {
        await tx.submission.create({
          data: { userId: user.id, quizId, score, answers, status: "completed", tabStrikes },
        });
      }

      const best = await tx.submission.aggregate({
        where: { userId: user.id, status: "completed" },
        _max: { score: true },
      });
      await tx.user.update({ where: { id: user.id }, data: { score: best._max.score ?? 0 } });

      const baseXp = Math.round(score * 0.5) + 10;
      const { newStreak, oldXp } = await updateStreakAndXp(tx, user.id, baseXp);

      const completedCount = await tx.submission.count({ where: { userId: user.id, status: "completed" } });
      const isFirstQuiz = completedCount === 1;

      const totalPossible = questions.length * pointsPerCorrect;
      const isPerfect = totalPossible > 0 && score >= totalPossible;
      const isLockdownClean = settings.timer === "global" && settings.navigation === "sequential_locked" && tabStrikes === 0;
      const isSpeedRound = settings.timer === "per_question";

      const higherScoreCount = await tx.submission.count({
        where: { quizId, status: "completed", score: { gt: score } },
      });
      const rank = higherScoreCount + 1;

      const { xpGained: achievementXp, newSlugs } = await awardAchievements(tx, user.id, {
        isFirstQuiz,
        isPerfect,
        streakCount: newStreak,
        isLockdownClean,
        isSpeedRound,
        rank,
      });
      if (achievementXp > 0) {
        await tx.user.update({ where: { id: user.id }, data: { xp: { increment: achievementXp } } });
      }

      if (settings.quiz_mode === "team") {
        const membership = await tx.teamMember.findFirst({ where: { userId: user.id }, select: { teamId: true } });
        if (membership) {
          const avg = await tx.submission.aggregate({
            where: {
              quizId,
              status: "completed",
              user: { teamMemberships: { some: { teamId: membership.teamId } } },
            },
            _avg: { score: true },
            _count: { id: true },
          });
          await tx.teamQuizScore.upsert({
            where: { teamId_quizId: { teamId: membership.teamId, quizId } },
            create: {
              teamId: membership.teamId,
              quizId,
              avgScore: avg._avg.score ?? 0,
              memberCount: avg._count.id,
            },
            update: { avgScore: avg._avg.score ?? 0, memberCount: avg._count.id, updatedAt: new Date() },
          });
        }
      }

      const xpGained = baseXp + achievementXp;
      const newXp = oldXp + xpGained;
      const oldLevel = getLevel(oldXp);
      const newLevel = getLevel(newXp);

      return {
        success: true,
        score,
        correct,
        total: questions.length,
        streak: newStreak,
        xpGained,
        newAchievements: newSlugs,
        leveledUp: newLevel > oldLevel,
        newLevel,
        oldLevel,
      };
    });

    if ("conflict" in result) {
      return NextResponse.json({ error: "Already submitted", score: result.conflict.score }, { status: 409 });
    }
    if ("forbidden" in result) {
      return NextResponse.json({ error: result.forbidden }, { status: 403 });
    }
    if ("notFound" in result) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Best-effort SSE/leaderboard signal — non-fatal if it fails.
    try {
      const { broadcastLeaderboardUpdate } = await import("@/lib/leaderboard-broadcast");
      broadcastLeaderboardUpdate(quizId, { type: "new_submission", quizId, score: result.score });
    } catch {
      // non-fatal
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Submission error:", err);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}

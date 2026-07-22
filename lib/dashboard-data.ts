import "server-only";
import { prisma } from "./prisma";
import { scoreQuestion } from "./answer-matching";
import type { QuizSettings, QuizQuestion, QuestionAnswer } from "@/types/quiz";

// Data-fetching for the /dashboard page. Each function here is a direct Prisma
// port of one of v1's dashboard endpoints (server/src/controllers/UserController.js,
// AdminController.getFeaturedQuiz, QuizController.getDailyQuiz) — see
// MIGRATION_AUDIT.md Section 4 for the original endpoint list. Ported as direct
// Server Component data access rather than internal `/api/*` fetches, since this
// data is only ever needed for the page's initial render (no client-side
// interactivity depends on these specific reads) — Phase 3's `app/api/*` routes
// are for endpoints the client actually calls at runtime (polling, mutations),
// not a requirement for every read a Server Component performs.

export interface DashboardSubmission {
  id: string;
  quizId: string | null;
  score: number;
  status: string;
  tabStrikes: number;
  submittedAt: Date;
  quizTitle: string;
  quizSettings: QuizSettings;
}

export async function getRecentSubmissions(userId: string): Promise<DashboardSubmission[]> {
  const rows = await prisma.submission.findMany({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    take: 50,
    include: { quiz: { select: { title: true, settings: true } } },
  });

  // v1 uses an INNER JOIN to quizzes, so submissions whose quiz no longer
  // resolves are silently excluded — replicate by dropping null-quiz rows.
  return rows
    .filter((r) => r.quiz !== null)
    .map((r) => ({
      id: r.id,
      quizId: r.quizId,
      score: r.score,
      status: r.status,
      tabStrikes: r.tabStrikes,
      submittedAt: r.submittedAt,
      quizTitle: r.quiz!.title,
      quizSettings: r.quiz!.settings as unknown as QuizSettings,
    }));
}

export interface DashboardAchievement {
  achievement: string;
  earnedAt: Date;
  name: string | null;
  description: string | null;
  icon: string | null;
  xpReward: number | null;
}

export async function getMyAchievements(userId: string): Promise<DashboardAchievement[]> {
  const earned = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });
  if (earned.length === 0) return [];

  // No FK relation between UserAchievement.achievement (slug) and Achievement.slug
  // in the schema, so the v1 LEFT JOIN is replicated with a manual lookup —
  // a missing catalogue entry still returns the row with null name/icon/etc.,
  // it isn't dropped.
  const catalogue = await prisma.achievement.findMany({
    where: { slug: { in: earned.map((e) => e.achievement) } },
  });
  const bySlug = new Map(catalogue.map((a) => [a.slug, a]));

  return earned.map((e) => {
    const def = bySlug.get(e.achievement);
    return {
      achievement: e.achievement,
      earnedAt: e.earnedAt,
      name: def?.name ?? null,
      description: def?.description ?? null,
      icon: def?.icon ?? null,
      xpReward: def?.xpReward ?? null,
    };
  });
}

export interface WeakTopic {
  topic: string;
  total: number;
  misses: number;
  accuracy: number;
}

/**
 * Exact port of v1's UserController.getWeakTopics accuracy algorithm — last 20
 * completed submissions, aggregated by question `topic` (falling back to
 * "General"), sorted worst-accuracy-first. Recomputes against the quiz's
 * *current* questions/answer key, not a frozen snapshot of what the user saw
 * at attempt time — this is a known v1 quirk, preserved intentionally for
 * parity rather than silently "fixed" during the port. Extended 2026-07-23 to
 * use scoreQuestion so mcq_multi/fill_blank/match_columns questions aggregate
 * correctly instead of being graded as plain string equality (a miss is now
 * "fraction < 1", matching the partial-credit-aware grading used elsewhere).
 */
export async function getWeakTopics(userId: string): Promise<WeakTopic[]> {
  const subs = await prisma.submission.findMany({
    where: { userId, status: "completed" },
    orderBy: { submittedAt: "desc" },
    take: 20,
    select: { answers: true, quiz: { select: { questions: true } } },
  });

  const topicTotals = new Map<string, number>();
  const topicMisses = new Map<string, number>();

  for (const row of subs) {
    const answers = row.answers as Record<string, QuestionAnswer> | null;
    const questions = row.quiz?.questions as unknown as QuizQuestion[] | null;
    if (!questions || !answers) continue;

    questions.forEach((q, idx) => {
      const topic = q.topic || "General";
      topicTotals.set(topic, (topicTotals.get(topic) ?? 0) + 1);

      const submitted = answers[String(idx)] ?? (answers as unknown as QuestionAnswer[])[idx];
      if (scoreQuestion(q, submitted) < 1) {
        topicMisses.set(topic, (topicMisses.get(topic) ?? 0) + 1);
      }
    });
  }

  const heatmap: WeakTopic[] = Array.from(topicTotals.entries()).map(([topic, total]) => {
    const misses = topicMisses.get(topic) ?? 0;
    return { topic, total, misses, accuracy: Math.round(((total - misses) / total) * 100) };
  });

  heatmap.sort((a, b) => a.accuracy - b.accuracy);
  return heatmap;
}

export interface FeaturedQuiz {
  id: string;
  title: string;
  settings: QuizSettings;
  submissionCount: number;
}

export async function getFeaturedQuiz(): Promise<FeaturedQuiz | null> {
  const quiz = await prisma.quiz.findFirst({
    where: { status: "live", settings: { path: ["featured"], equals: true } },
    select: { id: true, title: true, settings: true },
  });
  if (!quiz) return null;

  const submissionCount = await prisma.submission.count({
    where: { quizId: quiz.id, status: "completed" },
  });

  return {
    id: quiz.id,
    title: quiz.title,
    settings: quiz.settings as unknown as QuizSettings,
    submissionCount,
  };
}

export interface DailyQuiz {
  id: string;
  title: string;
  settings: QuizSettings;
  createdAt: Date;
  completedToday: boolean;
  isOfficialDaily: boolean;
  dailyDate: string | null;
  dailyTopic: string | null;
}

interface RawQuizRow {
  id: string;
  title: string;
  settings: QuizSettings;
  created_at: Date;
}

/**
 * Exact port of v1's QuizController.getDailyQuiz 3-tier fallback: today's
 * explicitly-published daily -> most recent published daily (any date) ->
 * seed-based pick from all live quizzes. Uses raw SQL for tiers 2/3 because
 * ordering/selecting by a JSON subfield path isn't expressible through
 * Prisma's query builder. Preserves v1's server-local-time date string quirk
 * (can disagree with Postgres's own `CURRENT_DATE`, used below for
 * `completedToday`, if server and DB timezones differ) — a known existing
 * behavior, not something to silently correct during the port.
 */
export async function getDailyQuizForUser(userId: string): Promise<DailyQuiz | null> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  let rows = await prisma.$queryRaw<RawQuizRow[]>`
    SELECT id, title, settings, created_at FROM quizzes
    WHERE status = 'live'
      AND settings->>'is_daily' = 'true'
      AND settings->>'daily_date' = ${dateStr}
    LIMIT 1
  `;

  if (rows.length === 0) {
    rows = await prisma.$queryRaw<RawQuizRow[]>`
      SELECT id, title, settings, created_at FROM quizzes
      WHERE status = 'live'
        AND settings->>'is_daily' = 'true'
      ORDER BY settings->>'daily_date' DESC
      LIMIT 1
    `;
  }

  if (rows.length === 0) {
    const allRows = await prisma.$queryRaw<RawQuizRow[]>`
      SELECT id, title, settings, created_at FROM quizzes
      WHERE status = 'live'
      ORDER BY created_at ASC
    `;
    if (allRows.length === 0) return null;
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rows = [allRows[seed % allRows.length]];
  }

  const quiz = rows[0];

  // Raw SQL so "today" is Postgres's own CURRENT_DATE (DB-server timezone),
  // matching v1 exactly rather than approximating with app-server-local midnight.
  const completedRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM submissions
    WHERE user_id = ${userId}::uuid AND quiz_id = ${quiz.id}::uuid AND status = 'completed'
      AND submitted_at >= CURRENT_DATE
  `;

  const settings = quiz.settings ?? ({} as QuizSettings);

  return {
    id: quiz.id,
    title: quiz.title,
    settings,
    createdAt: quiz.created_at,
    completedToday: completedRows.length > 0,
    isOfficialDaily: !!(settings as unknown as Record<string, unknown>).is_daily,
    dailyDate: (settings as unknown as Record<string, unknown>).daily_date as string | null ?? null,
    dailyTopic: (settings as unknown as Record<string, unknown>).daily_topic as string | null ?? null,
  };
}

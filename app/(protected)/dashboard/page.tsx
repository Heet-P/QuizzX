import Link from "next/link";
import {
  Flame,
  Trophy,
  Star,
  BookOpen,
  BarChart2,
  Award,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  CalendarCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLevel, getLevelProgress, XP_PER_LEVEL } from "@/lib/xp";
import {
  getRecentSubmissions,
  getMyAchievements,
  getWeakTopics,
  getFeaturedQuiz,
  getDailyQuizForUser,
} from "@/lib/dashboard-data";
import { ACHIEVEMENT_ICONS } from "@/lib/achievements";
import { DraftsSection } from "@/components/dashboard/DraftsSection";

// Ported from client/src/pages/DashboardPage.jsx. v1 fired 6 REST calls via
// Promise.allSettled on the client; here the equivalent reads happen directly
// server-side (Prisma) as part of rendering this Server Component — see
// lib/dashboard-data.ts's header comment for why that's the right call here.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // (protected) layout already redirects; satisfies TS.

  const [submissions, achievements, weakTopics, featuredQuiz, dailyQuiz] = await Promise.all([
    getRecentSubmissions(user.id),
    getMyAchievements(user.id),
    getWeakTopics(user.id),
    getFeaturedQuiz(),
    getDailyQuizForUser(user.id),
  ]);

  const level = getLevel(user.xp);
  const levelProgress = getLevelProgress(user.xp);

  const recentSubs = submissions.filter((s) => s.status !== "draft").slice(0, 10);
  const serverDrafts = submissions
    .filter((s) => s.status === "draft")
    .map((s) => ({
      quizId: s.quizId ?? "",
      quizTitle: s.quizTitle,
      submittedAt: s.submittedAt.toISOString(),
    }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome header */}
      <div className="card-tactile bg-blue text-white p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-sm font-accent font-bold uppercase opacity-80 mb-1">Welcome back</p>
            <h1 className="text-3xl sm:text-5xl font-display">{user.username}</h1>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="chip bg-white/15 border border-white/30 normal-case">
                <Flame size={16} className="text-orange" />
                {user.streakCount} day streak
              </div>
              <div className="chip bg-white/15 border border-white/30 normal-case">
                <Trophy size={16} className="text-yellow" />
                {user.score} pts
              </div>
              <div className="chip bg-white/15 border border-white/30 normal-case">
                <Star size={16} className="text-yellow" />
                Level {level}
              </div>
            </div>
          </div>
          <div className="sm:w-56 shrink-0">
            <p className="text-xs font-accent font-bold uppercase mb-1 opacity-80">
              XP Progress — Level {level}
            </p>
            <div className="h-4 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow transition-all duration-700"
                style={{ width: `${(levelProgress / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
            <p className="text-xs font-mono mt-1 opacity-70">
              {levelProgress} / {XP_PER_LEVEL} XP
            </p>
          </div>
        </div>
      </div>

      {/* Daily challenge */}
      {dailyQuiz && (
        <div
          className={`card-tactile p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            dailyQuiz.completedToday ? "bg-cream-deep" : "bg-blue text-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <CalendarCheck size={26} className="shrink-0 mt-0.5" />
            <div>
              <p
                className={`text-xs font-accent font-bold uppercase tracking-widest mb-0.5 ${
                  dailyQuiz.completedToday ? "text-ink/50" : "text-white/70"
                }`}
              >
                Today&apos;s Challenge
              </p>
              <h2 className="text-xl font-display">{dailyQuiz.title}</h2>
              {dailyQuiz.completedToday && (
                <p className="text-xs font-accent font-bold text-green mt-1 flex items-center gap-1">
                  <CheckCircle size={14} /> Completed today
                </p>
              )}
            </div>
          </div>
          {dailyQuiz.completedToday ? (
            <span className="btn-tactile bg-ink/10 text-ink/40 shrink-0 cursor-not-allowed">Done</span>
          ) : (
            <Link href={`/quiz/${dailyQuiz.id}`} className="btn-tactile bg-white text-ink shrink-0">
              <ChevronRight size={16} /> Accept Challenge
            </Link>
          )}
        </div>
      )}

      {/* Featured quiz spotlight */}
      {featuredQuiz && (
        <div className="card-tactile bg-yellow p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Star size={26} className="shrink-0 mt-0.5" fill="currentColor" />
            <div>
              <p className="text-xs font-accent font-bold uppercase tracking-widest text-ink/60 mb-0.5">
                Featured Quiz
              </p>
              <h2 className="text-xl font-display">{featuredQuiz.title}</h2>
              <p className="text-xs font-accent font-bold text-ink/60 mt-1">
                {featuredQuiz.submissionCount} submission{featuredQuiz.submissionCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Link href={`/quiz/${featuredQuiz.id}`} className="btn-tactile bg-ink text-white shrink-0">
            <ChevronRight size={16} /> Start Now
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/quizzes" className="btn-tactile bg-green justify-center py-4">
          <BookOpen size={20} /> Take a Quiz
        </Link>
        <Link href="/leaderboard" className="btn-tactile bg-yellow justify-center py-4">
          <Trophy size={20} /> View Leaderboard
        </Link>
        <Link href="/profile" className="btn-tactile bg-purple text-white justify-center py-4">
          <TrendingUp size={20} /> See Profile
        </Link>
      </div>

      <DraftsSection serverDrafts={serverDrafts} />

      {/* Recent attempts */}
      <section className="card-tactile p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-display mb-4">
          <BarChart2 size={20} /> Recent Attempts
        </h2>
        {recentSubs.length === 0 ? (
          <div className="text-center py-12 rounded-[var(--radius-card-sm)] border-2 border-dashed border-ink/15">
            <BookOpen size={40} className="mx-auto opacity-30 mb-3" />
            <p className="text-lg font-display">No quizzes taken yet!</p>
            <p className="text-sm font-accent font-bold text-ink/50 mt-1">
              Head over to Quizzes and start your first attempt.
            </p>
            <Link href="/quizzes" className="btn-tactile bg-blue text-white mt-4 inline-flex">
              Browse Quizzes <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b-2 border-ink/10">
                  <th className="p-3 font-accent font-bold text-xs uppercase text-ink/60">Quiz</th>
                  <th className="p-3 font-accent font-bold text-xs uppercase text-ink/60 text-right">Score</th>
                  <th className="p-3 font-accent font-bold text-xs uppercase text-ink/60 text-center">Status</th>
                  <th className="p-3 font-accent font-bold text-xs uppercase text-ink/60 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSubs.map((sub) => (
                  <tr key={sub.id} className="border-b border-ink/5 last:border-b-0">
                    <td className="p-3 font-accent font-bold">{sub.quizTitle}</td>
                    <td className="p-3 text-right font-mono font-bold">{sub.score}</td>
                    <td className="p-3 text-center">
                      {sub.status === "completed" ? (
                        <span className="chip bg-green text-white normal-case text-xs py-1 px-3">
                          <CheckCircle size={12} /> Done
                        </span>
                      ) : (
                        <span className="chip bg-yellow normal-case text-xs py-1 px-3">
                          <Clock size={12} /> {sub.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-xs font-mono text-ink/50">
                      {sub.submittedAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Achievements */}
      <section className="card-tactile bg-purple text-white p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-display mb-4">
          <Award size={20} /> Achievements
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {Array.from(
            new Map(achievements.map((a) => [a.achievement, a])).values()
          ).map((a) => {
            const Icon = ACHIEVEMENT_ICONS[a.achievement] ?? Award;
            return (
              <div
                key={a.achievement}
                title={a.name ?? a.achievement}
                className="flex flex-col items-center gap-1 p-3 rounded-[var(--radius-card-sm)] border-2 border-white/30 bg-yellow text-ink shadow-[var(--shadow-tactile-sm)]"
              >
                <Icon size={22} />
                <span className="text-[10px] font-accent font-bold uppercase text-center leading-tight">
                  {a.name ?? a.achievement}
                </span>
              </div>
            );
          })}
        </div>
        {achievements.length === 0 && (
          <p className="text-sm font-accent font-bold opacity-70 mt-3">
            Complete quizzes to unlock achievements!
          </p>
        )}
      </section>

      {/* Weak topics */}
      <section className="card-tactile p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-display mb-4">
          <TrendingUp size={20} /> Weak Topics
        </h2>
        {weakTopics.length === 0 ? (
          <div className="text-center py-8 rounded-[var(--radius-card-sm)] border-2 border-dashed border-ink/15">
            <p className="font-accent font-bold text-ink/50">
              No data yet — take more quizzes to see insights.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {weakTopics.slice(0, 8).map((t) => {
              const pct = Math.min(100, Math.max(0, t.accuracy));
              const barColor = pct < 40 ? "bg-coral" : pct < 70 ? "bg-yellow" : "bg-green";
              return (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-accent font-bold uppercase truncate shrink-0">
                    {t.topic}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-ink/10 relative overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-xs font-bold">{pct}%</span>
                </div>
              );
            })}
            <div className="flex items-center gap-4 pt-2 border-t border-ink/10 text-xs font-accent font-bold uppercase">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-coral" /> &lt;40%
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow" /> 40-70%
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-green" /> &gt;70%
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

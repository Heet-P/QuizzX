import Link from "next/link";
import { User, Users, ExternalLink, Flame, Star, Zap, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLevel, getLevelProgress, XP_PER_LEVEL } from "@/lib/xp";
import { getRecentSubmissions, getMyAchievements } from "@/lib/dashboard-data";
import { getStreakCalendar, getMyTeam } from "@/lib/profile-data";
import { ACHIEVEMENT_ICONS } from "@/lib/achievements";
import { UsernameForm } from "@/components/profile/UsernameForm";

// Ported from client/src/pages/ProfilePage.jsx. v1 fired 4 REST calls via
// Promise.allSettled plus a separate team fetch; here those reads happen
// directly server-side (Prisma), same rationale as /dashboard. Uses the
// shared lib/xp.ts formula (200 XP/level) rather than v1's own separate
// XP_PER_LEVEL=100 constant on this page — that was a real drift between
// two v1 pages (Dashboard used 200), not an intentional per-page difference,
// so it's unified here rather than reproduced.
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [submissions, achievements, calendarMap, team] = await Promise.all([
    getRecentSubmissions(user.id),
    getMyAchievements(user.id),
    getStreakCalendar(user.id),
    getMyTeam(user.id),
  ]);

  const level = getLevel(user.xp);
  const xpInLevel = getLevelProgress(user.xp);
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 91 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (90 - i));
    return d.toISOString().split("T")[0];
  });
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      <h1 className="flex items-center gap-3 text-3xl sm:text-5xl font-display">
        <User size={36} className="text-blue" />
        Your Profile
      </h1>

      <div className="card-tactile bg-ink text-white p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Zap size={28} className="text-yellow" />
            <div>
              <p className="text-xs font-accent font-bold uppercase text-white/50">Level</p>
              <p className="text-3xl font-display">{level}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Flame size={28} className="text-orange" />
            <div className="text-right">
              <p className="text-xs font-accent font-bold uppercase text-white/50">Streak</p>
              <p className="text-3xl font-display">
                {user.streakCount}
                <span className="text-base ml-1">days</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Star size={28} className="text-blue" />
            <div className="text-right">
              <p className="text-xs font-accent font-bold uppercase text-white/50">Total XP</p>
              <p className="text-3xl font-display">{user.xp}</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-accent font-bold text-white/50 mb-1">
            <span>Level {level}</span>
            <span>
              {xpInLevel} / {XP_PER_LEVEL} XP to Level {level + 1}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-yellow transition-all duration-500" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="card-tactile p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-display mb-3">
          <Flame size={18} className="text-orange" /> Activity Calendar
        </h2>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <div className="flex flex-col gap-1 mr-1">
              {weekdays.map((d, i) => (
                <span key={i} className="w-4 h-4 text-[9px] font-accent font-bold text-ink/40 flex items-center justify-center">
                  {d}
                </span>
              ))}
            </div>
            {Array.from({ length: 13 }, (_, col) => (
              <div key={col} className="flex flex-col gap-1">
                {days.slice(col * 7, col * 7 + 7).map((day) => {
                  const count = calendarMap[day] || 0;
                  let bg = "bg-ink/5";
                  if (count >= 4) bg = "bg-green";
                  else if (count >= 2) bg = "bg-green/60";
                  else if (count >= 1) bg = "bg-green/30";
                  return (
                    <div
                      key={day}
                      title={`${day}: ${count} submission${count !== 1 ? "s" : ""}`}
                      className={`w-4 h-4 rounded-sm ${bg}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] font-accent font-bold text-ink/40">
          <span>Less</span>
          {["bg-ink/5", "bg-green/30", "bg-green/60", "bg-green"].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <UsernameForm username={user.username} userCode={user.userCode} email={user.email} />

      {achievements.length > 0 && (
        <div className="card-tactile bg-purple text-white p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-display mb-4">
            <Trophy size={20} /> Achievements
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a) => {
              const Icon = ACHIEVEMENT_ICONS[a.achievement] ?? Trophy;
              return (
                <div key={a.achievement} className="bg-white/10 rounded-[var(--radius-card-sm)] border border-white/20 p-3 text-center space-y-1">
                  <Icon size={28} className="mx-auto" />
                  <p className="font-accent font-bold text-sm uppercase">{a.name ?? a.achievement}</p>
                  {a.description && <p className="text-xs text-white/70">{a.description}</p>}
                  <p className="text-xs font-mono text-white/50">{a.earnedAt.toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="card-tactile p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-display mb-4">
            <Star size={20} /> Recent Scores
          </h2>
          <div className="space-y-2">
            {submissions.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-[var(--radius-btn)] border-2 border-ink/10">
                <div>
                  <p className="font-accent font-bold text-sm">{s.quizTitle}</p>
                  <p className="text-xs text-ink/40 font-mono">{s.submittedAt.toLocaleDateString()}</p>
                </div>
                <span className="font-mono font-bold text-lg">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-tactile bg-yellow p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-display mb-4">
          <Users size={20} /> Team
        </h2>
        {team ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-accent font-bold text-lg">{team.name}</p>
                <p className="text-xs font-mono text-ink/60">Code: {team.team_code}</p>
              </div>
              <Link href="/team" className="btn-tactile bg-white text-sm">
                <ExternalLink size={14} /> View Team
              </Link>
            </div>
            <p className="text-sm font-accent font-bold text-ink/60">
              {team.member_count} member(s) · Role: {team.your_role}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-accent font-bold text-ink/60">You are not part of any team.</p>
            <Link href="/team" className="btn-tactile bg-blue text-white text-sm">
              <Users size={14} /> Join or Create a Team
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

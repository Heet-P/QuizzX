"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Trophy, Download, Users, User, ChevronDown, Medal, Crown, Award, Globe, School, Lock, Flag, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLeaderboardStream } from "@/hooks/useLeaderboardStream";
import type { QuizSettings } from "@/types/quiz";

interface QuizOption {
  id: string;
  title: string;
  status: string;
  settings?: QuizSettings;
}

interface IndividualRow {
  user_id?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  score: number;
}

interface TeamRow {
  team_id: string;
  team_name: string;
  team_code: string;
  member_count: number;
  avg_score: number | string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={20} className="text-yellow-deep" />;
  if (rank === 2) return <Medal size={20} className="text-ink/40" />;
  if (rank === 3) return <Award size={20} className="text-orange-deep" />;
  return <span className="w-6 text-center font-accent font-bold text-sm">{rank}</span>;
}

// Ported from client/src/pages/LeaderboardPage.jsx. Live updates now come
// from useLeaderboardStream (SSE) rather than Socket.IO — see that hook's
// header comment for why the consumer-facing shape is simpler here (no more
// per-mode "is the live channel applicable" branching). `/api/leaderboard*`
// routes are Phase 3 work, not built yet.
export function LeaderboardClient({ initialQuizId }: { initialQuizId: string | null }) {
  const { user: clerkUser } = useUser();
  const [rows, setRows] = useState<(IndividualRow | TeamRow)[]>([]);
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [scope, setScope] = useState<"global" | "campus">("global");
  const [quizId, setQuizId] = useState<string | null>(initialQuizId);
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [hiddenOwnUser, setHiddenOwnUser] = useState<{ score?: number } | null>(null);
  const [archived, setArchived] = useState(false);
  const [quizMode, setQuizMode] = useState<"individual" | "team">("individual");

  const { isConnected, socketError, lastUpdateAt } = useLeaderboardStream(quizId);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetch("/api/leaderboard/quizzes");
        const data: QuizOption[] = await res.json();
        setQuizzes(data);
        if (data.length > 0 && !quizId) {
          const firstLive = data.find((q) => q.status === "live");
          if (firstLive) {
            setQuizId(firstLive.id);
            setQuizMode(firstLive.settings?.quiz_mode === "team" ? "team" : "individual");
            setMode(firstLive.settings?.quiz_mode === "team" ? "team" : "individual");
          }
        }
      } catch {
        // leave quizzes empty; page shows "no quiz available"
      }
    };
    fetchQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    if (!quizId) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ quizId, mode, scope });
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();

      if (res.status === 403) {
        if (data.archived) setArchived(true);
        else if (data.hidden) {
          setHidden(true);
          setHiddenOwnUser(data.ownUser ?? null);
        }
        setRows([]);
      } else if (data.hidden) {
        setHidden(true);
        setHiddenOwnUser(data.ownUser ?? null);
        setRows([]);
      } else if (data.archived) {
        setArchived(true);
        setRows([]);
      } else {
        setHidden(false);
        setArchived(false);
        setRows(data.rows ?? []);
      }
    } catch {
      // keep prior rows on transient failure
    } finally {
      setLoading(false);
    }
  }, [quizId, mode, scope]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();
  }, [fetchLeaderboard, lastUpdateAt]);

  const handleQuizChange = (newQuizId: string) => {
    setQuizId(newQuizId);
    const quiz = quizzes.find((q) => q.id === newQuizId);
    if (quiz) {
      const newQuizMode = quiz.settings?.quiz_mode === "team" ? "team" : "individual";
      setQuizMode(newQuizMode);
      setMode(newQuizMode);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (quizId) params.set("quizId", quizId);
      params.set("mode", mode);
      const res = await fetch(`/api/leaderboard/export?${params.toString()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `leaderboard_${mode}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // export failure is non-fatal; user can retry
    }
  };

  const currentUsername = clerkUser?.username || clerkUser?.firstName || "";
  const individualRows = rows as IndividualRow[];
  const teamRows = rows as TeamRow[];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="flex items-center gap-3 text-3xl sm:text-5xl font-display">
          <Trophy size={36} className="text-yellow" />
          Leaderboard
        </h1>
        <button onClick={handleExport} className="btn-tactile bg-ink text-white text-sm self-start sm:self-auto">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <select
            value={quizId || ""}
            onChange={(e) => handleQuizChange(e.target.value)}
            className="input-tactile appearance-none pr-10"
          >
            <option value="">-- Select a Quiz --</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} {q.status !== "live" ? `(${q.status})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink/40" />
        </div>

        {quizMode === "team" && (
          <div className="flex rounded-[var(--radius-btn)] border-2 border-ink/10 overflow-hidden">
            <button
              onClick={() => setMode("individual")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-accent font-bold transition-all ${
                mode === "individual" ? "bg-ink text-white" : "bg-white hover:bg-cream-alt"
              }`}
            >
              <User size={16} /> Individual
            </button>
            <button
              onClick={() => setMode("team")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-accent font-bold border-l-2 border-ink/10 transition-all ${
                mode === "team" ? "bg-blue text-white" : "bg-white hover:bg-cream-alt"
              }`}
            >
              <Users size={16} /> Team
            </button>
          </div>
        )}

        <div className="flex rounded-[var(--radius-btn)] border-2 border-ink/10 overflow-hidden">
          <button
            onClick={() => setScope("global")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-accent font-bold transition-all ${
              scope === "global" ? "bg-ink text-white" : "bg-white hover:bg-cream-alt"
            }`}
          >
            <Globe size={16} /> Global
          </button>
          <button
            onClick={() => setScope("campus")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-accent font-bold border-l-2 border-ink/10 transition-all ${
              scope === "campus" ? "bg-purple text-white" : "bg-white hover:bg-cream-alt"
            }`}
          >
            <School size={16} /> Campus
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-xl font-display animate-pulse">Loading scores…</div>
        </div>
      ) : !quizId ? (
        <div className="card-tactile bg-yellow text-center py-12">
          <Trophy size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-display">No quiz available</p>
          <p className="text-sm font-accent font-bold text-ink/60 mt-1">Wait for the admin to publish a quiz.</p>
        </div>
      ) : hidden ? (
        <div className="card-tactile bg-yellow text-center py-12">
          <p className="text-lg font-display mb-4 flex items-center justify-center gap-2">
            <Lock size={20} /> Leaderboard is hidden
          </p>
          {hiddenOwnUser && <p className="font-mono text-2xl font-bold">Your score: {hiddenOwnUser.score || 0}</p>}
        </div>
      ) : archived ? (
        <div className="card-tactile bg-cream-deep text-center py-12">
          <p className="text-lg font-display flex items-center justify-center gap-2">
            <Flag size={20} /> This quiz has ended
          </p>
          <p className="text-sm font-accent font-bold text-ink/60 mt-1">The final leaderboard is no longer available.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-tactile text-center py-12">
          <p className="text-lg font-display">No scores yet</p>
          <p className="text-sm font-accent font-bold text-ink/50 mt-1">Be the first to submit!</p>
        </div>
      ) : mode === "team" ? (
        <div className="card-tactile overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b-2 border-ink/10">
                  <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60 w-16">#</th>
                  <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60">Team</th>
                  <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60 text-center">Members</th>
                  <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row, idx) => (
                  <tr key={row.team_id} className={`border-b border-ink/5 last:border-b-0 ${idx < 3 ? "bg-yellow/20" : ""}`}>
                    <td className="p-3 sm:p-4">
                      <RankBadge rank={idx + 1} />
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="font-accent font-bold">{row.team_name}</div>
                      <span className="text-xs font-mono text-ink/40">{row.team_code}</span>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <span className="font-accent font-bold">{row.member_count}</span>
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <span className="font-mono font-bold text-lg">{Number(row.avg_score).toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {(() => {
            const myIdx = individualRows.findIndex(
              (r) => (r.username || r.displayName)?.toLowerCase() === currentUsername?.toLowerCase()
            );
            if (myIdx > 0) {
              const ahead = individualRows[myIdx - 1];
              const aheadName = ahead.username || ahead.displayName || "";
              const gap = ahead.score - individualRows[myIdx].score;
              if (gap > 0) {
                return (
                  <div className="rounded-[var(--radius-btn)] bg-yellow px-4 py-2 flex items-center gap-2 text-sm font-accent font-bold">
                    <Trophy size={16} />
                    You&apos;re <span className="font-black">{gap} pts</span> behind{" "}
                    <span className="font-black">@{aheadName}</span> — keep going!
                  </div>
                );
              }
            }
            return null;
          })()}

          {!isConnected && !socketError && quizzes.find((q) => q.id === quizId)?.status === "live" && (
            <div className="text-xs text-orange-deep font-accent font-bold mb-2 flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin" /> Reconnecting live feed…
            </div>
          )}

          <div className="card-tactile overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b-2 border-ink/10">
                    <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60 w-16">#</th>
                    <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60">Player</th>
                    <th className="p-3 sm:p-4 font-accent font-bold text-xs uppercase text-ink/60 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {individualRows.map((row, idx) => {
                      const rowUsername = row.username || row.displayName || "";
                      const rowUserId = row.user_id || row.userId || "";
                      const isYou = rowUsername?.toLowerCase() === clerkUser?.username?.toLowerCase();
                      return (
                        <motion.tr
                          key={rowUserId || rowUsername}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className={`border-b border-ink/5 last:border-b-0 ${isYou ? "bg-blue/10" : idx < 3 ? "bg-yellow/20" : ""}`}
                        >
                          <td className="p-3 sm:p-4">
                            <RankBadge rank={idx + 1} />
                          </td>
                          <td className="p-3 sm:p-4">
                            <span className="font-accent font-bold">{rowUsername}</span>
                            {isYou && (
                              <span className="ml-2 text-[10px] font-bold bg-blue text-white px-1.5 py-0.5 rounded-[var(--radius-chip)] uppercase">
                                You
                              </span>
                            )}
                          </td>
                          <td className="p-3 sm:p-4 text-right">
                            <span className="font-mono font-bold text-lg">{row.score}</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

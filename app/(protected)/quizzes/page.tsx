"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, CheckCircle, Lock, RefreshCw, Users, User, LogIn, Radio } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { QuizSettings } from "@/types/quiz";

// Ported from client/src/pages/QuizListPage.jsx. Polls GET /api/quizzes every
// 15s (server caches 5s per-user in v1; Phase 3 should preserve that), pausing
// while the tab is hidden. NOTE: `/api/quizzes` doesn't exist yet (Phase 3 is
// not started per the strict phase order this migration follows) — this page
// is built against the exact response shape QuizController.listQuizzes
// returned in v1 (see MIGRATION_AUDIT.md Section 4), so it will work as soon
// as that route exists; until then the list stays empty and requests 404.
const POLL_INTERVAL = 15000;

interface QuizListItem {
  id: string;
  title: string;
  settings: QuizSettings;
  is_active: boolean;
  status: string;
  created_at: string;
  user_score: number | null;
  submitted_at: string | null;
  completed: boolean;
  room_code: string | null;
  room_state: "waiting" | "active" | null;
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const [codeInput, setCodeInput] = useState("");

  const fetchQuizzes = useCallback(async () => {
    try {
      const data = await apiFetch<QuizListItem[] | { quizzes?: QuizListItem[] }>("/api/quizzes");
      setQuizzes(Array.isArray(data) ? data : (data.quizzes ?? []));
    } catch {
      // Silently retry on next poll tick, matching v1 (only logs non-401 errors).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    pollRef.current = setInterval(fetchQuizzes, POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.hidden) {
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        fetchQuizzes();
        pollRef.current = setInterval(fetchQuizzes, POLL_INTERVAL);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchQuizzes]);

  const handleCodeJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (code.length < 1) return;
    router.push(`/live/${code}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-xl sm:text-2xl font-display animate-pulse">Loading quizzes…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-3xl sm:text-5xl font-display">Available Quizzes</h1>
        <div className="flex items-center gap-2 text-xs font-mono text-ink/40">
          <RefreshCw size={12} className="animate-spin" style={{ animationDuration: "3s" }} />
          Auto-updating
        </div>
      </div>

      <form onSubmit={handleCodeJoin} className="card-tactile flex items-center gap-2 p-3">
        <label htmlFor="room-code-input" className="sr-only">
          Room code
        </label>
        <LogIn size={18} className="shrink-0 text-ink/40" />
        <input
          id="room-code-input"
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.replace(/\s/g, "").toUpperCase())}
          placeholder="Have a room code? Enter it here…"
          maxLength={8}
          className="flex-1 font-mono font-bold text-sm uppercase bg-transparent outline-none placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-ink/40"
        />
        <button
          type="submit"
          disabled={codeInput.trim().length < 1}
          className="btn-tactile bg-ink text-white text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join
        </button>
      </form>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => {
          const isCompleted = quiz.completed;
          return (
            <div
              key={quiz.id}
              className={`card-tactile p-6 flex flex-col justify-between ${isCompleted ? "opacity-70" : ""}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-xl font-display leading-tight">{quiz.title}</h2>
                  {isCompleted && (
                    <span className="chip bg-green text-white normal-case text-xs py-1 px-3 shrink-0">
                      <CheckCircle size={13} /> Done
                    </span>
                  )}
                </div>
                <div className="mb-4 flex gap-4 text-sm font-accent font-bold text-ink/60">
                  {quiz.settings?.timer !== "none" ? (
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {quiz.settings?.timer === "per_question"
                        ? `${quiz.settings?.secondsPerQuestion || 30}s/Q`
                        : `${quiz.settings?.duration || 60} min`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock size={16} /> Untimed
                    </span>
                  )}
                  {quiz.settings?.quiz_mode === "team" ? (
                    <span className="flex items-center gap-1 text-blue">
                      <Users size={14} /> Team (max {quiz.settings?.max_team_size || 4})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <User size={14} /> Individual
                    </span>
                  )}
                </div>

                {isCompleted && (
                  <div className="mb-3 p-3 bg-white rounded-[var(--radius-card-sm)] border-2 border-ink/10">
                    <p className="font-mono font-bold">
                      Score: <span className="text-blue">{quiz.user_score} pts</span>
                    </p>
                    {quiz.submitted_at && (
                      <p className="text-xs text-ink/40 font-bold mt-1">
                        Submitted {new Date(quiz.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {quiz.room_code && (
                  <Link
                    href={`/live/${quiz.room_code}`}
                    className={`btn-tactile w-full justify-center text-sm ${
                      quiz.room_state === "active" ? "bg-green" : "bg-blue text-white"
                    }`}
                  >
                    <Radio size={16} />
                    {quiz.room_state === "active" ? "Join Session" : "Join Lobby"}
                    {quiz.room_state === "active" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ink opacity-50" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-ink" />
                      </span>
                    )}
                    <span className="text-xs font-bold opacity-80">
                      · {quiz.room_state === "active" ? "In progress" : "Waiting to start"}
                    </span>
                  </Link>
                )}

                {isCompleted ? (
                  <button disabled className="btn-tactile w-full justify-center bg-ink/10 text-ink/40 cursor-not-allowed text-sm">
                    <Lock size={16} /> Quiz Completed
                  </button>
                ) : (
                  <Link href={`/quiz/${quiz.id}`} className="btn-tactile w-full justify-center bg-ink text-white text-sm group">
                    Start Quiz <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {quizzes.length === 0 && (
          <div className="col-span-full card-tactile p-8 sm:p-12 text-center">
            <h3 className="text-xl font-display">No quizzes deployed</h3>
            <p className="mt-2 text-ink/50 text-sm font-accent font-bold">Wait for admin initialization.</p>
          </div>
        )}
      </div>
    </div>
  );
}

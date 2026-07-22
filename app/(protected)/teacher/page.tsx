"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, BarChart2, Rocket, Archive, AlertCircle, X, ChevronRight, Users } from "lucide-react";
import { QuizUploader } from "@/components/admin/QuizUploader";
import { DailyChallengePanel } from "@/components/admin/DailyChallengePanel";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { QuizSettings } from "@/types/quiz";

interface TeacherQuiz {
  id: string;
  title: string;
  status: "draft" | "live" | "archived";
  is_active?: boolean;
  submission_count?: number;
  settings?: QuizSettings;
}

interface QuestionAnalytics {
  id?: string;
  text?: string;
  question_text?: string;
  accuracy?: number;
  accuracy_pct?: number;
  top_wrong_answer?: string;
}

interface QuizAnalyticsData {
  questions?: QuestionAnalytics[];
  per_question?: QuestionAnalytics[];
  submission_count?: number;
  total_submissions?: number;
  avg_score?: number;
  completion_rate?: number;
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    {
      draft: { label: "Draft", cls: "bg-cream" },
      live: { label: "Live", cls: "bg-green" },
      archived: { label: "Archived", cls: "bg-coral text-white" },
    }[status] ?? { label: status, cls: "bg-cream" };

  return <span className={`px-2 py-0.5 text-xs font-accent font-bold uppercase rounded-[var(--radius-chip)] ${cfg.cls}`}>{cfg.label}</span>;
}

function QuestionBar({ question }: { question: QuestionAnalytics & { index: number } }) {
  const accuracy = question.accuracy ?? question.accuracy_pct ?? 0;
  const pct = Math.round(accuracy * 100);
  const barColor = pct >= 70 ? "bg-green" : pct >= 40 ? "bg-yellow" : "bg-coral";
  const text = question.text || question.question_text || "";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-accent font-bold truncate max-w-xs" title={text}>
          Q{question.index}: {text.slice(0, 60)}
          {text.length > 60 ? "…" : ""}
        </span>
        <span className="text-xs font-bold font-mono shrink-0">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-ink/10 overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {question.top_wrong_answer && (
        <p className="text-[10px] font-accent font-bold text-ink/40">
          Most wrong: <span className="text-coral">{question.top_wrong_answer}</span>
        </p>
      )}
    </div>
  );
}

function AnalyticsModal({ quiz, onClose }: { quiz: TeacherQuiz; onClose: () => void }) {
  const [analyticsData, setAnalyticsData] = useState<QuizAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/quizzes/${quiz.id}/analytics`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load analytics");
        setAnalyticsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quiz.id]);

  const questions = analyticsData?.questions || analyticsData?.per_question || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
      <div className="card-tactile bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b-2 border-ink/10">
          <h2 className="flex items-center gap-2 text-xl font-display">
            <BarChart2 size={20} /> {quiz.title} — Analytics
          </h2>
          <button onClick={onClose} className="btn-tactile bg-coral text-white p-1.5">
            <X size={18} />
          </button>
        </div>

        {loading && <div className="text-center py-12 text-lg font-accent font-bold animate-pulse">Loading analytics…</div>}
        {error && <div className="p-4 bg-coral text-white font-accent font-bold rounded-[var(--radius-btn)]">{error}</div>}
        {!loading && !error && questions.length === 0 && (
          <p className="text-ink/50 font-accent font-bold text-center py-8">No analytics data available yet.</p>
        )}
        {!loading && !error && questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs font-accent font-bold uppercase pb-2 border-b border-ink/10">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-green" /> ≥70%
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow" /> 40-70%
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-coral" /> &lt;40%
              </span>
            </div>
            {questions.map((q, i) => (
              <QuestionBar key={q.id || i} question={{ ...q, index: i + 1 }} />
            ))}
          </div>
        )}

        {!loading && analyticsData && (
          <div className="mt-4 pt-4 border-t border-ink/10 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-display">{analyticsData.submission_count ?? analyticsData.total_submissions ?? 0}</p>
              <p className="text-xs font-accent font-bold uppercase text-ink/50">Submissions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display">{analyticsData.avg_score !== undefined ? Number(analyticsData.avg_score).toFixed(1) : "—"}</p>
              <p className="text-xs font-accent font-bold uppercase text-ink/50">Avg Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display">
                {analyticsData.completion_rate !== undefined ? `${Math.round(analyticsData.completion_rate * 100)}%` : "—"}
              </p>
              <p className="text-xs font-accent font-bold uppercase text-ink/50">Completion</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ported from client/src/pages/TeacherPage.jsx. `/api/*` are Phase 3 work,
// not built yet. The role gate here is the same client-side-only check v1
// had (audit flags this as a real gap — server-side enforcement is what
// actually matters and belongs in the Phase 3 route handlers, not fixed here).
export default function TeacherPage() {
  const toast = useToast();
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [analyticsQuiz, setAnalyticsQuiz] = useState<TeacherQuiz | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quizzes");
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch {
      // leave quizzes empty
    } finally {
      setLoadingQuizzes(false);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/users/profile");
        const data = await res.json();
        setProfile(data);
      } catch {
        // profile stays null; access-denied branch below handles it
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handlePublish = async (quizId: string) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/publish`, { method: "POST" });
      if (!res.ok) throw new Error();
      fetchQuizzes();
      toast.success("Quiz is now live!");
    } catch {
      toast.error("Failed to publish quiz");
    }
  };

  const handleArchive = (quizId: string) => {
    setConfirmModal({
      title: "Archive Quiz?",
      message: "Users will no longer see this quiz.",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/admin/quizzes/${quizId}/archive`, { method: "POST" });
          if (!res.ok) throw new Error();
          fetchQuizzes();
          toast.success("Quiz archived.");
        } catch {
          toast.error("Failed to archive quiz");
        }
      },
    });
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-2xl font-display animate-pulse">Loading…</div>
      </div>
    );
  }

  if (profile && profile.role !== "teacher" && profile.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card-tactile bg-coral text-white max-w-md w-full text-center p-8">
          <AlertCircle size={48} className="mx-auto mb-3" />
          <h1 className="text-3xl font-display">Access Denied</h1>
          <p className="font-accent font-bold mt-2">You need the Teacher or Admin role to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ""}
        message={confirmModal?.message}
        onConfirm={confirmModal?.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(null)}
      />
      <div className="space-y-6 max-w-5xl mx-auto">
        <h1 className="flex items-center gap-3 text-3xl sm:text-5xl font-display">
          <BookOpen size={36} className="text-blue" /> Teacher Dashboard
        </h1>

        <section className="card-tactile p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-display mb-5">
            <BookOpen size={22} /> My Quizzes
          </h2>

          {loadingQuizzes ? (
            <div className="text-center py-8 text-lg font-accent font-bold animate-pulse">Loading quizzes…</div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-10 rounded-[var(--radius-card-sm)] border-2 border-dashed border-ink/15">
              <p className="text-lg font-accent font-bold text-ink/50">No quizzes yet. Upload one below!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => {
                const status = quiz.status || (quiz.is_active ? "live" : "draft");
                return (
                  <div
                    key={quiz.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border-2 border-ink/10 p-4 bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-display text-lg">{quiz.title}</h3>
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-sm font-accent font-bold text-ink/50 flex items-center gap-2">
                        <Users size={14} />
                        {quiz.submission_count || 0} submission{quiz.submission_count !== 1 ? "s" : ""}
                        {quiz.settings?.timer && <> · {quiz.settings.timer}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setAnalyticsQuiz(quiz)} className="btn-tactile bg-blue text-white text-sm">
                        <BarChart2 size={15} /> Analytics
                      </button>

                      {(status === "draft" || status === "archived") && (
                        <button onClick={() => handlePublish(quiz.id)} className="btn-tactile bg-green text-sm">
                          <Rocket size={15} /> {status === "archived" ? "Re-publish" : "Publish"}
                        </button>
                      )}
                      {status === "live" && (
                        <button onClick={() => handleArchive(quiz.id)} className="btn-tactile bg-coral text-white text-sm">
                          <Archive size={15} /> Archive
                        </button>
                      )}

                      <a href={`/admin/proctor/${quiz.id}`} className="btn-tactile bg-purple text-white text-sm" title="View Proctor Dashboard">
                        <ChevronRight size={15} /> Proctor
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <DailyChallengePanel />

        <QuizUploader fetchQuizzes={fetchQuizzes} />

        {analyticsQuiz && <AnalyticsModal quiz={analyticsQuiz} onClose={() => setAnalyticsQuiz(null)} />}
      </div>
    </>
  );
}

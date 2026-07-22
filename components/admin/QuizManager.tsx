"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Trash2, Rocket, Archive, Users, User, BarChart2, FileText, Shield, ChevronDown, ChevronUp, Star, Circle, CircleDot, Square, Key, Shuffle } from "lucide-react";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { QuizSettings } from "@/types/quiz";

export interface ManagedQuiz {
  id: string;
  title: string;
  status: "draft" | "live" | "archived";
  is_active?: boolean;
  settings?: QuizSettings;
  submission_count?: number;
  started_at?: string | null;
}

interface QuestionAnalytics {
  accuracy: number;
  top_wrong?: string;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-cream", Icon: Circle },
  live: { label: "Live", className: "bg-green", Icon: CircleDot },
  archived: { label: "Archived", className: "bg-coral text-white", Icon: Square },
};

// Ported from client/src/components/admin/QuizManager.jsx. Shared between
// /admin and /teacher (both render the quiz control center) — `showProctor`
// gates the Proctor button since only admins have that route today.
export function QuizManager({
  quizzes,
  fetchQuizzes,
  showProctor = true,
}: {
  quizzes: ManagedQuiz[];
  fetchQuizzes: () => void;
  showProctor?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, QuestionAnalytics[]>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; onConfirm: () => void } | null>(null);

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
    setConfirm({
      title: "Archive Quiz?",
      message: "Users will no longer see this quiz.",
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`/api/admin/quizzes/${quizId}/archive`, { method: "POST" });
          if (!res.ok) throw new Error();
          fetchQuizzes();
          toast.success("Quiz archived");
        } catch {
          toast.error("Failed to archive quiz");
        }
      },
    });
  };

  const handleDelete = (quizId: string) => {
    setConfirm({
      title: "Delete Quiz?",
      message: "This will delete the quiz and all submissions. This cannot be undone.",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`/api/admin/quizzes/${quizId}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          fetchQuizzes();
          toast.success("Quiz deleted");
        } catch {
          toast.error("Failed to delete quiz");
        }
      },
    });
  };

  const handleFeature = async (quizId: string) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/feature`, { method: "POST" });
      if (!res.ok) throw new Error();
      fetchQuizzes();
      toast.success("Quiz is now featured on the dashboard");
    } catch {
      toast.error("Failed to feature quiz");
    }
  };

  const handleDownloadIntegrity = async (quizId: string, title: string) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/integrity`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `integrity_${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("Failed to download integrity report");
    }
  };

  const toggleAnalytics = async (quizId: string) => {
    if (expandedId === quizId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(quizId);
    if (analytics[quizId]) return;
    setLoadingAnalytics((prev) => ({ ...prev, [quizId]: true }));
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/analytics`);
      const data = await res.json();
      setAnalytics((prev) => ({ ...prev, [quizId]: data }));
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoadingAnalytics((prev) => ({ ...prev, [quizId]: false }));
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message}
        confirmLabel={confirm?.danger ? "Delete" : "Confirm"}
        danger={confirm?.danger}
        onConfirm={confirm?.onConfirm || (() => {})}
        onCancel={() => setConfirm(null)}
      />
      <section className="card-tactile p-6 sm:p-8">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-display">
          <Zap /> Quiz Control Center
        </h2>
        {quizzes.length === 0 ? (
          <p className="text-ink/50 font-accent font-bold">No quizzes created yet.</p>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => {
              const qs = quiz.settings || ({} as QuizSettings);
              const status = quiz.status || (quiz.is_active ? "live" : "draft");
              const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
              const isTeamQuiz = qs.quiz_mode === "team";
              const isExpanded = expandedId === quiz.id;
              const quizAnalytics = analytics[quiz.id];
              const StatusIcon = statusCfg.Icon;

              return (
                <div key={quiz.id} className="rounded-[var(--radius-card-sm)] border-2 border-ink/10 bg-white overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-accent font-bold text-lg truncate">{quiz.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-accent font-bold uppercase rounded-[var(--radius-chip)] shrink-0 ${statusCfg.className}`}>
                          <StatusIcon size={10} /> {statusCfg.label}
                        </span>
                        {isTeamQuiz ? (
                          <span className="px-2 py-0.5 text-xs font-accent font-bold bg-blue text-white rounded-[var(--radius-chip)] flex items-center gap-1 shrink-0">
                            <Users size={12} /> Team
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-accent font-bold bg-cream rounded-[var(--radius-chip)] flex items-center gap-1 shrink-0">
                            <User size={12} /> Individual
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs font-accent font-bold bg-purple text-white rounded-[var(--radius-chip)] shrink-0">
                          {qs.timer || "—"}
                        </span>
                        {qs.accessCode && (
                          <span className="px-2 py-0.5 text-xs font-accent font-bold bg-yellow rounded-[var(--radius-chip)] flex items-center gap-1 shrink-0">
                            <Key size={11} /> PIN
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink/50 font-accent font-bold mt-1 truncate">
                        {quiz.submission_count || 0} submissions · {qs.pointsPerCorrect || 1} pt/correct
                        {qs.negativeMarking ? ` · ${qs.negativeMarking} penalty` : ""}
                        {qs.shuffleQuestions ? " · Shuffled" : ""}
                        {qs.poolSize ? ` · Pool ${qs.showCount || "?"}/${qs.poolSize}` : ""}
                        {status === "live" && quiz.started_at && <> · Live since {new Date(quiz.started_at).toLocaleDateString()}</>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {(status === "draft" || status === "archived") && (
                        <button onClick={() => handlePublish(quiz.id)} className="btn-tactile text-xs bg-green py-2 px-3">
                          <Rocket size={14} /> {status === "archived" ? "Re-publish" : "Publish"}
                        </button>
                      )}
                      {status === "live" && (
                        <>
                          {showProctor && (
                            <button onClick={() => router.push(`/admin/proctor/${quiz.id}`)} className="btn-tactile text-xs bg-blue text-white py-2 px-3">
                              <Shield size={14} /> Proctor
                            </button>
                          )}
                          <button
                            onClick={() => handleFeature(quiz.id)}
                            title="Feature on dashboard"
                            className={`btn-tactile text-xs py-2 px-3 ${qs.featured ? "bg-yellow" : "bg-white"}`}
                          >
                            <Star size={14} fill={qs.featured ? "currentColor" : "none"} />
                          </button>
                          <button onClick={() => handleArchive(quiz.id)} className="btn-tactile text-xs bg-coral text-white py-2 px-3">
                            <Archive size={14} /> Archive
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDownloadIntegrity(quiz.id, quiz.title)}
                        className="btn-tactile text-xs bg-white py-2 px-3"
                        title="Download integrity CSV"
                      >
                        <FileText size={14} />
                      </button>
                      <button onClick={() => toggleAnalytics(quiz.id)} className="btn-tactile text-xs bg-white py-2 px-3" title="Toggle analytics">
                        <BarChart2 size={14} />
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {status !== "live" && (
                        <button onClick={() => handleDelete(quiz.id)} className="btn-tactile bg-cream-alt text-xs py-2 px-3" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t-2 border-ink/10 bg-cream p-4">
                      {loadingAnalytics[quiz.id] ? (
                        <p className="text-sm font-accent font-bold animate-pulse">Loading analytics…</p>
                      ) : !quizAnalytics || quizAnalytics.length === 0 ? (
                        <p className="text-sm font-accent font-bold text-ink/50">No submissions yet to analyse.</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-accent font-bold uppercase text-ink/50 mb-2 flex items-center gap-1">
                            <Shuffle size={12} /> Per-Question Accuracy
                          </p>
                          {quizAnalytics.map((q, i) => {
                            const pct = Math.min(100, Math.round(q.accuracy ?? 0));
                            const barColor = pct >= 70 ? "bg-green" : pct >= 40 ? "bg-yellow" : "bg-coral";
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="w-6 text-xs font-accent font-bold shrink-0 text-right">Q{i + 1}</span>
                                <div className="flex-1 h-4 rounded-full bg-white overflow-hidden">
                                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-12 text-xs font-mono font-bold text-right shrink-0">{pct}%</span>
                                {q.top_wrong && (
                                  <span className="text-xs text-ink/40 truncate max-w-[120px]" title={`Most wrong: ${q.top_wrong}`}>
                                    {q.top_wrong}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

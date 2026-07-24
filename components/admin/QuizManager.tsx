"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Trash2,
  Rocket,
  Archive,
  Users,
  User,
  BarChart2,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  Star,
  Circle,
  CircleDot,
  Square,
  Key,
  Shuffle,
  MessagesSquare,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { apiFetch, apiFetchBlob, errorMessage } from "@/lib/api-client";
import { timeAgo } from "@/lib/time-ago";
import type { QuizSettings } from "@/types/quiz";

export interface ManagedQuiz {
  id: string;
  title: string;
  status: "draft" | "live" | "archived";
  is_active?: boolean;
  settings?: QuizSettings;
  submission_count?: number;
  started_at?: string | null;
  scores_published_at?: string | null;
}

interface QuestionAnalytics {
  id?: number;
  text?: string;
  accuracy: number | null;
  top_wrong_answer?: string | null;
}

interface QuizAnalyticsData {
  questions: QuestionAnalytics[];
  submission_count: number;
  avg_score: number;
  completion_rate: number;
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
  const [analytics, setAnalytics] = useState<Record<string, QuizAnalyticsData>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({});
  const [publishingScores, setPublishingScores] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; onConfirm: () => void } | null>(null);

  const handlePublish = async (quizId: string) => {
    try {
      await apiFetch(`/api/admin/quizzes/${quizId}/publish`, { method: "POST" });
      fetchQuizzes();
      toast.success("Quiz is now live!");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to publish quiz"));
    }
  };

  const doPublishScores = async (quizId: string) => {
    setPublishingScores((prev) => ({ ...prev, [quizId]: true }));
    try {
      const data = await apiFetch<{ studentCount: number; usedSummaryFallback: boolean }>(`/api/admin/quizzes/${quizId}/publish-scores`, {
        method: "POST",
      });
      fetchQuizzes();
      toast.success(
        data.usedSummaryFallback
          ? `Roster too large to list in full — posted a summary for ${data.studentCount} students instead`
          : `Posted scores for ${data.studentCount} students to Teams`
      );
    } catch (err) {
      toast.error(errorMessage(err, "Failed to publish scores to Teams"));
    } finally {
      setPublishingScores((prev) => ({ ...prev, [quizId]: false }));
    }
  };

  const handlePublishScores = (quizId: string, alreadyPublished: boolean) => {
    if (!alreadyPublished) {
      doPublishScores(quizId);
      return;
    }
    setConfirm({
      title: "Re-publish Scores?",
      message: "This quiz's scores were already posted to Teams. Publishing again will send another message to the channel.",
      onConfirm: () => {
        setConfirm(null);
        doPublishScores(quizId);
      },
    });
  };

  const handleArchive = (quizId: string) => {
    setConfirm({
      title: "Archive Quiz?",
      message: "Users will no longer see this quiz.",
      onConfirm: async () => {
        setConfirm(null);
        try {
          await apiFetch(`/api/admin/quizzes/${quizId}/archive`, { method: "POST" });
          fetchQuizzes();
          toast.success("Quiz archived");
        } catch (err) {
          toast.error(errorMessage(err, "Failed to archive quiz"));
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
          await apiFetch(`/api/admin/quizzes/${quizId}`, { method: "DELETE" });
          fetchQuizzes();
          toast.success("Quiz deleted");
        } catch (err) {
          toast.error(errorMessage(err, "Failed to delete quiz"));
        }
      },
    });
  };

  const handleFeature = async (quizId: string) => {
    try {
      await apiFetch(`/api/admin/quizzes/${quizId}/feature`, { method: "POST" });
      fetchQuizzes();
      toast.success("Quiz is now featured on the dashboard");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to feature quiz"));
    }
  };

  const handleDownloadIntegrity = async (quizId: string, title: string) => {
    try {
      const blob = await apiFetchBlob(`/api/admin/quizzes/${quizId}/integrity`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `integrity_${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to download integrity report"));
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
      const data = await apiFetch<QuizAnalyticsData>(`/api/admin/quizzes/${quizId}/analytics`);
      setAnalytics((prev) => ({ ...prev, [quizId]: data }));
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load analytics"));
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
                      {status !== "draft" && (
                        <button
                          onClick={() => handlePublishScores(quiz.id, !!quiz.scores_published_at)}
                          disabled={publishingScores[quiz.id]}
                          title={quiz.scores_published_at ? `Last posted to Teams ${timeAgo(quiz.scores_published_at)}` : "Post scores to the linked Teams channel"}
                          className={`btn-tactile text-xs py-2 px-3 disabled:opacity-50 ${quiz.scores_published_at ? "bg-white" : "bg-purple text-white"}`}
                        >
                          <MessagesSquare size={14} />
                          {publishingScores[quiz.id] ? "Posting…" : quiz.scores_published_at ? `Posted ${timeAgo(quiz.scores_published_at)}` : "Publish Scores"}
                        </button>
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
                      ) : !quizAnalytics || quizAnalytics.questions.length === 0 ? (
                        <p className="text-sm font-accent font-bold text-ink/50">No submissions yet to analyse.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-xs font-accent font-bold uppercase text-ink/60 mb-1">
                            <span>{quizAnalytics.submission_count} submissions</span>
                            <span>Avg {quizAnalytics.avg_score.toFixed(1)} pts</span>
                            <span>{Math.round(quizAnalytics.completion_rate * 100)}% completion</span>
                          </div>
                          <p className="text-xs font-accent font-bold uppercase text-ink/50 mb-2 flex items-center gap-1">
                            <Shuffle size={12} /> Per-Question Accuracy
                          </p>
                          {quizAnalytics.questions.map((q, i) => {
                            const pct = Math.min(100, Math.round((q.accuracy ?? 0) * 100));
                            const barColor = pct >= 70 ? "bg-green" : pct >= 40 ? "bg-yellow" : "bg-coral";
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="w-6 text-xs font-accent font-bold shrink-0 text-right">Q{i + 1}</span>
                                <div className="flex-1 h-4 rounded-full bg-white overflow-hidden">
                                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-12 text-xs font-mono font-bold text-right shrink-0">{pct}%</span>
                                {q.top_wrong_answer && (
                                  <span className="text-xs text-ink/40 truncate max-w-[120px]" title={`Most wrong: ${q.top_wrong_answer}`}>
                                    {q.top_wrong_answer}
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

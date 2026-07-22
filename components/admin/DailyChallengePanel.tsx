"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Sparkles, Loader, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/Toast";
import type { QuizSettings } from "@/types/quiz";

interface DailyChallenge {
  id: string;
  title: string;
  status: string;
  settings?: QuizSettings;
}

// Ported from client/src/components/admin/DailyChallengePanel.jsx. Shared
// between /admin and /teacher. `/api/admin/daily-challenge` is Phase 3 work
// (AI generation calls Groq — see AGENTS-level note: keys not configured
// yet, wired up per the user's instruction to build this now regardless).
export function DailyChallengePanel() {
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [todayStr, setTodayStr] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/daily-challenge");
      const data = await res.json();
      setChallenges(data.challenges ?? []);
      setTodayStr(data.today ?? "");
    } catch {
      // leave challenges empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const todayChallenge = challenges.find((c) => c.settings?.daily_date === todayStr);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/daily-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish daily challenge");
      toast.success(`Daily challenge published! "${data.title}" (${data.questionCount} questions)`);
      setTopic("");
      setNotes("");
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish daily challenge");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="card-tactile bg-yellow p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-xl font-display mb-5">
        <CalendarDays size={22} /> Daily Challenge
      </h2>

      <div className={`rounded-[var(--radius-card-sm)] p-4 mb-5 ${todayChallenge ? "bg-green" : "bg-white"}`}>
        {loading ? (
          <p className="font-accent font-bold animate-pulse text-sm">Loading…</p>
        ) : todayChallenge ? (
          <div className="flex items-start gap-3">
            <CheckCircle size={22} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-accent font-bold text-sm uppercase">Today&apos;s challenge is live</p>
              <p className="font-accent font-bold text-base mt-0.5">{todayChallenge.title}</p>
              <p className="text-xs font-accent font-bold text-ink/60 mt-1">
                Status: <span className="uppercase">{todayChallenge.status}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="shrink-0 mt-0.5 text-coral" />
            <div>
              <p className="font-accent font-bold text-sm uppercase">No challenge published yet today</p>
              <p className="text-xs font-accent font-bold text-ink/50 mt-1">
                Users will see the most recent daily challenge until you publish one.
              </p>
            </div>
          </div>
        )}
      </div>

      {!todayChallenge && (
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="block font-accent font-bold text-sm uppercase mb-1">Topic *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-tactile"
              placeholder="e.g. JavaScript Closures, French Revolution, Human Anatomy"
              required
            />
          </div>
          <div>
            <label className="block font-accent font-bold text-sm uppercase mb-1">Context / Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-tactile h-20 resize-y text-sm"
              placeholder="Any specific subtopics, difficulty level, or context for the AI…"
            />
          </div>
          <p className="text-xs font-accent font-bold text-ink/60">
            AI will generate 5 questions. The quiz is immediately published as today&apos;s daily challenge.
          </p>
          <button
            type="submit"
            disabled={publishing || !topic.trim()}
            className="btn-tactile bg-ink text-white w-full justify-center text-sm disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Loader size={16} className="animate-spin" /> Generating &amp; Publishing…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate &amp; Publish Today&apos;s Challenge
              </>
            )}
          </button>
        </form>
      )}

      {challenges.length > 0 && (
        <div className="mt-5 pt-4 border-t-2 border-ink/10 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-accent font-bold uppercase text-ink/60">Recent Daily Challenges</p>
            <button onClick={fetchChallenges} title="Refresh" className="text-ink hover:opacity-70">
              <RefreshCw size={14} />
            </button>
          </div>
          {challenges.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between p-2 rounded-[var(--radius-btn)] text-xs font-accent font-bold ${
                c.settings?.daily_date === todayStr ? "bg-green" : "bg-white"
              }`}
            >
              <div>
                <span className="font-bold">{c.settings?.daily_date || "—"}</span>
                <span className="ml-2 text-ink/50">{c.settings?.daily_topic || c.title}</span>
              </div>
              <span className={`uppercase px-1.5 py-0.5 rounded-[var(--radius-chip)] font-bold text-[10px] ${c.status === "live" ? "bg-green" : "bg-cream"}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

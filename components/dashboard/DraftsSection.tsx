"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";

interface ServerDraft {
  quizId: string;
  quizTitle: string;
  submittedAt: string | null;
}

interface DraftItem extends ServerDraft {
  source?: "local";
}

// Ported from DashboardPage.jsx's drafts logic: server-side draft submissions
// merged with localStorage `quiz_progress_*` keys left by in-progress quiz
// attempts that were never submitted. The localStorage read only works
// client-side, so this piece can't be a Server Component like the rest of
// the dashboard.
export function DraftsSection({ serverDrafts }: { serverDrafts: ServerDraft[] }) {
  const [drafts, setDrafts] = useState<DraftItem[]>(serverDrafts);

  useEffect(() => {
    const serverIds = new Set(serverDrafts.map((d) => d.quizId));
    const lsDrafts: DraftItem[] = Object.keys(localStorage)
      .filter((k) => k.startsWith("quiz_progress_"))
      .map((k) => k.replace("quiz_progress_", ""))
      .filter((id) => !serverIds.has(id))
      .map((id) => ({ quizId: id, quizTitle: `Quiz #${id}`, submittedAt: null, source: "local" }));
    setDrafts([...serverDrafts, ...lsDrafts]);
    // serverDrafts is derived server-side per request; only re-run if its identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (drafts.length === 0) return null;

  return (
    <section className="card-tactile bg-yellow p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-xl font-display mb-4">
        <Zap size={20} /> Continue Draft
      </h2>
      <div className="space-y-3">
        {drafts.map((d) => (
          <div
            key={d.quizId}
            className="flex items-center justify-between bg-white rounded-[var(--radius-card-sm)] border-2 border-ink/10 p-4"
          >
            <div>
              <p className="font-accent font-bold">{d.quizTitle}</p>
              {d.submittedAt && (
                <p className="text-xs font-mono text-ink/50 mt-0.5">
                  Last saved {new Date(d.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <Link href={`/quiz/${d.quizId}`} className="btn-tactile bg-ink text-white text-sm py-2 px-4">
              Resume <ChevronRight size={16} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Download, Wifi, WifiOff, AlertTriangle, RefreshCw, Loader } from "lucide-react";

interface LogEvent {
  _id?: string | number;
  type?: string;
  timestamp?: string;
  username?: string;
  user?: string;
  detail?: string;
}

interface SummaryRowData {
  user_id?: string;
  username: string;
  tab_switches?: number;
  fullscreen_exits?: number;
  copy_attempts?: number;
  score?: number;
  submitted_at?: string;
}

const TYPE_COLORS: Record<string, string> = {
  tab_switch: "bg-yellow",
  fullscreen_exit: "bg-coral text-white",
  copy_attempt: "bg-purple text-white",
  submit: "bg-green",
  join: "bg-blue text-white",
};

function LogEntry({ event }: { event: LogEvent }) {
  const cls = TYPE_COLORS[event.type ?? ""] ?? "bg-white";
  return (
    <div className={`flex items-center gap-3 px-3 py-2 border-b border-white/10 text-sm font-accent font-bold ${cls}`}>
      <span className="font-mono text-xs shrink-0 opacity-70">
        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
      </span>
      <span className="font-bold uppercase text-xs shrink-0 px-1.5 py-0.5 rounded-[var(--radius-chip)] border border-current">
        {event.type?.replace(/_/g, " ")}
      </span>
      <span className="truncate">{event.username || event.user || "unknown"}</span>
      {event.detail && <span className="opacity-70 truncate text-xs">{event.detail}</span>}
    </div>
  );
}

function SummaryRow({ row, rank }: { row: SummaryRowData; rank: number }) {
  const isHighViolator = (row.tab_switches || 0) >= 3;
  return (
    <tr className={`border-b border-ink/5 last:border-b-0 ${isHighViolator ? "bg-coral/20" : rank % 2 === 0 ? "bg-cream" : "bg-white"}`}>
      <td className="p-3 font-accent font-bold">{row.username}</td>
      <td className={`p-3 text-center font-bold ${isHighViolator ? "text-coral" : ""}`}>
        {row.tab_switches || 0}
        {isHighViolator && <AlertTriangle size={14} className="inline ml-1 text-coral" />}
      </td>
      <td className="p-3 text-center font-accent font-bold">{row.fullscreen_exits || 0}</td>
      <td className="p-3 text-center font-accent font-bold">{row.copy_attempts || 0}</td>
      <td className="p-3 text-right font-mono font-bold">{row.score ?? "—"}</td>
      <td className="p-3 text-right text-xs font-mono text-ink/40">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "—"}</td>
    </tr>
  );
}

const MAX_LOG_ENTRIES = 100;

// Ported from client/src/pages/ProctorPage.jsx. `/api/proctor/*` are Phase 3
// work, not built yet. Unlike v1 (cross-origin, needed a `?token=` query
// workaround for EventSource), this app is same-origin so the Clerk session
// cookie rides along automatically — no token plumbing needed here.
export function ProctorClient({ quizId }: { quizId: string }) {
  const router = useRouter();

  const [quizTitle, setQuizTitle] = useState("");
  const [summary, setSummary] = useState<SummaryRowData[]>([]);
  const [logEntries, setLogEntries] = useState<LogEvent[]>([]);
  const [sseStatus, setSseStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const fetchTitle = async () => {
      try {
        const res = await fetch("/api/leaderboard/quizzes");
        const quizzes = await res.json();
        const match = (Array.isArray(quizzes) ? quizzes : []).find((q: { id: string }) => String(q.id) === String(quizId));
        setQuizTitle(match?.title || `Quiz #${quizId}`);
      } catch {
        setQuizTitle(`Quiz #${quizId}`);
      }
    };
    fetchTitle();
  }, [quizId]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/proctor/${quizId}/summary`);
      if (res.status === 403) {
        setError("You do not have access to the proctor dashboard.");
        return;
      }
      const data = await res.json();
      const rows: SummaryRowData[] = Array.isArray(data) ? data : (data.summary ?? []);
      rows.sort((a, b) => (b.tab_switches || 0) - (a.tab_switches || 0));
      setSummary(rows);
    } catch {
      // keep prior summary on transient failure
    } finally {
      setSummaryLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`/api/proctor/${quizId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setSseStatus("connected");

    es.onmessage = (e) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        setLogEntries((prev) => [{ ...data, _id: Date.now() + Math.random() }, ...prev].slice(0, MAX_LOG_ENTRIES));
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setSseStatus("reconnecting");
      es.close();
      reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
    };
  }, [quizId]);

  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectSSE]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollTop = 0;
  }, [logEntries.length]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card-tactile bg-coral text-white max-w-md w-full text-center p-8">
          <Shield size={48} className="mx-auto mb-3" />
          <h1 className="text-2xl font-display">{error}</h1>
          <button onClick={() => router.back()} className="btn-tactile bg-white text-ink mt-4">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const highViolators = summary.filter((r) => (r.tab_switches || 0) >= 3).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl sm:text-4xl font-display">
            <Shield size={32} className="text-purple" /> Proctor Dashboard
          </h1>
          <p className="text-lg font-accent font-bold text-ink/60 mt-1">{quizTitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {sseStatus === "connected" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] font-accent font-bold text-sm bg-green">
              <Wifi size={16} /> Live
            </div>
          )}
          {sseStatus === "connecting" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] font-accent font-bold text-sm bg-ink/10 text-ink/60">
              <Loader size={16} className="animate-spin" /> Connecting…
            </div>
          )}
          {sseStatus === "reconnecting" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] font-accent font-bold text-sm bg-yellow">
              <WifiOff size={16} /> Reconnecting…
            </div>
          )}

          <a href={`/api/admin/quizzes/${quizId}/integrity`} className="btn-tactile bg-ink text-white text-sm" download>
            <Download size={16} /> Integrity CSV
          </a>

          <button onClick={fetchSummary} className="btn-tactile bg-blue text-white p-2.5" title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-tactile text-center py-4">
          <p className="text-3xl font-display">{summary.length}</p>
          <p className="text-xs font-accent font-bold uppercase text-ink/50 mt-1">Participants</p>
        </div>
        <div className="card-tactile bg-coral text-white text-center py-4">
          <p className="text-3xl font-display">{highViolators}</p>
          <p className="text-xs font-accent font-bold uppercase mt-1">High Violators</p>
        </div>
        <div className="card-tactile bg-yellow text-center py-4">
          <p className="text-3xl font-display">{summary.reduce((s, r) => s + (r.tab_switches || 0), 0)}</p>
          <p className="text-xs font-accent font-bold uppercase text-ink/50 mt-1">Tab Switches</p>
        </div>
        <div className="card-tactile bg-blue text-white text-center py-4">
          <p className="text-3xl font-display">{logEntries.length}</p>
          <p className="text-xs font-accent font-bold uppercase mt-1">Live Events</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-tactile bg-ink text-white p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-lg font-display">
              <span
                className={`w-3 h-3 rounded-full ${
                  sseStatus === "connected" ? "bg-green animate-pulse" : sseStatus === "connecting" ? "bg-white/30 animate-pulse" : "bg-yellow"
                }`}
              />
              Live Events
            </h2>
            <span className="text-xs font-mono opacity-50">
              {logEntries.length}/{MAX_LOG_ENTRIES}
            </span>
          </div>
          <div ref={logEndRef} className="flex-1 overflow-y-auto max-h-96 rounded-[var(--radius-card-sm)] border border-white/15" style={{ minHeight: "200px" }}>
            {logEntries.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm font-accent font-bold opacity-50">Waiting for events…</div>
            ) : (
              logEntries.map((ev, i) => <LogEntry key={ev._id || i} event={ev} />)
            )}
          </div>
        </section>

        <section className="card-tactile p-6">
          <h2 className="flex items-center gap-2 text-lg font-display mb-3">
            <AlertTriangle size={18} className="text-coral" /> Integrity Summary
            {highViolators > 0 && (
              <span className="ml-auto text-xs font-accent font-bold bg-coral text-white px-2 py-0.5 rounded-[var(--radius-chip)]">
                {highViolators} flagged
              </span>
            )}
          </h2>

          {summaryLoading ? (
            <div className="text-center py-8 font-accent font-bold animate-pulse">Loading…</div>
          ) : summary.length === 0 ? (
            <div className="text-center py-8 text-sm font-accent font-bold text-ink/40 rounded-[var(--radius-card-sm)] border-2 border-dashed border-ink/15">
              No submissions yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-ink text-white text-left">
                    <th className="p-3 font-accent font-bold text-xs uppercase">User</th>
                    <th className="p-3 font-accent font-bold text-xs uppercase text-center" title="Tab Switches">
                      Tabs
                    </th>
                    <th className="p-3 font-accent font-bold text-xs uppercase text-center" title="Fullscreen Exits">
                      FS
                    </th>
                    <th className="p-3 font-accent font-bold text-xs uppercase text-center" title="Copy Attempts">
                      Copy
                    </th>
                    <th className="p-3 font-accent font-bold text-xs uppercase text-right">Score</th>
                    <th className="p-3 font-accent font-bold text-xs uppercase text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, i) => (
                    <SummaryRow key={row.user_id || row.username || i} row={row} rank={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="card-tactile bg-yellow p-4 text-sm font-accent font-bold">
        <p className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-coral" />
          Rows highlighted in red have 3+ tab switches and should be reviewed. Tabs = tab switches, FS = fullscreen exits, Copy = copy attempts.
        </p>
      </div>
    </div>
  );
}

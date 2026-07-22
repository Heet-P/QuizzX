"use client";

import { useEffect, useRef, useState } from "react";

// Replaces v1's Socket.IO-based useQuizSocket.js (see MIGRATION_AUDIT.md
// Section 7 / MEMORY.md Section 5.1). Important difference from Socket.IO's
// `leaderboard:update` event: v1's SSE broadcast (utils/leaderboardBroadcast.js,
// pinged from SubmissionController on every submit) only ever sent a
// lightweight `{type:'new_submission', quizId, score}` ping — never the full
// rankings array. So this hook doesn't carry row data itself; it just signals
// "something changed" via `lastUpdateAt`, and the consuming page re-runs its
// existing REST `GET /api/leaderboard` fetch when that changes. This also
// means (unlike v1) there's no "only individual+global mode gets live data"
// caveat — any filter combination can refetch on the same signal, since the
// REST endpoint already applies the real mode/scope filtering server-side.
//
// Also unlike v1 (separate Vite frontend + Express backend, needed a
// `?token=`-in-query workaround because EventSource can't set an Authorization
// header), this app is same-origin — Clerk's session cookie rides along with
// the EventSource request automatically, no token plumbing needed.
export function useLeaderboardStream(quizId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (esRef.current) esRef.current.close();
      const es = new EventSource(`/api/leaderboard/stream?quizId=${quizId}`);
      esRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setSocketError(null);
      };

      es.onmessage = () => {
        setLastUpdateAt(Date.now());
      };

      es.onerror = () => {
        setIsConnected(false);
        setSocketError("Connection lost");
        es.close();
        if (!cancelled) reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      clearTimeout(reconnectTimeout);
    };
  }, [quizId]);

  return { isConnected, socketError, lastUpdateAt };
}

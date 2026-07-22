import "server-only";

// Ported from server/src/utils/leaderboardBroadcast.js's in-process fallback
// path (the Redis pub/sub half isn't ported — Redis isn't provisioned yet,
// see MEMORY.md Section 9/15). An in-memory Map only fans out correctly
// within a single long-lived Node process; on a multi-instance/serverless
// deployment, a submission handled by one instance won't reach an SSE
// connection held open by another. Fine for single-instance hosting; revisit
// with Redis pub/sub (utils/leaderboardBroadcast.js's `init`) if/when this
// app runs as more than one instance.

type Listener = (payload: unknown) => void;

const listenersByQuiz = new Map<string, Set<Listener>>();

export function subscribeToLeaderboard(quizId: string, listener: Listener): () => void {
  if (!listenersByQuiz.has(quizId)) listenersByQuiz.set(quizId, new Set());
  const set = listenersByQuiz.get(quizId)!;
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listenersByQuiz.delete(quizId);
  };
}

export function broadcastLeaderboardUpdate(quizId: string, payload: unknown): void {
  const set = listenersByQuiz.get(quizId);
  if (!set || set.size === 0) return;
  for (const listener of set) listener(payload);
}

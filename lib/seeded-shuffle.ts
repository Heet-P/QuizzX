import "server-only";

// Ported verbatim from server/src/controllers/QuizController.js's
// `seededShuffle` — a deterministic per-(quiz,user) Fisher-Yates shuffle
// (linear congruential generator, same seed always produces the same order).
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const r = [...arr];
  let s = seed;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Same per-(quizId,userId) seed formula v1 used to drive seededShuffle. */
export function questionSeed(quizId: string, userId: string): number {
  const quizSum = quizId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const userSum = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return quizSum * 31 + userSum;
}

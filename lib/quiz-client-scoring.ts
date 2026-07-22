// Client-safe (no "server-only") practice-mode instant-feedback checks.
// Deliberately NOT the same module as lib/answer-matching.ts (server-only,
// used for real grading) — practice mode is explicitly low-stakes (no score
// at risk, MIGRATION_AUDIT.md Section 9's still-open question about whether
// practice should share the server's matching logic is left unresolved here
// too, same as the pre-existing mcq_single exact-match check this mirrors).
// Duplicating a few tiny comparisons client-side is a deliberate, bounded
// tradeoff, not an oversight.

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mcqMultiIsFullyCorrect(selected: string[], correctAnswers: string[]): boolean {
  if (selected.length !== correctAnswers.length) return false;
  const a = new Set(selected.map(normalize));
  const b = new Set(correctAnswers.map(normalize));
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function fillBlankIsCorrect(submitted: string, correctAnswer: string): boolean {
  return !!submitted && normalize(submitted) === normalize(correctAnswer);
}

export function matchColumnsIsFullyCorrect(submitted: Record<string, string>, pairs: { left: string; right: string }[]): boolean {
  return pairs.every((p) => submitted[p.left] !== undefined && normalize(submitted[p.left]) === normalize(p.right));
}

import "server-only";

// Ported from server/src/utils/mapAnswerLetter.js plus the normalize/letterOf
// closures that were redefined per-controller in v1 (SubmissionController,
// RoomController, AdminService) — MIGRATION_AUDIT.md Section 9 flags this
// exact duplication as a consolidation candidate. One copy here, used by
// every route that grades or maps answers (submissions, rooms, admin
// analytics, AI-generated quiz answer remapping).

/**
 * Resolve an answer letter (A/B/C/D) to the matching option string.
 * Strategy 1: option starts with an "A)" style prefix.
 * Strategy 2: positional index (A=0, B=1, C=2, D=3).
 */
export function mapAnswerLetter(letter: string | null | undefined, options: string[]): string | null {
  if (!letter || !Array.isArray(options) || options.length === 0) return null;
  const l = letter.trim()[0]?.toUpperCase();
  if (!l || !/^[A-Z]$/.test(l)) return null;

  const prefixed = options.find((opt) => {
    const m = opt.match(/^([A-Za-z])\)/);
    return m && m[1].toUpperCase() === l;
  });
  if (prefixed) return prefixed;

  const idx = l.charCodeAt(0) - 65;
  return options[idx] || null;
}

/** Strips a leading "A) "-style prefix, trims, lowercases — for loose comparison. */
export function normalizeAnswer(s: string | null | undefined): string {
  return (s ?? "").replace(/^[A-Za-z]\)\s*/, "").trim().toLowerCase();
}

/** Extracts the leading letter from an "A) ..." style option, or null. */
export function letterOf(s: string | null | undefined): string | null {
  const m = (s ?? "").match(/^([A-Za-z])\)/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * True if `submitted` counts as correct against `correctAnswer` for the given
 * `options` list. Mirrors SubmissionController.submitQuiz's grading exactly:
 * exact match, normalized match, letter match, or bare-letter-vs-resolved-option match.
 */
export function isAnswerMatch(submitted: string | null | undefined, correctAnswer: string, options: string[]): boolean {
  if (!submitted || !correctAnswer) return false;
  const resolvedAnswer = mapAnswerLetter(correctAnswer, options) || correctAnswer;
  const sl = letterOf(submitted);
  const al = letterOf(resolvedAnswer);
  return (
    submitted === resolvedAnswer ||
    normalizeAnswer(submitted) === normalizeAnswer(resolvedAnswer) ||
    (sl !== null && al !== null && sl === al) ||
    (sl !== null && al === null && sl === resolvedAnswer.toUpperCase())
  );
}

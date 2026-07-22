import "server-only";
import { questionType, type QuizQuestion, type QuestionAnswer, type MatchPair } from "@/types/quiz";

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

// ── Multi-type grading (added 2026-07-23 for AI-classified question types) ──
// Each function returns a 0..1 fraction of `pointsPerCorrect` earned for one
// question, so the grading route (app/api/submissions/route.ts) can treat
// every question type uniformly: `score += fraction * pointsPerCorrect`.
// Grading rules are explicit user decisions (2026-07-23), not guesses:
// - mcq_multi: partial credit per option (+1/N correct selected, -1/N per
//   incorrect selected, N = number of correct answers), floored at 0.
// - match_columns: partial credit per pair (correct pairs / total pairs).
// - fill_blank: exact match only, case/whitespace-insensitive — no fuzzy/AI
//   grading, so it's just a boolean via isFillBlankMatch below.

/** Case/whitespace-insensitive exact match for fill-in-the-blank answers. */
export function isFillBlankMatch(submitted: string | null | undefined, correctAnswer: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return !!submitted && norm(submitted) === norm(correctAnswer);
}

/** Partial credit for a multi-correct MCQ: (correct selected - incorrect selected) / total correct, floored at 0. */
export function scoreMcqMulti(submitted: string[] | null | undefined, correctAnswers: string[]): number {
  if (!submitted || submitted.length === 0 || correctAnswers.length === 0) return 0;
  const correctSet = new Set(correctAnswers.map((a) => normalizeAnswer(a)));
  let correctSelected = 0;
  let incorrectSelected = 0;
  for (const s of submitted) {
    if (correctSet.has(normalizeAnswer(s))) correctSelected++;
    else incorrectSelected++;
  }
  return Math.max(0, (correctSelected - incorrectSelected) / correctAnswers.length);
}

/** Partial credit for match-the-columns: fraction of pairs the student matched correctly. */
export function scoreMatchColumns(submitted: Record<string, string> | null | undefined, correctPairs: MatchPair[]): number {
  if (!submitted || correctPairs.length === 0) return 0;
  let correct = 0;
  for (const pair of correctPairs) {
    if (submitted[pair.left] !== undefined && normalizeAnswer(submitted[pair.left]) === normalizeAnswer(pair.right)) {
      correct++;
    }
  }
  return correct / correctPairs.length;
}

/**
 * Unified entry point: grades one question against its submitted answer,
 * returning a 0..1 fraction regardless of question type. Missing/legacy
 * `type` is treated as "mcq_single" via {@link questionType}.
 */
export function scoreQuestion(question: QuizQuestion, submitted: QuestionAnswer | null | undefined): number {
  switch (questionType(question)) {
    case "mcq_single": {
      const q = question as Extract<QuizQuestion, { answer: string; options: string[] }>;
      return isAnswerMatch(typeof submitted === "string" ? submitted : null, q.answer, q.options) ? 1 : 0;
    }
    case "mcq_multi": {
      const q = question as Extract<QuizQuestion, { answers: string[] }>;
      return scoreMcqMulti(Array.isArray(submitted) ? submitted : null, q.answers);
    }
    case "fill_blank": {
      const q = question as Extract<QuizQuestion, { answer: string; type: "fill_blank" }>;
      return isFillBlankMatch(typeof submitted === "string" ? submitted : null, q.answer) ? 1 : 0;
    }
    case "match_columns": {
      const q = question as Extract<QuizQuestion, { pairs: MatchPair[] }>;
      return scoreMatchColumns(submitted && typeof submitted === "object" && !Array.isArray(submitted) ? submitted : null, q.pairs);
    }
    default:
      return 0;
  }
}

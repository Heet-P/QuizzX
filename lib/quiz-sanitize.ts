import "server-only";
import { seededShuffle } from "./seeded-shuffle";
import {
  questionType,
  type QuizQuestion,
  type SanitizedQuizQuestion,
  type McqSingleQuestion,
  type McqMultiQuestion,
  type FillBlankQuestion,
  type MatchColumnsQuestion,
  type McqSingleSanitized,
  type McqMultiSanitized,
  type MatchColumnsSanitized,
} from "@/types/quiz";

// Strips the answer key from a question before it's sent to a quiz-taking
// client — type-aware since each of the 4 question types stores its answer
// key differently (added 2026-07-23 alongside multi-type question support).
// `match_columns` needs the most care: the correct left→right mapping itself
// *is* the answer key, so the non-practice shape replaces it with two
// separate item lists rather than ever serializing `pairs` as-is.
//
// `revealAnswers` (practice mode: timer==='none' && tabSwitch==='disabled')
// keeps the answer key in the response for instant feedback — same output
// *shape* either way (options / leftItems+rightItems), just with the answer
// field(s) populated or omitted, so the client-side rendering code doesn't
// need two different branches for practice vs. graded mode.
export function sanitizeQuestion(q: QuizQuestion, revealAnswers = false): SanitizedQuizQuestion {
  switch (questionType(q)) {
    case "mcq_single": {
      const { answer, ...rest } = q as McqSingleQuestion;
      return { ...rest, ...(revealAnswers ? { answer } : {}) };
    }
    case "mcq_multi": {
      const { answers, ...rest } = q as McqMultiQuestion;
      return { ...rest, ...(revealAnswers ? { answers } : {}) };
    }
    case "fill_blank": {
      const { answer, ...rest } = q as FillBlankQuestion;
      return { ...rest, ...(revealAnswers ? { answer } : {}) };
    }
    case "match_columns": {
      const { pairs, ...rest } = q as MatchColumnsQuestion;
      return {
        ...rest,
        leftItems: pairs.map((p) => p.left),
        rightItems: pairs.map((p) => p.right),
        ...(revealAnswers ? { pairs } : {}),
      };
    }
  }
}

/**
 * Applies the seeded per-(quiz,user) shuffle to whatever "choice list" a
 * *sanitized* question actually has — mcq options, or match-columns' right
 * column (left column stays in a fixed reading order; only which right item
 * lines up with which left item on screen gets shuffled). No-op for
 * fill-blank, which has nothing to shuffle. Always call this after
 * `sanitizeQuestion`, never before — it only recognizes the sanitized shape.
 *
 * @deprecated for match_columns — shuffling the right column is no longer
 * optional (see {@link shuffleMatchColumnsRight}); this combined function is
 * kept only for mcq option shuffling, gated by the quiz's `shuffleOptions`
 * setting at the call site.
 */
export function shuffleSanitizedQuestion(q: SanitizedQuizQuestion, seed: number): SanitizedQuizQuestion {
  if ("options" in q && Array.isArray(q.options)) {
    return { ...q, options: seededShuffle(q.options, seed) } as McqSingleSanitized | McqMultiSanitized;
  }
  if ("rightItems" in q && Array.isArray(q.rightItems)) {
    return { ...q, rightItems: seededShuffle(q.rightItems, seed) } as MatchColumnsSanitized;
  }
  return q;
}

/**
 * Shuffles only mcq `options` — a no-op for every other question type.
 * Callers gate this on the quiz's `shuffleOptions` setting.
 */
export function shuffleMcqOptions(q: SanitizedQuizQuestion, seed: number): SanitizedQuizQuestion {
  if ("options" in q && Array.isArray(q.options)) {
    return { ...q, options: seededShuffle(q.options, seed) } as McqSingleSanitized | McqMultiSanitized;
  }
  return q;
}

/**
 * Always shuffles match-columns' right column — unlike mcq option order,
 * this is never optional. `sanitizeQuestion` builds `leftItems`/`rightItems`
 * from the same `pairs` array in the same order, so left[i] correctly pairs
 * with right[i] by construction — left unshuffled, the correct answer is
 * literally "match by position," trivially guessable regardless of the
 * quiz's `shuffleOptions` setting (added 2026-07-23, real bug found in
 * testing). A no-op for every other question type.
 */
export function shuffleMatchColumnsRight(q: SanitizedQuizQuestion, seed: number): SanitizedQuizQuestion {
  if ("rightItems" in q && Array.isArray(q.rightItems)) {
    return { ...q, rightItems: seededShuffle(q.rightItems, seed) } as MatchColumnsSanitized;
  }
  return q;
}

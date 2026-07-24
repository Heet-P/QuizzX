// Canonical quiz settings shape, consolidated from what was previously duplicated
// across AdminController.uploadQuiz (server defaults + legacy `mode` translation)
// and QuizPage's `s` useMemo (client defaults + legacy `mode` translation) in the
// pre-migration app. Both sides now share this one definition.

export type QuizTimerMode = "global" | "per_question" | "none";
export type QuizVisibility = "single" | "all";
export type QuizNavigation = "free" | "forward_only" | "sequential_locked";
export type QuizAnswerLock = "changeable" | "lock_on_select" | "lock_on_next";
export type QuizTabSwitchPolicy = "auto_submit" | "three_strikes" | "disabled";
export type QuizMode = "individual" | "team";

// Legacy shape used by quizzes created before the settings schema had explicit
// timer/visibility/navigation fields. Only ever present on old data.
export type LegacyQuizMode = "timed_full" | "timed_per_question" | "practice";

export interface QuizSettings {
  timer: QuizTimerMode;
  duration: number; // minutes, used when timer === 'global'
  secondsPerQuestion: number; // used when timer === 'per_question'
  visibility: QuizVisibility;
  navigation: QuizNavigation;
  answerLock: QuizAnswerLock;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  pointsPerCorrect: number;
  negativeMarking: number;
  tabSwitch: QuizTabSwitchPolicy;
  copyProtection: boolean;
  quiz_mode: QuizMode;
  max_team_size: number;
  startAt: string | null;
  endAt: string | null;
  accessCode: string | null; // bcrypt hash once stored; legacy plain-text still supported when verifying
  poolSize: number | null;
  showCount: number | null;
  featured?: boolean;
  is_daily?: boolean;
  daily_date?: string;
  daily_topic?: string;
  /** @deprecated legacy field, only read via {@link normalizeQuizSettings} */
  mode?: LegacyQuizMode;
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  timer: "global",
  duration: 60,
  secondsPerQuestion: 30,
  visibility: "single",
  navigation: "free",
  answerLock: "changeable",
  shuffleQuestions: false,
  shuffleOptions: false,
  pointsPerCorrect: 1,
  negativeMarking: 0,
  tabSwitch: "auto_submit",
  copyProtection: true,
  quiz_mode: "individual",
  max_team_size: 4,
  startAt: null,
  endAt: null,
  accessCode: null,
  poolSize: null,
  showCount: null,
};

/**
 * Applies field-level defaults and translates the legacy `mode` field
 * (timed_full | timed_per_question | practice) into explicit settings.
 * Single source of truth used by both the quiz upload path and the
 * quiz-taking path so the two can never drift out of sync again.
 */
export function normalizeQuizSettings(
  raw: Partial<QuizSettings> | null | undefined
): QuizSettings {
  const merged: QuizSettings = { ...DEFAULT_QUIZ_SETTINGS, ...(raw ?? {}) };

  if (raw?.mode && !raw.timer) {
    switch (raw.mode) {
      case "timed_full":
        return {
          ...merged,
          timer: "global",
          visibility: "all",
          navigation: "free",
          answerLock: "changeable",
          tabSwitch: "auto_submit",
          copyProtection: true,
          shuffleQuestions: false,
          shuffleOptions: false,
          pointsPerCorrect: 1,
          negativeMarking: 0,
        };
      case "timed_per_question":
        return {
          ...merged,
          timer: "per_question",
          visibility: "single",
          navigation: "forward_only",
          answerLock: "changeable",
          tabSwitch: "auto_submit",
          copyProtection: true,
          shuffleQuestions: false,
          shuffleOptions: false,
          pointsPerCorrect: 1,
          negativeMarking: 0,
        };
      case "practice":
        return {
          ...merged,
          timer: "none",
          visibility: "all",
          navigation: "free",
          answerLock: "changeable",
          tabSwitch: "disabled",
          copyProtection: false,
          shuffleQuestions: false,
          shuffleOptions: false,
          pointsPerCorrect: 1,
          negativeMarking: 0,
        };
    }
  }

  return merged;
}

/** True when a quiz should reveal answers/explanations client-side for instant feedback. */
export function isPracticeMode(settings: QuizSettings): boolean {
  return settings.timer === "none" && settings.tabSwitch === "disabled";
}

// ── Question types ──────────────────────────────────────────────────────────
// v1 only ever had one shape (single-correct MCQ). Extended 2026-07-23 per
// explicit user request: AI-assisted quiz-document parsing that classifies
// each question into one of four types and extracts type-appropriate answers.
// `type` is optional on McqSingleQuestion specifically so that every quiz
// created before this existed (no `type` field in stored JSON at all) keeps
// working without a data migration — treat a missing `type` as "mcq_single"
// everywhere via `questionType()` below, never assume `q.type` is set.

export type QuestionType = "mcq_single" | "mcq_multi" | "fill_blank" | "match_columns" | "ordering";

interface QuestionCommon {
  text: string;
  code?: string | null;
  prompt?: string | null;
  explanation?: string | null;
  topic?: string | null;
}

export interface McqSingleQuestion extends QuestionCommon {
  type?: "mcq_single";
  options: string[];
  answer: string;
}

export interface McqMultiQuestion extends QuestionCommon {
  type: "mcq_multi";
  options: string[];
  /** All options that are correct — grading gives partial credit per selection (Section: user decision 2026-07-23). */
  answers: string[];
}

export interface FillBlankQuestion extends QuestionCommon {
  type: "fill_blank";
  /** Graded via case/whitespace-insensitive exact match (user decision 2026-07-23) — no fuzzy/AI grading. */
  answer: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface MatchColumnsQuestion extends QuestionCommon {
  type: "match_columns";
  /** Canonical correct left→right pairs. Never sent to the client as-is — see MatchColumnsSanitized. */
  pairs: MatchPair[];
}

export interface OrderingQuestion extends QuestionCommon {
  type: "ordering";
  /** Canonical correct order, first-to-last. */
  items: string[];
}

export type QuizQuestion = McqSingleQuestion | McqMultiQuestion | FillBlankQuestion | MatchColumnsQuestion | OrderingQuestion;

/**
 * Reads a question's type, defaulting missing/legacy data to "mcq_single".
 * Accepts any question-shaped object with an optional `type` — both the raw
 * `QuizQuestion` union and the sanitized/client-facing shapes share this
 * field, so one function works for both without a second overload.
 */
export function questionType(q: { type?: QuestionType }): QuestionType {
  return q.type ?? "mcq_single";
}

// ── Sanitized (answer-key-stripped) shapes served to the quiz-taking client ──

export type McqSingleSanitized = Omit<McqSingleQuestion, "answer"> & { answer?: string };
export type McqMultiSanitized = Omit<McqMultiQuestion, "answers"> & { answers?: string[] };
export type FillBlankSanitized = Omit<FillBlankQuestion, "answer"> & { answer?: string };
/**
 * `pairs` (the answer key) is replaced with two separately-shuffle-able
 * lists — never sent as the original mapping. `pairs` is still allowed here
 * as an *optional* field purely for practice mode (see sanitizeQuestion's
 * `revealAnswers` flag), where the answer key is deliberately included
 * alongside the display lists for instant feedback.
 */
export type MatchColumnsSanitized = Omit<MatchColumnsQuestion, "pairs"> & {
  leftItems: string[];
  rightItems: string[];
  pairs?: MatchPair[];
};

/**
 * `items` here means the shuffled display list, NOT the canonical order
 * `OrderingQuestion.items` documents — parallels `options` on mcq_single
 * (unlike match_columns' `pairs`, the field name is safe to reuse for
 * display since `correctOrder` is what carries the answer key).
 */
export type OrderingSanitized = Omit<OrderingQuestion, "items"> & {
  /** Shuffled display order — never the canonical correct order. */
  items: string[];
  /** Present only when revealAnswers (practice mode) — the canonical correct order. */
  correctOrder?: string[];
};

export type SanitizedQuizQuestion = McqSingleSanitized | McqMultiSanitized | FillBlankSanitized | MatchColumnsSanitized | OrderingSanitized;

// ── Per-question submitted-answer shapes ────────────────────────────────────
// Keyed by question index in the submission's `answers` JSON blob, same as v1.
export type McqSingleAnswer = string;
export type McqMultiAnswer = string[];
export type FillBlankAnswer = string;
/** Keyed by left-item text (the stable side) -> the right-item text the student paired it with. */
export type MatchColumnsAnswer = Record<string, string>;

/** The student's arranged order, by item text. */
export type OrderingAnswer = string[];

export type QuestionAnswer = McqSingleAnswer | McqMultiAnswer | FillBlankAnswer | MatchColumnsAnswer | OrderingAnswer;

export type QuizStatus = "draft" | "live" | "archived";

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  settings: QuizSettings;
  is_active: boolean;
  status: QuizStatus;
  started_at: string | null;
  ended_at: string | null;
  creator_id: string | null;
  created_at: string;
}

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

export interface QuizQuestion {
  text: string;
  code?: string | null;
  prompt?: string | null;
  options: string[];
  answer: string;
  explanation?: string | null;
  topic?: string | null;
}

/** Question shape as served to the quiz-taking client — answer stripped unless practice mode. */
export type SanitizedQuizQuestion = Omit<QuizQuestion, "answer"> & {
  answer?: string;
};

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

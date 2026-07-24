# Question-Type Variety: True/False + Ordering — Design

**Date:** 2026-07-24
**Trigger:** Competitor analysis flagged question-type breadth as the widest feature gap (QuizzX: 4 types vs. Wayground 15-18+, Moodle 17, Kahoot ~8).
**Status:** Approved, ready for implementation plan.

## Scope

Two additions, chosen for fitting the existing extensible per-type pattern cleanly and being realistically extractable by the existing AI creation paths:

1. **True/False** — not a new `QuestionType`. `mcq_single` already scores any 2-option question correctly. This is a presentation + AI-prompt change only.
2. **Ordering/Sequence** — one new `QuestionType: "ordering"`. Student arranges a shuffled list of items into the correct order (chronological events, process steps, algorithm steps).

**Explicitly out of scope, and why:**
- **Poll/opinion (no correct answer)** — breaks the core model (leaderboard, XP, analytics all assume a right answer exists).
- **Image-based/hotspot** — needs new asset-storage infrastructure that doesn't exist anywhere in this app (`Quiz.questions` is plain JSON; no file/blob storage anywhere in the schema).
- **Open-ended/free-response (manually graded)** — needs a "pending grading" submission state and a teacher grading UI; a separate project, not one more question type.
- **Category/group-sort (many-to-one)** — the natural next type after Ordering (close cousin of `match_columns`), but not requested — not building speculatively.
- Mentimeter's "23 slide types" isn't a fair comparison (mostly non-scored presentation content for an audience-engagement tool, not a quiz platform); the realistic peer is Kahoot's ~8, which True/False + Ordering reaches.

## Non-Negotiable Constraint: No Regression to Existing Scoring/Evaluation

Every file this touches already has working, correct logic for the 4 existing types (`mcq_single`, `mcq_multi`, `fill_blank`, `match_columns`), including a previously-fixed real scoring bug (`mapAnswerLetter`, see `lib/answer-matching.ts`'s header comment) and a previously-fixed real shuffle bug (`shuffleMatchColumnsRight`, see below). This work must be **purely additive**:

- `scoreQuestion`'s existing 4 `switch` cases in `lib/answer-matching.ts` — byte-for-byte unchanged. Only a new `"ordering"` case is added.
- `sanitizeQuestion`'s existing 4 cases in `lib/quiz-sanitize.ts` — byte-for-byte unchanged. Only a new `"ordering"` case is added.
- `QuestionCard`'s existing 4 type branches and `*Body` components — byte-for-byte unchanged. Only a new `type === "ordering"` branch and `OrderingBody` are added.
- `lib/quiz-client-scoring.ts`'s existing 3 functions — byte-for-byte unchanged. Only a new `orderingIsFullyCorrect` is added.
- `ai-quiz-parser.ts` / `generateQuestions`'s existing type-handling — byte-for-byte unchanged except for the new `ordering` case and (for `generateQuestions` only) the True/False prompt extension.
- The implementation plan's tasks and its task reviewer must treat "did this touch any existing case body" as a first-class check, not just "does the new case work."
- This repo has no test framework — regression safety is verified by manually exercising one quiz of each of the 4 existing types (already-created quizzes exist in the database from prior sessions) after the change and confirming identical scores to before, plus confirming the diff for `answer-matching.ts`/`quiz-sanitize.ts`/`quiz-client-scoring.ts` contains only additions (new functions/cases), no modified lines within existing case bodies.

## The Ordering Shuffle Trap (learn from `match_columns`' fixed bug)

`shuffleMatchColumnsRight`'s doc comment in `lib/quiz-sanitize.ts` describes a real bug: leaving the right column in the same order as the left column made "match by position" trivially correct, regardless of the quiz's `shuffleOptions` setting. The same trap exists for Ordering: if the displayed item list is ever left in canonical correct-order, the question is free — the student submits back exactly what they see. This must **not** be optional or gated by `shuffleOptions` (which only governs *MCQ* option order, per its own name).

Design: `sanitizeQuestion`'s new `ordering` case returns `items` in canonical order (matching the existing per-type contract — canonical order in, `revealAnswers` governs `correctOrder`). A new **mandatory** `shuffleOrderingItems(q, seed)` function (parallel to `shuffleMatchColumnsRight`, not to the optional `shuffleMcqOptions`) is added to `lib/quiz-sanitize.ts` and called unconditionally at both places a quiz is sanitized for a client:
- `app/api/quizzes/[id]/route.ts:55` (right after the existing unconditional `shuffleMatchColumnsRight` call)
- `app/api/rooms/[code]/route.ts:34` (wraps the existing `shuffleMatchColumnsRight(sanitizeQuestion(q), roomSeed + i + 1)` call chain)

`app/api/quizzes/[id]/review/route.ts` needs no change — it calls `sanitizeQuestion(q, true)` only, no shuffling, since it's a post-submission review of already-graded answers (same as `match_columns` today).

## Data Model (`types/quiz.ts`)

```ts
export type QuestionType = "mcq_single" | "mcq_multi" | "fill_blank" | "match_columns" | "ordering";

export interface OrderingQuestion extends QuestionCommon {
  type: "ordering";
  /** Canonical correct order, first-to-last. */
  items: string[];
}

export type QuizQuestion = McqSingleQuestion | McqMultiQuestion | FillBlankQuestion | MatchColumnsQuestion | OrderingQuestion;

/**
 * `items` here means the shuffled display list, NOT the canonical order
 * `OrderingQuestion.items` documents — parallels `options` on mcq_single
 * (unlike match_columns' `pairs`, the field name is safe to reuse for
 * display since `correctOrder` is what carries the answer key).
 */
export type OrderingSanitized = Omit<OrderingQuestion, "items"> & {
  /** Shuffled display order — never the canonical correct order (see "The Ordering Shuffle Trap" below). */
  items: string[];
  /** Present only when revealAnswers (practice mode) — the canonical correct order. */
  correctOrder?: string[];
};

export type SanitizedQuizQuestion = McqSingleSanitized | McqMultiSanitized | FillBlankSanitized | MatchColumnsSanitized | OrderingSanitized;

// Per-question submitted-answer shape: the student's arranged order, by item text (items are unique strings, so value-based tracking needs no index alignment with the original unshuffled order).
export type OrderingAnswer = string[];

export type QuestionAnswer = McqSingleAnswer | McqMultiAnswer | FillBlankAnswer | MatchColumnsAnswer | OrderingAnswer;
```

Note `OrderingSanitized` deliberately does NOT `Omit<..., "items">` the way `MatchColumnsSanitized` omits `pairs` — the answer key here is *order*, not *identity*, and `correctOrder` (optional, present only when `revealAnswers`) carries the order. `items` is always present as the (unconditionally shuffled, see above) display list.

## Scoring (`lib/answer-matching.ts`)

```ts
/** Partial credit for ordering: fraction of items in their correct position. */
export function scoreOrdering(submitted: string[] | null | undefined, correctOrder: string[]): number {
  if (!submitted || submitted.length === 0 || correctOrder.length === 0) return 0;
  let correct = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (normalizeAnswer(submitted[i]) === normalizeAnswer(correctOrder[i])) correct++;
  }
  return correct / correctOrder.length;
}
```

New `case "ordering"` added to `scoreQuestion`'s switch, alongside (not replacing) the existing 4 cases:

```ts
    case "ordering": {
      const q = question as Extract<QuizQuestion, { items: string[]; type: "ordering" }>;
      return scoreOrdering(Array.isArray(submitted) ? (submitted as string[]) : null, q.items);
    }
```

## Practice-Mode Instant Feedback (`lib/quiz-client-scoring.ts`)

```ts
export function orderingIsFullyCorrect(submitted: string[], correctOrder: string[]): boolean {
  if (submitted.length !== correctOrder.length) return false;
  return submitted.every((s, i) => normalize(s) === normalize(correctOrder[i]));
}
```

## UI (`components/quiz/QuestionCard.tsx`)

- New `type === "ordering"` branch rendering `OrderingBody`, added alongside the existing 4 branches (none modified).
- `OrderingBody` built with Framer Motion's `Reorder.Group`/`Reorder.Item` (already a dependency — used elsewhere in this codebase, e.g. `SubmitLiquidOverlay.tsx`) instead of hand-rolled pointer-event drag logic like `match_columns`' wire UI. `Reorder.Group` holds the current display order in local state (initialized from the sanitized `items` array), calling `onSelect(idx, newOrder)` on reorder.
- `McqSingleBody` gets a small addition: when `question.options` is exactly `["True", "False"]` or `["False", "True"]` (case-insensitive compare), render a 2-button toggle instead of the generic vertical option list. Existing `McqSingleBody` logic (selection state, feedback coloring, correct-answer reveal) is reused, not duplicated — this is a rendering branch inside the same component, not a new type or new scoring path.

## Creation Paths

- **`lib/ai-quiz-parser.ts`** (document upload → classified questions): add `"ordering"` to `VALID_TYPES` and a new `case "ordering"` in `coerceQuestion`'s switch (parallel to the existing 4), validating `items.length >= 2`. No existing case modified.
- **`lib/ai-clients.ts`'s `generateQuestions`** (topic-based generation, currently hardcoded to always produce 4-option single-answer MCQ): prompt extended to allow the model to occasionally emit either a 4-option MCQ *or* a True/False statement (2 options) when appropriate for the topic — this only affects `mcq_single` output shape (2 vs 4 options), not the function's parsing/coercion logic, which already handles variable option counts. Ordering questions are **not** added to `generateQuestions` in this pass — topic-based generation produces one question at a time from a topic string with no source document to sequence, so "chronological events" ordering doesn't naturally fit that prompt; Ordering stays reachable only via document-upload for now. (Flagging this rather than silently dropping it: if usage data later shows Ordering needs to be reachable from topic-generation too, that's a follow-up, not part of this scope.)

## No Changes Needed

- **`app/api/admin/quizzes/[id]/answer-key/route.ts`** — already deliberately `mcq_single`-only (`if (questionType(q) !== "mcq_single") continue;`), skips every other type today. Ordering falls into that existing skip with zero changes.
- **`app/api/admin/quizzes/[id]/analytics/route.ts`** — already generic via `scoreQuestion` for per-question accuracy, and already skips "top wrong answer" for non-single-string-answer types. Ordering falls into that existing generic path and existing skip with zero changes.

## Testing / Verification

No test framework exists in this repo (confirmed: no vitest/jest/playwright, no `test` script). Verification is manual, per the project's existing convention:

1. **Regression check (existing 4 types):** with the dev server running, take one already-existing quiz of each type (`mcq_single`, `mcq_multi`, `fill_blank`, `match_columns` — real quizzes already exist in the database from prior sessions) and confirm submission scoring is unchanged from before this change.
2. **New type check (Ordering):** manually construct one `ordering` question (via direct DB insert or a temporary document upload through the AI parser), take the quiz, submit a partially-correct order, and confirm the score matches the expected fraction.
3. **Shuffle check:** confirm the client never receives `items` in canonical correct order (i.e., the display order differs from a freshly-loaded canonical order across multiple loads/seeds) — this is the one behavior that would silently make the question free if broken.
4. **True/False check:** confirm a 2-option `mcq_single` question renders as a toggle, not a list, and that submitting/scoring behaves identically to how 2-option MCQ already scored before this change (no scoring code touched, but worth confirming the UI wiring didn't regress the `onSelect` contract).

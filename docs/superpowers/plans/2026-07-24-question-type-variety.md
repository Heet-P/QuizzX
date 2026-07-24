# True/False + Ordering Question Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `ordering` question type (drag-to-reorder a shuffled list into the correct sequence) and a True/False presentation treatment for 2-option `mcq_single` questions, without changing how any of the 4 existing question types are scored, sanitized, or rendered.

**Architecture:** `ordering` slots into the same per-type extension points every existing type already uses (`QuestionType` union → `scoreQuestion` switch in `lib/answer-matching.ts` → `sanitizeQuestion` switch in `lib/quiz-sanitize.ts` → a `*Body` renderer in `components/quiz/QuestionCard.tsx` → a case in each AI creation path). True/False needs no new type at all — it's a rendering branch on the existing `mcq_single` path plus an AI-prompt change.

**Tech Stack:** TypeScript, Next.js Route Handlers, Framer Motion's `Reorder.Group`/`Reorder.Item` (already a dependency, used elsewhere in this codebase) for the drag-to-reorder UI.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-24-question-type-variety-design.md`.
- **Purely additive requirement:** every existing `switch`/`if` case body for `mcq_single`, `mcq_multi`, `fill_blank`, `match_columns` in `lib/answer-matching.ts`, `lib/quiz-sanitize.ts`, `lib/quiz-client-scoring.ts`, and `components/quiz/QuestionCard.tsx` stays byte-for-byte unchanged. Only new cases/functions/branches are added.
  - **Sanctioned exception to "unchanged":** widening a union type declaration (e.g. `QuestionType`, `QuizQuestion`, `SanitizedQuizQuestion`, `QuestionAnswer` in `types/quiz.ts`) by appending `| "ordering"` / `| OrderingQuestion` / etc. to an existing line is expected and required — this is adding a member, not changing existing behavior. This is different from touching a function body or case implementation, which is not sanctioned.
  - **Second sanctioned exception:** `lib/ai-clients.ts`'s `generateQuestions` prompt string and its final `.filter(...)` line are deliberately modified (not just added-to) to allow 2-option True/False output alongside the existing 4-option format — this is the one place outside `ordering`'s new-case additions where existing text changes. Task 4 below has the exact before/after.
- This repo has no test framework (no vitest/jest/playwright, no `test` script in `package.json`). Task 1 adds one small, permanent, framework-free verification script (`scripts/check-question-scoring.ts`, run via `npx tsx --conditions=react-server`) that asserts the 4 existing types still score exactly as before AND the new type scores correctly — this directly answers the "don't break scoring" requirement with a re-runnable check, not just a one-time manual read of the diff. `npx tsx` needs `--conditions=react-server` specifically because `lib/answer-matching.ts` and `lib/quiz-sanitize.ts` both start with `import "server-only"`, which throws unless that condition is set (verified working during planning).
- Ordering's shuffle is **mandatory, never optional** — same rule as `match_columns`' right-column shuffle (see `shuffleMatchColumnsRight`'s doc comment in `lib/quiz-sanitize.ts` for the real bug this rule prevents). It must never be gated by `settings.shuffleOptions`, which only governs MCQ option order per its own name.

---

### Task 1: Ordering core — types, scoring, sanitizing, client-scoring, route wiring, and the regression-check script

**Files:**
- Modify: `types/quiz.ts`
- Modify: `lib/answer-matching.ts`
- Modify: `lib/quiz-sanitize.ts`
- Modify: `lib/quiz-client-scoring.ts`
- Modify: `app/api/quizzes/[id]/route.ts`
- Modify: `app/api/rooms/[code]/route.ts`
- Create: `scripts/check-question-scoring.ts`

**Interfaces:**
- Produces: `OrderingQuestion { type: "ordering", text, code?, prompt?, explanation?, topic?, items: string[] }`, `OrderingSanitized` (same shape, `items` becomes the shuffled display list, plus optional `correctOrder: string[]`), `OrderingAnswer = string[]`, `scoreOrdering(submitted, correctOrder): number`, `shuffleOrderingItems(q, seed): SanitizedQuizQuestion`, `orderingIsFullyCorrect(submitted, correctOrder): boolean`. Task 2 (UI) and Tasks 3-4 (AI creation) consume these exact names/signatures.

- [ ] **Step 1: Add the `ordering` type to `types/quiz.ts`**

In `types/quiz.ts`, change:

```ts
export type QuestionType = "mcq_single" | "mcq_multi" | "fill_blank" | "match_columns";
```

to:

```ts
export type QuestionType = "mcq_single" | "mcq_multi" | "fill_blank" | "match_columns" | "ordering";
```

Immediately after the `MatchColumnsQuestion` interface (and before `export type QuizQuestion = ...`), add:

```ts
export interface OrderingQuestion extends QuestionCommon {
  type: "ordering";
  /** Canonical correct order, first-to-last. */
  items: string[];
}
```

Change:

```ts
export type QuizQuestion = McqSingleQuestion | McqMultiQuestion | FillBlankQuestion | MatchColumnsQuestion;
```

to:

```ts
export type QuizQuestion = McqSingleQuestion | McqMultiQuestion | FillBlankQuestion | MatchColumnsQuestion | OrderingQuestion;
```

Immediately after the `MatchColumnsSanitized` type (and before `export type SanitizedQuizQuestion = ...`), add:

```ts
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
```

Change:

```ts
export type SanitizedQuizQuestion = McqSingleSanitized | McqMultiSanitized | FillBlankSanitized | MatchColumnsSanitized;
```

to:

```ts
export type SanitizedQuizQuestion = McqSingleSanitized | McqMultiSanitized | FillBlankSanitized | MatchColumnsSanitized | OrderingSanitized;
```

Immediately after `export type MatchColumnsAnswer = Record<string, string>;` (and before `export type QuestionAnswer = ...`), add:

```ts
/** The student's arranged order, by item text. */
export type OrderingAnswer = string[];
```

Change:

```ts
export type QuestionAnswer = McqSingleAnswer | McqMultiAnswer | FillBlankAnswer | MatchColumnsAnswer;
```

to:

```ts
export type QuestionAnswer = McqSingleAnswer | McqMultiAnswer | FillBlankAnswer | MatchColumnsAnswer | OrderingAnswer;
```

- [ ] **Step 2: Add `scoreOrdering` and wire it into `scoreQuestion` in `lib/answer-matching.ts`**

Add this new function immediately after `scoreMatchColumns` (do not modify `scoreMatchColumns` itself):

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

In `scoreQuestion`'s `switch (questionType(question))`, add a new case immediately after the existing `case "match_columns":` block (leave that block and every other case exactly as-is):

```ts
    case "ordering": {
      const q = question as Extract<QuizQuestion, { items: string[]; type: "ordering" }>;
      return scoreOrdering(Array.isArray(submitted) ? (submitted as string[]) : null, q.items);
    }
```

- [ ] **Step 3: Add the `ordering` case to `sanitizeQuestion`, and add mandatory `shuffleOrderingItems`, in `lib/quiz-sanitize.ts`**

Add `OrderingQuestion` and `OrderingSanitized` to the existing type-only import at the top of the file (append to the same `import { ... } from "@/types/quiz";` block — do not add a second import statement):

```ts
  type OrderingQuestion,
  type OrderingSanitized,
```

In `sanitizeQuestion`'s `switch (questionType(q))`, add a new case immediately after the existing `case "match_columns":` block (leave that block and every other case exactly as-is):

```ts
    case "ordering": {
      const { items, ...rest } = q as OrderingQuestion;
      return { ...rest, items, ...(revealAnswers ? { correctOrder: items } : {}) };
    }
```

At the end of the file, add this new function (parallel to `shuffleMatchColumnsRight`, not to the optional `shuffleMcqOptions` — this one is never gated by a setting):

```ts
/**
 * Always shuffles ordering's displayed item order — unlike mcq option order,
 * this is never optional. Leaving `items` in canonical correct order would
 * make the question trivially free (the student submits back exactly what
 * they see) — the same class of bug `shuffleMatchColumnsRight` fixed for
 * match-columns' right column. A no-op for every other question type.
 */
export function shuffleOrderingItems(q: SanitizedQuizQuestion, seed: number): SanitizedQuizQuestion {
  if ("items" in q && Array.isArray(q.items) && !("options" in q)) {
    return { ...q, items: seededShuffle(q.items, seed) } as OrderingSanitized;
  }
  return q;
}
```

(The `!("options" in q)` guard exists because `mcq_single`/`mcq_multi` sanitized shapes use `options`, not `items` — this keeps the structural check unambiguous even though no current type actually has both fields.)

- [ ] **Step 4: Add `orderingIsFullyCorrect` to `lib/quiz-client-scoring.ts`**

Add this function at the end of the file (do not modify `mcqMultiIsFullyCorrect`, `fillBlankIsCorrect`, or `matchColumnsIsFullyCorrect`):

```ts
export function orderingIsFullyCorrect(submitted: string[], correctOrder: string[]): boolean {
  if (submitted.length !== correctOrder.length) return false;
  return submitted.every((s, i) => normalize(s) === normalize(correctOrder[i]));
}
```

- [ ] **Step 5: Wire the mandatory shuffle into both places a quiz is sanitized for a client**

In `app/api/quizzes/[id]/route.ts`, change the import:

```ts
import { sanitizeQuestion, shuffleMcqOptions, shuffleMatchColumnsRight } from "@/lib/quiz-sanitize";
```

to:

```ts
import { sanitizeQuestion, shuffleMcqOptions, shuffleMatchColumnsRight, shuffleOrderingItems } from "@/lib/quiz-sanitize";
```

Then change:

```ts
    if (settings.shuffleOptions) sanitized = shuffleMcqOptions(sanitized, qSeed);
    // Match-columns' right column is always shuffled — never optional, see
    // lib/quiz-sanitize.ts's shuffleMatchColumnsRight doc comment.
    sanitized = shuffleMatchColumnsRight(sanitized, qSeed);
    return sanitized;
```

to:

```ts
    if (settings.shuffleOptions) sanitized = shuffleMcqOptions(sanitized, qSeed);
    // Match-columns' right column and ordering's item list are always
    // shuffled — never optional, see lib/quiz-sanitize.ts's
    // shuffleMatchColumnsRight/shuffleOrderingItems doc comments.
    sanitized = shuffleMatchColumnsRight(sanitized, qSeed);
    sanitized = shuffleOrderingItems(sanitized, qSeed);
    return sanitized;
```

In `app/api/rooms/[code]/route.ts`, change the import:

```ts
import { sanitizeQuestion, shuffleMatchColumnsRight } from "@/lib/quiz-sanitize";
```

to:

```ts
import { sanitizeQuestion, shuffleMatchColumnsRight, shuffleOrderingItems } from "@/lib/quiz-sanitize";
```

Then change:

```ts
  const questions = ((room.quiz.questions ?? []) as unknown as QuizQuestion[]).map((q, i) =>
    shuffleMatchColumnsRight(sanitizeQuestion(q), roomSeed + i + 1)
  );
```

to:

```ts
  const questions = ((room.quiz.questions ?? []) as unknown as QuizQuestion[]).map((q, i) =>
    shuffleOrderingItems(shuffleMatchColumnsRight(sanitizeQuestion(q), roomSeed + i + 1), roomSeed + i + 1)
  );
```

- [ ] **Step 6: Write the regression + new-type check script**

Create `scripts/check-question-scoring.ts`:

```ts
// Run: npx tsx --conditions=react-server scripts/check-question-scoring.ts
//
// Plain assert script, not a framework-based test (this repo has none) —
// covers exactly the scoring/sanitizing logic that must not regress when
// adding the "ordering" question type. `--conditions=react-server` is
// required because lib/answer-matching.ts and lib/quiz-sanitize.ts both
// start with `import "server-only"`, which throws under plain Node/tsx
// resolution unless that condition is set.
import { scoreQuestion } from "../lib/answer-matching";
import { sanitizeQuestion, shuffleOrderingItems } from "../lib/quiz-sanitize";
import { orderingIsFullyCorrect } from "../lib/quiz-client-scoring";
import type {
  McqSingleQuestion,
  McqMultiQuestion,
  FillBlankQuestion,
  MatchColumnsQuestion,
  OrderingQuestion,
  OrderingSanitized,
} from "../types/quiz";

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`FAIL ${label}: expected ${e}, got ${a}`);
  console.log(`OK ${label}`);
}

// ── Regression: the 4 existing types must score exactly as before ──────────
const mcqSingle: McqSingleQuestion = { type: "mcq_single", text: "2+2?", options: ["3", "4", "5", "6"], answer: "4" };
assertEqual(scoreQuestion(mcqSingle, "4"), 1, "mcq_single correct");
assertEqual(scoreQuestion(mcqSingle, "3"), 0, "mcq_single incorrect");

const mcqMulti: McqMultiQuestion = { type: "mcq_multi", text: "Primes?", options: ["2", "3", "4", "5"], answers: ["2", "3", "5"] };
assertEqual(scoreQuestion(mcqMulti, ["2", "3", "5"]), 1, "mcq_multi fully correct");
assertEqual(scoreQuestion(mcqMulti, ["2", "3"]), 2 / 3, "mcq_multi partial credit");

const fillBlank: FillBlankQuestion = { type: "fill_blank", text: "Capital of France?", answer: "Paris" };
assertEqual(scoreQuestion(fillBlank, "  paris "), 1, "fill_blank case/whitespace-insensitive match");
assertEqual(scoreQuestion(fillBlank, "London"), 0, "fill_blank incorrect");

const matchColumns: MatchColumnsQuestion = {
  type: "match_columns",
  text: "Match",
  pairs: [
    { left: "A", right: "1" },
    { left: "B", right: "2" },
  ],
};
assertEqual(scoreQuestion(matchColumns, { A: "1", B: "2" }), 1, "match_columns fully correct");
assertEqual(scoreQuestion(matchColumns, { A: "1", B: "1" }), 0.5, "match_columns partial credit");

// ── New: ordering ───────────────────────────────────────────────────────────
const ordering: OrderingQuestion = { type: "ordering", text: "Order these", items: ["first", "second", "third"] };
assertEqual(scoreQuestion(ordering, ["first", "second", "third"]), 1, "ordering fully correct");
assertEqual(scoreQuestion(ordering, ["first", "third", "second"]), 1 / 3, "ordering partial credit");
// Cyclic rotation, not reversal — reversing a 3-item list leaves the middle
// element in place (never a true 0-score case); a cyclic shift has no fixed
// points, so every position is wrong.
assertEqual(scoreQuestion(ordering, ["second", "third", "first"]), 0, "ordering fully incorrect (cyclic rotation, no fixed points)");

assertEqual(orderingIsFullyCorrect(["first", "second", "third"], ["first", "second", "third"]), true, "orderingIsFullyCorrect true");
assertEqual(orderingIsFullyCorrect(["second", "first", "third"], ["first", "second", "third"]), false, "orderingIsFullyCorrect false");

// ── The shuffle trap: sanitized items must never equal canonical order verbatim across many seeds ──
let sawDifferentOrder = false;
for (let seed = 0; seed < 20; seed++) {
  const sanitized = shuffleOrderingItems(sanitizeQuestion(ordering), seed) as OrderingSanitized;
  if (JSON.stringify(sanitized.items) !== JSON.stringify(ordering.items)) {
    sawDifferentOrder = true;
    break;
  }
}
if (!sawDifferentOrder) throw new Error("FAIL shuffle trap: shuffleOrderingItems never produced a non-canonical order across 20 seeds");
console.log("OK shuffle trap: shuffleOrderingItems produces non-canonical orders");

console.log("\nAll checks passed.");
```

- [ ] **Step 7: Run the check script**

Run: `npx tsx --conditions=react-server scripts/check-question-scoring.ts`
Expected: every line printed is `OK ...`, ending with `All checks passed.` — no `FAIL` lines, no thrown error.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this task's changes (pre-existing unrelated errors elsewhere in the repo, if any, are not this task's concern).

- [ ] **Step 9: Manual regression check against a real quiz of an existing type**

Start the dev server (`npm run dev`), sign in, and take one already-existing quiz (any type already in the database from prior sessions). Confirm the submitted score matches what you'd expect — i.e., grading for the 4 existing types works identically through the live route, not just in the check script.

- [ ] **Step 10: Commit**

```bash
git add types/quiz.ts lib/answer-matching.ts lib/quiz-sanitize.ts lib/quiz-client-scoring.ts app/api/quizzes/\[id\]/route.ts app/api/rooms/\[code\]/route.ts scripts/check-question-scoring.ts
git commit -m "Add ordering question type: scoring, sanitizing, mandatory shuffle, and a regression-check script"
```

---

### Task 2: QuestionCard UI — Ordering drag-to-reorder + True/False toggle

**Files:**
- Modify: `components/quiz/QuestionCard.tsx`

**Interfaces:**
- Consumes: `OrderingSanitized`, `OrderingAnswer` from `@/types/quiz` (Task 1).
- Produces: nothing new consumed by later tasks — this is the UI layer.

- [ ] **Step 1: Add new imports**

In `components/quiz/QuestionCard.tsx`, add `Reorder` to the framer-motion import (this file currently has no framer-motion import — add a new import line for it, right after the existing `lucide-react` import block):

```ts
import { Reorder } from "framer-motion";
```

Add `GripVertical` to the existing `lucide-react` import list (`CheckCircle, XCircle, Bookmark, BookmarkCheck, Lock, Lightbulb, X` → append `GripVertical`):

```ts
import { CheckCircle, XCircle, Bookmark, BookmarkCheck, Lock, Lightbulb, X, GripVertical } from "lucide-react";
```

Add `OrderingSanitized` to the existing `@/types/quiz` type import list (append alongside `MatchColumnsSanitized`):

```ts
  type OrderingSanitized,
```

- [ ] **Step 2: Add the `ordering` dispatch branch in `QuestionCard`**

Immediately after the existing `{type === "match_columns" && (...)}` block in the main `QuestionCard` component (leave that block unmodified), add:

```tsx
      {type === "ordering" && (
        <OrderingBody
          question={question as OrderingSanitized}
          idx={idx}
          answer={Array.isArray(answer) ? (answer as string[]) : []}
          feedback={feedback}
          isLocked={isLocked}
          onSelect={onSelect}
        />
      )}
```

- [ ] **Step 3: Add the True/False toggle branch to `McqSingleBody`**

Replace the entire existing `McqSingleBody` function:

```tsx
function McqSingleBody({ question, idx, answer, feedback, isLocked, onSelect }: TypeBodyProps<McqSingleSanitized, string | undefined>) {
  return (
    <div className="space-y-2">
      {question.options.map((option, optIdx) => {
        let optionClass = "bg-white border-ink/10 hover:bg-cream-alt";
        const isSelected = answer === option;

        if (isSelected && feedback === "correct") optionClass = "bg-green border-green text-ink";
        else if (isSelected && feedback === "wrong") optionClass = "bg-coral border-coral text-white";
        else if (isSelected) optionClass = "bg-ink text-white border-ink";

        if (feedback === "wrong" && question.answer === option) optionClass = "bg-green border-green border-2";

        return (
          <label
            key={optIdx}
            className={`flex cursor-pointer items-center p-3 rounded-[var(--radius-btn)] border-2 transition-all ${optionClass} ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <input
              type="radio"
              name={`q-${idx}`}
              className="hidden"
              checked={isSelected}
              onChange={() => onSelect(idx, option)}
              disabled={isLocked}
            />
            <span className="font-mono flex-1">{option}</span>
            {feedback === "correct" && isSelected && <CheckCircle size={20} />}
            {feedback === "wrong" && isSelected && <XCircle size={20} />}
            {feedback === "wrong" && question.answer === option && <CheckCircle size={20} />}
          </label>
        );
      })}
    </div>
  );
}
```

with this version — the added code is the `isTrueFalseOptions` helper and the early-return block at the top; every line below the early return (the original body) is copied verbatim, unmodified:

```tsx
/** True when a 2-option mcq_single is a True/False question, regardless of casing or order. */
function isTrueFalseOptions(options: string[]): boolean {
  if (options.length !== 2) return false;
  const norm = options.map((o) => o.trim().toLowerCase());
  return (norm[0] === "true" && norm[1] === "false") || (norm[0] === "false" && norm[1] === "true");
}

function McqSingleBody({ question, idx, answer, feedback, isLocked, onSelect }: TypeBodyProps<McqSingleSanitized, string | undefined>) {
  if (isTrueFalseOptions(question.options)) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((option, optIdx) => {
          let optionClass = "bg-white border-ink/10 hover:bg-cream-alt";
          const isSelected = answer === option;

          if (isSelected && feedback === "correct") optionClass = "bg-green border-green text-ink";
          else if (isSelected && feedback === "wrong") optionClass = "bg-coral border-coral text-white";
          else if (isSelected) optionClass = "bg-ink text-white border-ink";

          if (feedback === "wrong" && question.answer === option) optionClass = "bg-green border-green border-2";

          return (
            <button
              key={optIdx}
              type="button"
              onClick={() => onSelect(idx, option)}
              disabled={isLocked}
              className={`flex items-center justify-center gap-2 p-4 rounded-[var(--radius-btn)] border-2 font-accent font-bold text-lg transition-all ${optionClass} ${isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
            >
              {option}
              {feedback === "correct" && isSelected && <CheckCircle size={20} />}
              {feedback === "wrong" && isSelected && <XCircle size={20} />}
              {feedback === "wrong" && question.answer === option && <CheckCircle size={20} />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {question.options.map((option, optIdx) => {
        let optionClass = "bg-white border-ink/10 hover:bg-cream-alt";
        const isSelected = answer === option;

        if (isSelected && feedback === "correct") optionClass = "bg-green border-green text-ink";
        else if (isSelected && feedback === "wrong") optionClass = "bg-coral border-coral text-white";
        else if (isSelected) optionClass = "bg-ink text-white border-ink";

        if (feedback === "wrong" && question.answer === option) optionClass = "bg-green border-green border-2";

        return (
          <label
            key={optIdx}
            className={`flex cursor-pointer items-center p-3 rounded-[var(--radius-btn)] border-2 transition-all ${optionClass} ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <input
              type="radio"
              name={`q-${idx}`}
              className="hidden"
              checked={isSelected}
              onChange={() => onSelect(idx, option)}
              disabled={isLocked}
            />
            <span className="font-mono flex-1">{option}</span>
            {feedback === "correct" && isSelected && <CheckCircle size={20} />}
            {feedback === "wrong" && isSelected && <XCircle size={20} />}
            {feedback === "wrong" && question.answer === option && <CheckCircle size={20} />}
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Add `OrderingBody`**

At the end of the file, add:

```tsx
/**
 * Drag-to-reorder list using Framer Motion's Reorder primitive (already a
 * dependency elsewhere in this codebase) instead of hand-rolled pointer
 * tracking. `answer` starts empty before the student first drags anything,
 * so it falls back to the sanitized (already-shuffled, see
 * lib/quiz-sanitize.ts's shuffleOrderingItems) display order. Practice-mode
 * coloring uses `question.correctOrder` directly (present only when
 * revealed) rather than the `feedback` prop — same pattern MatchColumnsBody
 * already uses for its own practice-mode coloring.
 */
function OrderingBody({ question, idx, answer, isLocked, onSelect }: TypeBodyProps<OrderingSanitized, string[]>) {
  const order = answer.length === question.items.length ? answer : question.items;

  return (
    <Reorder.Group
      axis="y"
      values={order}
      onReorder={(newOrder) => {
        if (!isLocked) onSelect(idx, newOrder);
      }}
      className="space-y-2"
    >
      {order.map((item, pos) => {
        const tinted = question.correctOrder
          ? question.correctOrder[pos] === item
            ? "border-green bg-green/10"
            : "border-coral bg-coral/10"
          : "border-ink/10 bg-white";
        return (
          <Reorder.Item
            key={item}
            value={item}
            drag={!isLocked}
            className={`flex items-center gap-3 p-3 rounded-[var(--radius-btn)] border-2 font-mono ${tinted} ${isLocked ? "cursor-not-allowed opacity-80" : "cursor-grab active:cursor-grabbing"}`}
          >
            <GripVertical size={16} className="text-ink/30 shrink-0" />
            <span className="flex-1">{item}</span>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

This task's new UI has no way to be exercised end-to-end yet — Task 3 adds the only creation path (document upload) for `ordering` questions, and no True/False question exists in the database yet either. Defer full browser verification to Task 3's Step 5 (which creates a real quiz containing both a True/False question and an `ordering` question and walks through taking it). For this task, confirm only that the file compiles (Step 5) and that existing quiz-taking (any of the 4 existing types) still renders and behaves identically in the browser — no visual or functional change to `McqSingleBody`'s non-True/False branch, `McqMultiBody`, `FillBlankBody`, or `MatchColumnsBody`.

- [ ] **Step 7: Commit**

```bash
git add components/quiz/QuestionCard.tsx
git commit -m "Add Ordering drag-to-reorder UI and True/False toggle to QuestionCard"
```

---

### Task 3: AI document-upload parser — classify `ordering` questions

**Files:**
- Modify: `lib/ai-quiz-parser.ts`

**Interfaces:**
- Consumes: `OrderingQuestion` from `@/types/quiz` (Task 1).
- Produces: `parseQuizDocumentWithAI` can now return `OrderingQuestion` items alongside the existing 4 types — consumed by `app/api/ai/parse-quiz-doc/route.ts` (unchanged, already generic) and, once created, `app/api/admin/quizzes/create/route.ts` (unchanged, already accepts any `QuizQuestion[]`).

- [ ] **Step 1: Add `items` to the raw-parse interface**

In `lib/ai-quiz-parser.ts`, add a new optional field to the existing `RawParsedQuestion` interface (append, don't modify the existing fields):

```ts
  items?: unknown[];
```

- [ ] **Step 2: Add `"ordering"` to `VALID_TYPES`**

Change:

```ts
const VALID_TYPES: QuestionType[] = ["mcq_single", "mcq_multi", "fill_blank", "match_columns"];
```

to:

```ts
const VALID_TYPES: QuestionType[] = ["mcq_single", "mcq_multi", "fill_blank", "match_columns", "ordering"];
```

- [ ] **Step 3: Add the `ordering` case to `coerceQuestion`**

In `coerceQuestion`'s `switch (type)`, add a new case immediately after the existing `case "match_columns":` block (leave that block and every other case exactly as-is):

```ts
    case "ordering": {
      const items = Array.isArray(raw.items) ? raw.items.map((i) => String(i).trim()).filter(Boolean) : [];
      if (items.length < 2) return null;
      return { type: "ordering", text, items, explanation, topic };
    }
```

- [ ] **Step 4: Teach the AI prompt to classify `ordering`**

In `parseQuizDocumentWithAI`'s prompt template, change:

```ts
  const prompt = `You are extracting quiz questions from a document. Read the raw text below and identify every question. For EACH question, classify it into exactly one of these 4 types and output the matching JSON shape:
```

to:

```ts
  const prompt = `You are extracting quiz questions from a document. Read the raw text below and identify every question. For EACH question, classify it into exactly one of these 5 types and output the matching JSON shape:
```

Immediately after the existing `4. "match_columns"` block (before the `Rules:` line), add a 5th classification option:

```ts

5. "ordering" — a question asking to arrange/order/sequence items correctly (e.g. chronological events, steps of a process, algorithm steps). List "items" in the CORRECT order as they should be in the answer, not shuffled — the app shuffles them for display separately:
   {"type":"ordering","text":"<question>","items":["<item in correct order 1>","<item in correct order 2>",...],"explanation":"<optional>","topic":"<optional>"}
```

Change:

```
- Classify based on what the document actually shows — do not force everything into mcq_single.
```

to:

```
- Classify based on what the document actually shows — do not force everything into mcq_single.
- Only use "ordering" when the source material genuinely describes a sequence (steps, chronological order, ranked order) — don't force it onto content that's naturally a different type.
```

- [ ] **Step 5: Manual end-to-end verification**

Start the dev server (`npm run dev`). Create a small test document (e.g. `/tmp/ordering-test.txt`, not committed) containing content that should classify as a mix of types, including at least one true/false-style statement and one sequence:

```
The water cycle: put these steps in the correct order.
Steps: Condensation, Evaporation, Precipitation, Collection.

True or False: The Earth is the third planet from the Sun.

What is the capital of Japan?
```

In the browser, sign in as an admin/teacher, go to the quiz upload page's AI document-parsing flow (`POST /api/ai/parse-quiz-doc`, the "Upload document" / AI-parse tab in `components/admin/QuizUploader.tsx`), upload this file, and confirm the preview shows: an `ordering` question with `items` in the correct chronological order (Evaporation, Condensation, Precipitation, Collection), and a 2-option `mcq_single` question for the true/false statement. Save the quiz, take it, and confirm:
- The ordering question renders as a draggable list (Task 2), starts in a shuffled (not canonical) order, and reordering it and submitting scores correctly (fully correct = 1, partially correct = partial credit, matching Task 1's `scoreOrdering`).
- The true/false question renders as a 2-button toggle (Task 2) and scores correctly.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add lib/ai-quiz-parser.ts
git commit -m "Teach the AI document parser to classify ordering questions"
```

---

### Task 4: Topic-based AI generation — allow True/False output

**Files:**
- Modify: `lib/ai-clients.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks (True/False needs no new type — `McqSingleQuestion` already covers it).
- Produces: nothing new consumed elsewhere — `generateQuestions`' return type (`QuizQuestion[]`) and its two callers (`app/api/ai/generate-quiz/route.ts`, `app/api/admin/daily-challenge/route.ts`) are unchanged.

- [ ] **Step 1: Update the prompt to allow 2-option True/False**

In `lib/ai-clients.ts`'s `generateQuestions`, change:

```ts
  const prompt = `Generate ${numQ} multiple-choice quiz questions about: ${topic}.
${syllabus ? `\nSyllabus / context:\n${syllabus.substring(0, 3000)}\n` : ""}
Rules:
- Each question must have exactly 4 answer options.
- Exactly one option must be correct.
- Options should be plausible and varied in difficulty.
- Include a brief explanation (1-2 sentences) for the correct answer.

Return ONLY a valid JSON array. Each element must follow this exact shape:
{"text":"<question text>","options":["<option 1>","<option 2>","<option 3>","<option 4>"],"answer":"A","explanation":"<why it is correct>"}

CRITICAL rules for the "answer" field:
- Use ONLY a single capital letter: A, B, C, or D
- A means options[0] is correct, B means options[1], C means options[2], D means options[3]
No markdown fences, no commentary, no trailing text. Start your response with [ and end with ].`;
```

to:

```ts
  const prompt = `Generate ${numQ} multiple-choice quiz questions about: ${topic}.
${syllabus ? `\nSyllabus / context:\n${syllabus.substring(0, 3000)}\n` : ""}
Rules:
- Most questions should have exactly 4 answer options with exactly one correct.
- When a question is naturally a true/false statement (a single factual claim to judge, rather than a "pick one of several options" question), use exactly 2 options instead: ["True","False"]. Vary this in naturally — don't force every question into this shape, and don't force every question into 4 options either.
- Options should be plausible and varied in difficulty.
- Include a brief explanation (1-2 sentences) for the correct answer.

Return ONLY a valid JSON array. Each element must follow this exact shape:
{"text":"<question text>","options":["<option 1>","<option 2>",...],"answer":"A","explanation":"<why it is correct>"}

CRITICAL rules for the "answer" field:
- Use ONLY a single capital letter matching the option's position: A means options[0], B means options[1], C means options[2], D means options[3] (C/D only apply when there are 4 options)
No markdown fences, no commentary, no trailing text. Start your response with [ and end with ].`;
```

- [ ] **Step 2: Widen the final validity filter to accept 2-option questions**

Change:

```ts
    .filter((q: McqSingleQuestion) => q.text && q.options.length === 4 && q.options.includes(q.answer)) as QuizQuestion[];
```

to:

```ts
    .filter((q: McqSingleQuestion) => q.text && (q.options.length === 4 || q.options.length === 2) && q.options.includes(q.answer)) as QuizQuestion[];
```

- [ ] **Step 3: Manual end-to-end verification**

Start the dev server (`npm run dev`), sign in as an admin, go to the AI-generate tab (`POST /api/ai/generate-quiz`, in `components/admin/QuizUploader.tsx`), and generate a quiz for a topic likely to include some true/false-appropriate facts (e.g. "Basic astronomy facts"). Confirm the preview includes at least one 2-option question (may take a couple of generations, since the model decides when it's natural — this is expected, not a bug, per the prompt's "vary this in naturally" instruction). Save the quiz, take it, and confirm the True/False toggle (Task 2) renders and scores correctly. Also confirm the 4-option questions in the same generated set are unaffected — same shape and scoring as before this change.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-clients.ts
git commit -m "Allow topic-based AI generation to produce True/False questions"
```

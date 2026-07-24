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

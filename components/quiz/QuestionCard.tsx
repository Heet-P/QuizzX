import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Bookmark, BookmarkCheck, Lock, Lightbulb, X, GripVertical } from "lucide-react";
import { Reorder } from "framer-motion";
import {
  questionType,
  type SanitizedQuizQuestion,
  type QuestionAnswer,
  type McqSingleSanitized,
  type McqMultiSanitized,
  type FillBlankSanitized,
  type MatchColumnsSanitized,
  type OrderingSanitized,
} from "@/types/quiz";

interface QuestionCardProps {
  question: SanitizedQuizQuestion;
  idx: number;
  answer: QuestionAnswer | undefined;
  feedback: "correct" | "wrong" | undefined;
  isLocked: boolean;
  onSelect: (idx: number, newAnswer: QuestionAnswer) => void;
  isPractice: boolean;
  isFlagged: boolean;
  onToggleFlag: (idx: number) => void;
}

// Ported from client/src/components/quiz/QuestionCard.jsx (mcq_single only in
// v1). Extended 2026-07-23 to render all 4 AI-classifiable question types —
// see types/quiz.ts's header comment for the type system this renders.
// Practice-mode correctness for mcq_single is still a simple exact-match
// (`option === q.answer`), same as v1 — MIGRATION_AUDIT.md Section 9 flags
// this as a still-open question (should it share the server's matching
// logic instead?) rather than a decided behavior; preserved as-is. The 3 new
// types use lib/quiz-client-scoring.ts (deliberately not the server-only
// grading module) for the same low-stakes instant-feedback purpose.
export const QuestionCard = memo(function QuestionCard({
  question,
  idx,
  answer,
  feedback,
  isLocked,
  onSelect,
  isPractice,
  isFlagged,
  onToggleFlag,
}: QuestionCardProps) {
  const type = questionType(question);

  return (
    <div id={`q-${idx}`} className={`card-tactile p-6 ${isLocked && !isPractice ? "opacity-70" : ""}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex items-center bg-blue text-white font-accent font-bold text-sm px-3 py-1 rounded-[var(--radius-chip)] shrink-0">
          Q{idx + 1}
        </span>
        {question.prompt && !question.code && <h3 className="text-lg font-display mt-0.5 flex-1">{question.prompt}</h3>}
        {isLocked && !isPractice && (
          <span className="ml-auto flex items-center gap-1 text-xs font-accent font-bold bg-ink/10 px-2 py-1 rounded-[var(--radius-chip)] shrink-0">
            <Lock size={12} /> Locked
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleFlag(idx)}
          title={isFlagged ? "Remove bookmark" : "Bookmark for review"}
          className={`ml-auto shrink-0 p-1.5 rounded-full border-2 border-ink/10 transition-colors ${isFlagged ? "bg-yellow" : "bg-white hover:bg-cream-alt"}`}
        >
          {isFlagged ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      {question.code && (
        <pre className="mb-4 overflow-x-auto rounded-[var(--radius-card-sm)] bg-ink p-4 font-mono text-sm text-green">
          <code>{question.code}</code>
        </pre>
      )}
      {question.prompt && question.code && <p className="mb-4 font-accent font-bold">{question.prompt}</p>}
      {!question.code && !question.prompt && <p className="mb-4 text-lg font-display">{question.text}</p>}

      {question.topic && (
        <span className="inline-block mb-3 text-xs font-accent font-bold rounded-[var(--radius-chip)] px-2 py-0.5 bg-cream uppercase text-ink/60">
          {question.topic}
        </span>
      )}

      {type === "mcq_single" && (
        <McqSingleBody
          question={question as McqSingleSanitized}
          idx={idx}
          answer={typeof answer === "string" ? answer : undefined}
          feedback={feedback}
          isLocked={isLocked}
          onSelect={onSelect}
        />
      )}
      {type === "mcq_multi" && (
        <McqMultiBody
          question={question as McqMultiSanitized}
          idx={idx}
          answer={Array.isArray(answer) ? answer : []}
          feedback={feedback}
          isLocked={isLocked}
          onSelect={onSelect}
        />
      )}
      {type === "fill_blank" && (
        <FillBlankBody
          question={question as FillBlankSanitized}
          idx={idx}
          answer={typeof answer === "string" ? answer : ""}
          feedback={feedback}
          isLocked={isLocked}
          onSelect={onSelect}
        />
      )}
      {type === "match_columns" && (
        <MatchColumnsBody
          question={question as MatchColumnsSanitized}
          idx={idx}
          answer={answer && typeof answer === "object" && !Array.isArray(answer) ? answer : {}}
          feedback={feedback}
          isLocked={isLocked}
          onSelect={onSelect}
        />
      )}
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

      {isPractice && feedback && (
        <div className={`mt-3 p-2 rounded-[var(--radius-btn)] font-accent font-bold text-center ${feedback === "correct" ? "bg-green" : "bg-coral text-white"}`}>
          {feedback === "correct" ? "Correct!" : "Incorrect"}
        </div>
      )}

      {isPractice && feedback === "wrong" && question.explanation && (
        <div className="mt-3 p-3 rounded-[var(--radius-btn)] bg-yellow">
          <p className="font-accent font-bold text-xs uppercase mb-1 flex items-center gap-1">
            <Lightbulb size={14} /> Explanation
          </p>
          <p className="text-sm font-accent font-bold">{question.explanation}</p>
        </div>
      )}
    </div>
  );
});

interface TypeBodyProps<Q, A> {
  question: Q;
  idx: number;
  answer: A;
  feedback: "correct" | "wrong" | undefined;
  isLocked: boolean;
  onSelect: (idx: number, newAnswer: QuestionAnswer) => void;
}

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

function McqMultiBody({ question, idx, answer, feedback, isLocked, onSelect }: TypeBodyProps<McqMultiSanitized, string[]>) {
  const toggle = (option: string) => {
    if (isLocked) return;
    const next = answer.includes(option) ? answer.filter((o) => o !== option) : [...answer, option];
    onSelect(idx, next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-accent font-bold text-ink/50 uppercase -mt-1 mb-2">Select all that apply</p>
      {question.options.map((option, optIdx) => {
        const isSelected = answer.includes(option);
        const isCorrectOption = question.answers?.includes(option);
        let optionClass = "bg-white border-ink/10 hover:bg-cream-alt";

        if (feedback && isCorrectOption) optionClass = "bg-green border-green text-ink";
        else if (feedback === "wrong" && isSelected && !isCorrectOption) optionClass = "bg-coral border-coral text-white";
        else if (isSelected) optionClass = "bg-ink text-white border-ink";

        return (
          <label
            key={optIdx}
            className={`flex cursor-pointer items-center p-3 rounded-[var(--radius-btn)] border-2 transition-all ${optionClass} ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggle(option)} disabled={isLocked} />
            <span className="font-mono flex-1">{option}</span>
            {isSelected && <CheckCircle size={18} />}
          </label>
        );
      })}
    </div>
  );
}

function FillBlankBody({ question, idx, answer, feedback, isLocked, onSelect }: TypeBodyProps<FillBlankSanitized, string>) {
  const borderClass = feedback === "correct" ? "border-green" : feedback === "wrong" ? "border-coral" : "";
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={answer}
        onChange={(e) => onSelect(idx, e.target.value)}
        disabled={isLocked}
        placeholder="Type your answer…"
        className={`input-tactile disabled:cursor-not-allowed disabled:opacity-70 ${borderClass}`}
      />
      {feedback === "wrong" && question.answer && (
        <p className="flex items-center gap-1 text-sm font-accent font-bold text-green">
          <CheckCircle size={14} /> Correct answer: {question.answer}
        </p>
      )}
    </div>
  );
}

// Vibrant, distinct wire colors cycling per left-item index — matches the
// app's brand palette so the connections read as intentional, not random.
const WIRE_COLORS = ["#2e5bff", "#ff4b36", "#22c55e", "#8b5cf6", "#ff9500", "#e6b800", "#14b8a6", "#ec4899"];

interface Anchor {
  x: number;
  y: number;
}

/**
 * Drag-a-colored-wire matching UI — replaced the previous per-left-item
 * `<select>` dropdown (2026-07-23, explicit user request). Each left item
 * gets a fixed color; dragging from its handle to a right item draws a
 * curved SVG wire in that color and records the pair. Anchor positions are
 * measured via `getBoundingClientRect` in an effect (never read directly
 * during render, to avoid the same "ref access during render" pitfall
 * flagged elsewhere in this codebase — see MEMORY.md) and stored in state,
 * so the SVG only ever renders from that state, never from refs directly.
 */
function MatchColumnsBody({ question, idx, answer, isLocked, onSelect }: TypeBodyProps<MatchColumnsSanitized, Record<string, string>>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<{ left: Anchor[]; right: Anchor[] }>({ left: [], right: [] });
  const [dragLeftIdx, setDragLeftIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<Anchor | null>(null);

  // Practice mode only (graded mode never receives the answer key at all) —
  // used purely to tint wires green/red instead of by left-item color once
  // the question has been revealed, same spirit as the other body types'
  // feedback treatment.
  const correctMap = question.pairs ? new Map(question.pairs.map((p) => [p.left, p.right])) : null;

  const recomputePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const toAnchor = (el: HTMLDivElement | null, side: "left" | "right"): Anchor => {
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return { x: (side === "left" ? r.right : r.left) - containerRect.left, y: r.top + r.height / 2 - containerRect.top };
    };
    setPositions({
      left: leftRefs.current.map((el) => toAnchor(el, "left")),
      right: rightRefs.current.map((el) => toAnchor(el, "right")),
    });
  }, []);

  useLayoutEffect(() => {
    recomputePositions();
    window.addEventListener("resize", recomputePositions);
    return () => window.removeEventListener("resize", recomputePositions);
  }, [recomputePositions, question.leftItems.length, question.rightItems.length]);

  useEffect(() => {
    if (dragLeftIdx === null) return;

    const toContainerPoint = (e: PointerEvent): Anchor | null => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMove = (e: PointerEvent) => {
      const point = toContainerPoint(e);
      if (point) setDragPos(point);
    };

    const handleUp = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const rightEl = target?.closest<HTMLElement>("[data-right-idx]");
      if (rightEl) {
        const rightIdx = Number(rightEl.dataset.rightIdx);
        const leftText = question.leftItems[dragLeftIdx];
        const rightText = question.rightItems[rightIdx];
        onSelect(idx, { ...answer, [leftText]: rightText });
      }
      setDragLeftIdx(null);
      setDragPos(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragLeftIdx, question.leftItems, question.rightItems, answer, idx, onSelect]);

  const startDrag = (leftIdx: number) => (e: React.PointerEvent) => {
    if (isLocked) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setDragLeftIdx(leftIdx);
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const clearPair = (left: string) => {
    if (isLocked) return;
    const next = { ...answer };
    delete next[left];
    onSelect(idx, next);
  };

  const wireColorFor = (leftIdx: number, leftText: string, rightText: string): string => {
    if (correctMap) return correctMap.get(leftText) === rightText ? "#22c55e" : "#ff4b36";
    return WIRE_COLORS[leftIdx % WIRE_COLORS.length];
  };

  return (
    <div ref={containerRef} className="relative grid grid-cols-2 gap-x-10 gap-y-3">
      <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: "none" }}>
        {question.leftItems.map((left, i) => {
          const rightText = answer[left];
          if (!rightText) return null;
          const rightIdx = question.rightItems.indexOf(rightText);
          const from = positions.left[i];
          const to = positions.right[rightIdx];
          if (!from || !to || rightIdx < 0) return null;
          const midX = (from.x + to.x) / 2;
          return (
            <path
              key={i}
              d={`M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`}
              stroke={wireColorFor(i, left, rightText)}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
        {dragLeftIdx !== null && dragPos && positions.left[dragLeftIdx] && (
          <path
            d={`M${positions.left[dragLeftIdx].x},${positions.left[dragLeftIdx].y} L${dragPos.x},${dragPos.y}`}
            stroke={WIRE_COLORS[dragLeftIdx % WIRE_COLORS.length]}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="8 6"
          />
        )}
      </svg>

      <div className="space-y-3">
        {question.leftItems.map((left, i) => {
          const color = WIRE_COLORS[i % WIRE_COLORS.length];
          const connected = !!answer[left];
          return (
            <div
              key={i}
              ref={(el) => {
                leftRefs.current[i] = el;
              }}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-btn)] border-2 bg-white p-3 font-mono text-sm"
              style={{ borderColor: connected ? color : "rgba(20,18,15,0.1)" }}
            >
              <span className="flex-1">{left}</span>
              {connected && !isLocked && (
                <button type="button" onClick={() => clearPair(left)} title="Remove match" className="shrink-0 text-ink/40 hover:text-coral">
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onPointerDown={startDrag(i)}
                disabled={isLocked}
                title="Drag to a match on the right"
                className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(20,18,15,0.15)] disabled:cursor-not-allowed"
                style={{ background: color, touchAction: "none", cursor: isLocked ? "not-allowed" : "grab" }}
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {question.rightItems.map((right, j) => {
          const matchedLeftIdx = question.leftItems.findIndex((l) => answer[l] === right);
          const color = matchedLeftIdx >= 0 ? wireColorFor(matchedLeftIdx, question.leftItems[matchedLeftIdx], right) : null;
          return (
            <div
              key={j}
              ref={(el) => {
                rightRefs.current[j] = el;
              }}
              data-right-idx={j}
              className="flex items-center gap-2 rounded-[var(--radius-btn)] border-2 bg-white p-3 font-mono text-sm"
              style={{ borderColor: color ?? "rgba(20,18,15,0.1)" }}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color ?? "transparent", border: color ? "none" : "2px solid rgba(20,18,15,0.2)" }} />
              {right}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  // Each item gets a stable identity independent of its text, since Framer
  // Motion's Reorder tracks position by `value` equality (verified against
  // its source) — using item TEXT as that value would silently corrupt drag
  // tracking for questions with duplicate-text items. `keyedItems` is this
  // component's own source of truth for order, built once from the sanitized
  // (already-shuffled) display order or a previously-saved answer — never
  // reconstructed from `answer` on later renders, which would be ambiguous
  // for duplicate text anyway (and doesn't matter: scoring only cares about
  // the final text sequence, not which id underlies which slot).
  const [keyedItems, setKeyedItems] = useState(() =>
    (answer.length === question.items.length ? answer : question.items).map((text, i) => ({ id: i, text }))
  );
  // Ordering has no "empty" initial state (unlike MatchColumnsBody, which
  // starts with zero connections) — the shuffled list always shows a
  // complete permutation from first render, so some positions can
  // coincidentally sit in their correct slot purely by chance of the
  // shuffle. Gate practice-mode coloring on having dragged at least once,
  // so it never leaks the answer key before the student attempts the
  // question — parallels MatchColumnsBody's "nothing colors until
  // connected" gating, adapted to this type's always-fully-populated
  // starting state.
  const [hasInteracted, setHasInteracted] = useState(() => answer.length === question.items.length);

  const handleReorder = (newOrder: { id: number; text: string }[]) => {
    setKeyedItems(newOrder);
    setHasInteracted(true);
    if (!isLocked) onSelect(idx, newOrder.map((k) => k.text));
  };

  return (
    <Reorder.Group axis="y" values={keyedItems} onReorder={handleReorder} className="space-y-2">
      {keyedItems.map((k, pos) => {
        const tinted =
          hasInteracted && question.correctOrder
            ? question.correctOrder[pos] === k.text
              ? "border-green bg-green/10"
              : "border-coral bg-coral/10"
            : "border-ink/10 bg-white";
        return (
          <Reorder.Item
            key={k.id}
            value={k}
            drag={!isLocked}
            className={`flex items-center gap-3 p-3 rounded-[var(--radius-btn)] border-2 font-mono ${tinted} ${isLocked ? "cursor-not-allowed opacity-80" : "cursor-grab active:cursor-grabbing"}`}
          >
            <GripVertical size={16} className="text-ink/30 shrink-0" />
            <span className="flex-1">{k.text}</span>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}

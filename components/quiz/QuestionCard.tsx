import { memo } from "react";
import { CheckCircle, XCircle, Bookmark, BookmarkCheck, Lock, Lightbulb } from "lucide-react";
import type { QuizQuestion } from "@/types/quiz";

interface QuestionCardProps {
  question: QuizQuestion;
  idx: number;
  answer: string | undefined;
  feedback: "correct" | "wrong" | undefined;
  isLocked: boolean;
  onSelect: (idx: number, option: string) => void;
  isPractice: boolean;
  isFlagged: boolean;
  onToggleFlag: (idx: number) => void;
}

// Ported from client/src/components/quiz/QuestionCard.jsx. Practice-mode
// correctness here is a simple exact-match (`option === q.answer`), same as
// v1 — MIGRATION_AUDIT.md Section 9 flags this as an open question (should it
// share the server's letter/positional-match logic instead?) rather than a
// decided behavior; preserved as-is pending that decision.
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

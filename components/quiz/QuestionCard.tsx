import { memo } from "react";
import { CheckCircle, XCircle, Bookmark, BookmarkCheck, Lock, Lightbulb } from "lucide-react";
import {
  questionType,
  type SanitizedQuizQuestion,
  type QuestionAnswer,
  type McqSingleSanitized,
  type McqMultiSanitized,
  type FillBlankSanitized,
  type MatchColumnsSanitized,
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

function FillBlankBody({ question: _question, idx, answer, isLocked, onSelect }: TypeBodyProps<FillBlankSanitized, string>) {
  return (
    <input
      type="text"
      value={answer}
      onChange={(e) => onSelect(idx, e.target.value)}
      disabled={isLocked}
      placeholder="Type your answer…"
      className="input-tactile disabled:cursor-not-allowed disabled:opacity-70"
    />
  );
}

function MatchColumnsBody({ question, idx, answer, isLocked, onSelect }: TypeBodyProps<MatchColumnsSanitized, Record<string, string>>) {
  const setPair = (left: string, right: string) => {
    if (isLocked) return;
    onSelect(idx, { ...answer, [left]: right });
  };

  return (
    <div className="space-y-2">
      {question.leftItems.map((left, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="flex-1 p-3 rounded-[var(--radius-btn)] border-2 border-ink/10 bg-white font-mono text-sm">{left}</span>
          <select
            value={answer[left] ?? ""}
            onChange={(e) => setPair(left, e.target.value)}
            disabled={isLocked}
            className="input-tactile flex-1 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="">-- Match --</option>
            {question.rightItems.map((right, j) => (
              <option key={j} value={right}>
                {right}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

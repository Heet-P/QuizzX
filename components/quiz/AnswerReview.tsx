"use client";

import { useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { QuestionCard } from "./QuestionCard";
import { mcqMultiIsFullyCorrect, fillBlankIsCorrect, matchColumnsIsFullyCorrect, orderingIsFullyCorrect } from "@/lib/quiz-client-scoring";
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

interface ReviewData {
  title: string;
  score: number;
  submittedAnswers: Record<string, QuestionAnswer>;
  questions: SanitizedQuizQuestion[];
}

function computeFeedback(q: SanitizedQuizQuestion, submitted: QuestionAnswer | undefined): "correct" | "wrong" {
  if (submitted === undefined || submitted === null || submitted === "") return "wrong";
  switch (questionType(q)) {
    case "mcq_single": {
      const mq = q as McqSingleSanitized;
      return submitted === mq.answer ? "correct" : "wrong";
    }
    case "mcq_multi": {
      const mq = q as McqMultiSanitized;
      if (!Array.isArray(submitted) || !mq.answers) return "wrong";
      return mcqMultiIsFullyCorrect(submitted, mq.answers) ? "correct" : "wrong";
    }
    case "fill_blank": {
      const fq = q as FillBlankSanitized;
      if (typeof submitted !== "string" || !fq.answer) return "wrong";
      return fillBlankIsCorrect(submitted, fq.answer) ? "correct" : "wrong";
    }
    case "match_columns": {
      const mq = q as MatchColumnsSanitized;
      if (!submitted || typeof submitted !== "object" || Array.isArray(submitted) || !mq.pairs) return "wrong";
      return matchColumnsIsFullyCorrect(submitted, mq.pairs) ? "correct" : "wrong";
    }
    case "ordering": {
      const oq = q as OrderingSanitized;
      if (!Array.isArray(submitted) || !oq.correctOrder) return "wrong";
      return orderingIsFullyCorrect(submitted, oq.correctOrder) ? "correct" : "wrong";
    }
    default:
      return "wrong";
  }
}

// Lets a user see their own submitted answer next to the correct one for
// every question, once their submission is already completed — added
// 2026-07-23 per explicit user request. Reuses QuestionCard itself
// (isLocked + isPractice so it renders read-only with the "Correct!"/
// "Incorrect" banner and explanation, same as practice mode) rather than
// building a parallel rendering path — the match-columns drag-wire body
// already tints wires green/red from the revealed `pairs` answer key with
// no extra work needed here.
export function AnswerReview({ quizId }: { quizId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<ReviewData>(`/api/quizzes/${quizId}/review`);
      setData(result);
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your answers"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <button onClick={handleToggle} className="btn-tactile w-full justify-center bg-ink text-white py-3">
        <ClipboardList size={18} />
        Review My Answers
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {loading && <div className="py-8 text-center font-accent font-bold animate-pulse">Loading your answers…</div>}
          {error && <p className="py-4 text-center font-accent font-bold text-coral">{error}</p>}
          {data &&
            data.questions.map((q, idx) => {
              const submitted = data.submittedAnswers[String(idx)] ?? (data.submittedAnswers as unknown as QuestionAnswer[])[idx];
              return (
                <QuestionCard
                  key={idx}
                  question={q}
                  idx={idx}
                  answer={submitted}
                  feedback={computeFeedback(q, submitted)}
                  isLocked={true}
                  onSelect={() => {}}
                  isPractice={true}
                  isFlagged={false}
                  onToggleFlag={() => {}}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

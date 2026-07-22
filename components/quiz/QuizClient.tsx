"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Send, ChevronLeft, ChevronRight, Flame, AlertTriangle, Swords, LayoutGrid } from "lucide-react";
import { AntiCopy } from "./AntiCopy";
import { WatermarkOverlay } from "./WatermarkOverlay";
import { PinGateModal } from "./PinGateModal";
import { RulesScreen } from "./RulesScreen";
import { QuizTimer } from "./QuizTimer";
import { QuestionCard } from "./QuestionCard";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useQuizCheating } from "@/hooks/useQuizCheating";
import { useToast } from "@/components/Toast";
import { normalizeQuizSettings, type QuizQuestion } from "@/types/quiz";

interface QuizData {
  id: string;
  title: string;
  questions?: QuizQuestion[];
  settings?: Record<string, unknown>;
  alreadyCompleted?: boolean;
  score?: number;
}

interface ChallengerInfo {
  username: string;
  score: number;
}

interface SubmitResult {
  score?: number;
  correct?: number;
  streak?: number;
  xpGained?: number;
  newAchievements?: string[];
  leveledUp?: boolean;
  newLevel?: number;
  oldLevel?: number;
}

// Ported from client/src/pages/QuizPage.jsx (~770 lines, the most complex
// single piece of v1 frontend logic — see MIGRATION_AUDIT.md Section 8).
// All `/api/*` calls here target Phase 3 routes that don't exist yet; this
// component is written against their exact documented v1 contract so it
// activates once Phase 3 implements them.
export function QuizClient({ id, challengerId }: { id: string; challengerId: string | null }) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const toast = useToast();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = window.localStorage.getItem(`quiz_progress_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [showRules, setShowRules] = useState(true);

  const [needsPin, setNeedsPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const answersRef = useRef<Record<number, string>>({});
  const submittedRef = useRef(false);
  const nonceRef = useRef<string | null>(null);

  const [feedback, setFeedback] = useState<Record<number, "correct" | "wrong">>({});
  const [streak, setStreak] = useState(0);
  const [locked, setLocked] = useState<Record<number, boolean>>({});
  const [showNavPalette, setShowNavPalette] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; oldLevel: number } | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [challengerInfo, setChallengerInfo] = useState<ChallengerInfo | null>(null);

  const s = useMemo(() => normalizeQuizSettings(quiz?.settings), [quiz]);

  const totalDuration = (s.duration || 60) * 60;
  const secondsPerQ = s.secondsPerQuestion || 30;
  const showSingleQuestion = s.visibility === "single";
  const isPractice = s.timer === "none" && s.tabSwitch === "disabled";

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${id}`);
        if (res.status === 403) {
          const body = await res.json().catch(() => null);
          if (body?.completed) {
            setQuiz({ id, title: "Quiz Completed", alreadyCompleted: true, score: body.score });
            setSubmitted(true);
          }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        setQuiz(data);
        setQuestions(data.questions ?? []);
        if (data.settings?.accessCode) setNeedsPin(true);

        try {
          const draftRes = await fetch(`/api/submissions/draft/${id}`);
          if (draftRes.ok) {
            const draftData = await draftRes.json();
            if (draftData.draft) setAnswers((prev) => ({ ...prev, ...draftData.draft }));
          }
        } catch {
          // draft fetch is optional
        }
      } catch {
        // handled by loading state remaining incomplete
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (!challengerId || !id) return;
    fetch(`/api/users/challenge-info?challengerId=${challengerId}&quizId=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setChallengerInfo(data))
      .catch(() => {});
  }, [challengerId, id]);

  useEffect(() => {
    answersRef.current = answers;
    if (Object.keys(answers).length > 0 && !submitted) {
      window.localStorage.setItem(`quiz_progress_${id}`, JSON.stringify(answers));
    }
  }, [answers, id, submitted]);

  const fetchNonce = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: id }),
      });
      const data = await res.json();
      nonceRef.current = data.nonce;
    } catch {
      // start-attempt failure surfaces later as a submit error
    }
  }, [id]);

  const lastSavedAnswersRef = useRef<Record<number, string>>({});
  useEffect(() => {
    if (!quiz || submittedRef.current || isPractice || Object.keys(answers).length === 0) return;

    const interval = setInterval(() => {
      const currentAnswersStr = JSON.stringify(answersRef.current);
      const lastSavedStr = JSON.stringify(lastSavedAnswersRef.current);
      if (currentAnswersStr !== lastSavedStr) {
        fetch("/api/submissions/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: id, answers: answersRef.current }),
        })
          .then(() => {
            lastSavedAnswersRef.current = { ...answersRef.current };
          })
          .catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
    // answers intentionally read via answersRef to avoid re-registering the interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, id, isPractice]);

  const handleAutoSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    setSubmitted(true);
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: id, answers: answersRef.current, nonce: nonceRef.current }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data: SubmitResult = await res.json();
      window.localStorage.removeItem(`quiz_progress_${id}`);

      if (data.xpGained) toast.xp(data.xpGained);
      (data.newAchievements ?? []).forEach((ach, i) => {
        setTimeout(() => toast.achievement(ach), i * 800);
      });
      if (data.leveledUp && data.newLevel !== undefined && data.oldLevel !== undefined) {
        setLevelUpData({ newLevel: data.newLevel, oldLevel: data.oldLevel });
      }

      setSubmitStatus("success");

      window.sessionStorage.setItem(
        `quiz_result_${id}`,
        JSON.stringify({
          score: data.score ?? 0,
          correct: data.correct ?? 0,
          total: questions.length,
          streak: data.streak ?? 0,
          quizTitle: quiz?.title ?? "",
          challenger: challengerInfo,
        })
      );
    } catch {
      setSubmitStatus("error");
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, toast, questions.length, quiz?.title, challengerInfo]);

  const { tabSwitched, tabStrikes, isFullscreen, startQuiz: requestFullscreen, reEnterFullscreen } = useQuizCheating({
    quiz,
    settings: s,
    submitted: submittedRef.current,
    showRules,
    id,
    handleAutoSubmit,
  });

  const startQuiz = async () => {
    if (needsPin && !pinVerified) {
      setShowPinModal(true);
      return;
    }
    await fetchNonce();
    const success = await requestFullscreen();
    if (success) setShowRules(false);
  };

  const handlePinVerified = async () => {
    setShowPinModal(false);
    setPinVerified(true);
    await fetchNonce();
    const success = await requestFullscreen();
    if (success) setShowRules(false);
  };

  const handleOptionSelect = useCallback(
    (questionIndex: number, option: string) => {
      if (locked[questionIndex]) return;
      setAnswers((prev) => ({ ...prev, [questionIndex]: option }));

      if (s.answerLock === "lock_on_select") {
        setLocked((prev) => ({ ...prev, [questionIndex]: true }));
      }

      if (isPractice) {
        const q = questions[questionIndex];
        const isCorrect = !!q.answer && option === q.answer;
        setFeedback((prev) => ({ ...prev, [questionIndex]: isCorrect ? "correct" : "wrong" }));
        setLocked((prev) => ({ ...prev, [questionIndex]: true }));
        setStreak((prev) => (isCorrect ? prev + 1 : 0));
      }
    },
    [locked, s.answerLock, isPractice, questions]
  );

  const handleToggleFlag = useCallback((idx: number) => {
    setFlags((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const goToNext = useCallback(() => {
    if (s.answerLock === "lock_on_next") {
      setLocked((prev) => ({ ...prev, [currentQ]: true }));
    }
    setCurrentQ((curr) => Math.min(curr + 1, questions.length - 1));
  }, [s.answerLock, currentQ, questions.length]);

  const goToPrev = () => {
    if (s.navigation === "forward_only" || s.navigation === "sequential_locked") return;
    setCurrentQ((curr) => Math.max(curr - 1, 0));
  };

  const handleSubmit = () => setShowSubmitConfirm(true);

  const displayName = clerkUser?.username || clerkUser?.firstName || "";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xl font-display animate-pulse">
        Loading quiz…
      </div>
    );
  }
  if (!quiz) {
    return <div className="flex min-h-[60vh] items-center justify-center text-xl font-display">Quiz not found</div>;
  }

  // v1 has no dedicated screen for this — the 403-completed response leaves
  // `showRules` true but `submitted` true too, which falls through every
  // branch below to the main quiz UI with an empty `questions` array (no
  // crash, since `s` ends up `{}` and `showSingleQuestion` false, but a
  // confusing "0 questions, Submit Final Answers" render). Added a real
  // screen instead of reproducing that gap.
  if (quiz.alreadyCompleted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <div className="card-tactile bg-green p-8 max-w-md">
          <h2 className="text-2xl font-display mb-2">Quiz Already Completed</h2>
          {quiz.score !== undefined && <p className="text-lg font-accent font-bold">Your score: {quiz.score} pts</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/leaderboard")} className="btn-tactile bg-blue text-white">
            View Leaderboard
          </button>
          <button onClick={() => router.push("/quizzes")} className="btn-tactile bg-ink text-white">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (tabSwitched) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle size={64} className="text-coral" />
        <h2 className="text-3xl font-display">Quiz Auto-Submitted</h2>
        <p className="text-lg font-accent font-bold text-ink/60">
          {s.tabSwitch === "three_strikes" ? "You switched tabs 3 times." : "You switched tabs during the quiz."}
        </p>
        <button onClick={() => router.push("/leaderboard")} className="btn-tactile bg-blue text-white mt-4">
          View Leaderboard
        </button>
      </div>
    );
  }

  if (showRules && !submitted && !quiz.alreadyCompleted && submitStatus === "idle") {
    return (
      <>
        {showPinModal && <PinGateModal quizId={id} onVerify={handlePinVerified} onCancel={() => setShowPinModal(false)} />}
        <RulesScreen settings={s} onStart={startQuiz} />
      </>
    );
  }

  if (submitStatus === "success") {
    return (
      <>
        {levelUpData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-yellow p-4">
            <div className="text-center max-w-sm">
              <p className="text-sm font-accent font-bold uppercase tracking-widest text-ink/60 mb-1">Level Up!</p>
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-4xl font-display text-ink/30 line-through">Lv.{levelUpData.oldLevel}</span>
                <span className="text-6xl font-display">Lv.{levelUpData.newLevel}</span>
              </div>
              <p className="text-lg font-accent font-bold mb-6">You reached Level {levelUpData.newLevel}!</p>
              <button onClick={() => setLevelUpData(null)} className="btn-tactile bg-ink text-white text-sm py-2 px-6">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-green p-4">
          <div className="max-w-xl text-center">
            <h2 className="text-3xl md:text-5xl font-display text-ink mb-8">Successfully Submitted!</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/quiz/${id}/results`)}
                className="btn-tactile justify-center bg-white text-ink text-lg py-4 px-8 w-full"
              >
                View My Results
              </button>
              <button
                onClick={() => router.push("/leaderboard")}
                className="btn-tactile justify-center bg-ink text-white text-base py-3 px-8 w-full"
              >
                View Leaderboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (submitStatus === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-coral p-4">
        <div className="max-w-xl text-center">
          <h2 className="text-3xl md:text-5xl font-display text-white mb-8">
            Error occurred during submission — try again
          </h2>
          <button
            onClick={() => {
              setSubmitStatus("idle");
              setSubmitted(false);
              submittedRef.current = false;
              handleAutoSubmit();
            }}
            className="btn-tactile justify-center bg-white text-ink text-lg py-4 px-8 w-full"
          >
            Retry Submission
          </button>
        </div>
      </div>
    );
  }

  if (!showRules && !submitted && !isFullscreen && !quiz.alreadyCompleted && !isPractice && submitStatus === "idle") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm">
        <div className="card-tactile max-w-lg w-full text-center overflow-hidden">
          <div className="bg-coral text-white p-4">
            <h1 className="text-xl font-display flex items-center justify-center gap-2">
              <AlertTriangle size={28} />
              Fullscreen Required
            </h1>
          </div>
          <div className="p-8">
            <p className="mb-6 font-accent font-bold">
              You exited fullscreen mode. You must return to fullscreen to continue the quiz.
            </p>
            <button onClick={reEnterFullscreen} className="btn-tactile w-full justify-center bg-ink text-white text-lg py-3">
              Return to Fullscreen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePerQuestionTimeout = () => {
    setCurrentQ((curr) => {
      if (curr >= questions.length - 1) {
        handleAutoSubmit();
        return curr;
      }
      return curr + 1;
    });
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flags).filter(Boolean).length;
  const settingsLabel = [
    s.timer === "global" ? "Global Timer" : s.timer === "per_question" ? "Per-Q Timer" : "Untimed",
    s.visibility === "single" ? "Single View" : "All Visible",
  ].join(" · ");

  const displayQuestions = showSingleQuestion ? [questions[currentQ]] : questions;
  const canGoPrev = s.navigation === "free" && currentQ > 0;

  return (
    <AntiCopy enabled={s.copyProtection}>
      {s.copyProtection && <WatermarkOverlay username={displayName} />}

      <ConfirmModal
        isOpen={showSubmitConfirm}
        title="Submit Quiz?"
        message={`You've answered ${Object.keys(answers).length} of ${questions.length} questions. This cannot be undone.`}
        confirmLabel="Submit"
        cancelLabel="Keep Going"
        onConfirm={() => {
          setShowSubmitConfirm(false);
          handleAutoSubmit();
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <div className="mx-auto max-w-4xl">
        {challengerInfo && (
          <div className="mb-4 p-3 rounded-[var(--radius-btn)] bg-purple text-white font-accent font-bold text-sm flex items-center gap-2">
            <Swords size={16} /> You&apos;ve been challenged by{" "}
            <span className="font-black">@{challengerInfo.username}</span> who scored{" "}
            <span className="font-black">{challengerInfo.score} pts</span> — beat them!
          </div>
        )}

        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-ink/10 pb-4 sm:pb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-display">{quiz.title}</h1>
            <p className="text-xs sm:text-sm font-accent font-bold text-ink/50 uppercase mt-1">
              {settingsLabel} · {questions.length} questions
              {flaggedCount > 0 && <span className="ml-2 text-yellow-deep">· {flaggedCount} flagged</span>}
            </p>
            {s.negativeMarking < 0 && (
              <p className="text-xs font-accent font-bold text-coral mt-0.5">Negative marking: {s.negativeMarking}</p>
            )}
            {s.tabSwitch === "three_strikes" && (
              <p className="text-xs font-accent font-bold text-coral mt-0.5 flex items-center gap-1">
                <AlertTriangle size={12} /> Tab switch: {tabStrikes}/3 strikes
              </p>
            )}
          </div>

          {!submitted && !showRules && (
            <>
              {s.timer === "global" && <QuizTimer duration={totalDuration} onTimeUp={handleAutoSubmit} mode="global" />}
              {s.timer === "per_question" && (
                <QuizTimer key={currentQ} duration={secondsPerQ} onTimeUp={handlePerQuestionTimeout} mode="per_question" />
              )}
            </>
          )}

          {isPractice && streak > 0 && (
            <div className="flex items-center gap-2 px-5 py-3 font-mono text-xl font-bold rounded-[var(--radius-btn)] shadow-[var(--shadow-tactile-sm)] bg-yellow">
              <Flame size={24} className="text-orange" />
              {streak} streak!
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center gap-3">
          <span className="font-accent font-bold text-sm uppercase text-ink/60">Progress</span>
          <div className="flex-1 h-3 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="font-mono font-bold text-sm">
            {answeredCount}/{questions.length}
          </span>
          <button
            type="button"
            onClick={() => setShowNavPalette((v) => !v)}
            className="md:hidden p-1.5 rounded-[var(--radius-btn)] border-2 border-ink/10 bg-white hover:bg-cream-alt transition-colors"
            title="Question navigator"
          >
            <LayoutGrid size={18} />
          </button>
        </div>

        {showNavPalette && (
          <div className="md:hidden mb-4 p-3 rounded-[var(--radius-card-sm)] border-2 border-ink/10 bg-white">
            <p className="text-xs font-accent font-bold uppercase mb-2 flex items-center gap-1 text-ink/60">
              <LayoutGrid size={12} /> Navigate
            </p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((_, idx) => {
                const isActive = showSingleQuestion && idx === currentQ;
                const isAnswered = answers[idx] !== undefined;
                const isFlagged = flags[idx];
                const isReachable =
                  !showSingleQuestion ||
                  s.navigation === "free" ||
                  (s.navigation === "forward_only" && idx <= currentQ) ||
                  (s.navigation === "sequential_locked" && idx <= currentQ);

                let cls = "bg-white hover:bg-cream-alt";
                if (isActive) cls = "bg-blue text-white";
                else if (isFlagged) cls = "bg-yellow";
                else if (isAnswered) cls = "bg-green";
                else if (!isReachable) cls = "bg-ink/10 opacity-50 cursor-not-allowed";

                const handleClick = () => {
                  if (!isReachable) return;
                  if (showSingleQuestion) {
                    setCurrentQ(idx);
                    setShowNavPalette(false);
                  } else {
                    document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setShowNavPalette(false);
                  }
                };

                return (
                  <button
                    key={idx}
                    onClick={handleClick}
                    disabled={!isReachable}
                    className={`w-9 h-9 rounded-[var(--radius-btn)] text-xs font-bold border-2 border-ink/10 transition-all ${cls}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-ink/10 text-xs font-accent font-bold">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-green" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow" /> Flagged
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-white border border-ink/20" /> Unanswered
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          <div className="hidden md:block w-24 shrink-0">
            <div className="sticky top-24 space-y-2">
              <p className="text-xs font-accent font-bold uppercase text-center mb-2 text-ink/60">Nav</p>
              <div className="grid grid-cols-5 gap-1">
                {questions.map((_, idx) => {
                  if (showSingleQuestion) {
                    const isActive = idx === currentQ;
                    const isAnswered = answers[idx] !== undefined;
                    const isFlagged = flags[idx];
                    const isReachable =
                      s.navigation === "free" ||
                      (s.navigation === "forward_only" && idx <= currentQ) ||
                      (s.navigation === "sequential_locked" && idx <= currentQ);

                    let btnClass = "bg-white hover:bg-cream-alt";
                    if (isActive) btnClass = "bg-blue text-white";
                    else if (isFlagged) btnClass = "bg-yellow";
                    else if (isAnswered) btnClass = "bg-green";
                    else if (!isReachable) btnClass = "bg-ink/10 opacity-50 cursor-not-allowed";

                    return (
                      <button
                        key={idx}
                        onClick={() => isReachable && setCurrentQ(idx)}
                        disabled={!isReachable}
                        className={`w-8 h-8 rounded-[var(--radius-btn)] text-xs font-bold border-2 border-ink/10 transition-all ${btnClass}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  }
                  const isFlagged = flags[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                      className={`w-8 h-8 rounded-[var(--radius-btn)] text-xs font-bold border-2 border-ink/10 transition-all ${
                        isFlagged ? "bg-yellow" : answers[idx] !== undefined ? "bg-blue text-white" : "bg-white hover:bg-cream-alt"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            {displayQuestions.map((q, displayIdx) => {
              const idx = showSingleQuestion ? currentQ : displayIdx;
              const isLocked = locked[idx] || (s.navigation === "sequential_locked" && showSingleQuestion && idx < currentQ);

              return (
                <QuestionCard
                  key={idx}
                  question={q}
                  idx={idx}
                  answer={answers[idx]}
                  feedback={feedback[idx]}
                  isLocked={isLocked}
                  onSelect={handleOptionSelect}
                  isPractice={isPractice}
                  isFlagged={flags[idx] || false}
                  onToggleFlag={handleToggleFlag}
                />
              );
            })}

            {showSingleQuestion && (
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPrev}
                  disabled={!canGoPrev}
                  className={`btn-tactile flex items-center gap-1 ${!canGoPrev ? "bg-ink/10 text-ink/40 opacity-50 cursor-not-allowed" : "bg-white"}`}
                >
                  <ChevronLeft size={20} /> Previous
                </button>
                <span className="font-mono font-bold">
                  {currentQ + 1} / {questions.length}
                </span>
                {currentQ < questions.length - 1 ? (
                  <button onClick={goToNext} className="btn-tactile bg-blue text-white flex items-center gap-1">
                    Next <ChevronRight size={20} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting} className="btn-tactile bg-green flex items-center gap-1">
                    <Send size={20} /> Submit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {!showSingleQuestion && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-tactile w-full mt-8 justify-center bg-green text-xl py-4"
          >
            {submitting ? (
              "Submitting…"
            ) : (
              <>
                <Send /> Submit Final Answers
              </>
            )}
          </button>
        )}
      </div>
    </AntiCopy>
  );
}

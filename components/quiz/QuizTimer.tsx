"use client";

import { useState, useEffect, useRef } from "react";
import { Timer } from "lucide-react";

// Ported from client/src/components/quiz/QuizTimer.jsx.
export function QuizTimer({
  duration,
  onTimeUp,
  mode,
}: {
  duration: number;
  onTimeUp: () => void;
  mode: "global" | "per_question";
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, onTimeUp]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const ss = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const getTimerColor = (current: number, total: number) => {
    const pct = current / total;
    if (pct > 0.5) return "bg-green";
    if (pct > 0.2) return "bg-yellow";
    return "bg-coral text-white";
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-[var(--radius-btn)] font-mono text-base sm:text-xl font-bold shadow-[var(--shadow-tactile-sm)] ${getTimerColor(timeLeft, duration)} ${
          timeLeft <= duration * 0.2 ? "animate-pulse" : ""
        }`}
      >
        <Timer size={20} />
        {mode === "global" ? formatTime(timeLeft) : `${timeLeft}s`}
      </div>
    </div>
  );
}

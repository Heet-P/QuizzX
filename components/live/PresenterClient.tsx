"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface RoomQuestion {
  question?: string;
  text?: string;
  options: string[];
}

interface Room {
  quiz_title?: string;
  quiz_questions?: RoomQuestion[];
  question_index?: number;
  state: "waiting" | "active" | "ended";
  participant_count?: number;
  quiz_settings?: { timer?: string; secondsPerQuestion?: number; duration?: number };
  settings?: { timer?: string; secondsPerQuestion?: number; duration?: number };
}

function TimerDisplay({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 10;

  return (
    <div className={`font-mono font-bold text-5xl sm:text-7xl tabular-nums transition-colors ${isUrgent ? "text-coral" : "text-yellow"}`}>
      {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : String(secs)}
    </div>
  );
}

const OPTION_COLORS = ["bg-blue", "bg-green", "bg-yellow", "bg-coral"];
const OPTION_LETTERS = ["A", "B", "C", "D"];

function OptionChip({ label, index }: { label: string; index: number }) {
  return (
    <div className={`flex items-center gap-4 rounded-[var(--radius-card-sm)] p-4 sm:p-5 ${OPTION_COLORS[index % OPTION_COLORS.length]}`}>
      <span className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-ink font-bold text-xl shrink-0">
        {OPTION_LETTERS[index] || index + 1}
      </span>
      <span className="font-accent font-bold text-lg sm:text-xl text-ink leading-snug">{label}</span>
    </div>
  );
}

// Ported from client/src/pages/PresenterPage.jsx — a fullscreen, chrome-free
// projector/TV display (see app/(presenter)/layout.tsx for why this route
// isn't under the normal (protected) app shell). `/api/rooms/*` are Phase 3
// work, not built yet. Dropped v1's inline `fontFamily: "Space Grotesk"`
// override — the site's own display/sans fonts apply sitewide now, no
// per-page override needed.
export function PresenterClient({ code }: { code: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQuestionIndexRef = useRef<number | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      const roomData: Room = data?.room ?? data;
      setRoom(roomData);

      if (lastQuestionIndexRef.current !== roomData.question_index) {
        lastQuestionIndexRef.current = roomData.question_index ?? 0;

        const settings = roomData.quiz_settings || roomData.settings || {};
        if (settings.timer === "per_question" && settings.secondsPerQuestion) {
          setTimerSeconds(settings.secondsPerQuestion);
        } else if (settings.timer === "global" && settings.duration && lastQuestionIndexRef.current === 0) {
          setTimerSeconds(settings.duration * 60);
        } else {
          setTimerSeconds(null);
        }
      }
    } catch {
      // keep prior room on transient failure
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  useEffect(() => {
    if (timerSeconds === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // Restart only when the timer resets to a new value (question change), not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastQuestionIndexRef.current]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="text-yellow text-3xl font-display animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="text-coral text-3xl font-display">Room not found.</div>
      </div>
    );
  }

  const question = room.quiz_questions?.[room.question_index ?? 0];
  const total = room.quiz_questions?.length || 0;
  const options = question?.options || [];
  const settings = room.quiz_settings || room.settings || {};
  const hasTimer = settings.timer === "per_question" || settings.timer === "global";

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b-2 border-yellow/40">
        <span className="text-2xl sm:text-3xl font-display text-yellow">QUIZZX</span>
        <span className="text-white font-accent font-bold text-sm uppercase opacity-60">{room.quiz_title || "Live Quiz"}</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">
        {room.state === "waiting" && (
          <div className="text-center space-y-6">
            <div className="text-yellow text-xl font-display animate-pulse">Waiting for host to start…</div>
            <div className="text-white opacity-60 text-sm font-accent font-bold">
              Room code: <span className="font-mono font-bold text-yellow text-3xl tracking-widest">{code}</span>
            </div>
          </div>
        )}

        {room.state === "ended" && (
          <div className="text-center space-y-4">
            <div className="text-green text-5xl font-display">Quiz Complete!</div>
            <div className="text-white opacity-60 font-accent font-bold">Thank you for participating.</div>
          </div>
        )}

        {room.state === "active" && question && (
          <div className="w-full max-w-4xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-yellow font-display text-xl">Question</span>
                <span className="w-14 h-14 flex items-center justify-center rounded-full bg-yellow text-ink font-bold text-2xl">
                  {(room.question_index ?? 0) + 1}
                </span>
                <span className="text-white font-accent font-bold opacity-60 text-xl">/ {total}</span>
              </div>
              {hasTimer && timerSeconds !== null && <TimerDisplay seconds={timerSeconds} />}
            </div>

            <div className="bg-white rounded-[var(--radius-card)] p-8 sm:p-12">
              <p className="text-ink text-3xl sm:text-4xl font-display leading-tight">{question.question || question.text}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.map((opt, i) => (
                <OptionChip key={i} label={opt} index={i} />
              ))}
            </div>
          </div>
        )}

        {room.state === "active" && !question && (
          <div className="text-white text-2xl font-display animate-pulse">Loading question…</div>
        )}
      </main>

      <footer className="flex items-center justify-between px-8 py-4 border-t border-yellow/20">
        <span className="text-white opacity-40 text-sm font-accent font-bold uppercase">{room.participant_count ?? 0} participants</span>
        <span className="font-mono font-bold text-yellow/60 text-lg tracking-widest">{code}</span>
      </footer>
    </div>
  );
}

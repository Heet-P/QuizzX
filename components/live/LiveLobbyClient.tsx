"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Users, Play, ChevronRight, StopCircle, Copy, CheckCircle, Loader, Monitor } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { apiFetch, ApiError, errorMessage } from "@/lib/api-client";

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
  is_host?: boolean;
  host_name?: string;
}

function OptionButton({
  option,
  selected,
  onSelect,
  disabled,
}: {
  option: string;
  selected: boolean;
  onSelect: (option: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onSelect(option)}
      disabled={disabled}
      className={`w-full text-left btn-tactile py-4 px-5 text-base transition-all ${
        selected ? "bg-blue text-white" : "bg-white hover:bg-yellow"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {option}
    </button>
  );
}

function HostView({
  room,
  code,
  onStart,
  onNext,
  onRequestEnd,
  advancing,
  ending,
  actionError,
}: {
  room: Room;
  code: string;
  onStart: () => void;
  onNext: () => void;
  onRequestEnd: () => void;
  advancing: boolean;
  ending: boolean;
  actionError: string | null;
}) {
  const [codeCopied, setCodeCopied] = useState(false);
  const question = room.quiz_questions?.[room.question_index ?? 0];
  const total = room.quiz_questions?.length || 0;

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="card-tactile bg-blue text-white text-center p-6">
        <p className="text-sm font-accent font-bold uppercase opacity-80 mb-1">Room Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl font-display tracking-widest font-mono">{code}</span>
          <button onClick={copyCode} className="btn-tactile bg-white text-ink p-2">
            {codeCopied ? <CheckCircle size={20} /> : <Copy size={20} />}
          </button>
        </div>
        <p className="text-sm opacity-70 mt-2">Share this code with participants</p>
      </div>

      <div className="card-tactile bg-yellow flex items-center gap-3 p-6">
        <Users size={28} />
        <div>
          <p className="font-display text-2xl">{room.participant_count || 0}</p>
          <p className="text-xs font-accent font-bold uppercase text-ink/60">Participants joined</p>
        </div>
      </div>

      {room.state === "active" && question && (
        <div className="card-tactile p-6">
          <p className="text-xs font-accent font-bold uppercase text-ink/50 mb-1">
            Question {(room.question_index ?? 0) + 1} of {total}
          </p>
          <p className="font-accent font-bold text-base">{question.question || question.text}</p>
        </div>
      )}

      {actionError && <div className="card-tactile bg-coral text-white text-sm font-accent font-bold px-4 py-3">{actionError}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        {room.state === "waiting" && (
          <button onClick={onStart} disabled={advancing} className="btn-tactile bg-green flex-1 justify-center text-lg py-4 disabled:opacity-50">
            <Play size={22} /> {advancing ? "Starting…" : "Start Quiz"}
          </button>
        )}

        {room.state === "active" && (room.question_index ?? 0) < total - 1 && (
          <button onClick={onNext} disabled={advancing} className="btn-tactile bg-blue text-white flex-1 justify-center text-lg py-4 disabled:opacity-50">
            <ChevronRight size={22} /> {advancing ? "Moving…" : "Next Question"}
          </button>
        )}

        <button
          onClick={() => window.open(`/live/${code}/display`, "_blank")}
          className="btn-tactile bg-yellow justify-center py-4 px-6"
          title="Open presenter view in a new tab (for projector / TV)"
        >
          <Monitor size={20} /> Presenter View
        </button>

        <button
          onClick={onRequestEnd}
          disabled={ending || room.state === "ended"}
          className="btn-tactile bg-coral text-white justify-center py-4 px-6 disabled:opacity-50"
        >
          <StopCircle size={20} /> {ending ? "Ending…" : "End Lobby"}
        </button>
      </div>
    </div>
  );
}

function ParticipantView({
  room,
  onAnswer,
  selectedAnswer,
}: {
  room: Room;
  onAnswer: (option: string) => void;
  selectedAnswer: string | undefined;
}) {
  if (room.state === "waiting") {
    return (
      <div className="card-tactile bg-yellow text-center py-16">
        <Loader size={40} className="mx-auto mb-4 animate-spin" />
        <h2 className="text-2xl font-display">Waiting for host to start…</h2>
        <p className="text-sm font-accent font-bold text-ink/60 mt-2">Get ready!</p>
      </div>
    );
  }

  if (room.state === "ended") {
    return (
      <div className="card-tactile bg-green text-center py-16">
        <CheckCircle size={48} className="mx-auto mb-4" />
        <h2 className="text-2xl font-display">Quiz Ended!</h2>
        <p className="text-sm font-accent font-bold mt-2">Thanks for participating.</p>
      </div>
    );
  }

  const question = room.quiz_questions?.[room.question_index ?? 0];
  if (!question) {
    return (
      <div className="card-tactile text-center py-12">
        <p className="text-lg font-accent font-bold animate-pulse">Loading question…</p>
      </div>
    );
  }

  const total = room.quiz_questions?.length || 0;
  const options = question.options || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-accent font-bold uppercase text-ink/50">
          Question {(room.question_index ?? 0) + 1} / {total}
        </span>
        {selectedAnswer && <span className="chip bg-green normal-case text-xs py-1 px-3">Answered</span>}
      </div>

      <div className="card-tactile bg-blue text-white p-6">
        <p className="text-xl sm:text-2xl font-display">{question.question || question.text}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <OptionButton key={i} option={opt} selected={selectedAnswer === opt} onSelect={onAnswer} disabled={!!selectedAnswer} />
        ))}
      </div>

      {selectedAnswer && (
        <p className="text-center font-accent font-bold text-sm text-ink/50">
          Your answer: <span className="font-bold text-ink">{selectedAnswer}</span> — waiting for next question
        </p>
      )}
    </div>
  );
}

// Ported from client/src/pages/LiveLobbyPage.jsx (the `code` branch — the
// no-code CreateLobby branch is now its own route, app/(protected)/live/page.tsx).
// `/api/rooms/*` are Phase 3 work, not built yet.
export function LiveLobbyClient({ code }: { code: string }) {
  const router = useRouter();
  const { user: clerkUser } = useUser();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await apiFetch<{ room?: Room } | Room>(`/api/rooms/${code}`);
      setRoom((data as { room?: Room }).room ?? (data as Room));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Room not found.");
        return;
      }
      // keep prior room on other transient failures
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchRoom();
    // Auto-join so answers can be submitted (idempotent on the server).
    apiFetch(`/api/rooms/${code}/join`, { method: "POST" }).catch(() => {});
    pollRef.current = setInterval(fetchRoom, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchRoom, code]);

  const currentUsername = clerkUser?.username || clerkUser?.firstName || "";
  const isHost = room ? room.is_host === true || room.host_name?.toLowerCase() === currentUsername?.toLowerCase() : false;

  const handleStart = async () => {
    setAdvancing(true);
    setActionError(null);
    try {
      await apiFetch(`/api/rooms/${code}/advance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_index: 0, state: "active" }),
      });
      fetchRoom();
    } catch (err) {
      setActionError(errorMessage(err, "Failed to start"));
    } finally {
      setAdvancing(false);
    }
  };

  const handleNext = async () => {
    setAdvancing(true);
    setActionError(null);
    try {
      await apiFetch(`/api/rooms/${code}/advance`, { method: "PATCH" });
      fetchRoom();
    } catch (err) {
      setActionError(errorMessage(err, "Failed to advance"));
    } finally {
      setAdvancing(false);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    setActionError(null);
    try {
      await apiFetch(`/api/rooms/${code}/end`, { method: "POST" });
      fetchRoom();
    } catch (err) {
      setActionError(errorMessage(err, "Failed to end lobby"));
    } finally {
      setEnding(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const idx = room?.question_index ?? 0;
    setSelectedAnswers((prev) => ({ ...prev, [idx]: answer }));
    try {
      await apiFetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_index: idx, answer }),
      });
    } catch {
      // non-fatal: answer stays recorded locally for UX
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-2xl font-display animate-pulse">Joining room…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card-tactile bg-coral text-white max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-display">{error}</h1>
          <button onClick={() => router.push("/live")} className="btn-tactile bg-white text-ink mt-4">
            Create New Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display">{room.quiz_title || "Live Quiz"}</h1>
          <p className="text-sm font-accent font-bold text-ink/50 mt-0.5">
            Room: <span className="font-mono font-bold">{code}</span>
            {" · "}
            <span
              className={`uppercase text-xs font-bold px-1.5 py-0.5 rounded-[var(--radius-chip)] ${
                room.state === "active" ? "bg-green" : room.state === "ended" ? "bg-cream-deep" : "bg-yellow"
              }`}
            >
              {room.state || "waiting"}
            </span>
          </p>
        </div>
        {isHost && <span className="text-xs font-accent font-bold uppercase bg-purple text-white px-2 py-1 rounded-[var(--radius-chip)]">Host</span>}
      </div>

      <ConfirmModal
        isOpen={showEndConfirm}
        title="End Lobby?"
        message="This will end the session for all participants."
        confirmLabel="End Lobby"
        danger
        onConfirm={() => {
          setShowEndConfirm(false);
          handleEnd();
        }}
        onCancel={() => setShowEndConfirm(false)}
      />

      {isHost ? (
        <HostView
          room={room}
          code={code}
          onStart={handleStart}
          onNext={handleNext}
          onRequestEnd={() => setShowEndConfirm(true)}
          advancing={advancing}
          ending={ending}
          actionError={actionError}
        />
      ) : (
        <ParticipantView room={room} onAnswer={handleAnswer} selectedAnswer={selectedAnswers[room.question_index ?? 0]} />
      )}
    </div>
  );
}

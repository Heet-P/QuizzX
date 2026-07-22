"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

interface QuizOption {
  id: string;
  title: string;
}

// Ported from client/src/pages/LiveLobbyPage.jsx's inline CreateLobby
// (rendered when there's no room `code` in the URL). `/api/rooms` and
// `/api/admin/quizzes` are Phase 3 work, not built yet.
export default function CreateLobbyPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/quizzes")
      .then((res) => res.json())
      .then((data) => setQuizzes(Array.isArray(data) ? data : []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!selectedQuiz) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: selectedQuiz }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create lobby");
      const code = data?.code || data?.room_code || data?.room?.code;
      if (code) router.push(`/live/${code}`);
      else setError("Room created but no code returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lobby");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-display flex items-center gap-3">
        <Users size={30} /> Create Live Lobby
      </h1>
      <div className="card-tactile p-6 space-y-4">
        {loading ? (
          <p className="font-accent font-bold animate-pulse">Loading quizzes…</p>
        ) : (
          <>
            <label className="block text-sm font-accent font-bold uppercase mb-1">Select Quiz</label>
            <select value={selectedQuiz} onChange={(e) => setSelectedQuiz(e.target.value)} className="input-tactile">
              <option value="">-- Choose a quiz --</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
            {error && <p className="text-sm font-accent font-bold text-coral">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={!selectedQuiz || creating}
              className="btn-tactile w-full justify-center bg-green text-lg py-3 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Lobby"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

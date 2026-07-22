"use client";

import { useState } from "react";
import { Key } from "lucide-react";

// Ported from client/src/pages/QuizPage.jsx's inline PinGateModal.
export function PinGateModal({
  quizId,
  onVerify,
  onCancel,
}: {
  quizId: string;
  onVerify: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`/api/quizzes/${quizId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        onVerify();
      } else {
        setError("Incorrect access code. Try again.");
      }
    } catch {
      setError("Could not verify. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4">
      <div className="card-tactile max-w-sm w-full overflow-hidden">
        <div className="bg-ink text-white p-4">
          <h2 className="text-lg font-display flex items-center gap-2">
            <Key size={20} /> Access Code Required
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm font-accent font-bold text-ink/60">
            Enter the access code provided by your admin to start this quiz.
          </p>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input-tactile text-center text-2xl font-mono tracking-widest"
            placeholder="••••••"
            autoFocus
            required
          />
          {error && <p className="text-coral font-accent font-bold text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="btn-tactile flex-1 justify-center bg-cream-alt">
              Cancel
            </button>
            <button type="submit" disabled={checking} className="btn-tactile flex-1 justify-center bg-ink text-white">
              {checking ? "Checking…" : "Verify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

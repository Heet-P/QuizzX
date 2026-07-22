"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Copy } from "lucide-react";

// Ported from the username-edit portion of client/src/pages/ProfilePage.jsx.
// `/api/users/profile` PUT is Phase 3 work, not built yet.
export function UsernameForm({ username, userCode, email }: { username: string; userCode: string | null; email: string }) {
  const [newUsername, setNewUsername] = useState(username);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update username");
      setNewUsername(data.user.username);
      showMessage("success", "Username updated successfully!");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-tactile p-6 sm:p-8 space-y-4">
      {message && (
        <div
          className={`p-4 rounded-[var(--radius-btn)] font-accent font-bold flex items-center gap-2 ${
            message.type === "success" ? "bg-green" : "bg-coral text-white"
          }`}
        >
          {message.type === "success" ? <CheckCircle /> : <AlertCircle />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-accent font-bold uppercase mb-2">Display Username</label>
          <p className="text-xs text-ink/50 font-accent font-bold mb-3">This is the name that will appear on the global leaderboard.</p>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="input-tactile text-lg"
            placeholder="Enter a cool username…"
            required
            minLength={3}
            maxLength={50}
          />
        </div>

        {userCode && (
          <div>
            <label className="block text-sm font-accent font-bold uppercase mb-2">Your User Code</label>
            <p className="text-xs text-ink/50 font-accent font-bold mb-3">Your unique identifier. Share this with others.</p>
            <div className="flex gap-2">
              <input type="text" value={userCode} className="input-tactile bg-cream font-mono text-lg cursor-not-allowed" disabled />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(userCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="btn-tactile bg-ink text-white px-3"
              >
                {copiedCode ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-accent font-bold uppercase mb-2">Email Address</label>
          <input type="email" value={email} className="input-tactile bg-cream text-ink/50 cursor-not-allowed" disabled />
        </div>

        <button
          type="submit"
          disabled={saving || newUsername === username}
          className="btn-tactile w-full justify-center bg-blue text-white text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

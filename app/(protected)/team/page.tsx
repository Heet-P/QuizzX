"use client";

import { useState, useEffect } from "react";
import { Users, Copy, CheckCircle, AlertCircle, Plus, LogIn, Crown, User, LogOut, Info } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

interface TeamMember {
  user_id: string;
  username: string;
  user_code?: string;
  role: "leader" | "member";
}

interface Team {
  name: string;
  team_code: string;
  created_at: string;
  your_role: "leader" | "member";
  members: TeamMember[];
}

// Ported from client/src/pages/TeamPage.jsx. `/api/teams/*` are Phase 3 work,
// not built yet.
export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/teams/mine");
        const data = await res.json();
        setTeam(data.team ?? null);
      } catch {
        // team stays null; page falls back to create/join forms
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create team");
      setTeam(data.team);
      showMessage("success", `Team "${data.team.name}" created! Share the code: ${data.team.team_code}`);
      setTeamName("");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join team");
      setTeam(data.team);
      showMessage("success", `Joined team "${data.team.name}" successfully!`);
      setJoinCode("");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to join team");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    if (!team) return;
    const isLeader = team.your_role === "leader";
    const memberCount = team.members?.length || 0;
    const msg =
      isLeader && memberCount > 1
        ? `You are the team leader. Leaving will transfer leadership to the next member. Leave "${team.name}"?`
        : isLeader && memberCount === 1
          ? `You are the only member. Leaving will delete the team "${team.name}". Continue?`
          : `Leave team "${team.name}"?`;
    setLeaveConfirm({
      title: "Leave Team?",
      message: msg,
      onConfirm: async () => {
        setLeaveConfirm(null);
        setLeaving(true);
        try {
          const res = await fetch("/api/teams/mine", { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || "Failed to leave team");
          }
          setTeam(null);
          showMessage("success", "You have left the team.");
        } catch (err) {
          showMessage("error", err instanceof Error ? err.message : "Failed to leave team");
        } finally {
          setLeaving(false);
        }
      },
    });
  };

  const copyCode = () => {
    if (team?.team_code) {
      navigator.clipboard.writeText(team.team_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-xl sm:text-2xl font-display animate-pulse">Loading team…</div>
      </div>
    );
  }

  if (team) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
        <ConfirmModal
          isOpen={!!leaveConfirm}
          title={leaveConfirm?.title || ""}
          message={leaveConfirm?.message}
          confirmLabel="Leave"
          danger
          onConfirm={leaveConfirm?.onConfirm || (() => {})}
          onCancel={() => setLeaveConfirm(null)}
        />
        <h1 className="flex items-center gap-3 text-3xl sm:text-5xl font-display">
          <Users size={36} className="text-blue" />
          Your Team
        </h1>

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

        <div className="card-tactile bg-yellow p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display">{team.name}</h2>
              <p className="text-sm font-accent font-bold text-ink/60 mt-1">
                Created {new Date(team.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg sm:text-xl font-bold bg-white px-4 py-2 rounded-[var(--radius-btn)]">
                {team.team_code}
              </span>
              <button onClick={copyCode} className="btn-tactile bg-ink text-white p-2.5" title="Copy team code">
                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <p className="text-xs font-accent font-bold text-ink/60 mb-4">Share this code with others to join your team.</p>

          <div className="flex justify-end mb-4">
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="btn-tactile bg-coral text-white text-sm disabled:opacity-50"
            >
              <LogOut size={16} /> {leaving ? "Leaving…" : "Leave Team"}
            </button>
          </div>

          <div className="rounded-[var(--radius-card-sm)] bg-white overflow-hidden">
            <div className="p-3 bg-ink text-white font-accent font-bold text-sm uppercase">
              Members ({team.members?.length || 0})
            </div>
            {team.members?.map((member, idx) => (
              <div
                key={member.user_id}
                className={`flex items-center justify-between p-3 sm:p-4 ${idx !== team.members.length - 1 ? "border-b border-ink/10" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {member.role === "leader" ? <Crown size={18} className="text-yellow-deep" /> : <User size={18} className="text-ink/30" />}
                  <div>
                    <span className="font-accent font-bold text-sm sm:text-base">{member.username}</span>
                    {member.user_code && <span className="text-xs text-ink/40 font-mono ml-2">{member.user_code}</span>}
                  </div>
                </div>
                <span
                  className={`text-xs font-accent font-bold uppercase px-2 py-1 rounded-[var(--radius-chip)] ${
                    member.role === "leader" ? "bg-yellow" : "bg-cream"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      <h1 className="flex items-center gap-3 text-3xl sm:text-5xl font-display">
        <Users size={36} className="text-blue" />
        Join a Team
      </h1>

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

      <p className="text-sm sm:text-base font-accent font-bold text-ink/60 bg-yellow/30 p-4 rounded-[var(--radius-btn)] flex items-center gap-2">
        <Info size={18} className="shrink-0" /> You can leave your team at any time — unless a team quiz is currently live.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card-tactile p-6">
          <h2 className="flex items-center gap-2 text-xl font-display mb-4">
            <Plus size={20} />
            Create Team
          </h2>
          <p className="text-xs text-ink/50 font-accent font-bold mb-4">
            Create a new team and get a code to share with your teammates.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input-tactile"
              placeholder="Team name…"
              required
              minLength={2}
              maxLength={50}
            />
            <button
              type="submit"
              disabled={creating || !teamName.trim()}
              className="btn-tactile w-full justify-center bg-blue text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Team"}
            </button>
          </form>
        </div>

        <div className="card-tactile p-6">
          <h2 className="flex items-center gap-2 text-xl font-display mb-4">
            <LogIn size={20} />
            Join Team
          </h2>
          <p className="text-xs text-ink/50 font-accent font-bold mb-4">
            Enter the 6-character team code shared by your team leader.
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-tactile font-mono text-center text-xl tracking-widest"
              placeholder="XXXXXX"
              required
              minLength={6}
              maxLength={6}
            />
            <button
              type="submit"
              disabled={joining || joinCode.trim().length !== 6}
              className="btn-tactile w-full justify-center bg-ink text-white disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join Team"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

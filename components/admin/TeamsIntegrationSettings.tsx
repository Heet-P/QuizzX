"use client";

import { useState, useEffect, useCallback } from "react";
import { MessagesSquare, CheckCircle, AlertCircle, Send, Loader, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { timeAgo } from "@/lib/time-ago";

interface IntegrationStatus {
  configured: boolean;
  label: string | null;
  updatedAt: string | null;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
}

// New settings card for Teams score publishing. Shared between /admin and
// /teacher (same "shared control center" pattern as DailyChallengePanel).
// The webhook URL is a bearer secret (see lib/teams-crypto.ts) — this
// component never receives it back from the server, not even masked; once
// saved, the form only shows whether a channel is linked, never the URL.
export function TeamsIntegrationSettings() {
  const toast = useToast();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch<IntegrationStatus>("/api/teacher/teams-integration");
      setStatus(data);
    } catch {
      // leave status null; the form below still works
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/teacher/teams-integration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), label: label.trim() || undefined }),
      });
      toast.success("Teams channel linked");
      setWebhookUrl("");
      setLabel("");
      fetchStatus();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save the webhook URL"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await apiFetch("/api/teacher/teams-integration/test", { method: "POST" });
      toast.success("Test message sent — check your Teams channel");
      fetchStatus();
    } catch (err) {
      toast.error(errorMessage(err, "Test message failed to send"));
      fetchStatus();
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    try {
      await apiFetch("/api/teacher/teams-integration", { method: "DELETE" });
      toast.success("Teams channel unlinked");
      fetchStatus();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to unlink"));
    }
  };

  return (
    <section className="card-tactile p-6 sm:p-8">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-display">
        <MessagesSquare size={22} /> Teams Score Publishing
      </h2>

      <div className={`rounded-[var(--radius-card-sm)] p-4 mb-5 ${status?.configured ? "bg-green" : "bg-cream"}`}>
        {loading ? (
          <p className="font-accent font-bold animate-pulse text-sm">Loading…</p>
        ) : status?.configured ? (
          <div className="flex items-start gap-3">
            <CheckCircle size={22} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-accent font-bold text-sm uppercase">Channel linked{status.label ? `: ${status.label}` : ""}</p>
              <p className="text-xs font-accent font-bold text-ink/60 mt-1">
                {status.lastTestedAt
                  ? `Last tested ${timeAgo(status.lastTestedAt)} — ${status.lastTestOk ? "delivered OK" : "failed"}`
                  : "Not tested yet — send a test message to confirm it lands in the right channel."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="shrink-0 mt-0.5 text-coral" />
            <div>
              <p className="font-accent font-bold text-sm uppercase">No Teams channel linked</p>
              <p className="text-xs font-accent font-bold text-ink/50 mt-1">
                &ldquo;Publish Scores&rdquo; won&apos;t work on any of your quizzes until you link one below.
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block font-accent font-bold text-sm uppercase mb-1">Workflow Webhook URL *</label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="input-tactile font-mono text-xs"
            placeholder="https://.../triggers/manual/paths/invoke?...&sig=..."
            autoComplete="off"
          />
          <p className="text-xs font-accent font-bold text-ink/50 mt-1">
            In Teams: open the channel → Workflows → look for the webhook-alert template (worded something like
            &ldquo;Send webhook alerts to a channel&rdquo; or &ldquo;Post to a channel when a webhook request is received&rdquo;
            depending on your Teams version) → pick this channel → copy the URL it gives you.
            {status?.configured && " Pasting a new one here replaces the current channel."}
          </p>
        </div>
        <div>
          <label className="block font-accent font-bold text-sm uppercase mb-1">Label (optional)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input-tactile"
            placeholder="e.g. Period 3 — Teams channel"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving || !webhookUrl.trim()} className="btn-tactile bg-ink text-white text-sm disabled:opacity-50">
            {saving ? <Loader size={16} className="animate-spin" /> : <MessagesSquare size={16} />}
            {saving ? "Saving…" : "Save"}
          </button>
          {status?.configured && (
            <>
              <button type="button" onClick={handleTest} disabled={testing} className="btn-tactile bg-blue text-white text-sm disabled:opacity-50">
                {testing ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                {testing ? "Sending…" : "Send Test Message"}
              </button>
              <button type="button" onClick={handleRemove} className="btn-tactile bg-coral text-white text-sm">
                <Trash2 size={16} /> Unlink
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}

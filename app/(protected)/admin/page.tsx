"use client";

import { useState, useEffect } from "react";
import { Shield, Eye, Key } from "lucide-react";
import { QuizManager, type ManagedQuiz } from "@/components/admin/QuizManager";
import { QuizUploader } from "@/components/admin/QuizUploader";
import { DailyChallengePanel } from "@/components/admin/DailyChallengePanel";
import { TeamsIntegrationSettings } from "@/components/admin/TeamsIntegrationSettings";
import { useToast } from "@/components/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";

// Ported from client/src/pages/AdminPage.jsx. `/api/admin/*` are Phase 3 work,
// not built yet.
export default function AdminPage() {
  const toast = useToast();
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [selectedQuizForKey, setSelectedQuizForKey] = useState("");
  const [quizzes, setQuizzes] = useState<ManagedQuiz[]>([]);
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch<{ leaderboard_visible?: boolean }>("/api/admin/settings");
      setLeaderboardVisible(data.leaderboard_visible !== false);
    } catch {
      // keep default (visible)
    }
  };

  const fetchQuizzes = async () => {
    try {
      const data = await apiFetch<ManagedQuiz[]>("/api/admin/quizzes");
      setQuizzes(data);
    } catch {
      // leave quizzes empty
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchSettings();
  }, []);

  const handleUploadAnswerKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerKeyFile || !selectedQuizForKey) return;
    const formData = new FormData();
    formData.append("answerFile", answerKeyFile);
    try {
      const data = await apiFetch<{ message?: string }>(`/api/admin/quizzes/${selectedQuizForKey}/answer-key`, {
        method: "POST",
        body: formData,
      });
      toast.success(data.message || "Answer key mapped successfully");
      setAnswerKeyFile(null);
      setSelectedQuizForKey("");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to upload answer key"));
    }
  };

  const toggleLeaderboard = async () => {
    const newValue = !leaderboardVisible;
    try {
      await apiFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "leaderboard_visible", value: newValue }),
      });
      setLeaderboardVisible(newValue);
      toast.success(`Leaderboard ${newValue ? "shown" : "hidden"} for users`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to toggle leaderboard"));
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      <h1 className="text-3xl sm:text-5xl font-display flex items-center gap-2">
        <Shield size={32} />
        Admin Dashboard
      </h1>

      <section className="card-tactile p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Eye size={22} />
            <div>
              <h3 className="font-accent font-bold text-base sm:text-lg uppercase">Leaderboard Visibility</h3>
              <p className="text-xs sm:text-sm text-ink/50 font-accent font-bold">
                {leaderboardVisible ? "Users can see the leaderboard" : "Leaderboard is hidden from users"}
              </p>
            </div>
          </div>
          <button onClick={toggleLeaderboard} className={`btn-tactile px-6 text-sm ${leaderboardVisible ? "bg-green" : "bg-coral text-white"}`}>
            {leaderboardVisible ? "On" : "Off"}
          </button>
        </div>
      </section>

      <TeamsIntegrationSettings />

      <QuizManager quizzes={quizzes} fetchQuizzes={fetchQuizzes} />

      <section className="card-tactile bg-yellow p-6 sm:p-8">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-display">
          <Key /> Upload Answer Key
        </h2>
        <p className="mb-4 text-sm font-mono bg-white rounded-[var(--radius-btn)] p-3">
          Format: <strong>Q1: D</strong> or <strong>1: A</strong>
        </p>
        <form onSubmit={handleUploadAnswerKey} className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <select value={selectedQuizForKey} onChange={(e) => setSelectedQuizForKey(e.target.value)} className="input-tactile" required>
            <option value="">-- Select a quiz --</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".md,.txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setAnswerKeyFile(e.target.files?.[0] ?? null)}
            className="w-full cursor-pointer bg-white rounded-[var(--radius-btn)] p-2 file:mr-4 file:border-0 file:rounded-[var(--radius-btn)] file:bg-ink file:px-4 file:py-2 file:text-white file:font-accent file:font-bold"
            required
          />
          <button className="btn-tactile justify-center bg-ink text-white sm:col-span-2">Map Answer Key</button>
        </form>
      </section>

      <DailyChallengePanel />

      <QuizUploader fetchQuizzes={fetchQuizzes} />
    </div>
  );
}

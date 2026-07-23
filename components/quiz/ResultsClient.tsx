"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Trophy, Flame, Copy, CheckCircle, ExternalLink, Swords, Handshake, Frown, ImageIcon } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { ShareCardModal } from "./ShareCardModal";

interface ResultData {
  score: number;
  correct: number;
  total: number;
  quizTitle: string;
  streak: number;
}

interface ChallengerInfo {
  username: string;
  score: number;
}

interface StashedResult extends ResultData {
  challenger: ChallengerInfo | null;
}

function CircleRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? score / total : 0;
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = pct >= 0.7 ? "#22c55e" : pct >= 0.4 ? "#ffd200" : "#ff4b36";

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(20,18,15,0.1)" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="70" y="63" textAnchor="middle" fontSize="26" fontWeight="700" fill="#14120f">
        {score}
      </text>
      <text x="70" y="84" textAnchor="middle" fontSize="13" fontWeight="700" fill="#14120f99">
        / {total}
      </text>
    </svg>
  );
}

function ConfettiDots() {
  // Fixed per mount (not re-randomized on re-render), matching v1.
  const dots = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        color: ["#2e5bff", "#ffd200", "#22c55e", "#ff4b36", "#8b5cf6"][i % 5],
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 6 + Math.random() * 10,
        delay: Math.random() * 1.2,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: -20, scale: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, 30, 60, 120], scale: [0, 1, 1, 0] }}
          transition={{ duration: 2.5, delay: d.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            borderRadius: "9999px",
          }}
        />
      ))}
    </div>
  );
}

// Ported from client/src/pages/QuizResultsPage.jsx. v1 preferred React Router
// `location.state` (set by QuizPage after submission) over URL params (used
// by share links); Next.js has no route-state equivalent, so QuizClient
// stashes the same payload in sessionStorage (`quiz_result_${id}`) instead —
// this component reads that first, falling back to the URL params passed
// down from the server shell (used when this page is opened via a shared link).
export function ResultsClient({
  id,
  urlFallback,
  isPractice,
}: {
  id: string;
  urlFallback: ResultData;
  isPractice: boolean;
}) {
  const { user: clerkUser } = useUser();
  const [stashed, setStashed] = useState<StashedResult | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(`quiz_result_${id}`);
      if (raw) setStashed(JSON.parse(raw));
    } catch {
      // fall back to URL params
    }
  }, [id]);

  const { score, correct, total, quizTitle, streak } = stashed ?? urlFallback;
  const challenger = stashed?.challenger ?? null;

  const [rank, setRank] = useState<number | null>(null);
  const [rankLoading, setRankLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);

  const username = clerkUser?.username || clerkUser?.firstName || "";

  useEffect(() => {
    const fetchRank = async () => {
      try {
        const data = await apiFetch<{ rows?: { username?: string }[] }>(`/api/leaderboard?quizId=${id}`);
        const rows = data?.rows || [];
        const myIdx = rows.findIndex((r) => r.username?.toLowerCase() === username?.toLowerCase());
        setRank(myIdx >= 0 ? myIdx + 1 : null);
      } catch {
        setRank(null);
      } finally {
        setRankLoading(false);
      }
    };
    if (id) fetchRank();
  }, [id, username]);

  const handleShare = () => {
    const url = `${window.location.origin}/quiz/${id}/results?score=${score}&correct=${correct}&total=${total}&quizTitle=${encodeURIComponent(quizTitle)}&streak=${streak}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const handleChallenge = () => {
    const userId = clerkUser?.id || "";
    const url = `${window.location.origin}/quiz/${id}?challenge=${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      setChallengeCopied(true);
      setTimeout(() => setChallengeCopied(false), 2000);
    });
  };

  const pct = total > 0 ? (score / total) * 100 : 0;
  const resultColor = pct >= 70 ? "bg-green" : pct >= 40 ? "bg-yellow" : "bg-coral";
  const resultLabel = pct >= 70 ? "Excellent!" : pct >= 40 ? "Good Effort!" : "Keep Practicing!";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`card-tactile ${resultColor} relative overflow-hidden p-6 sm:p-8`}
      >
        <ConfettiDots />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <CircleRing score={correct} total={total} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-accent font-bold uppercase mb-1 opacity-70">{quizTitle}</p>
            <h1 className="text-3xl sm:text-5xl font-display">{resultLabel}</h1>
            <p className="font-accent font-bold mt-2">
              {correct} correct out of {total} questions
            </p>
            <p className="font-mono font-bold text-2xl mt-1">{score} pts</p>

            {streak >= 2 && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-[var(--radius-chip)] bg-ink text-white font-accent font-bold text-sm">
                <Flame size={16} className="text-orange" /> {streak} streak!
              </div>
            )}

            {!rankLoading && rank !== null && (
              <div className="mt-3 flex items-center gap-2 font-accent font-bold text-sm">
                <Trophy size={16} className="text-ink" />
                You ranked <span className="font-black">#{rank}</span> on the leaderboard
              </div>
            )}

            {challenger && (
              <div
                className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-chip)] font-accent font-bold text-sm ${
                  score > challenger.score ? "bg-ink text-white" : score === challenger.score ? "bg-white" : "bg-coral text-white"
                }`}
              >
                {score > challenger.score ? (
                  <>
                    <Swords size={14} /> You beat @{challenger.username} by {score - challenger.score} pts!
                  </>
                ) : score === challenger.score ? (
                  <>
                    <Handshake size={14} /> Tied with @{challenger.username}!
                  </>
                ) : (
                  <>
                    <Frown size={14} /> @{challenger.username} is still ahead by {challenger.score - score} pts
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <button onClick={() => setShareCardOpen(true)} className="btn-tactile justify-center bg-orange text-white py-3 sm:col-span-2">
          <ImageIcon size={18} /> Share Result Card
        </button>

        <button onClick={handleShare} className="btn-tactile justify-center bg-blue text-white py-3">
          {shareCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
          {shareCopied ? "Copied!" : "Share Result"}
        </button>

        <button onClick={handleChallenge} className="btn-tactile justify-center bg-purple text-white py-3">
          {challengeCopied ? <CheckCircle size={18} /> : <ExternalLink size={18} />}
          {challengeCopied ? "Link Copied!" : "Challenge a Friend"}
        </button>

        <Link
          href={`/leaderboard?quizId=${id}`}
          className={`btn-tactile justify-center bg-yellow py-3 ${!isPractice ? "sm:col-span-2" : ""}`}
        >
          <Trophy size={18} /> View Leaderboard
        </Link>

        {isPractice && (
          <Link href={`/quiz/${id}`} className="btn-tactile justify-center bg-green py-3">
            Practice Again
          </Link>
        )}
      </motion.div>

      <ShareCardModal
        open={shareCardOpen}
        onClose={() => setShareCardOpen(false)}
        username={clerkUser?.username || clerkUser?.firstName || "Player"}
        avatarUrl={clerkUser?.imageUrl}
        quizTitle={quizTitle}
        score={score}
        correct={correct}
        total={total}
        streak={streak}
      />
    </div>
  );
}

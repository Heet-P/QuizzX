"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, Share2, ImageIcon } from "lucide-react";
import { drawShareCard } from "@/lib/share-card";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  avatarUrl?: string | null;
  quizTitle: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
}

// Strava/Duolingo-style shareable result image — added 2026-07-23 per
// explicit user request ("makes our users our sellers on social medias").
// Rendered entirely client-side onto a <canvas> (see lib/share-card.ts) and
// handed to the user via download or the Web Share API — no server route,
// no storage, since R2 is still deferred (MEMORY.md Section 9/11).
export function ShareCardModal({ open, onClose, username, avatarUrl, quizTitle, score, correct, total, streak }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const run = async () => {
      setReady(false);
      setError(null);
      try {
        await drawShareCard(canvas, { username, avatarUrl, quizTitle, score, correct, total, streak });
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Couldn't generate the card image. Try again.");
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [open, username, avatarUrl, quizTitle, score, correct, total, streak]);

  if (!open) return null;

  const getBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizzx-${quizTitle.replace(/\s+/g, "_").slice(0, 40)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], "quizzx-result.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      setSharing(true);
      try {
        await navigator.share({ files: [file], title: "My QuizzX Result", text: `I just scored ${score} pts on ${quizTitle} on QuizzX!` });
      } catch {
        // user cancelled the share sheet — no-op
      } finally {
        setSharing(false);
      }
    } else {
      await handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70">
      <div className="card-tactile bg-white max-w-md w-full p-5 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 btn-tactile bg-coral text-white p-1.5" title="Close">
          <X size={16} />
        </button>
        <h3 className="font-display text-xl mb-4 flex items-center gap-2">
          <ImageIcon size={20} /> Shareable Result Card
        </h3>

        <div className="rounded-[var(--radius-card-sm)] overflow-hidden border-2 border-ink/10 bg-cream flex items-center justify-center min-h-[280px]">
          {!ready && !error && <p className="font-accent font-bold text-sm animate-pulse p-8">Generating card…</p>}
          {error && <p className="font-accent font-bold text-sm text-coral text-center p-8">{error}</p>}
          <canvas ref={canvasRef} className={`w-full h-auto ${ready ? "" : "hidden"}`} />
        </div>

        {ready && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={handleDownload} className="btn-tactile bg-blue text-white justify-center py-3">
              <Download size={18} /> Download
            </button>
            <button onClick={handleShare} disabled={sharing} className="btn-tactile bg-green justify-center py-3 disabled:opacity-60">
              <Share2 size={18} /> {sharing ? "Sharing…" : "Share"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Download, Share2, ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";
import { Tilt } from "@/components/core/tilt";
import { ShareCardFace } from "./ShareCardFace";
import type { ShareCardData } from "@/lib/share-card";

const CARD_SIZE = 1200;

interface ShareCardModalProps extends ShareCardData {
  open: boolean;
  onClose: () => void;
}

// Strava/Duolingo-style shareable result image — added 2026-07-23 per
// explicit user request ("makes our users our sellers on social medias"),
// rewritten the same day to render the actual DOM/CSS card (adapted from
// the user-supplied reference in public/shareCard/) instead of a hand-drawn
// canvas, so the live preview and the exported PNG are guaranteed to match.
// The card shows immediately with a shimmer sweep over just the avatar
// while it loads; the PNG itself is generated silently in the background
// right after so Download/Share are instant rather than waiting on click.
export function ShareCardModal({ open, onClose, username, avatarUrl, quizTitle, score, correct, total, streak }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.32);
  const [avatarSettled, setAvatarSettled] = useState(!avatarUrl);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const reset = () => {
      setAvatarSettled(!avatarUrl);
      setAvatarFailed(false);
      setPngUrl(null);
      setError(null);
    };
    reset();
  }, [open, avatarUrl, username, quizTitle, score, correct, total, streak]);

  useEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / CARD_SIZE);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const generatePng = useCallback(async () => {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_SIZE,
        height: CARD_SIZE,
        pixelRatio: 2,
        cacheBust: true,
      });
      setPngUrl(dataUrl);
      return dataUrl;
    } catch {
      setError("Couldn't prepare the download — you can still screenshot the card above.");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!open || !avatarSettled || pngUrl) return;
    const run = async () => {
      setPreparing(true);
      await generatePng();
      setPreparing(false);
    };
    run();
  }, [open, avatarSettled, pngUrl, generatePng]);

  if (!open) return null;

  const ensurePng = async (): Promise<string | null> => {
    if (pngUrl) return pngUrl;
    setPreparing(true);
    const result = await generatePng();
    setPreparing(false);
    return result;
  };

  const handleDownload = async () => {
    const dataUrl = await ensurePng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `quizzx-${quizTitle.replace(/\s+/g, "_").slice(0, 40)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    const dataUrl = await ensurePng();
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
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
      <div className="card-tactile bg-white max-w-lg w-full p-5 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 btn-tactile bg-coral text-white p-1.5 z-10" title="Close">
          <X size={16} />
        </button>
        <h3 className="font-display text-xl mb-4 flex items-center gap-2">
          <ImageIcon size={20} /> Shareable Result Card
        </h3>

        <div ref={wrapperRef} className="relative w-full rounded-[var(--radius-card-sm)] overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
          <div style={{ width: CARD_SIZE, height: CARD_SIZE, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <Tilt rotationFactor={6} className="relative">
              <ShareCardFace
                ref={cardRef}
                username={username}
                avatarUrl={avatarUrl}
                quizTitle={quizTitle}
                score={score}
                correct={correct}
                total={total}
                streak={streak}
                avatarFailed={avatarFailed}
                onAvatarLoad={() => setAvatarSettled(true)}
                onAvatarError={() => {
                  setAvatarFailed(true);
                  setAvatarSettled(true);
                }}
              />
            </Tilt>
          </div>
          {!avatarSettled && <div className="shimmer-overlay" />}
        </div>

        {error && <p className="text-sm font-accent font-bold text-coral text-center mt-3">{error}</p>}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={handleDownload} disabled={preparing} className="btn-tactile bg-blue text-white justify-center py-3 disabled:opacity-60">
            <Download size={18} /> {preparing && !pngUrl ? "Preparing…" : "Download"}
          </button>
          <button onClick={handleShare} disabled={sharing || preparing} className="btn-tactile bg-green justify-center py-3 disabled:opacity-60">
            <Share2 size={18} /> {sharing ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

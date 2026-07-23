// Client-safe (no "server-only") data helpers for the shareable result card.
// Rewritten 2026-07-23: the card is now a real DOM/CSS component
// (components/quiz/ShareCardFace.tsx + ShareCard.module.css, adapted from
// the user-supplied reference in public/shareCard/) captured to PNG via
// html-to-image, rather than hand-drawn on a <canvas> — this file now only
// holds the score -> color/label logic both the live preview and the PNG
// export share.

export interface ShareCardData {
  username: string;
  avatarUrl?: string | null;
  quizTitle: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
}

export function pctFor(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export interface ShareCardPalette {
  from: string;
  to: string;
  label: string;
  crown: boolean;
}

/**
 * Background gradient + stamp label, keyed off score percentage. Exact
 * bands are an explicit user decision (2026-07-23): <30 pale red, 30-59
 * blue, 60-89 purple, 90-99 green, 100 golden-orange + crown (the crown
 * must never appear at any other percentage).
 */
export function paletteFor(pct: number): ShareCardPalette {
  if (pct >= 100) return { from: "#ffd200", to: "#ff9500", label: "Perfect Score!", crown: true };
  if (pct >= 90) return { from: "#4ade80", to: "#22c55e", label: "Excellent!", crown: false };
  if (pct >= 60) return { from: "#a78bfa", to: "#8b5cf6", label: "Great Job!", crown: false };
  if (pct >= 30) return { from: "#5b82ff", to: "#2e5bff", label: "Good Effort!", crown: false };
  return { from: "#ffbcb2", to: "#ff8a75", label: "Keep Practicing!", crown: false };
}

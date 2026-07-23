// Client-safe (no "server-only") canvas renderer for the shareable result
// card — added 2026-07-23 per explicit user request, modeled after
// Strava/Duolingo-style result cards to encourage social sharing. Pure
// client-side Canvas 2D (no server route, no image storage) since R2 is
// still deferred (see MEMORY.md Section 9/11) — the PNG is generated
// entirely in the browser and handed to the user via download or the Web
// Share API.

export interface ShareCardData {
  username: string;
  avatarUrl?: string | null;
  quizTitle: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
}

const W = 1080;
const H = 1200;

function pctFor(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/**
 * Background palette + stamp label, keyed off score percentage. Exact
 * bands are an explicit user decision (2026-07-23): <30 pale red, 30-59
 * blue, 60-89 purple, 90-99 green, 100 golden-orange + crown (crown never
 * appears otherwise).
 */
function paletteFor(pct: number): { from: string; to: string; label: string; crown: boolean } {
  if (pct >= 100) return { from: "#ffd200", to: "#ff9500", label: "Perfect Score!", crown: true };
  if (pct >= 90) return { from: "#4ade80", to: "#22c55e", label: "Excellent!", crown: false };
  if (pct >= 60) return { from: "#a78bfa", to: "#8b5cf6", label: "Great Job!", crown: false };
  if (pct >= 30) return { from: "#5b82ff", to: "#2e5bff", label: "Good Effort!", crown: false };
  return { from: "#ffbcb2", to: "#ff8a75", label: "Keep Practicing!", crown: false };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load avatar image"));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Reads the actual resolved font-family string next/font/local injected into the CSS variable, so canvas text uses the same brand fonts as the rest of the app. */
function fontFamily(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function drawStatBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub: string,
  accentFont: string,
  displayFont: string
) {
  roundRect(ctx, x, y, w, h, 28);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(20,18,15,0.15)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#14120f";
  ctx.font = `700 24px ${accentFont}`;
  ctx.fillText(label, x + w / 2, y + 56);
  ctx.font = `900 78px ${displayFont}`;
  ctx.fillText(value, x + w / 2, y + 152);
  ctx.font = `700 22px ${accentFont}`;
  ctx.fillStyle = "rgba(20,18,15,0.6)";
  ctx.fillText(sub, x + w / 2, y + 200);
}

function drawTrophy(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#ffd200";
  ctx.strokeStyle = "#14120f";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(-size * 0.4, -size * 0.3);
  ctx.quadraticCurveTo(-size * 0.5, size * 0.25, 0, size * 0.32);
  ctx.quadraticCurveTo(size * 0.5, size * 0.25, size * 0.4, -size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-size * 0.55, -size * 0.05, size * 0.18, Math.PI * 0.2, Math.PI * 1.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size * 0.55, -size * 0.05, size * 0.18, Math.PI * 1.7, Math.PI * 2.8);
  ctx.stroke();

  ctx.fillRect(-size * 0.08, size * 0.3, size * 0.16, size * 0.22);
  roundRect(ctx, -size * 0.3, size * 0.52, size * 0.6, size * 0.16, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCrown(ctx: CanvasRenderingContext2D, cx: number, topY: number, size: number) {
  ctx.save();
  ctx.translate(cx, topY);
  const w = size;
  const h = size * 0.65;
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.15);
  ctx.lineTo(-w / 2, -h * 0.05);
  ctx.lineTo(-w / 3, h * 0.35);
  ctx.lineTo(-w / 6, -h * 0.55);
  ctx.lineTo(0, h * 0.35);
  ctx.lineTo(w / 6, -h * 0.55);
  ctx.lineTo(w / 3, h * 0.35);
  ctx.lineTo(w / 2, -h * 0.05);
  ctx.lineTo(w / 2, h * 0.15);
  ctx.closePath();
  ctx.fillStyle = "#ffd200";
  ctx.fill();
  ctx.strokeStyle = "#14120f";
  ctx.lineWidth = 5;
  ctx.stroke();

  ["#ff4b36", "#2e5bff", "#22c55e"].forEach((color, i) => {
    ctx.beginPath();
    ctx.arc((i - 1) * (w * 0.28), h * 0.02, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.15, -size * 0.15, size, 0);
  ctx.quadraticCurveTo(size * 0.15, size * 0.15, 0, size);
  ctx.quadraticCurveTo(-size * 0.15, size * 0.15, -size, 0);
  ctx.quadraticCurveTo(-size * 0.15, -size * 0.15, 0, -size);
  ctx.closePath();
  ctx.fillStyle = "rgba(20,18,15,0.45)";
  ctx.fill();
  ctx.restore();
}

function drawBottomBand(ctx: CanvasRenderingContext2D, accentFont: string, displayFont: string) {
  const bandTop = H - 190;
  const outerR = 56;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, bandTop + 40);
  const waveCount = 4;
  const segW = W / waveCount;
  for (let i = 0; i < waveCount; i++) {
    const xMid = i * segW + segW / 2;
    const xEnd = i * segW + segW;
    ctx.quadraticCurveTo(xMid, bandTop - (i % 2 === 0 ? 34 : -34), xEnd, bandTop + 40);
  }
  ctx.lineTo(W, H - outerR);
  ctx.quadraticCurveTo(W, H, W - outerR, H);
  ctx.lineTo(outerR, H);
  ctx.quadraticCurveTo(0, H, 0, H - outerR);
  ctx.closePath();
  ctx.fillStyle = "#14120f";
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 44px ${displayFont}`;
  ctx.fillText("QUIZZX", 70, H - 100);
  ctx.font = `700 20px ${accentFont}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Learn. Play. Compete.", 70, H - 65);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd200";
  ctx.font = `700 24px ${accentFont}`;
  ctx.fillText("Join me on QuizzX!", W - 70, H - 122);

  const pillW = 260;
  const pillH = 54;
  const pillX = W - 70 - pillW;
  const pillY = H - 100;
  roundRect(ctx, pillX, pillY, pillW, pillH, 27);
  ctx.strokeStyle = "#ffd200";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 22px ${accentFont}`;
  ctx.fillText("🌐 quizzx.app", pillX + pillW / 2, pillY + pillH / 2 + 8);
}

/** Draws the full shareable result card onto `canvas`. Resolves once fonts + avatar (if any) are loaded and every layer is painted. */
export async function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // proceed with whatever fonts are available
    }
  }

  const pct = pctFor(data.correct, data.total);
  const { from, to, label, crown } = paletteFor(pct);
  const displayFont = fontFamily("--font-geist-pixel", "sans-serif");
  const accentFont = fontFamily("--font-satoshi", "sans-serif");

  ctx.clearRect(0, 0, W, H);

  // Background card
  const grad = ctx.createLinearGradient(0, 0, W, H * 0.8);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  roundRect(ctx, 0, 0, W, H, 56);
  ctx.fillStyle = grad;
  ctx.fill();

  // Decorative dots
  const dotColors = ["#ffffff", "#14120f", "#2e5bff", "#22c55e"];
  const dotPositions: [number, number, number][] = [
    [90, 110, 7],
    [210, 300, 5],
    [980, 130, 6],
    [70, 560, 5],
    [1010, 600, 7],
    [140, 950, 6],
    [960, 900, 5],
  ];
  dotPositions.forEach(([dx, dy, dr], i) => {
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fillStyle = dotColors[i % dotColors.length];
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Top: "I just scored N pts"
  ctx.textAlign = "center";
  ctx.fillStyle = "#14120f";
  ctx.font = `700 28px ${accentFont}`;
  ctx.fillText("I JUST SCORED", W / 2, 105);
  ctx.font = `900 92px ${displayFont}`;
  ctx.fillText(`${data.score} pts`, W / 2, 205);

  // Stamp badge, top-left
  ctx.save();
  ctx.translate(160, 195);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.ellipse(0, 0, 108, 78, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(20,18,15,0.65)";
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `700 25px ${accentFont}`;
  ctx.fillStyle = "#14120f";
  ctx.textAlign = "center";
  const words = label.split(" ");
  if (words.length > 2) {
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(" "), 0, -8);
    ctx.fillText(words.slice(mid).join(" "), 0, 24);
  } else {
    ctx.fillText(label, 0, 8);
  }
  ctx.restore();

  // Trophy, top-right
  drawTrophy(ctx, W - 150, 155, 70);

  // Score + streak stat boxes
  drawStatBox(ctx, 90, 480, 260, 260, "SCORE", `${data.correct}/${data.total}`, "Correct", accentFont, displayFont);
  drawStatBox(ctx, W - 350, 480, 260, 260, "STREAK", `${data.streak}`, data.streak === 1 ? "Day" : "Days", accentFont, displayFont);

  // Avatar
  const cx = W / 2;
  const cy = 560;
  const r = 150;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#14120f";
  ctx.stroke();
  ctx.clip();
  try {
    if (!data.avatarUrl) throw new Error("no avatar");
    const img = await loadImage(data.avatarUrl);
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = "#e3d3ac";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#14120f";
    ctx.font = `900 120px ${displayFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((data.username[0] || "?").toUpperCase(), cx, cy + 10);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  if (crown) {
    drawCrown(ctx, cx, cy - r - 70, 90);
  }

  drawSparkle(ctx, cx - r - 90, cy - 40, 20);
  drawSparkle(ctx, cx + r + 90, cy - 70, 16);

  // Username, quiz title
  ctx.textAlign = "center";
  ctx.fillStyle = "#14120f";
  ctx.font = `900 50px ${displayFont}`;
  ctx.fillText(data.username, cx, cy + r + 70);

  ctx.font = `700 22px ${accentFont}`;
  ctx.fillStyle = "rgba(20,18,15,0.55)";
  ctx.fillText("QUIZ", cx, cy + r + 118);

  ctx.font = `900 38px ${displayFont}`;
  ctx.fillStyle = "#14120f";
  const title = data.quizTitle.length > 30 ? data.quizTitle.slice(0, 29) + "…" : data.quizTitle;
  ctx.fillText(title, cx, cy + r + 166);

  ctx.strokeStyle = "rgba(20,18,15,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 220, cy + r + 192);
  ctx.lineTo(cx + 220, cy + r + 192);
  ctx.stroke();

  drawBottomBand(ctx, accentFont, displayFont);
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from "framer-motion";
import { Lock } from "lucide-react";
import styles from "./SubmitLiquidOverlay.module.css";

export type SubmitPhase = "idle" | "filling" | "waiting" | "revealing";

interface SubmitLiquidOverlayProps {
  phase: SubmitPhase;
  /** True once the backend has confirmed success — gates the confetti pop (never shown for errors). */
  success: boolean;
  /** Fired once the "revealing" slide-away finishes — the parent should reset phase to "idle" here. */
  onRevealComplete: () => void;
}

const FILL_SECONDS = 2.4;

// Fixed, deterministic positions/timings (not Math.random) so this never
// trips the "impure function during render" lint rule the rest of the app
// already has pre-existing violations of (see ConfettiDots) — new code
// shouldn't add more of those.
const PARTICLES = [
  { x: 10, size: 8, delay: 0, duration: 3.2 },
  { x: 22, size: 5, delay: 0.6, duration: 2.6 },
  { x: 35, size: 7, delay: 1.1, duration: 3.6 },
  { x: 48, size: 4, delay: 0.3, duration: 2.9 },
  { x: 60, size: 6, delay: 1.4, duration: 3.1 },
  { x: 73, size: 5, delay: 0.8, duration: 2.7 },
  { x: 85, size: 7, delay: 0.1, duration: 3.4 },
  { x: 93, size: 4, delay: 1.6, duration: 2.5 },
];

// 110% = fully below the screen/box (invisible), ~8% = covers almost
// everything. Mirrors the reference's `.wave { top: 110% -> 0% }` directly.
function fillYFromProgress(p: number): number {
  return 110 - p * 1.02;
}

function clipPolygon(y: number): string {
  return `polygon(0% 110%, 0% ${y}%, 110% ${y}%, 110% 110%)`;
}

const CONFETTI_COLORS = ["#ffd200", "#2e5bff", "#ff4b36", "#8b5cf6", "#ff9500", "#ffffff"];
// angle (degrees around the burst center), distance (px), end rotation (deg), start delay (s)
const CONFETTI = [
  { angle: 0, dist: 260, rot: 120, delay: 0 },
  { angle: 30, dist: 300, rot: -140, delay: 0.05 },
  { angle: 60, dist: 240, rot: 200, delay: 0.02 },
  { angle: 90, dist: 320, rot: -90, delay: 0.08 },
  { angle: 120, dist: 260, rot: 160, delay: 0.03 },
  { angle: 150, dist: 300, rot: -180, delay: 0.06 },
  { angle: 180, dist: 250, rot: 100, delay: 0.01 },
  { angle: 210, dist: 310, rot: -120, delay: 0.07 },
  { angle: 240, dist: 270, rot: 220, delay: 0.04 },
  { angle: 270, dist: 330, rot: -100, delay: 0.09 },
  { angle: 300, dist: 260, rot: 140, delay: 0.02 },
  { angle: 330, dist: 290, rot: -160, delay: 0.05 },
].map((c, i) => {
  const rad = (c.angle * Math.PI) / 180;
  return { ...c, tx: Math.cos(rad) * c.dist, ty: Math.sin(rad) * c.dist, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] };
});

// Full-screen "I'm locking in your answers" submission animation — added
// 2026-07-23 per an explicit, detailed spec, replacing the previous
// button-level liquid-fill for the quiz-submit flow (ConfirmModal's
// `loading` prop stays available for other confirmations, just unused here
// now). State machine owned by the parent (QuizClient): idle -> filling
// (fixed 1.8s, non-linear easing, regardless of backend speed) -> waiting
// (only if the backend hasn't responded by then — gentle idle wave +
// "Calculating your results…") -> revealing (slides the whole green layer
// off the top of the screen, uncovering whatever the parent has already
// swapped to underneath — see QuizClient's submitPhase-gated early returns).
export function SubmitLiquidOverlay({ phase, success, onRevealComplete }: SubmitLiquidOverlayProps) {
  const reduceMotion = useReducedMotion();
  const [showLocked, setShowLocked] = useState(false);

  // Single source of truth (0-100) for BOTH the water level and the
  // percentage digits — the digits are a direct readout of this value's
  // live progress, not a separately-timed spring, so they can never show
  // "100%" while the water is still visibly rising.
  const progress = useMotionValue(0);
  const displayPercent = useTransform(progress, (v) => `${Math.round(Math.min(100, Math.max(0, v)))}%`);
  const waterTop = useTransform(progress, (v) => `${fillYFromProgress(v)}%`);
  const numberClip = useTransform(progress, (v) => clipPolygon(fillYFromProgress(v)));

  useEffect(() => {
    if (phase !== "filling") {
      const reset = () => setShowLocked(false);
      reset();
      return;
    }
    const timer = setTimeout(() => setShowLocked(true), FILL_SECONDS * 1000 * 0.85);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "idle") {
      progress.set(0);
      return;
    }
    if (phase === "filling") {
      // One smooth, unhurried rise for the whole fill — deliberately not a
      // fast-jump/crawl/fast-finish curve, per explicit "slow and smooth"
      // feedback. The wave's own waviness comes entirely from the rotating
      // blobs below, so the progress curve itself can stay simple.
      const controls = animate(progress, 100, { duration: reduceMotion ? 0.2 : FILL_SECONDS, ease: "easeInOut" });
      return () => controls.stop();
    }
    // waiting / revealing: settle at fully-full even if the backend
    // resolved before the fill's own 1.8s had finished on its own.
    const controls = animate(progress, 100, { duration: 0.2, ease: "easeInOut" });
    return () => controls.stop();
  }, [phase, reduceMotion, progress]);

  // Disable scrolling and soft-block back navigation for the whole overlay
  // lifetime, per spec ("never allow user interaction once SUBMITTING begins").
  useEffect(() => {
    if (phase === "idle") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockBack = () => window.history.pushState(null, "", window.location.href);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("popstate", blockBack);
    };
  }, [phase]);

  if (phase === "idle") return null;

  const isWaving = phase === "waiting";

  return (
    <div className={styles.overlay}>
      <div className={styles.blocker} />
      {/* The whole stage stays full-screen the entire time — "how full" is
          expressed purely by the water layer's own `top` offset within it,
          matching the reference technique. Only the "revealing" slide-away
          moves this container at all. */}
      <motion.div
        className={styles.waveStage}
        initial={{ y: "0%" }}
        animate={{ y: phase === "revealing" ? "-100%" : "0%" }}
        transition={phase === "revealing" ? { duration: 0.7, ease: "easeInOut" } : { duration: 0 }}
        onAnimationComplete={() => {
          if (phase === "revealing") onRevealComplete();
        }}
      >
        <motion.div className={styles.waterLevel} style={{ top: waterTop }}>
          {reduceMotion ? (
            <div className={styles.waterFlatReduced} />
          ) : (
            <div className={styles.waterBob}>
              <div className={styles.waterFlat} />
              <svg className={styles.wavesSvg} viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                <defs>
                  <path id="quizzx-gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
                </defs>
                <g>
                  <use href="#quizzx-gentle-wave" x="48" y="0" fill="rgba(110,231,183,0.7)" className={`${styles.waveLayer} ${styles.waveLayerA}`} />
                  <use href="#quizzx-gentle-wave" x="48" y="3" fill="rgba(74,222,128,0.55)" className={`${styles.waveLayer} ${styles.waveLayerB}`} />
                  <use href="#quizzx-gentle-wave" x="48" y="5" fill="rgba(34,197,94,0.5)" className={`${styles.waveLayer} ${styles.waveLayerC}`} />
                  <use href="#quizzx-gentle-wave" x="48" y="7" fill="#15803d" className={`${styles.waveLayer} ${styles.waveLayerD}`} />
                </g>
              </svg>
            </div>
          )}
        </motion.div>

        {!reduceMotion &&
          PARTICLES.map((p, i) => (
            <div
              key={i}
              className={styles.bubble}
              style={{ left: `${p.x}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
            />
          ))}

        {phase === "revealing" && success && !reduceMotion && (
          <div className={styles.confettiBurst}>
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className={styles.confettiPiece}
                style={
                  {
                    background: c.color,
                    animationDelay: `${c.delay}s`,
                    "--tx": `${c.tx}px`,
                    "--ty": `${c.ty}px`,
                    "--rot": `${c.rot}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}

        <div className={styles.centerText}>
          <div className={styles.percentWrap}>
            {/* Bottom copy: solid white, clipped from the bottom up by the
                same live `progress` value driving the water outside — its
                interior fills in lockstep with the background, and the
                digits themselves are a direct readout of that same value. */}
            <motion.div className={styles.percentClipWrap} style={{ clipPath: numberClip }}>
              <motion.span className={`${styles.percentNumber} ${styles.percentNumberFill}`}>{displayPercent}</motion.span>
            </motion.div>
            {/* Top copy: transparent fill, bold dark stroke only — the
                "glass" outline, always fully legible regardless of fill. */}
            <motion.span className={`${styles.percentNumber} ${styles.percentNumberOutline}`}>{displayPercent}</motion.span>
          </div>
          {isWaving ? (
            <div className={styles.waitingText}>
              <p>Calculating your results</p>
              <span className={styles.dots}>
                <span className={styles.dot} style={{ animationDelay: "0s" }} />
                <span className={styles.dot} style={{ animationDelay: "0.15s" }} />
                <span className={styles.dot} style={{ animationDelay: "0.3s" }} />
              </span>
            </div>
          ) : (
            showLocked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className={styles.lockedText}>
                <Lock size={22} /> Answers Locked
              </motion.div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}

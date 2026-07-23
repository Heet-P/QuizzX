"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { AnimatedNumber } from "@/components/core/animated-number";
import styles from "./SubmitLiquidOverlay.module.css";

export type SubmitPhase = "idle" | "filling" | "waiting" | "revealing";

interface SubmitLiquidOverlayProps {
  phase: SubmitPhase;
  /** True once the backend has confirmed success — gates the confetti pop (never shown for errors). */
  success: boolean;
  /** Fired once the "revealing" slide-away finishes — the parent should reset phase to "idle" here. */
  onRevealComplete: () => void;
}

const FILL_SECONDS = 1.8;

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

// Waypoints matching the reference's "how full" percentages (their demo
// hardcoded 3 states — 0/50/100 — as separate CSS classes; we have a
// continuous fill, so these are the equivalent in-between stops for the
// same fast/steady/slow easing curve used elsewhere in this file).
const FILL_WAYPOINTS = [0, 62, 94, 100];
// clip-path Y: 110% (fully below viewport, nothing visible) down to ~8%
// (covers nearly the whole screen) — mirrors the reference's
// `.wave-below._0/_50/_100` clip-path values, generalized to a continuous
// range instead of 3 fixed classes.
const CLIP_Y = FILL_WAYPOINTS.map((p) => 110 - p * 1.02);
// wave background-position Y sits ~10-13 points "ahead" (higher up) of the
// clip line, same gap the reference's own wave/_0/_50/_100 values have
// relative to their paired wave-below values — the tiled texture is what
// visually bridges the flat clip edge into a wavy crest.
const WAVE_Y = FILL_WAYPOINTS.map((p) => 110 - p * 1.15);

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
  const [targetPercent, setTargetPercent] = useState(0);

  useEffect(() => {
    if (phase !== "filling") {
      const reset = () => setShowLocked(false);
      reset();
      return;
    }
    const timer = setTimeout(() => setShowLocked(true), FILL_SECONDS * 1000 * 0.85);
    return () => clearTimeout(timer);
  }, [phase]);

  // Cosmetic count-up only — deliberately not tied to the actual fill
  // height/DOM measurement, per explicit user request ("it need not be
  // accurate but it needs to be 0-100"). Tuned to visually settle around
  // the same ~1.8s as the liquid fill via the spring's own duration below.
  useEffect(() => {
    if (phase === "idle") {
      const reset = () => setTargetPercent(0);
      reset();
      return;
    }
    const start = () => setTargetPercent(100);
    start();
  }, [phase]);

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

  // Filling phase animates through the waypoints (custom fast/steady/slow
  // easing, same curve for both the wave texture and the solid clip-path
  // reveal so they stay paired); waiting/revealing/reduced-motion just hold
  // at "100% full" — always arrays (length 1 when holding) so the keyframe
  // shape stays consistent instead of a number-or-array union.
  const holdFull = phase === "waiting" || phase === "revealing" || reduceMotion;
  const fillWaveY = holdFull ? [WAVE_Y[WAVE_Y.length - 1]] : WAVE_Y;
  const fillClipY = holdFull ? [CLIP_Y[CLIP_Y.length - 1]] : CLIP_Y;
  const fillTransition = holdFull
    ? { duration: phase === "filling" ? FILL_SECONDS : 0.2, ease: "easeInOut" as const }
    : { duration: FILL_SECONDS, times: [0, 0.15, 0.85, 1], ease: ["easeOut", "linear", "easeIn"] as ("easeOut" | "linear" | "easeIn")[] };

  return (
    <div className={styles.overlay}>
      <div className={styles.blocker} />
      {/* The whole stage stays full-screen the entire time (unlike a
          height-animated container) — "how full" is expressed purely via
          the clip-path reveal below, matching the reference technique. Only
          the "revealing" slide-away moves this container at all. */}
      <motion.div
        className={styles.waveStage}
        initial={{ y: "0%" }}
        animate={{ y: phase === "revealing" ? "-100%" : "0%" }}
        transition={phase === "revealing" ? { duration: 0.7, ease: "easeInOut" } : { duration: 0 }}
        onAnimationComplete={() => {
          if (phase === "revealing") onRevealComplete();
        }}
      >
        {!reduceMotion && (
          <>
            <motion.div
              className={`${styles.waveTexture} ${styles.waveTextureA}`}
              initial={{ backgroundPositionY: `${WAVE_Y[0]}%` }}
              animate={{ backgroundPositionY: fillWaveY.map((v) => `${v}%`) }}
              transition={fillTransition}
            />
            <motion.div
              className={`${styles.waveTexture} ${styles.waveTextureB}`}
              initial={{ backgroundPositionY: `${WAVE_Y[0]}%` }}
              animate={{ backgroundPositionY: fillWaveY.map((v) => `${v}%`) }}
              transition={fillTransition}
            />
          </>
        )}

        <motion.div
          className={reduceMotion ? styles.fillBodyFlat : styles.fillBody}
          initial={{ clipPath: clipPolygon(CLIP_Y[0]) }}
          animate={{ clipPath: fillClipY.map((v) => clipPolygon(v)) }}
          transition={fillTransition}
        >
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
        </motion.div>

        <div className={styles.centerText}>
          <AnimatedNumber
            value={targetPercent}
            springOptions={{ duration: 1.6, bounce: 0 }}
            format={(v) => `${Math.round(Math.min(100, Math.max(0, v)))}%`}
            className={styles.percentNumber}
          />
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

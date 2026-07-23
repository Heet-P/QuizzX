"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

  useEffect(() => {
    if (phase !== "filling") {
      const reset = () => setShowLocked(false);
      reset();
      return;
    }
    const timer = setTimeout(() => setShowLocked(true), FILL_SECONDS * 1000 * 0.85);
    return () => clearTimeout(timer);
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

  return (
    <div className={styles.overlay}>
      <div className={styles.blocker} />
      <motion.div
        className={styles.fillWrap}
        initial={{ height: "0%", y: "0%" }}
        animate={
          phase === "revealing"
            ? { height: "100%", y: "-100%" }
            : phase === "waiting"
              ? { height: "100%", y: "0%" }
              : reduceMotion
                ? { height: "100%", y: "0%" }
                : { height: ["0%", "62%", "94%", "100%"], y: "0%" }
        }
        transition={
          phase === "revealing"
            ? { duration: 0.7, ease: "easeInOut" }
            : phase === "waiting"
              ? { duration: 0.2 }
              : reduceMotion
                ? { duration: FILL_SECONDS, ease: "easeInOut" }
                : { duration: FILL_SECONDS, times: [0, 0.15, 0.85, 1], ease: ["easeOut", "linear", "easeIn"] }
        }
        onAnimationComplete={() => {
          if (phase === "revealing") onRevealComplete();
        }}
      >
        <div className={reduceMotion ? styles.fillBodyFlat : styles.fillBody}>
          {!reduceMotion && (
            <>
              <div className={`${styles.waveGroup} ${isWaving ? styles.waveGroupBreathe : ""}`}>
                <svg className={`${styles.waveLayer} ${styles.waveA}`} viewBox="0 0 2400 220" preserveAspectRatio="none">
                  <path d="M0,130 C150,50 300,210 450,130 C600,50 750,210 900,130 C1050,50 1200,130 1200,130 L1200,220 L0,220 Z M1200,130 C1350,50 1500,210 1650,130 C1800,50 1950,210 2100,130 C2250,50 2400,130 2400,130 L2400,220 L1200,220 Z" />
                </svg>
                <svg className={`${styles.waveLayer} ${styles.waveB}`} viewBox="0 0 2400 160" preserveAspectRatio="none">
                  <path d="M0,90 C120,20 260,160 400,88 C540,20 680,160 820,88 C960,20 1100,90 1200,90 L1200,160 L0,160 Z M1200,90 C1320,20 1460,160 1600,88 C1740,20 1880,160 2020,88 C2160,20 2300,90 2400,90 L2400,160 L1200,160 Z" />
                </svg>
                <svg className={`${styles.waveLayer} ${styles.waveC}`} viewBox="0 0 2400 100" preserveAspectRatio="none">
                  <path d="M0,55 C100,15 200,95 300,53 C400,15 500,95 600,53 C700,15 800,55 900,55 L1200,55 L1200,100 L0,100 Z M1200,55 C1300,15 1400,95 1500,53 C1600,15 1700,95 1800,53 C1900,15 2000,55 2100,55 L2400,55 L2400,100 L1200,100 Z" />
                </svg>
              </div>

              {PARTICLES.map((p, i) => (
                <div
                  key={i}
                  className={styles.bubble}
                  style={{ left: `${p.x}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
                />
              ))}
            </>
          )}

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
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { Trophy, Bot, Zap, Flame } from "lucide-react";

const STAT_CHIPS = [
  { icon: Trophy, label: "127 Live Rooms", color: "text-yellow" },
  { icon: Bot, label: "AI Ready", color: "text-purple" },
  { icon: Zap, label: "Ranked Mode", color: "text-blue" },
  { icon: Flame, label: "8-Day Streak", color: "text-coral" },
];

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green" />
    </span>
  );
}

function OnlineCount() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, 16842, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [inView]);

  return <span ref={ref}>{display}</span>;
}

// Top-of-page HUD — replaces the old bare "QuizzX — Gamified Quiz Platform"
// title. Designed to read as an arcade-machine / game-lobby dashboard
// (matches ink-bg "status display" language already used elsewhere: the
// CategoryMarquee ticker and SiteFooter both sit on the same bg-ink, so this
// bookends the page with the same terminal/HUD material) rather than a
// generic hero banner. All motion here is deliberately restrained — a live
// pulse, a count-up, a fill-in progress bar, a blinking cursor — nothing
// idly loops forever the way the earlier icon-bounce animations did.
//
// Padding/gaps/wordmark size use `clamp(min, Ndvh, max)` instead of fixed
// rem — fixed lengths don't shrink with browser zoom, but the viewport (in
// CSS px) does, so at 110-125% zoom fixed-size content eats a growing share
// of the screen and pushes MosaicHero/CategoryMarquee below the fold. Tying
// these to `dvh` keeps them a constant *proportion* of viewport height
// regardless of zoom level (see the same technique in MosaicHero's card
// min-heights and CategoryMarquee's padding).
export function TopHUD() {
  return (
    <section className="card-tactile bg-ink text-white px-5 sm:px-7 py-[clamp(0.75rem,1.8dvh,1.25rem)] mb-3 lg:mb-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="relative">
        {/* Status bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-[clamp(0.5rem,1.2dvh,0.75rem)]">
          <div className="flex items-center gap-2.5 font-accent text-xs font-bold uppercase tracking-wide">
            <LiveDot />
            <span>Live</span>
            <span className="text-white/25">&middot;</span>
            <span className="text-white/70 normal-case tracking-normal">
              <OnlineCount /> players online
            </span>
          </div>
          <span className="chip bg-white/10 border border-white/15 text-white">Season 04</span>
        </div>

        {/* Wordmark + tagline */}
        <div className="mb-[clamp(0.5rem,1.2dvh,0.75rem)] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="font-display font-bold text-[clamp(1.5rem,4.2dvh,3rem)] tracking-tight leading-none flex items-baseline">
            QUIZZX
            <span
              aria-hidden
              className="inline-block bg-yellow animate-blink ml-1 align-middle"
              style={{ width: "0.4rem", height: "0.8em" }}
            />
          </h1>
          <p className="font-accent text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-yellow">
            Learn &middot; Compete &middot; Climb &middot; Repeat
          </p>
        </div>
        <p className="font-sans text-white/45 text-xs sm:text-sm mb-[clamp(0.5rem,1.2dvh,0.75rem)]">
          <span className="text-green">&gt;</span> Today&apos;s challenge: score 80%+ on any AI quiz to
          unlock the &ldquo;Quiz Master&rdquo; badge.
        </p>

        {/* XP bar + status chips, one row on larger screens */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <span className="font-accent text-xs font-bold uppercase text-white/70 shrink-0">Lvl 17</span>
            <div className="flex-1 h-2.5 rounded-full bg-white/10 border border-white/15 overflow-hidden max-w-xs">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "72%" }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-yellow"
              />
            </div>
            <span className="font-accent text-xs font-bold text-white/50 shrink-0 hidden sm:inline">
              2,140 / 3,000 XP
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {STAT_CHIPS.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 font-accent text-xs font-bold"
              >
                <s.icon size={14} className={s.color} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

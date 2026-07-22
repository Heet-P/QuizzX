"use client";

import { SmartCTAButton } from "./SmartCTAButton";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Zap, ShieldCheck, Users, Sparkles, Check } from "lucide-react";

// Opening mosaic — replaces a conventional centered hero, composed after
// design_idea/units-website-design.png's asymmetric card grid (left tall
// headline card, photo-style card, two info cards, second illustrated card).
// QuizzX content throughout; no Units copy or imagery reused. Text is black
// on every bright card per explicit follow-up feedback — only the true-dark
// (ink) card keeps light text.
export function MosaicHero() {
  return (
    <section className="grid sm:grid-cols-2 lg:grid-cols-3 grid-flow-dense gap-3">
      {/* Headline card — tall, spans both rows on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-tactile bg-coral text-ink p-6 flex flex-col justify-between sm:row-span-2 min-h-[clamp(200px,30dvh,300px)]"
      >
        <div className="chip bg-white text-ink w-fit">
          <Sparkles size={14} /> AI-Powered
        </div>
        <div>
          <h2 className="font-display font-bold text-3xl sm:text-3xl lg:text-4xl leading-[0.98] mb-3">
            Every quiz.
            <br />
            Your arena.
          </h2>
          <p className="font-sans font-medium text-sm text-ink mb-4">
            Battle friends, climb the leaderboard, and let AI build your next quiz in seconds.
          </p>
          <SmartCTAButton className="btn-tactile bg-ink text-white w-fit">
            Start Playing <ArrowRight size={18} />
          </SmartCTAButton>
        </div>
      </motion.div>

      {/* Illustrated "quiz session" card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-tactile bg-blue text-ink p-5 min-h-[clamp(130px,19dvh,190px)] flex flex-col justify-between overflow-hidden relative"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#fff 2px, transparent 2px)",
            backgroundSize: "22px 22px",
          }}
        />
        <p className="relative font-accent text-xs font-bold uppercase text-white/80">Live Now</p>
        <div className="relative rounded-[20px] bg-white p-4">
          <p className="font-medium text-lg mb-3 text-ink">Which planet has the most moons?</p>
          <div className="space-y-2">
            <div className="rounded-xl bg-cream-alt px-3 py-2 text-sm text-ink">Saturn</div>
            <div className="rounded-xl bg-blue text-white px-3 py-2 text-sm font-bold flex items-center justify-between">
              Jupiter <Check size={16} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fair Play info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card-tactile bg-yellow text-ink p-5 min-h-[clamp(130px,19dvh,190px)]"
      >
        <ShieldCheck size={26} className="mb-3" />
        <h3 className="font-display font-bold text-xl mb-1">Fair Play</h3>
        <p className="font-accent text-sm font-bold text-ink/90 mb-4">Locked down, both ways</p>
        <ul className="space-y-2 font-sans font-medium text-sm">
          {["Fullscreen lockdown", "Tab-switch detection", "Shuffled per student", "Live proctor view"].map((t) => (
            <li key={t} className="border-b border-ink/10 pb-2">
              {t}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Team Battles info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="card-tactile bg-purple text-ink p-5 min-h-[clamp(115px,17dvh,170px)]"
      >
        <Users size={26} className="mb-3" />
        <h3 className="font-display font-bold text-xl mb-1">Team Battles</h3>
        <p className="font-accent text-sm font-bold text-ink/90 mb-4">Join with a code, 24/7</p>
        <ul className="space-y-2 font-sans font-medium text-sm text-ink">
          {["Any squad size", "Shared team score", "Instant matchmaking"].map((t) => (
            <li key={t} className="border-b border-ink/10 pb-2">
              {t}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Illustrated rank card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card-tactile bg-ink text-white p-5 min-h-[clamp(130px,19dvh,190px)] flex flex-col items-center justify-center gap-2"
      >
        <Trophy size={40} className="text-yellow" />
        <p className="font-display font-bold text-3xl">#1</p>
        <p className="font-accent text-xs font-bold uppercase opacity-85">Global Rank</p>
        <div className="flex items-center gap-1 chip bg-white/10 text-white">
          <Zap size={12} className="text-yellow" /> +240 XP today
        </div>
      </motion.div>
    </section>
  );
}

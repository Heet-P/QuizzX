"use client";

import Link from "next/link";
import { Swords, ArrowRight, Users } from "lucide-react";
import { Reveal } from "./Reveal";

// Section 6: Battle Mode — split layout. Maps to QuizzX's real team-quiz mode
// (create/join a team with a 6-char code, compete on a shared average score).
export function BattleMode() {
  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-16 sm:py-20 bg-coral text-ink overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <Reveal className="flex items-center justify-center gap-5 sm:gap-8 min-h-[280px] sm:min-h-[320px] order-2 lg:order-1">
          <div className="card-tactile bg-blue text-white w-36 sm:w-40 h-48 sm:h-52 flex flex-col items-center justify-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <Users size={18} className="text-blue" />
            </span>
            <p className="font-accent font-bold">TEAM BLUE</p>
            <p className="font-display font-bold text-3xl">842</p>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-ink text-white flex items-center justify-center shrink-0">
            <Swords size={28} className="sm:size-8" />
          </div>

          <div className="card-tactile bg-yellow text-ink w-36 sm:w-40 h-48 sm:h-52 flex flex-col items-center justify-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-full bg-ink flex items-center justify-center">
              <Users size={18} className="text-yellow" />
            </span>
            <p className="font-accent font-bold">TEAM GOLD</p>
            <p className="font-display font-bold text-3xl">799</p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <h2 className="font-display font-medium text-display-sm sm:text-display-md mb-6">
            Squad up. Settle it on the leaderboard.
          </h2>
          <p className="text-lg font-sans text-ink/80 mb-8 max-w-md">
            Create a team, share the 6-character code, and every member&apos;s score counts toward
            your team average. No spectators — only competitors.
          </p>
          <Link href="/register" className="btn-tactile bg-ink text-white text-base">
            Build Your Team <ArrowRight size={18} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

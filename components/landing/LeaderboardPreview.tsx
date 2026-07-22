"use client";

import { motion } from "framer-motion";
import { Crown, Medal, Award } from "lucide-react";
import { Reveal } from "./Reveal";

const ROWS = [
  { rank: 1, name: "aria_codes", score: 4820, icon: Crown, medal: "rank-gold" },
  { rank: 2, name: "quizmaster_dev", score: 4510, icon: Medal, medal: "rank-silver" },
  { rank: 3, name: "sam.k", score: 4290, icon: Award, medal: "rank-bronze" },
  { rank: 4, name: "nova_reads", score: 3980, icon: null, medal: "" },
  { rank: 5, name: "priya_learns", score: 3760, icon: null, medal: "" },
];

// Section 9: Leaderboard Preview — top users as collectible cards, animated
// rank movement on hover. Rounded/inset color panel like every other
// section (no section sits directly on the page background); top-3 rows get
// a metallic gold/silver/bronze gradient with a shimmer sweep (see
// .rank-gold/.rank-silver/.rank-bronze in globals.css) instead of a flat
// tint, so the medal tiers actually read as distinct at a glance.
export function LeaderboardPreview() {
  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-10 sm:py-12 bg-orange text-ink">
      <div>
        <Reveal className="text-center mb-14">
          <h2 className="font-display font-bold text-display-sm sm:text-display-md mb-4">
            Climb the ranks.
          </h2>
          <p className="text-lg font-sans font-medium text-ink/85">Live, real-time, always up to date.</p>
        </Reveal>

        <Reveal delay={0.1} className="card-tactile bg-cream-alt p-3 sm:p-4 space-y-2">
          {ROWS.map((r) => (
            <motion.div
              key={r.rank}
              whileHover={{ x: 6 }}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-ink ${r.medal || "bg-cream"}`}
            >
              <span className="w-8 text-center font-display font-bold text-xl">
                {r.icon ? <r.icon size={22} className="mx-auto text-ink" /> : r.rank}
              </span>
              <span className="flex-1 font-accent font-bold">{r.name}</span>
              <span className="font-display font-bold text-lg">{r.score.toLocaleString()}</span>
            </motion.div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

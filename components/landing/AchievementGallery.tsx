"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Percent, Flame, CalendarCheck, Lock, Gauge, Medal } from "lucide-react";
import { Reveal } from "./Reveal";

// The 7 real achievements seeded in the database (prisma/schema.prisma /
// achievements table) — see MIGRATION_AUDIT.md.
const ACHIEVEMENTS = [
  { icon: Target, name: "First Blood", desc: "Complete your first quiz" },
  { icon: Percent, name: "Perfect Score", desc: "Score 100% on any quiz" },
  { icon: Flame, name: "On Fire", desc: "3-day quiz streak" },
  { icon: CalendarCheck, name: "Week Warrior", desc: "7-day quiz streak" },
  { icon: Lock, name: "Lockdown Survivor", desc: "Zero tab switches" },
  { icon: Gauge, name: "Speed Demon", desc: "Complete a speed round" },
  { icon: Medal, name: "Podium Finish", desc: "Rank in the top 3" },
];

const CONFETTI_COLORS = ["#2e5bff", "#ff4b36", "#8b5cf6", "#22c55e", "#14120f"];

// Section 8: Achievement Gallery — grid of collectible badges, hover enlarges
// + confetti burst.
export function AchievementGallery() {
  const [popped, setPopped] = useState<number | null>(null);

  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-16 sm:py-20 bg-yellow">
      <div>
        <Reveal className="max-w-2xl mb-14">
          <h2 className="font-display font-medium text-display-sm sm:text-display-md mb-4">
            Collect them all.
          </h2>
          <p className="text-lg font-sans text-ink/80">Every badge tells the story of a win.</p>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {ACHIEVEMENTS.map((a, i) => (
            <Reveal key={a.name} delay={i * 0.04}>
              <motion.div
                onHoverStart={() => setPopped(i)}
                onHoverEnd={() => setPopped(null)}
                whileHover={{ scale: 1.12 }}
                className="relative card-tactile bg-cream-alt aspect-square flex flex-col items-center justify-center gap-2 p-3 text-center cursor-default"
              >
                <a.icon size={32} className="text-ink" />
                <p className="font-accent font-bold text-xs leading-tight">{a.name}</p>

                <AnimatePresence>
                  {popped === i && (
                    <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
                      {Array.from({ length: 10 }).map((_, c) => (
                        <motion.span
                          key={c}
                          initial={{ opacity: 1, x: "50%", y: "50%", scale: 0 }}
                          animate={{
                            opacity: 0,
                            x: `${50 + (Math.random() * 100 - 50)}%`,
                            y: `${50 + (Math.random() * 100 - 50)}%`,
                            scale: 1,
                          }}
                          transition={{ duration: 0.6 }}
                          className="absolute w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: CONFETTI_COLORS[c % CONFETTI_COLORS.length] }}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

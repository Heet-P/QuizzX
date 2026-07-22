"use client";

import { motion } from "framer-motion";
import { Sparkles, CalendarDays, Users, Award, Zap, Trophy, Flame } from "lucide-react";
import { Reveal } from "./Reveal";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Quiz Generator",
    desc: "Give it a topic — or your own notes — and get a full quiz in seconds.",
    bg: "bg-purple text-ink",
    span: "sm:col-span-2",
  },
  {
    icon: Trophy,
    title: "Live Leaderboards",
    desc: "Real-time rankings, global or just your campus.",
    bg: "bg-yellow text-ink",
    span: "",
  },
  {
    icon: Users,
    title: "Team Battles",
    desc: "Squad up with a 6-character code and compete together.",
    bg: "bg-blue text-ink",
    span: "",
  },
  {
    icon: CalendarDays,
    title: "Daily Challenge",
    desc: "One AI-picked question every day. Keep the streak alive.",
    bg: "bg-green text-ink",
    span: "",
  },
  {
    icon: Flame,
    title: "Streaks & XP",
    desc: "Level up with every quiz. Miss a day, lose the fire.",
    bg: "bg-coral text-ink",
    span: "",
  },
  {
    icon: Award,
    title: "Achievements",
    desc: "Collectible badges for first wins, perfect scores, and more.",
    bg: "bg-cream-alt",
    span: "sm:col-span-3",
  },
];

// Section 3: Feature Mosaic — different-sized cards, per DesignPhilo.md.
export function FeatureMosaic() {
  return (
    <section className="py-2">
      <div>
        <Reveal className="max-w-2xl mb-14">
          <h2 className="font-display font-medium text-display-sm sm:text-display-md mb-4">
            Everything you need to <span className="text-blue">win.</span>
          </h2>
          <p className="text-lg font-sans text-ink/75">
            Not just quizzes — a whole system built to make learning competitive and addictive.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05} className={f.span}>
              <motion.div whileHover={{ y: -6, rotate: i % 2 === 0 ? -1 : 1 }} className={`card-tactile h-full p-7 ${f.bg}`}>
                <f.icon size={32} className="mb-6" />
                <h3 className="font-display font-bold text-2xl mb-2">{f.title}</h3>
                <p className="font-sans font-medium">{f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

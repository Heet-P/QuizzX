"use client";

import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const QUOTES = [
  {
    quote: "I built a 30-question midterm review quiz from my notes in under two minutes.",
    name: "Priya Sharma",
    role: "Computer Science student",
    span: "sm:col-span-2",
  },
  {
    quote: "The lockdown mode is no joke. My students actually take assessments seriously now.",
    name: "Prof. Ramesh Iyer",
    role: "Professor, Computer Science",
    span: "",
  },
  {
    quote: "Team battles turned quiz night into the thing my friend group actually shows up for.",
    name: "Arjun Mehta",
    role: "Team captain, \"Quiz Wizards\"",
    span: "",
  },
  {
    quote: "Watching my streak climb is weirdly the best part of my morning routine.",
    name: "Dr. Meera Nair",
    role: "Professor, Mathematics",
    span: "sm:col-span-2",
  },
];

// Section 10: Testimonials — magazine-style cards, explicitly not a slider.
export function Testimonials() {
  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-16 sm:py-20 bg-green text-ink">
      <div>
        <Reveal className="max-w-2xl mb-14">
          <h2 className="font-display font-medium text-display-sm sm:text-display-md">
            People keep coming back.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.06} className={q.span}>
              <motion.div whileHover={{ y: -6 }} className="card-tactile bg-cream-alt text-ink h-full p-8">
                <p className="font-display font-medium text-xl leading-snug mb-6">&ldquo;{q.quote}&rdquo;</p>
                <p className="font-accent font-bold">{q.name}</p>
                <p className="font-sans text-sm text-ink/60">{q.role}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

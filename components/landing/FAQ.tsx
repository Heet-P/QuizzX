"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "Is QuizzX free to use?",
    a: "Yes — creating an account, taking quizzes, joining teams, and climbing the leaderboard are all free.",
  },
  {
    q: "How does the AI quiz generator work?",
    a: "Give it a topic, or paste your own notes, and it drafts a full multiple-choice quiz — questions, answer options, and explanations included. You review and publish it.",
  },
  {
    q: "What stops people from cheating?",
    a: "Fullscreen lockdown, tab-switch detection, copy/paste blocking, and shuffled questions/options per student. Teachers get a live integrity dashboard during the quiz and a downloadable report after.",
  },
  {
    q: "Can I compete as a team?",
    a: "Yes. Create a team and share its 6-character code — every member's score counts toward your team's average on team-mode quizzes.",
  },
  {
    q: "Do I need to install anything?",
    a: "No — QuizzX runs entirely in the browser.",
  },
];

// Section 11: FAQ — accordion with playful open/close interaction. Rounded/
// inset color panel like every other section — no section sits directly on
// the page background.
export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-10 sm:py-12 bg-blue text-ink">
      <div>
        <Reveal className="mb-14">
          <h2 className="font-display font-bold text-display-sm sm:text-display-md">Questions? Answers.</h2>
        </Reveal>

        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className="card-tactile bg-cream-alt overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-accent font-bold text-lg">{f.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 w-8 h-8 rounded-full bg-cream-deep flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 font-sans font-medium text-ink/85">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

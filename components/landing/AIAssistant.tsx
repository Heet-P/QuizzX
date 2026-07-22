"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { Reveal } from "./Reveal";

const PROMPTS = [
  "Generate 10 questions on the French Revolution",
  "Explain why the answer to Q4 is B, not C",
  "Turn my lecture notes into a quiz",
];

// Section 7: AI Assistant — color shift to purple, animated mascot + floating
// chat bubbles. Maps to QuizzX's real AI features (quiz generation from a
// topic/notes, and "explain this answer" in practice mode).
export function AIAssistant() {
  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-16 sm:py-20 bg-purple text-ink overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div className="chip bg-white text-ink mb-6">
            <Sparkles size={14} /> Powered by AI
          </div>
          <h2 className="font-display font-medium text-display-sm sm:text-display-md mb-6">
            Your quiz, written in seconds.
          </h2>
          <p className="text-lg font-sans text-ink/80 max-w-md">
            Paste a topic or your own notes and QuizzX&apos;s AI drafts a full quiz — questions,
            options, and explanations included. Stuck on an answer? Ask it why.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="relative h-[340px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 rounded-[28px] bg-white text-ink flex items-center justify-center">
            <Bot size={40} />
          </div>

          {PROMPTS.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
              className={`card-tactile bg-cream-alt text-ink px-5 py-3 max-w-[280px] absolute font-sans text-sm ${
                i === 0 ? "top-24 left-0" : i === 1 ? "top-44 right-0" : "top-64 left-8"
              }`}
            >
              {p}
            </motion.div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

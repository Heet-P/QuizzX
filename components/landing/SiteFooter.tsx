"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PartyPopper } from "lucide-react";

const SQUARES = [
  { top: "10%", left: "8%", bg: "bg-blue" },
  { top: "70%", left: "15%", bg: "bg-yellow" },
  { top: "20%", left: "85%", bg: "bg-coral" },
  { top: "60%", left: "92%", bg: "bg-purple" },
  { top: "85%", left: "50%", bg: "bg-green" },
];

// Section 12: Footer — massive branded ending with animated grid + floating squares.
export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <footer className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-ink text-white px-6 sm:px-10 pt-16 sm:pt-20 pb-10">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {SQUARES.map((s, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute w-8 h-8 sm:w-12 sm:h-12 rounded-xl ${s.bg}`}
          style={{ top: s.top, left: s.left }}
        />
      ))}

      <div className="relative">
        <div className="grid md:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <p className="font-accent font-bold uppercase tracking-wide text-white/50 mb-3">
              Ready when you are
            </p>
            <h2 className="font-display font-medium text-3xl sm:text-4xl">
              Your first quiz is 60 seconds away.
            </h2>
          </div>
          <div>
            {submitted ? (
              <p className="font-accent font-bold text-green flex items-center gap-2">
                <PartyPopper size={18} /> You&apos;re on the list.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSubmitted(true);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 h-[52px] rounded-[18px] border-2 border-ink bg-cream-alt px-4 leading-[52px] font-sans text-ink placeholder:text-ink/45 focus:outline-none focus:bg-white"
                />
                <button type="submit" className="btn-tactile bg-yellow text-ink shrink-0 h-[52px]">
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 mb-16 font-sans text-white/60">
          <div>
            <p className="font-accent font-bold text-white mb-3">Product</p>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-accent font-bold text-white mb-3">Legal</p>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-accent font-bold text-white mb-3">Connect</p>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Twitter / X
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <h1 className="font-display font-medium text-6xl sm:text-8xl lg:text-9xl leading-none tracking-tight text-white/95 select-none">
          QUIZZX
        </h1>

        <p className="mt-6 text-white/40 font-sans text-sm">© 2026 QuizzX. All rights reserved.</p>
      </div>
    </footer>
  );
}

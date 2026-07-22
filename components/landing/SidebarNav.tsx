"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";

// Colors match each target section's own panel color, so the menu reads as
// a color-coded map of the page, not just a numbered list.
const NAV_ITEMS = [
  { num: "01", label: "Features", href: "#features", bg: "bg-ink text-white" },
  { num: "02", label: "Live Stats", href: "#stats", bg: "bg-blue text-ink" },
  { num: "03", label: "Battle Mode", href: "#battle", bg: "bg-coral text-ink" },
  { num: "04", label: "AI Coach", href: "#ai", bg: "bg-purple text-ink" },
  { num: "05", label: "Achievements", href: "#achievements", bg: "bg-yellow text-ink" },
  { num: "06", label: "Leaderboard", href: "#leaderboard", bg: "bg-orange text-ink" },
  { num: "07", label: "Reviews", href: "#testimonials", bg: "bg-green text-ink" },
  { num: "08", label: "FAQ", href: "#faq", bg: "bg-blue text-ink" },
];

// Index nav as a dropdown instead of a permanently-visible rail — a
// persistent sidebar that has to stay pinned for the whole page *and* fill
// exactly the right height at every scroll position/viewport size turned
// into a losing battle (sticky containing-block quirks, grid row
// inflation, natural-vs-stuck offset mismatches). A small trigger button +
// full-screen overlay sidesteps all of that: it only needs to size itself
// once, while open, with nothing else on the page to coordinate with.
export function SidebarNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex items-center gap-2 sticky top-6 z-30 rounded-[var(--radius-card-sm)] border-2 border-ink bg-ink text-white px-4 py-3 font-accent font-bold text-sm hover:-translate-y-1 transition-transform"
      >
        <Menu size={16} /> Menu
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="card-tactile bg-cream w-full max-w-lg p-6 sm:p-8 relative max-h-[85dvh] overflow-y-auto"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute top-5 right-5 sm:top-7 sm:right-7 rounded-full border-2 border-ink bg-cream-alt p-2 hover:-translate-y-0.5 transition-transform"
              >
                <X size={16} />
              </button>

              <p className="font-display font-bold text-2xl sm:text-3xl mb-6">Jump to</p>

              <nav className="grid grid-cols-2 gap-2.5 mb-3">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.num}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`group flex items-center justify-between rounded-[var(--radius-card-sm)] border-2 border-ink px-3 py-3 transition-transform hover:-translate-y-1 ${item.bg}`}
                  >
                    <div>
                      <span className="block font-accent font-bold text-[10px] opacity-70">{item.num}</span>
                      <span className="block font-display font-medium text-sm leading-tight">{item.label}</span>
                    </div>
                    <ArrowUpRight size={14} className="shrink-0 transition-transform group-hover:rotate-45" />
                  </a>
                ))}
              </nav>

              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-[var(--radius-card-sm)] border-2 border-ink bg-ink text-white text-center font-accent text-sm font-bold py-3 hover:-translate-y-1 transition-transform"
              >
                Sign In
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

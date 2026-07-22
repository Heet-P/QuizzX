"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Branded first-load intro screen (design_idea/DesignPhilo.md: "interactive
// fun elements" / units.gr-style loading moment on first visit). Session-
// scoped so it only plays once per browser session, not on every navigation.
export function IntroLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("quizzx-intro-played")) return;
    setVisible(true);
    sessionStorage.setItem("quizzx-intro-played", "1");
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] bg-ink flex items-center justify-center"
        >
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-medium text-5xl sm:text-7xl text-white tracking-tight"
          >
            QUIZZX<span className="text-yellow">.</span>
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

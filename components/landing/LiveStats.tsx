"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

const STATS = [
  { value: 48_000, suffix: "+", label: "Questions Solved" },
  { value: 6_200, suffix: "+", label: "Players" },
  { value: 60, suffix: "+", label: "Categories" },
  { value: 92, suffix: "%", label: "Retention" },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

// Section 4: Live Statistics — animated counters, blue dominant panel. Rounded
// and inset (not edge-to-edge) since it now sits in the sidebar-flanked
// content column — see app/page.tsx.
export function LiveStats() {
  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink px-6 sm:px-10 py-16 sm:py-20 bg-blue text-ink">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center sm:text-left"
          >
            <p className="font-display font-medium text-display-sm sm:text-display-md">
              <Counter value={s.value} suffix={s.suffix} />
            </p>
            <p className="font-accent font-bold uppercase tracking-wide opacity-80 mt-2">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

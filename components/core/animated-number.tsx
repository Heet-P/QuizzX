"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

// Small in-house count-up number — the project has no UI-kit dependency
// providing `@/components/core/animated-number` (same situation as
// components/core/tilt.tsx), so this reimplements the same idea with
// framer-motion's spring engine, already a project dependency. A plain
// local type for spring config (not imported from framer-motion) mirrors
// how tilt.tsx handles the same "no exported options type" situation.
interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  duration?: number;
  bounce?: number;
}

interface AnimatedNumberProps {
  value: number;
  className?: string;
  springOptions?: SpringConfig;
  /** Formats the rounded live value for display — defaults to a plain integer string. */
  format?: (value: number) => string;
}

export function AnimatedNumber({ value, className, springOptions, format }: AnimatedNumberProps) {
  const spring = useSpring(0, springOptions);
  const display = useTransform(spring, (current) => (format ? format(current) : Math.round(current).toString()));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}

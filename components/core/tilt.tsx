"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// Lightweight in-house tilt-on-hover wrapper — the project has no UI-kit
// dependency providing this (no `@/components/core/tilt` package installed),
// so this reimplements the same idea (pointer-position-driven 3D rotation)
// with framer-motion, which is already a dependency used throughout the app.
interface TiltProps {
  children: ReactNode;
  rotationFactor?: number;
  isReverse?: boolean;
  springOptions?: { stiffness?: number; damping?: number; mass?: number };
  className?: string;
}

export function Tilt({ children, rotationFactor = 10, isReverse = false, springOptions, className }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springX = useSpring(px, { stiffness: 220, damping: 20, mass: 0.6, ...springOptions });
  const springY = useSpring(py, { stiffness: 220, damping: 20, mass: 0.6, ...springOptions });
  const sign = isReverse ? -1 : 1;

  const rotateX = useTransform(springY, [0, 1], [rotationFactor * sign, -rotationFactor * sign]);
  const rotateY = useTransform(springX, [0, 1], [-rotationFactor * sign, rotationFactor * sign]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

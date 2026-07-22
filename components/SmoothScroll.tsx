"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Site-wide smooth scroll (design_idea/DesignPhilo.md tech stack: "Lenis
// smooth scrolling"). Mounted once in the root layout.
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const raf_id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(raf_id);
      lenis.destroy();
    };
  }, []);

  return null;
}

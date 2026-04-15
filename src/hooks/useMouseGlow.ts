"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Attaches mouse-follow glow to cards inside a container.
 * Sets --mx / --my CSS custom properties on each matched element.
 */
export function useMouseGlow(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string = ".glow-card"
) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || !containerRef.current) return;

    const container = containerRef.current;
    const cards = container.querySelectorAll<HTMLElement>(selector);
    const cleanups: (() => void)[] = [];

    cards.forEach((card) => {
      let ticking = false;
      const handler = (e: MouseEvent) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
          card.style.setProperty("--my", `${e.clientY - rect.top}px`);
          ticking = false;
        });
      };
      card.addEventListener("mousemove", handler);
      cleanups.push(() => card.removeEventListener("mousemove", handler));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [containerRef, selector, shouldReduceMotion]);
}

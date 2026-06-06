"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Scans the document for [data-speed] and [data-lag] attributes and applies
 * parallax + lag transforms tied to scroll, mirroring ScrollSmoother semantics.
 *
 *   data-speed="1.2" → drifts 20% faster than scroll (overtakes)
 *   data-speed="0.8" → drifts 20% slower than scroll (parallax)
 *   data-lag="0.4"   → transform smooths toward target with ~0.4s ease
 *
 * Both can be combined on the same element. Honors prefers-reduced-motion.
 */
export function useScrollParallax(scopeSelector: string = "body") {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const root =
      document.querySelector<HTMLElement>(scopeSelector) ?? document.body;
    const els = root.querySelectorAll<HTMLElement>("[data-speed], [data-lag]");
    const triggers: ScrollTrigger[] = [];

    els.forEach((el) => {
      const speed = parseFloat(el.dataset.speed ?? "1");
      const lag = parseFloat(el.dataset.lag ?? "0");
      const hasSpeed = isFinite(speed) && speed !== 1;
      const hasLag = isFinite(lag) && lag > 0;
      if (!hasSpeed && !hasLag) return;

      const setter = hasLag
        ? gsap.quickTo(el, "y", { duration: lag, ease: "power2.out" })
        : (v: number) => gsap.set(el, { y: v });

      const distance = () => {
        const vh = window.innerHeight;
        const eh = el.getBoundingClientRect().height;
        return hasSpeed ? (speed - 1) * (vh + eh) : 60;
      };

      const t = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          setter(distance() * (self.progress - 0.5));
        },
        invalidateOnRefresh: true,
      });
      triggers.push(t);
    });

    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
      els.forEach((el) => gsap.set(el, { clearProps: "y" }));
    };
  }, [scopeSelector]);
}

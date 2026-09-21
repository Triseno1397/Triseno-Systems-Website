"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Module-level handle so chrome (menu overlay, back chevron) can drive the
// same scroller without prop-drilling. null when Lenis is off (reduced motion,
// touch devices) — callers fall back to native scrolling.
let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function scrollToTop() {
  if (lenisInstance) lenisInstance.scrollTo(0, { duration: 1.4 });
  else {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }
}

export function lockScroll(locked: boolean) {
  if (lenisInstance) {
    if (locked) lenisInstance.stop();
    else lenisInstance.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/**
 * Lenis smooth scroll, ticked by GSAP so ScrollTrigger and Lenis share one
 * clock. Disabled for prefers-reduced-motion (M5: no scroll-jacking) and on
 * touch devices, where native momentum scrolling is already right.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) {
      // native scrolling: mirror Lenis's `lenis-scrolling` flag so the ambient
      // layers (world.css) and the studio's air canvas rest mid-scroll here too
      const root = document.documentElement;
      let idle = 0;
      const onScroll = () => {
        if (!root.classList.contains("lenis-scrolling")) root.classList.add("lenis-scrolling");
        window.clearTimeout(idle);
        idle = window.setTimeout(() => root.classList.remove("lenis-scrolling"), 180);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(idle);
        root.classList.remove("lenis-scrolling");
      };
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
    });
    lenisInstance = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  // New route: start at the top and let ScrollTrigger re-measure the new page.
  useEffect(() => {
    lenisInstance?.scrollTo(0, { immediate: true, force: true });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}

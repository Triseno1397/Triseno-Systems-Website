"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setPreFrame } from "./frameLoop";
import { feedScroll } from "./plateMotion";

gsap.registerPlugin(ScrollTrigger);
// iOS/Android: the address bar sliding in and out resizes the viewport while
// you scroll. Without this ScrollTrigger re-measures every pin mid-scroll and
// the page visibly jumps.
ScrollTrigger.config({ ignoreMobileResize: true });
// Touch scrolling runs off the main thread, so a pin can engage a frame late
// and visibly hop; anticipating it by one frame of scroll removes the hop.
if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
  ScrollTrigger.defaults({ anticipatePin: 1 });
}

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
    // first in every frame: the page moves before anything measures or writes
    // (otherwise Lenis's scrollTo forces a full style pass over the frame's writes)
    setPreFrame((time) => {
      lenis.raf(time * 1000);
      feedScroll(lenis.scroll);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      setPreFrame(null);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  // Every page opens at the top — on every device. (Touch devices have no
  // Lenis, and the browser's own restoration could land a new page mid-way.)
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // New route: start at the top and let ScrollTrigger re-measure the new page.
  // The reset is repeated while the new page settles (the old page's pins
  // unwinding, the new page's pin-spacers and images arriving can all move
  // the scroll position) — until the visitor scrolls on their own.
  useEffect(() => {
    let userMoved = false;
    const mark = () => (userMoved = true);
    const top = () => {
      if (userMoved) return;
      if (lenisInstance) lenisInstance.scrollTo(0, { immediate: true, force: true });
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    top();
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchstart", mark, { passive: true });
    window.addEventListener("keydown", mark);
    const raf = window.requestAnimationFrame(top);
    const timers = [
      window.setTimeout(() => {
        ScrollTrigger.refresh();
        top();
      }, 120),
      window.setTimeout(top, 400),
      window.setTimeout(top, 900),
    ];
    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchstart", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [pathname]);

  return null;
}

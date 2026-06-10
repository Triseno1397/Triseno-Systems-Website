"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// Register ScrollTrigger + useGSAP exactly once at module load (idempotent guard).
let pluginsRegistered = false;
if (typeof window !== "undefined" && !pluginsRegistered) {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  pluginsRegistered = true;
}

export function useGSAPScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      ScrollTrigger.refresh();
      return () => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    // Smooth every input, not just the wheel. On touch we sync Lenis to the
    // native gesture (syncTouch) with a gentler inertia, so scrubbed
    // ScrollTrigger timelines glide as the finger moves instead of lurching
    // with each fling — the main reason the division's scroll choreography
    // felt fast and janky on mobile.
    const lenis = new Lenis({
      lerp: isMobile ? 0.08 : 0.1,
      smoothWheel: true,
      syncTouch: isMobile,
      syncTouchLerp: 0.08,
    });

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);
}

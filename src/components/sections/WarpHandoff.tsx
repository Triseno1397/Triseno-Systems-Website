"use client";

import { useRef } from "react";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";

/**
 * Warp-blast handoff between the hero and the Capabilities showcase.
 *
 * A fixed, full-viewport bloom that whites out the seam where the hero warp
 * ends and the next section begins, then clears to reveal that section — so
 * the hyperspeed "explosion" deposits you into the next section instead of
 * the warp frame simply scrolling off-screen.
 *
 * Tied to the Capabilities section entering the viewport:
 *   start "top bottom" → its top reaches the viewport bottom (the moment the
 *     hero warp finishes), bloom begins.
 *   end   "top top"    → its top reaches the viewport top and it pins; by then
 *     the bloom has fully cleared.
 *
 * Driven entirely by scroll (scrub) so it tracks the wheel exactly. Skipped
 * for prefers-reduced-motion; the overlay just stays invisible.
 */
export default function WarpHandoff() {
  const flashRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const flash = flashRef.current;
    if (!flash) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const target = document.querySelector<HTMLElement>(
      '[data-section="capabilities-showcase"]'
    );
    if (!target) return;

    gsap.set(flash, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: target,
        start: "top bottom",
        end: "top top",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    // Bloom in fast to cover the seam, hold the white-out briefly, then clear
    // on a smooth ease as the section settles into its pinned position.
    tl.to(flash, { opacity: 1, ease: "power2.out", duration: 0.3 }, 0)
      .to(flash, { opacity: 1, duration: 0.15 }, 0.3)
      .to(flash, { opacity: 0, ease: "power2.inOut", duration: 0.55 }, 0.45);
  }, []);

  return (
    <div
      ref={flashRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80]"
      style={{
        opacity: 0,
        willChange: "opacity",
        background:
          "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.98) 0%, rgba(216,245,255,0.96) 28%, rgba(120,226,255,0.86) 52%, rgba(30,60,95,0.55) 78%, rgba(10,14,26,0.32) 100%)",
      }}
    />
  );
}

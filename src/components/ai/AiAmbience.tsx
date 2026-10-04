"use client";

import { useEffect, useRef } from "react";
import "@/app/ai-ambience.css";

/**
 * The clean room's air, page-wide and cheap:
 *
 *   grain   a living film grain over the paper: one oversized noise layer
 *           jumping between offsets in steps (transform only, compositor);
 *   glow    under the pointer the drafting grid lights up in cyan: a small
 *           lens that follows the pointer and draws the same grid, aligned
 *           to the sheet's, fading out at its rim;
 *   shine   eyebrow labels and the hero's button catch a cyan glint as they
 *           come into view and again on hover, then rest solid (gradient type
 *           only while moving).
 *
 * Pointer devices only for the glow; reduced motion keeps the grain still and
 * the labels solid.
 */
/** the glow lens radius (matches .ai-glow in ai-ambience.css) */
const R = 230;

export default function AiAmbience() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    // shine: labels glint once on entry
    const labels = Array.from(document.querySelectorAll<HTMLElement>(".ai-world .ai-label, .ai-world [data-shine], .ai-hero__cta .ghost-btn__layer:not(.ghost-btn__fill) > span:first-child"));
    let io: IntersectionObserver | null = null;
    if (!reduced) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            el.classList.add("ai-shine");
            el.classList.remove("is-shining");
            void el.offsetWidth;
            el.classList.add("is-shining");
            io?.unobserve(el);
          }
        },
        { rootMargin: "0px 0px -12% 0px" },
      );
      labels.forEach((el) => io!.observe(el));
    }
    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(".ai-shine");
      if (!el || el.classList.contains("is-shining")) return;
      el.classList.add("is-shining");
    };
    const onEnd = (e: Event) => (e.target as HTMLElement).classList?.remove("is-shining");
    document.addEventListener("pointerover", onOver);
    document.addEventListener("animationend", onEnd);

    // glow: follow the pointer
    const glow = glowRef.current;
    let raf = 0;
    let tx = -999;
    let ty = -999;
    let x = -999;
    let y = -999;
    let on = false;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!on) {
        on = true;
        x = tx;
        y = ty;
        glow?.setAttribute("data-on", "");
      }
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onLeave = () => {
      on = false;
      glow?.removeAttribute("data-on");
    };
    const step = () => {
      raf = 0;
      if (!glow) return;
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      // the lens moves by transform; its grid is shifted the other way so it
      // stays registered with the sheet's grid underneath
      glow.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const g = `${(R - x - 1).toFixed(1)}px ${(R - y - 1).toFixed(1)}px`;
      glow.style.backgroundPosition = `${g}, ${g}, ${g}, ${g}, 0 0`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(step);
    };
    if (fine && !reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    return () => {
      io?.disconnect();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("animationend", onEnd);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <span aria-hidden="true" data-world-layer="" className="ai-grain">
        <i />
      </span>
      <div ref={glowRef} aria-hidden="true" data-world-layer="" className="ai-glow" />
    </>
  );
}

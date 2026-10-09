"use client";

import { useEffect, useRef } from "react";
import "@/app/ai-ambience.css";
import "@/app/ai-projection.css";
import { addFrameJob } from "@/components/world/frameLoop";
import { getLenis } from "@/components/world/SmoothScroll";
import { cleanDark } from "./cleanDark";

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
 *           only while moving);
 *   streak  the gate streak: fling the page and the paper's horizontal
 *           rules smear vertically like film through a projector gate too
 *           fast; stop and they snap back crisp within ~200 ms. The rules
 *           live on their own fixed layer (.ai-paper__rules, registered
 *           with the paper's grid) and a pre-smeared twin (.ai-paper__streak)
 *           is cross-faded in by scroll velocity and shifted against the
 *           motion, up to 14px. Two style writes per frame while moving,
 *           none at rest; off under reduced motion and while a dark band
 *           owns the frame (cleanDark).
 *
 * Pointer devices only for the glow; reduced motion keeps the grain still,
 * the labels solid and the rules crisp.
 */
/** the glow lens radius (matches .ai-glow in ai-ambience.css) */
const R = 230;
/** velocity (px per 60 Hz frame) where the smear begins and where it is full */
const STREAK_LO = 6;
const STREAK_HI = 42;

export default function AiAmbience() {
  const glowRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLSpanElement>(null);
  const streakRef = useRef<HTMLSpanElement>(null);

  // the gate streak: one frame job, velocity sampled in the read phase,
  // two writes in the write phase, only when the quantised values changed
  useEffect(() => {
    const rules = rulesRef.current;
    const streak = streakRef.current;
    if (!rules || !streak) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let y = 0;
    let lastY = -1;
    let lastT = -1;
    let v = 0;
    let shownO = 0;
    let shownY = 0;
    let parked = true;
    const stop = addFrameJob({
      read: () => {
        y = getLenis()?.scroll ?? window.scrollY;
      },
      write: (t) => {
        const dt = lastT < 0 ? 1 / 60 : Math.min(0.1, Math.max(0.001, t - lastT));
        lastT = t;
        const dy = lastY < 0 ? 0 : y - lastY;
        lastY = y;
        // px per 60 Hz frame, whatever the display's rate, smoothed exp(-dt x 9)
        const inst = dy / dt / 60;
        v += (inst - v) * (1 - Math.exp(-dt * 9));
        if (cleanDark.isActive()) {
          // a dark band owns the frame: the paper's rules are not the subject
          if (!parked) {
            parked = true;
            shownO = 0;
            shownY = 0;
            streak.style.opacity = "0";
            rules.style.opacity = "1";
            streak.style.transform = "";
          }
          return;
        }
        const a = Math.abs(v);
        let o = 0;
        if (a >= STREAK_HI) o = 1;
        else if (a > STREAK_LO) {
          const x = (a - STREAK_LO) / (STREAK_HI - STREAK_LO);
          o = x * x * (3 - 2 * x);
        }
        const oq = Math.round(o * 100) / 100;
        const tyq = Math.round(Math.max(-14, Math.min(14, -v * 0.35)) * 2) / 2;
        if (oq === shownO && (oq === 0 || tyq === shownY)) return;
        shownO = oq;
        shownY = tyq;
        parked = false;
        streak.style.opacity = String(oq);
        rules.style.opacity = String(1 - oq);
        streak.style.transform = `translate3d(0, ${tyq}px, 0)`;
      },
    });
    return stop;
  }, []);

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
      {/* the gate streak: the paper's horizontal rules, crisp and pre-smeared,
          under the grain (same fixed z as the paper; DOM order stacks them) */}
      <span ref={rulesRef} aria-hidden="true" data-world-layer="" className="ai-paper__rules" />
      <span ref={streakRef} aria-hidden="true" data-world-layer="" className="ai-paper__streak" />
      <span aria-hidden="true" data-world-layer="" className="ai-grain">
        <i />
      </span>
      <div ref={glowRef} aria-hidden="true" data-world-layer="" className="ai-glow" />
    </>
  );
}

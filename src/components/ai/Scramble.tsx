"use client";

import { useEffect, useRef } from "react";

/**
 * Text that decodes into place: each character cycles through a few random
 * glyphs and settles, left to right. The final text is what the server
 * renders (and what a reader or a crawler gets); the scramble only runs once,
 * on mount or when `play` flips true. Reduced motion: no scramble.
 */

const POOL = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>_";

interface Props {
  text: string;
  /** seconds before this line starts */
  delay?: number;
  /** seconds for the whole line to settle */
  duration?: number;
  play?: boolean;
  className?: string;
}

export default function Scramble({ text, delay = 0, duration = 0.9, play = true, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !play || done.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    done.current = true;
    const chars = [...text];
    let raf = 0;
    let start = 0;
    let lastSwap = 0;
    const frame = (now: number) => {
      if (!start) start = now + delay * 1000;
      const t = (now - start) / (duration * 1000);
      if (t < 0) {
        el.textContent = chars.map((c) => (c === " " ? " " : " ")).join("");
        raf = requestAnimationFrame(frame);
        return;
      }
      if (t >= 1) {
        el.textContent = text;
        return;
      }
      // swap the unsettled glyphs at ~30Hz, not every frame
      if (now - lastSwap > 33) {
        lastSwap = now;
        el.textContent = chars
          .map((c, i) => {
            if (c === " ") return " ";
            const settle = (i + 1) / chars.length;
            if (t >= settle * 0.85) return c;
            if (t < (i / chars.length) * 0.5) return " ";
            return POOL[(Math.random() * POOL.length) | 0];
          })
          .join("");
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, delay, duration, play]);

  return (
    <span ref={ref} className={className} aria-hidden="true">
      {text}
    </span>
  );
}

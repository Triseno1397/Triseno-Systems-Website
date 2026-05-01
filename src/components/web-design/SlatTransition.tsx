"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const SLAT_COUNT = 14;
// Outside-in flap rhythm: 1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 8 (1-indexed)
const ORDER = [0, 13, 1, 12, 2, 11, 3, 10, 4, 9, 5, 8, 6, 7];

interface Props {
  triggerSelectors: string[];
}

export default function SlatTransition({ triggerSelectors }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const slatsRef = useRef<(SVGRectElement | null)[]>([]);

  useGSAP(
    () => {
      const slats = slatsRef.current.filter(Boolean) as SVGRectElement[];
      if (slats.length === 0) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(slats, { transformOrigin: "50% 50%", scaleY: 0 });
      if (reduce) return;

      // Defer ScrollTrigger creation until refs and DOM are settled.
      const rafId = requestAnimationFrame(() => {
        triggerSelectors.forEach((sel) => {
          const el = document.querySelector(sel);
          if (!el) return;

          const tl = gsap.timeline({ paused: true });
          ORDER.forEach((idx, i) => {
            const target = slats[idx];
            if (!target) return;
            tl.to(
              target,
              { scaleY: 1, duration: 0.32, ease: "power3.in" },
              i * 0.018
            );
          });
          const outStart = 0.32 + ORDER.length * 0.018;
          ORDER.forEach((idx, i) => {
            const target = slats[idx];
            if (!target) return;
            tl.to(
              target,
              { scaleY: 0, duration: 0.7, ease: "power3.inOut" },
              outStart + i * 0.03
            );
          });

          ScrollTrigger.create({
            trigger: el,
            start: "top 75%",
            onEnter: () => tl.restart(),
          });
        });
      });

      return () => cancelAnimationFrame(rafId);
    },
    { scope: wrapRef, dependencies: [triggerSelectors] }
  );

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[40]"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block h-full w-full"
      >
        {Array.from({ length: SLAT_COUNT }).map((_, i) => (
          <rect
            key={i}
            ref={(el) => {
              slatsRef.current[i] = el;
            }}
            x={(100 / SLAT_COUNT) * i}
            y={0}
            width={100 / SLAT_COUNT + 0.1}
            height={100}
            fill="#050810"
          />
        ))}
      </svg>
    </div>
  );
}

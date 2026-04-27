"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useGSAPScroll";

export default function VelocityMarquee({
  text,
  baseSpeed = 60, // px/sec
  baseDirection = 1,
  className = "",
  separator = " · ",
}: {
  text: string;
  baseSpeed?: number;
  baseDirection?: 1 | -1;
  className?: string;
  separator?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const velocityFactorRef = useRef(1);
  const directionRef = useRef(baseDirection);
  const widthRef = useRef(0);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      // Track contains 4 copies; one copy width is total / 4
      widthRef.current = track.scrollWidth / 4;
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(track);

    let raf = 0;
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const speed = reduced ? baseSpeed * 0.15 : baseSpeed * velocityFactorRef.current;
      offsetRef.current -= speed * directionRef.current * dt;

      const w = widthRef.current;
      if (w > 0) {
        if (offsetRef.current <= -w) offsetRef.current += w;
        else if (offsetRef.current >= 0) offsetRef.current -= w;
      }

      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let scrollTrigger: ScrollTrigger | null = null;
    if (!reduced) {
      scrollTrigger = ScrollTrigger.create({
        trigger: document.body,
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const v = self.getVelocity(); // px/sec, signed
          // Map velocity → multiplier: negative = scrolling up
          const norm = gsap.utils.clamp(-1, 1, v / 1500);
          // Scrolling down (positive v) → marquee moves left (direction = baseDirection)
          // Scrolling up (negative v) → marquee flips direction
          if (Math.abs(norm) > 0.05) {
            directionRef.current = (norm > 0 ? baseDirection : -baseDirection) as 1 | -1;
          } else {
            directionRef.current = baseDirection;
          }
          velocityFactorRef.current = 1 + Math.abs(norm) * 4;
        },
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (scrollTrigger) scrollTrigger.kill();
    };
  }, [baseSpeed, baseDirection]);

  return (
    <div
      className={`relative w-full overflow-hidden whitespace-nowrap select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div ref={trackRef} className="inline-flex" style={{ willChange: "transform" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="inline-block pr-12">
            {text}
            {separator}
          </span>
        ))}
      </div>
    </div>
  );
}

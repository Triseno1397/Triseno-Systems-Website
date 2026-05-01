"use client";

import { useEffect, useRef, useState } from "react";

export default function PageCurtain() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // Force reflow then trigger transition.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = "translateY(-100%)";
      });
    });
    const t = window.setTimeout(() => setDone(true), 720);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{
        backgroundColor: "#050810",
        transform: "translateY(0)",
        transition: "transform 600ms cubic-bezier(0.7, 0, 0.18, 1)",
        willChange: "transform",
      }}
    />
  );
}

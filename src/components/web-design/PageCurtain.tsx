"use client";

import { useEffect, useState } from "react";

export default function PageCurtain({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<"down" | "up" | "gone">("down");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("gone");
      onComplete?.();
      return;
    }

    const t1 = window.setTimeout(() => setPhase("up"), 60);
    const t2 = window.setTimeout(() => {
      setPhase("gone");
      onComplete?.();
    }, 660);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onComplete]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{
        background: "#050810",
        transform: phase === "down" ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 600ms cubic-bezier(0.7, 0, 0.2, 1)",
        willChange: "transform",
      }}
    />
  );
}

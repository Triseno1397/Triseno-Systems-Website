"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Arrival bloom for /web-design. The page is only ever reached through the
 * /contact portal blast, which white-outs the screen on a hyperspeed warp
 * (see PortalBlast). This curtain picks that bloom up on the other side and
 * dissolves it — so the navigation reads as emerging from the warp into the
 * hero, rather than a hard cut to a dark panel. Kept visually in sync with
 * PortalBlast's PORTAL_BLOOM.
 *
 * prefers-reduced-motion reveals instantly (no flash).
 */
const ARRIVAL_BLOOM =
  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.99) 0%, rgba(231,250,255,0.98) 34%, rgba(110,224,255,0.92) 62%, rgba(36,118,178,0.6) 82%, rgba(8,12,22,0.4) 100%)";

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
    // Force reflow then dissolve: the bloom fades while easing back to rest,
    // settling the "camera exposure" onto the hero beneath.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = "0";
        el.style.transform = "scale(1)";
      });
    });
    const t = window.setTimeout(() => setDone(true), 620);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{
        background: ARRIVAL_BLOOM,
        opacity: 1,
        transform: "scale(1.06)",
        transition:
          "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 760ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "opacity, transform",
      }}
    />
  );
}

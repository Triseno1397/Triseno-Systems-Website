"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DIVISIONS } from "@/lib/divisions";
import AiHero from "./AiHero";
import Capabilities from "./Capabilities";
import Compression from "./Compression";
import OrbitalProcess from "./OrbitalProcess";
import Industries from "./Industries";
import WhyTriseno from "./WhyTriseno";
import AiGate from "./AiGate";
import LatticePoster from "./LatticePoster";
import { latticeState } from "./lattice";

// three / R3F never reach the server HTML or the first bundle: the LCP element is the headline.
const LatticeScene = dynamic(() => import("./LatticeScene"), { ssr: false });

type Mode = "pending" | "full" | "lite";

function canRunWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function AiPage() {
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  const [dim, setDim] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /* full 3D, or the poster (M5: mobile, reduced motion, no WebGL) */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const small = window.matchMedia("(max-width: 767px)");
    const webgl = canRunWebGL();
    const decide = () => setMode(reduced.matches || small.matches || !webgl ? "lite" : "full");
    decide();
    latticeState.lastMove = 0;
    reduced.addEventListener("change", decide);
    small.addEventListener("change", decide);
    return () => {
      reduced.removeEventListener("change", decide);
      small.removeEventListener("change", decide);
    };
  }, []);

  /* one pointer feeds both the lattice and the headline spotlight */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      latticeState.px = (e.clientX / window.innerWidth) * 2 - 1;
      latticeState.py = 1 - (e.clientY / window.innerHeight) * 2;
      latticeState.lastMove = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* past the hero the world steps back behind the content */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setDim(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <main
      className="ai-world relative bg-black text-white"
      data-mode={mode}
      style={{ ["--hue" as string]: DIVISIONS.ai.hue }}
    >
      {/* The world: one fixed scene behind every section. */}
      <div aria-hidden="true" className="ai-world__scene" data-dim={dim ? "" : undefined}>
        {mode !== "pending" ? <LatticePoster hidden={mode === "full" && ready} /> : null}
        {mode === "full" ? (
          <div className="ai-world__canvas" data-ready={ready ? "" : undefined}>
            <LatticeScene onReady={() => setReady(true)} />
          </div>
        ) : null}
        <span className="ai-world__veil" />
      </div>

      <AiHero live={mode === "full"} />
      {/* marks the point where the hero has mostly left the viewport */}
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-[55dvh] w-px" />

      <Capabilities />
      <Compression />
      <OrbitalProcess />
      <Industries />
      <WhyTriseno />
      <AiGate />
    </main>
  );
}

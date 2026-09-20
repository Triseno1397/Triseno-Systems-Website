"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LatticePoster from "./LatticePoster";
import { latticeState } from "./lattice";

// three / R3F never reach the server HTML or the first bundle: the LCP element
// is the headline.
const LatticeScene = dynamic(() => import("./LatticeScene"), { ssr: false });

/**
 * The world for /ai-infrastructure: ONE continuous lit element behind every
 * section of the page. Nothing else on the page paints a background, so there
 * are no cuts between sections — the scene simply slides from side to side as
 * sections come on screen (see `data-world-side` below).
 *
 * This component is the single swap point. When the foundation's shared
 * `DivisionWorld` lands, only this file changes: it renders <DivisionWorld
 * division="ai"> with the lattice as its object, and every section keeps
 * working untouched.
 *
 * Sections declare which side of the frame the object should move to with
 * `data-world-side="left|right"` (i.e. the side the copy is NOT on), which is
 * what keeps text off the focal object — bar.md rule 5.
 */

type Mode = "pending" | "full" | "lite";

function canRunWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function AiWorld() {
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);

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

  /* one pointer feeds the lattice, the headline spotlight and the card light */
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

  /* the scene follows the reading order: whichever section owns the middle of
     the viewport decides which side the object sits on */
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-world-side]"));
    if (!sections.length) return;
    const pick = () => {
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const el of sections) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = el;
        }
      }
      if (best) latticeState.side = best.dataset.worldSide === "left" ? -1 : 1;
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, []);

  return (
    <div aria-hidden="true" className="ai-world__scene">
      {mode !== "pending" ? <LatticePoster hidden={mode === "full" && ready} /> : null}
      {mode === "full" ? (
        <div className="ai-world__canvas" data-ready={ready ? "" : undefined}>
          <LatticeScene onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  );
}

export { canRunWebGL };

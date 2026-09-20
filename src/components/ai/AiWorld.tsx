"use client";

import { useEffect, useRef, useState } from "react";
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
 *
 * R3 — the scene sits behind content, always, and never reads through type:
 * a depth-of-field layer inside the scene (a backdrop blur, no colour) softens
 * the lattice wherever copy rests. By default it covers the half the copy is
 * on; a section with `data-dof="full"` (copy across the whole frame) defocuses
 * the whole world. Crisp scene lines therefore never pass behind letterforms,
 * and the room stays lit because blur keeps the light, only its edges go.
 *
 * On phones (poster mode) the world still moves: it drifts with scroll and
 * slides to the object's side, and the lit nodes breathe.
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
  const sceneRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);

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
     the viewport decides which side the object sits on and where the world is
     in focus */
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-world-side]"));
    const scene = sceneRef.current;
    if (!sections.length || !scene) return;
    const narrow = window.matchMedia("(max-width: 767px)");
    let raf = 0;
    const pick = () => {
      raf = 0;
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
      if (best) {
        const objectLeft = best.dataset.worldSide === "left";
        latticeState.side = objectLeft ? -1 : 1;
        let dof = best.dataset.dof ?? (objectLeft ? "right" : "left");
        // phone: copy runs full width, so the world is defocused everywhere
        // except above the hero's bottom-aligned headline
        if (narrow.matches) dof = best === sections[0] ? "bottom" : "full";
        scene.dataset.dof = dof;
        scene.style.setProperty("--side", String(latticeState.side));
      }
      // poster drift: the phone world travels with the page instead of sitting still
      const pan = panRef.current;
      if (pan) {
        const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const k = window.scrollY / span;
        pan.style.transform = `translate3d(0, ${(-7 * k).toFixed(3)}%, 0) rotate(${(-2.5 + 5 * k).toFixed(3)}deg)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode]);

  return (
    <div ref={sceneRef} aria-hidden="true" className="ai-world__scene" data-dof="left">
      <div className="ai-world__drift">
        <div ref={panRef} className="ai-world__pan">
          {mode !== "pending" ? <LatticePoster hidden={mode === "full" && ready} /> : null}
        </div>
      </div>
      {mode === "full" ? (
        <div className="ai-world__canvas" data-ready={ready ? "" : undefined}>
          <LatticeScene onReady={() => setReady(true)} />
        </div>
      ) : null}
      {/* depth of field: behind all content, above the lattice */}
      <span className="ai-world__dof ai-world__dof--left" />
      <span className="ai-world__dof ai-world__dof--right" />
      <span className="ai-world__dof ai-world__dof--bottom" />
      <span className="ai-world__dof ai-world__dof--full" />
    </div>
  );
}

export { canRunWebGL };

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import WorldPlate from "@/components/world/WorldPlate";
import { platePose, plateTransform, type PlatePose } from "@/components/world/plateMotion";

/**
 * The world for /ai-infrastructure: the cathedral plate — a nave of dark
 * pillars strung with cyan light filaments over a wet floor — rendered by the
 * shared WorldPlate (design-loop/world-plates.md), so every GlassPanel on the
 * page frosts exactly the part of it that is behind the panel.
 *
 * This page's own life sits on top, locked to the plate's camera (the same
 * pose model and clock as WorldPlate and GlassPanel, plateMotion.ts):
 *   - the filaments on each side of the nave breathe, out of phase,
 *   - the vanishing point pulses like a signal arriving down the nave,
 *   - a soft cyan light follows the pointer.
 * Soft neutral scrims at the top and bottom keep the chrome legible over the
 * brightest filaments. Only transform / opacity animate.
 */
export default function AiWorld() {
  const camRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cam = camRef.current;
    const light = lightRef.current;
    if (!cam || !light) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pose: PlatePose = { tx: 0, ty: 0, s: 1 };
    let last = "";
    let lx = window.innerWidth * 0.5;
    let ly = window.innerHeight * 0.58;
    let tlx = lx;
    let tly = ly;
    let moved = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tlx = e.clientX;
      tly = e.clientY;
      moved = true;
    };

    const tick = () => {
      const t = plateTransform(platePose(pose));
      if (t !== last) {
        last = t;
        cam.style.transform = t;
      }
      if (!fine.matches || reduced.matches) return;
      if (!moved) {
        // before the first move the light wanders the nave on its own
        const s = performance.now() / 1000;
        tlx = window.innerWidth * (0.5 + 0.2 * Math.sin(s * 0.21));
        tly = window.innerHeight * (0.58 + 0.1 * Math.sin(s * 0.33 + 1));
      }
      lx += (tlx - lx) * 0.08;
      ly += (tly - ly) * 0.08;
      light.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
    };

    tick();
    gsap.ticker.add(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden="true" data-world-layer="" className="ai-world__scene">
      <WorldPlate world="ai" />
      {/* laid out exactly like WorldPlate's camera, so these sit on the plate */}
      <div ref={camRef} className="ai-world__cam">
        <span className="ai-world__glow ai-world__glow--l" />
        <span className="ai-world__glow ai-world__glow--r" />
        <span className="ai-world__core" />
      </div>
      <span ref={lightRef} className="ai-world__light" />
      <span className="ai-world__scrim ai-world__scrim--top" />
      <span className="ai-world__scrim ai-world__scrim--bottom" />
    </div>
  );
}

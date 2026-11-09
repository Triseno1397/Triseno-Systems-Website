"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WorldPlate from "@/components/world/WorldPlate";
import { platePose, plateTransform, type PlatePose } from "@/components/world/plateMotion";
import { activeStation } from "@/components/world/stations";
import { DIVISIONS } from "@/lib/divisions";
import { SECTIONS_EVENT } from "@/components/world/Staged";

gsap.registerPlugin(ScrollTrigger);

/**
 * The world the Web Design Division lives in (design-loop/world-plates.md).
 *
 * BASE: the shared `WorldPlate` for "web" — the violet concrete atrium of
 * receding square portals (the division's own glyph, at the scale of
 * architecture) over a polished floor. It owns the camera: a scroll push-in
 * about the vanishing point and a few px of pointer parallax, on the shared
 * pose model — the same one every `GlassPanel` on the page uses to line its
 * blurred copy of the plate up with this one.
 *
 * OVERLAYS this division adds on top, all behind content:
 * - the far portal's violet light, breathing — drawn in a layer that follows
 *   the plate's pose exactly, so it stays locked to the portal as the camera
 *   pushes in;
 * (the shared plate already carries drifting haze, dust and a pointer
 * light; this layer adds none of its own: every extra full-screen layer is
 * one more composite under every scrolled frame)
 * - station light: every section registers a station and the key haze moves
 *   to the far side of the object on stage.
 *
 * Wrapper is fixed and `data-world-layer`, so the content-only edge fade
 * never touches the world. Only transform / opacity animate (M4).
 */
export default function WebWorld() {
  const layerRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);

  /* stations. Arriving by warp, the sections land one per frame after this
     layer (world/Staged): the triggers are built again once they are all in */
  useEffect(() => {
    const layer = layerRef.current;
    const main = layer?.parentElement;
    if (!layer || !main) return;
    layer.dataset.at = "hero";
    let triggers: ScrollTrigger[] = [];
    const build = () => {
      triggers.forEach((t) => t.kill());
      triggers = gsap.utils.toArray<HTMLElement>("[data-station]", main).map((section) =>
        ScrollTrigger.create({
          trigger: section,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => {
            if (self.isActive) layer.dataset.at = section.dataset.station ?? "hero";
          },
        }),
      );
    };
    build();
    window.addEventListener(SECTIONS_EVENT, build);
    return () => {
      window.removeEventListener(SECTIONS_EVENT, build);
      triggers.forEach((t) => t.kill());
    };
  }, []);

  /* the overlay rides the plate's own pose */
  useEffect(() => {
    const fx = fxRef.current;
    if (!fx) return;
    const pose: PlatePose = { tx: 0, ty: 0, s: 1 };
    let last = "";
    let lastO = "";
    const tick = () => {
      const t = plateTransform(platePose(pose));
      if (t !== last) {
        last = t;
        fx.style.transform = t;
      }
      // the far portal's light dips through each station hand-off and comes
      // back up on the next station's portal, never hanging over the dissolve
      const { blend } = activeStation("web");
      const o = (1 - Math.sin(Math.PI * blend)).toFixed(3);
      if (o !== lastO) {
        lastO = o;
        fx.style.opacity = o;
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={layerRef} aria-hidden="true" data-world-layer="" className="web-scene" data-at="hero">
      {/* camera stations: deeper into the atrium at Before / After, arriving
          in the innermost glowing room as the gate enters */}
      <WorldPlate
        world="web"
        hue={DIVISIONS.web.hue}
        // no colour grade: the atrium is painted in the division's violet
        // already, and the grade was the last blend layer on the page (a
        // full-screen read-back every frame; design-loop/_gpu-exp.mjs)
        tint={0}
        stations={[0, '[data-rail="Before / After"]', '[data-rail="Gate"]']}
      />
      <div ref={fxRef} className="web-plate__fx">
        {/* the far portal's light, locked to the plate's pose */}
        <span className="web-plate__shaft" />
      </div>
      <span className="web-scene__haze" />
    </div>
  );
}

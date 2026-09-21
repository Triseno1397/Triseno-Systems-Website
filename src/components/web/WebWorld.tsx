"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import WorldPlate from "@/components/world/WorldPlate";
import { platePose, plateTransform, type PlatePose } from "@/components/world/plateMotion";
import { activeStation } from "@/components/world/stations";
import { DIVISIONS } from "@/lib/divisions";

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
 * - two violet haze banks drifting and dust hanging in the light;
 * - a soft violet key light that follows the pointer;
 * - station light: every section registers a station and the key haze moves
 *   to the far side of the object on stage.
 *
 * Wrapper is fixed and `data-world-layer`, so the content-only edge fade
 * never touches the world. Only transform / opacity animate (M4).
 */
export default function WebWorld() {
  const layerRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);

  /* stations */
  useGSAP(
    () => {
      const layer = layerRef.current;
      const main = layer?.parentElement;
      if (!layer || !main) return;
      layer.dataset.at = "hero";
      const stations = gsap.utils.toArray<HTMLElement>("[data-station]", main);
      const triggers = stations.map((section) =>
        ScrollTrigger.create({
          trigger: section,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => {
            if (self.isActive) layer.dataset.at = section.dataset.station ?? "hero";
          },
        }),
      );
      return () => triggers.forEach((t) => t.kill());
    },
    { scope: layerRef },
  );

  /* overlays ride the plate's own pose; the key light follows the pointer */
  useEffect(() => {
    const fx = fxRef.current;
    const light = lightRef.current;
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
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !light) return;
      light.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
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
    <div ref={layerRef} aria-hidden="true" data-world-layer="" className="web-scene" data-at="hero">
      {/* camera stations: deeper into the atrium at Before / After, arriving
          in the innermost glowing room as the gate enters */}
      <WorldPlate
        world="web"
        hue={DIVISIONS.web.hue}
        tint={0.35}
        stations={[0, '[data-rail="Before / After"]', '[data-rail="Gate"]']}
      />
      <div ref={fxRef} className="web-plate__fx">
        {/* the far portal's light, locked to the plate's pose */}
        <span className="web-plate__shaft" />
      </div>
      <span className="web-plate__haze web-plate__haze--a" />
      <span className="web-plate__haze web-plate__haze--b" />
      <span className="web-plate__dust" />
      <span className="web-scene__haze" />
      <span ref={lightRef} className="web-plate__light" />
    </div>
  );
}

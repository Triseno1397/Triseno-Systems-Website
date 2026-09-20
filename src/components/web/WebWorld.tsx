"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import DivisionWorld from "@/components/world/DivisionWorld";

gsap.registerPlugin(ScrollTrigger);

/**
 * The world the Web Design Division lives in — the single swap point.
 *
 * Base: the foundation's shared `DivisionWorld` for "web": ONE continuous lit
 * 3D volume behind the whole page, whose camera travels with page scroll
 * (lite, composited atmosphere on phones / reduced motion / no WebGL).
 *
 * On top of it, one thin layer this division owns: STATION LIGHT. Every
 * section registers itself with `data-station`; when a station becomes active
 * the division's light moves to the far side of the frame from that section's
 * object, the square glyph frames re-seat, and at the gate the volume visibly
 * changes — the horizon opens, a threshold beam rises and the square turns on
 * its corner. Sections are objects standing in this one world; nothing on the
 * page paints its own background.
 *
 * Only transform / opacity animate (M4). Reduced motion: the resting lit state.
 */
export default function WebWorld() {
  const layerRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <DivisionWorld division="web" />
      <div ref={layerRef} aria-hidden="true" className="web-scene" data-at="hero">
        <span className="web-scene__haze" />
        <span className="web-scene__ring web-scene__ring--in" />
        <span className="web-scene__ring web-scene__ring--out" />
        <span className="web-scene__beam" />
        <span className="web-scene__horizon" />
      </div>
    </>
  );
}

"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * The world the Web Design Division lives in.
 *
 * One continuous lit volume that is mounted once and never swapped: a violet
 * wireframe floor, a vault of the same grid overhead (so the top half of the
 * frame is lit space, not black), a haze that is the scene's only light, a
 * white horizon, and a threshold beam that only exists at the gate.
 *
 * It is camera-driven, not static: page scroll dollies the grid forward
 * (a translate inside the rotated plane, so it reads as travel), and every
 * section registers itself as a station — when a station becomes active the
 * light moves to the opposite side of the frame from that section's object,
 * the grid opens or closes, and at the gate the whole volume recolours to the
 * threshold state. Sections are objects standing in this volume.
 *
 * Only transform / opacity animate (M4). Reduced motion: the volume renders
 * its lit resting state and nothing moves.
 */
export default function WebWorld() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scene = sceneRef.current;
      const main = scene?.parentElement;
      if (!scene || !main) return;

      scene.dataset.at = "hero";

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Camera: one scrubbed value for the whole page.
        const camera = ScrollTrigger.create({
          trigger: main,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => scene.style.setProperty("--cam", self.progress.toFixed(4)),
          onRefresh: (self) => scene.style.setProperty("--cam", self.progress.toFixed(4)),
        });

        // Stations: which object the light is currently lighting.
        const stations = gsap.utils.toArray<HTMLElement>("[data-station]", main);
        const triggers = stations.map((section) =>
          ScrollTrigger.create({
            trigger: section,
            start: "top 62%",
            end: "bottom 38%",
            onToggle: (self) => {
              if (self.isActive) scene.dataset.at = section.dataset.station ?? "hero";
            },
          }),
        );

        return () => {
          camera.kill();
          triggers.forEach((t) => t.kill());
        };
      });
    },
    { scope: sceneRef },
  );

  return (
    <div ref={sceneRef} aria-hidden="true" className="web-scene" data-at="hero">
      <div className="web-scene__vault">
        <div className="web-scene__plane">
          <div className="web-scene__grid">
            <i className="web-scene__tiles" />
          </div>
        </div>
      </div>

      <span className="web-scene__haze" />
      <span className="web-scene__ring web-scene__ring--in" />
      <span className="web-scene__ring web-scene__ring--out" />
      <span className="web-scene__beam" />
      <span className="web-scene__horizon" />

      <div className="web-scene__floor">
        <div className="web-scene__plane">
          <div className="web-scene__grid">
            <i className="web-scene__tiles" />
          </div>
        </div>
      </div>
    </div>
  );
}

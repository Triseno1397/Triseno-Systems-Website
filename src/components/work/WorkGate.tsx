"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import GlassPanel from "@/components/world/GlassPanel";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import { GATE } from "./content";

gsap.registerPlugin(ScrollTrigger);

/**
 * Gate — CONVERGENCE. The three division glyphs (circle, square, triangle),
 * drawn as white hairlines, arrive from three directions as the gate scrolls
 * in and fuse at one point; where they meet, the index's own white diamond
 * resolves out of them (scroll-scrubbed; transform + opacity only). The page
 * is achromatic, so nothing here carries a division hue. One ghost button
 * names the next stop. Reduced motion: the resolved diamond, at rest.
 */
export default function WorkGate() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 85%",
            end: "top 15%",
            scrub: 0.8,
          },
        });
        tl.fromTo(
          ".work-gate__part--a",
          { xPercent: -170, yPercent: -40, rotate: -60, opacity: 0 },
          { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, ease: "power3.out", duration: 1 },
          0,
        )
          .fromTo(
            ".work-gate__part--b",
            { xPercent: 170, yPercent: -30, rotate: 45, opacity: 0 },
            { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, ease: "power3.out", duration: 1 },
            0.08,
          )
          .fromTo(
            ".work-gate__part--c",
            { yPercent: 150, rotate: 90, opacity: 0 },
            { yPercent: 0, rotate: 0, opacity: 1, ease: "power3.out", duration: 1 },
            0.16,
          )
          // the three collapse into the point where they met…
          .to(".work-gate__part", { scale: 0.2, opacity: 0, ease: "power3.out", duration: 0.5 }, 1.05)
          // …and the index's diamond resolves out of it
          .fromTo(
            ".work-gate__diamond",
            { scale: 0.2, rotate: -45, opacity: 0 },
            { scale: 1, rotate: 0, opacity: 1, ease: "expo.out", duration: 0.7 },
            1.15,
          );
      });
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      data-rail="Gate"
      data-rail-next="Contact"
      aria-labelledby="work-gate-title"
      className="work-section work-gate"
    >
      <div aria-hidden="true" className="work-gate__object">
        <span className="work-gate__part work-gate__part--a">
          <Glyph kind="circle" size="100%" color="#ffffff" strokeWidth={1.25} />
        </span>
        <span className="work-gate__part work-gate__part--b">
          <Glyph kind="square" size="100%" color="#ffffff" strokeWidth={1.25} />
        </span>
        <span className="work-gate__part work-gate__part--c">
          <Glyph kind="triangle" size="100%" color="#ffffff" strokeWidth={1.25} />
        </span>
        <span className="work-gate__diamond">
          <Glyph kind="diamond" size="100%" color="#ffffff" strokeWidth={1.5} glow />
        </span>
      </div>

      <GlassPanel world="portal" className="work-gate__copy">
        <p className="work-label">{GATE.label}</p>
        <h2 id="work-gate-title" className="work-h2 font-display font-semibold uppercase">
          {GATE.title}
        </h2>
        <p className="work-body">{GATE.body}</p>
        <div className="work-gate__actions">
          <GhostButton href="/contact">Start a Conversation</GhostButton>
        </div>
        <nav aria-label="The three divisions" className="work-gate__cross">
          <span className="work-label">Or travel to</span>
          {(["creative", "web", "ai"] as const).map((k) => (
            <WarpLink key={k} href={DIVISIONS[k].route} className="world-underline">
              {DIVISIONS[k].name}
            </WarpLink>
          ))}
        </nav>
      </GlassPanel>
    </section>
  );
}

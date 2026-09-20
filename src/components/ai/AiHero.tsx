"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import { getLenis } from "@/components/world/SmoothScroll";
import { DIVISIONS } from "@/lib/divisions";
import { canRunWebGL } from "./AiWorld";
import { HERO } from "./content";
import { buildLattice, latticeState } from "./lattice";

/**
 * 1. Hero — interactive 3D + spotlight.
 * The spotlight is scene light: the pointer (or an idle roaming point) lights
 * the lattice's nodes cyan and sends pulses along its edges, inside the world
 * (AiWorld). The headline is solid white server-rendered text at all times —
 * it is the LCP element, and display type is never tinted with the hue
 * (design-system §2: type at rest is solid; hue only on active state, data
 * readouts and focus). R2 removed the old cyan re-ink of the headline.
 * The live readout under the CTA counts the scene's own nodes, edges, lit
 * nodes and pulses.
 */
export default function AiHero() {
  /** true once the WebGL lattice is the thing on screen, so the live counters
   *  in the readout are describing something the reader can actually see */
  const [live, setLive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const litRef = useRef<HTMLSpanElement>(null);
  const pulsesRef = useRef<HTMLSpanElement>(null);

  /* subscribe to the same two queries AiWorld uses, so the readout only claims
     live counters when the WebGL lattice is really the thing on screen */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const small = window.matchMedia("(max-width: 767px)");
    const webgl = canRunWebGL();
    const decide = () => setLive(!reduced.matches && !small.matches && webgl);
    decide();
    reduced.addEventListener("change", decide);
    small.addEventListener("change", decide);
    return () => {
      reduced.removeEventListener("change", decide);
      small.removeEventListener("change", decide);
    };
  }, []);

  /* the readout's live counters, sampled from the scene four times a second */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !live) return;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
    io.observe(section);
    const id = window.setInterval(() => {
      if (!visible) return;
      if (litRef.current) litRef.current.textContent = String(latticeState.lit).padStart(2, "0");
      if (pulsesRef.current) pulsesRef.current.textContent = String(latticeState.pulses).padStart(2, "0");
    }, 250);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, [live]);

  const lattice = buildLattice();

  const toCapabilities = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("capabilities");
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      data-rail="Layer"
      data-world-side="right"
      aria-label="AI Infrastructure"
      className="ai-hero relative z-10 min-h-[100dvh] overflow-hidden"
    >
      <div className="ai-hero__inner relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-center px-[var(--gutter)]">
        <p className="ai-label mb-5 flex items-center gap-3">
          <Glyph kind="triangle" size={14} color={DIVISIONS.ai.hue} strokeWidth={1.25} glow />
          <span>{HERO.label}</span>
        </p>

        <h1 className="ai-hero__title font-display font-bold uppercase">
          {HERO.headline.map((line) => (
            <span key={line} className="block">
              {line}{" "}
            </span>
          ))}
        </h1>

        <p className="ai-body mt-6 max-w-[44ch]">{HERO.sub}</p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
          <GhostButton href="/contact">Start with a diagnostic</GhostButton>
          <a href="#capabilities" onClick={toCapabilities} className="ai-textlink">
            <span>Explore what we build</span>
            <ArrowDown size={16} weight="light" aria-hidden="true" />
          </a>
        </div>

        {/* live data readout from the lattice — the numbers are the scene's own counters */}
        <p aria-hidden="true" className="ai-hero__readout ai-label">
          <span>
            Nodes <b>{lattice.count}</b>
          </span>
          <span>
            Edges <b>{lattice.edges.length / 2}</b>
          </span>
          {live ? (
            <>
              <span>
                Lit <b ref={litRef}>00</b>
              </span>
              <span className="max-sm:hidden">
                Pulses <b ref={pulsesRef}>00</b>
              </span>
            </>
          ) : (
            <span>
              Layers <b>03</b>
            </span>
          )}
        </p>
      </div>
    </section>
  );
}

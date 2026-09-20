"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import { getLenis } from "@/components/world/SmoothScroll";
import { DIVISIONS } from "@/lib/divisions";
import { canRunWebGL } from "./AiWorld";
import { HERO } from "./content";
import { buildLattice, latticeState, pointerTarget } from "./lattice";

/**
 * 1. Hero — interactive 3D + spotlight.
 * The 3D lattice is the fixed world behind the page (AiPage owns it). This
 * section owns the headline half of the spotlight: the light itself is grey
 * haze rendered inside the scene, and here the same pointer re-inks the
 * headline in cyan inside the light's radius (clip-path only). The base
 * headline is plain server-rendered white text — it is the LCP element.
 */
export default function AiHero() {
  /** true once the WebGL lattice is the thing on screen, so the live counters
   *  in the readout are describing something the reader can actually see */
  const [live, setLive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
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

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const ink = inkRef.current;
    if (!section || !title || !ink) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const place = (cx: number, cy: number) => {
      const r = title.getBoundingClientRect();
      const radius = Math.min(230, Math.max(110, window.innerWidth * 0.13));
      ink.style.clipPath = `circle(${radius.toFixed(0)}px at ${(cx - r.left).toFixed(1)}px ${(cy - r.top).toFixed(1)}px)`;
    };

    if (reduced) {
      // final state: the light rests on the headline
      const r = title.getBoundingClientRect();
      place(r.left + r.width * 0.3, r.top + r.height * 0.45);
      return;
    }

    let raf = 0;
    let visible = true;
    let x = window.innerWidth * 0.3;
    let y = window.innerHeight * 0.45;
    let last = performance.now();
    let readoutClock = 0;

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
    io.observe(section);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const wide = window.innerWidth / Math.max(1, window.innerHeight) > 1.25;
      const aim = pointerTarget(now, wide);
      const k = 1 - Math.exp(-dt * (aim.idle ? 1.6 : 7));
      x += (((aim.x + 1) / 2) * window.innerWidth - x) * k;
      y += (((1 - aim.y) / 2) * window.innerHeight - y) * k;
      place(x, y);

      readoutClock += dt;
      if (readoutClock > 0.25) {
        readoutClock = 0;
        if (litRef.current) litRef.current.textContent = String(latticeState.lit).padStart(2, "0");
        if (pulsesRef.current) pulsesRef.current.textContent = String(latticeState.pulses).padStart(2, "0");
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

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
      <div className="ai-hero__inner relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-center px-[var(--gutter)] pb-[calc(var(--gutter-y)+64px)] pt-[clamp(132px,19dvh,200px)]">
        <p className="ai-label mb-7 flex items-center gap-3">
          <Glyph kind="triangle" size={14} color={DIVISIONS.ai.hue} strokeWidth={1.25} glow />
          <span>{HERO.label}</span>
        </p>

        <h1 ref={titleRef} className="ai-hero__title font-display font-bold uppercase">
          <span className="block">
            {HERO.headline.map((line) => (
              <span key={line} className="block">
                {line}{" "}
              </span>
            ))}
          </span>
          <span ref={inkRef} aria-hidden="true" className="ai-hero__ink">
            {HERO.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
        </h1>

        <p className="ai-body mt-8 max-w-[44ch]">{HERO.sub}</p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
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

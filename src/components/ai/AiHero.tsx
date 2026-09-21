"use client";

import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import { getLenis } from "@/components/world/SmoothScroll";
import { DIVISIONS } from "@/lib/divisions";
import { HERO } from "./content";

/**
 * 1. Hero — the world is the spotlight (site-map: "interactive 3D + spotlight").
 * The cathedral plate behind it parallaxes with the pointer and carries a soft
 * cyan light that follows it (AiWorld). The copy sits on one frosted glass
 * card in the calm centre of the nave, so no filament ever passes behind a
 * letterform. The headline is solid white server-rendered text — the LCP
 * element — and display type is never tinted with the hue.
 */
export default function AiHero() {
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
      data-rail="Layer"
      aria-label="AI Infrastructure"
      className="ai-hero relative z-10 min-h-[100dvh] overflow-hidden"
    >
      <div className="ai-hero__inner ai-wrap relative flex min-h-[100dvh] flex-col justify-center">
        <div className="ai-glass ai-sheet ai-hero__card">
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

          {/* phone: display must be >= 2.5x body, so the sub line is dropped there */}
          <p className="ai-body mt-6 max-w-[44ch] max-md:hidden">{HERO.sub}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
            <GhostButton href="/contact">Start with a diagnostic</GhostButton>
            <a href="#capabilities" onClick={toCapabilities} className="ai-textlink">
              <span>Explore what we build</span>
              <ArrowDown size={16} weight="light" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

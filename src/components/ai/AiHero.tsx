"use client";

import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import { getLenis } from "@/components/world/SmoothScroll";
import { DIVISIONS } from "@/lib/divisions";
import { HERO } from "./content";

/**
 * 1. Hero — the world is the spotlight (site-map: "interactive 3D + spotlight").
 * The cathedral plate parallaxes with the pointer and carries a cyan light
 * that follows it (AiWorld). The copy stands directly in the calm dark centre
 * of the nave — no box — over a soft local neutral scrim, so no filament ever
 * sits behind a letterform (world-plates.md: "a local soft neutral scrim").
 *
 * Entrance: the label, then each headline line rising out of its own mask,
 * then the sub line and the calls to action. The masks only run during the
 * entrance; at rest the headline is solid white. Reduced motion: no entrance.
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
    <section data-rail="Layer" aria-label="AI Infrastructure" className="ai-hero relative z-10 min-h-[100dvh]">
      <div className="ai-hero__inner ai-wrap relative flex min-h-[100dvh] flex-col justify-center">
        <div className="ai-hero__stack">
          <span aria-hidden="true" className="ai-scrim ai-hero__scrim" />
          <p className="ai-label ai-rise mb-6 flex items-center justify-center gap-3" style={{ ["--d" as string]: 0 }}>
            <Glyph kind="triangle" size={14} color={DIVISIONS.ai.hue} strokeWidth={1.25} glow />
            <span>{HERO.label}</span>
          </p>

          <h1 className="ai-hero__title font-display font-bold uppercase">
            {HERO.headline.map((line, i) => (
              <span key={line} className="ai-hero__line">
                <span className="ai-hero__word" style={{ ["--d" as string]: i + 1 }}>
                  {line}
                </span>{" "}
              </span>
            ))}
          </h1>

          <p className="ai-body ai-rise ai-hero__sub mt-7 max-md:hidden" style={{ ["--d" as string]: 5 }}>
            {HERO.sub}
          </p>
          {/* phone: the same three offers as a mono line, so the frame keeps
              its message and the display type stays >= 2.5x the body size */}
          <p className="ai-label ai-rise ai-hero__offers mt-6 md:hidden" style={{ ["--d" as string]: 5 }}>
            {HERO.offers.map((o) => (
              <span key={o}>{o}</span>
            ))}
          </p>

          <div className="ai-rise mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-5" style={{ ["--d" as string]: 6 }}>
            <GhostButton href="/contact?division=ai">Start with a diagnostic</GhostButton>
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

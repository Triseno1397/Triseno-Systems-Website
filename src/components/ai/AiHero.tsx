"use client";

import { useRef } from "react";
import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import { getLenis } from "@/components/world/SmoothScroll";
import { HERO } from "./content";
import DitherLens from "./DitherLens";
import Scramble from "./Scramble";

/**
 * 1. Hero — sheet one of the spec.
 *
 * The page is a clean room: paper, ink and one signal colour. The headline
 * decodes into place line by line; beside it the division's world (the
 * cathedral nave every other page of the site would show you in full dark)
 * is printed as a 1-bit negative, and the pointer is a lens that develops the
 * real frame under it. Nothing here is scroll-driven.
 */
export default function AiHero() {
  const readoutRef = useRef<HTMLSpanElement>(null);

  const toCapabilities = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("capabilities");
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <section data-rail="Layer" aria-labelledby="ai-hero-title" className="ai-hero relative z-10">
      <div className="ai-wrap">
        {/* the sheet's title block */}
        <div className="ai-sheetbar ai-in" style={{ ["--d" as string]: 0 }}>
          <span>
            <b>AI-01</b>
            <span className="max-md:hidden">Triseno Systems / AI Infrastructure</span>
            <span className="md:hidden">Spec</span>
          </span>
          <span className="max-md:hidden">{HERO.label}</span>
          <span>Sheet 01 / 07</span>
        </div>

        <div className="ai-hero__grid">
          <div className="ai-hero__copy">
            <p className="ai-label ai-in flex items-center gap-3" style={{ ["--d" as string]: 1 }}>
              <Glyph kind="triangle" size={13} color="#00a3c4" strokeWidth={1.4} />
              <span>Division 03 / Operational intelligence</span>
            </p>
            <h1 id="ai-hero-title" className="ai-hero__title font-display font-bold uppercase" aria-label={HERO.headline.join(" ")}>
              {HERO.headline.map((line, i) => (
                <span key={line} className="ai-hero__line" data-hot={i === 2 ? "" : undefined}>
                  <Scramble text={line} delay={0.25 + i * 0.18} duration={0.8} />
                </span>
              ))}
            </h1>
            <p className="ai-body ai-in ai-hero__sub" style={{ ["--d" as string]: 4 }}>
              {HERO.sub}
            </p>
            <div className="ai-in ai-hero__cta" style={{ ["--d" as string]: 5 }}>
              <GhostButton href="/contact?division=ai">Start with a diagnostic</GhostButton>
              <a href="#capabilities" onClick={toCapabilities} className="ai-textlink">
                <span>Explore what we build</span>
                <ArrowDown size={16} weight="light" aria-hidden="true" />
              </a>
            </div>
          </div>

          <figure className="ai-hero__fig ai-in" style={{ ["--d" as string]: 2 }}>
            <div className="ai-frame">
              <i className="ai-frame__crop" data-c="tl" />
              <i className="ai-frame__crop" data-c="tr" />
              <i className="ai-frame__crop" data-c="bl" />
              <i className="ai-frame__crop" data-c="br" />
              <DitherLens
                src="/worlds/ai-desktop.webp"
                srcMobile="/worlds/ai-mobile.webp"
                lens={0.22}
                readout={readoutRef}
                label="The AI division's world, a nave of dark pillars strung with cyan light, printed as a one-bit negative with a lens that shows the real image"
                className="ai-hero__lens"
              />
            </div>
            <figcaption className="ai-figcap">
              <span>
                <b>Fig. 01</b> The layer, printed. <span className="max-md:hidden">Move over it to develop the frame.</span>
              </span>
              <span ref={readoutRef} className="ai-figcap__read" aria-hidden="true">
                X 0.620  Y 0.460
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

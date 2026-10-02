"use client";

import GhostButton from "@/components/ui/GhostButton";
import { HERO } from "./content";
import IntelligenceCore from "./IntelligenceCore";
import Scramble from "./Scramble";

/**
 * 1. Hero — the offer, and nothing else: the headline (decoding into place),
 * one sentence, one button. Beside it, the intelligence layer as one object:
 * a liquid-chrome core inside a dotted globe with cyan routes, ringed by a
 * swarm of agents that scatter from the pointer (IntelligenceCore).
 * The headline is sized to its own column (container units), so it can never
 * run under the figure at any width. Nothing here is scroll-driven.
 */
export default function AiHero() {
  return (
    <section data-rail="Layer" aria-labelledby="ai-hero-title" className="ai-hero relative z-10">
      <div className="ai-wrap">
        <div className="ai-hero__grid">
          <div className="ai-hero__copy">
            <h1 id="ai-hero-title" className="ai-hero__title font-display font-bold uppercase" aria-label={HERO.headline.join(" ")}>
              {HERO.headline.map((line, i) => (
                <span key={line} className="ai-hero__line">
                  <Scramble text={line} delay={0.2 + i * 0.16} duration={0.8} />
                </span>
              ))}
            </h1>
            <p className="ai-body ai-in ai-hero__sub" style={{ ["--d" as string]: 3 }}>
              {HERO.sub}
            </p>
            <div className="ai-in ai-hero__cta" style={{ ["--d" as string]: 4 }}>
              <GhostButton href="/contact?division=ai">Start with a diagnostic</GhostButton>
            </div>
          </div>

          <figure className="ai-hero__fig ai-in" style={{ ["--d" as string]: 1 }}>
            <IntelligenceCore
              label="A liquid chrome core inside a dotted globe, cyan routes arcing between cities, and a swarm of agents orbiting it that scatter from the pointer"
              className="ai-hero__lens"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}

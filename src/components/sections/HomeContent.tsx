"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import WarpHero from "@/components/sections/WarpHero";
import CapabilitiesZoom from "@/components/sections/CapabilitiesZoom";
import WebDesignDivision from "@/components/sections/WebDesignDivision";
import BuiltFor from "@/components/sections/BuiltFor";
import ScrollReveal from "@/components/animations/ScrollReveal";
import Button from "@/components/ui/Button";
import { useGSAPScroll } from "@/hooks/useGSAPScroll";

const whyBullets = [
  "Outcome-tied pricing",
  "Infrastructure, not features",
  "Broadcast-grade reliability",
];

export default function HomeContent() {
  useGSAPScroll();

  return (
    <div data-home-root>
      {/* Single performant canvas warp hero with the draggable speed throttle. */}
      <WarpHero />

      {/* Pinned scroll-zoom-through of the capability words ("What we engineer") */}
      <CapabilitiesZoom />

      {/* Restructured Built For section */}
      <BuiltFor />

      {/* Web Design — separate division band (sub-brand identity + threshold) */}
      <WebDesignDivision />

      {/* Why Triseno teaser */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-2xl mb-12" data-speed="1.08">
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
                Why Triseno
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight">
                Built to compound, not depreciate.
              </h2>
            </div>
          </ScrollReveal>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10"
            data-speed="0.94"
          >
            {whyBullets.map((bullet, i) => (
              <ScrollReveal key={bullet} delay={i * 0.1}>
                <div className="flex items-start gap-4 pl-5 border-l border-cyan-400/30">
                  <p className="text-base md:text-lg text-text-primary font-medium leading-snug">
                    {bullet}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.3}>
            <div className="mt-12">
              <Link
                href="/process#why"
                className="group inline-flex items-center gap-2 text-base text-cyan-400 hover:text-[#00e5ff] font-medium transition-colors duration-200"
              >
                How we engineer this
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 md:py-32 border-t border-white/[0.06]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight mb-10"
              data-speed="1.1"
            >
              Let&apos;s talk architecture.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <Button variant="primary" size="large" href="/contact">
              Start a Conversation
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

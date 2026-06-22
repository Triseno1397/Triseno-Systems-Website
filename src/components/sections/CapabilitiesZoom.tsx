"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import {
  createZoomTimeline,
  createVelocitySmear,
} from "@/lib/capabilities-zoom";

interface Capability {
  index: string;
  word: string;
  description: string;
  href: string;
}

// Copy is fixed — do not edit the wording.
const CAPABILITIES: Capability[] = [
  {
    index: "01",
    word: "Orchestration",
    description: "Multi-agent systems that operate as a team.",
    href: "/#capabilities",
  },
  {
    index: "02",
    word: "Compression",
    description: "40-hour workflows engineered down to minutes.",
    href: "/#capabilities",
  },
  {
    index: "03",
    word: "Decision Intelligence",
    description: "Judgment that operates at machine speed.",
    href: "/#capabilities",
  },
];

// Shared oversized type for the zoom words and their chromatic ghosts so the
// layers overlay pixel-for-pixel. Width is capped so the longest phrase wraps
// instead of overflowing the settled, readable frame.
const WORD_TYPE =
  "block text-center text-balance font-bold uppercase tracking-[-0.025em] " +
  "leading-[0.9] text-[clamp(2.5rem,11vw,8.5rem)] max-w-[92vw]";

export default function CapabilitiesZoom() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // The velocity driver needs the active index every frame; a ref avoids a
  // React state read per ticker tick.
  const setActive = (i: number) => {
    activeRef.current = i;
    setActiveIndex(i);
  };

  // Track the two environment switches that change the rendered tree.
  useEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMq = window.matchMedia("(max-width: 768px)");
    const sync = () => {
      setReduceMotion(motionMq.matches);
      setIsMobile(mobileMq.matches);
    };
    sync();
    motionMq.addEventListener("change", sync);
    mobileMq.addEventListener("change", sync);
    return () => {
      motionMq.removeEventListener("change", sync);
      mobileMq.removeEventListener("change", sync);
    };
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section) return;

      // Reduced motion: no pin, no zoom — just a gentle, one-shot fade/scale-in
      // on the readable stacked list.
      if (reduceMotion) {
        const rows = section.querySelectorAll<HTMLElement>(".cap-rm-row");
        gsap.from(rows, {
          opacity: 0,
          scale: 0.98,
          duration: 0.5,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 75%", once: true },
        });
        return;
      }

      if (!stage) return;

      const zoomLayers = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll(".cap-zoom")
      );
      const words = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll(".cap-word")
      );
      const warps = gsap.utils.toArray<HTMLElement>(
        stage.querySelectorAll(".cap-warp")
      );
      if (zoomLayers.length === 0) return;

      // Tune the experience down on small / touch screens: gentler scale
      // ceiling, no velocity distortion.
      const scaleCeiling = isMobile ? 5 : 8.5;

      const zoom = createZoomTimeline({
        pinTarget: stage,
        layers: zoomLayers,
        words,
        scaleCeiling,
        scrub: 1.1,
        // Scroll budget ≈ one viewport per capability; a touch snappier on
        // mobile so the pin doesn't overstay.
        viewportsPerUnit: isMobile ? 1.1 : 1.35,
        onActiveChange: setActive,
      });

      let smear: { destroy: () => void } | null = null;
      if (!isMobile) {
        const ghosts = zoomLayers.map((layer) => {
          const pair = layer.querySelectorAll<HTMLElement>(".cap-ghost");
          return [pair[0], pair[1]] as [HTMLElement, HTMLElement];
        });
        smear = createVelocitySmear({
          warps,
          ghosts,
          getActive: () => activeRef.current,
          scrollTrigger: zoom.scrollTrigger,
        });
      }

      return () => {
        zoom.destroy();
        smear?.destroy();
      };
    },
    { scope: sectionRef, dependencies: [reduceMotion, isMobile] }
  );

  // ── Reduced motion: clean, fully readable stacked list ──────────────────
  if (reduceMotion) {
    return (
      <section
        ref={sectionRef}
        id="capabilities"
        data-section="capabilities-showcase"
        className="relative bg-[#0a0e1a] py-24 md:py-32"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <span className="inline-block font-mono text-sm tracking-[0.22em] uppercase text-cyan-400 mb-10">
            What we engineer
          </span>
          <ul className="space-y-12 md:space-y-16">
            {CAPABILITIES.map((cap) => (
              <li
                key={cap.word}
                className="cap-rm-row border-l border-cyan-400/25 pl-6 md:pl-8"
              >
                <span className="block font-mono text-xs tracking-[0.25em] text-cyan-400/70 mb-3">
                  {cap.index}
                </span>
                <h3 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-text-primary leading-[0.95] mb-4">
                  {cap.word}
                </h3>
                <p className="text-base md:text-lg text-text-secondary max-w-xl">
                  {cap.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  // ── Motion path: pinned scroll-driven zoom-through ──────────────────────
  return (
    <section
      ref={sectionRef}
      id="capabilities"
      data-section="capabilities-showcase"
      className="relative bg-[#0a0e1a]"
      style={{ minHeight: "100dvh" }}
    >
      <div
        ref={stageRef}
        className="relative h-[100dvh] w-full overflow-hidden"
      >
        {/* Soft cyan depth field behind the words. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-radial)" }}
        />

        {/* Eyebrow — real heading for the section. */}
        <h2 className="absolute left-6 top-10 z-20 font-mono text-xs md:text-sm tracking-[0.25em] uppercase text-cyan-400/70 lg:left-8">
          What we engineer
        </h2>

        {/* The zoom words. Decorative transforms of the real text below. */}
        <div aria-hidden="true" className="absolute inset-0">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.word}
              className="cap-layer absolute inset-0 flex items-center justify-center px-6"
            >
              <div className="cap-zoom inline-block will-change-transform">
                <div className="cap-warp relative inline-block will-change-transform">
                  {/* Chromatic-split ghosts (cyan fringes at speed). */}
                  <span
                    className={`cap-ghost pointer-events-none absolute inset-0 text-cyan-300 opacity-0 ${WORD_TYPE}`}
                    style={{ mixBlendMode: "screen" }}
                  >
                    {cap.word}
                  </span>
                  <span
                    className={`cap-ghost pointer-events-none absolute inset-0 text-cyan-600 opacity-0 ${WORD_TYPE}`}
                    style={{ mixBlendMode: "screen" }}
                  >
                    {cap.word}
                  </span>
                  {/* The word itself (split into chars by the timeline). */}
                  <span className={`cap-word relative z-10 ${WORD_TYPE}`}>
                    {cap.word}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Captions — the real, readable copy. Active one is visible; the
            others remain in the DOM (and the accessibility tree). */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-16 md:pb-20 lg:px-8">
          <div className="relative mx-auto max-w-[1400px]">
            <div className="relative min-h-[120px] md:min-h-[96px]">
              {CAPABILITIES.map((cap, i) => (
                <article
                  key={cap.word}
                  className="absolute inset-x-0 bottom-0 transition-all duration-500 ease-out"
                  style={{
                    opacity: i === activeIndex ? 1 : 0,
                    transform:
                      i === activeIndex ? "translateY(0)" : "translateY(14px)",
                    pointerEvents: i === activeIndex ? "auto" : "none",
                  }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs tracking-[0.25em] text-cyan-400">
                      {cap.index}
                    </span>
                    <span className="h-px w-10 self-center bg-cyan-400/40" />
                    <h3 className="font-mono text-xs tracking-[0.25em] uppercase text-cyan-400/80">
                      {cap.word}
                    </h3>
                  </div>
                  <p className="mt-3 max-w-xl text-lg md:text-2xl font-medium text-text-primary leading-snug">
                    {cap.description}
                  </p>
                  <Link
                    href={cap.href}
                    className="group mt-4 inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200"
                  >
                    Explore {cap.word}
                    <ArrowRight
                      size={14}
                      weight="bold"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>
                </article>
              ))}
            </div>

            {/* Progress dots. */}
            <div className="mt-8 flex items-center gap-3">
              {CAPABILITIES.map((cap, i) => (
                <div key={cap.word} className="flex items-center gap-2.5">
                  <span
                    className={`h-px transition-all duration-500 ${
                      i === activeIndex ? "w-9 bg-cyan-400" : "w-4 bg-white/15"
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.22em] transition-colors duration-500 ${
                      i === activeIndex ? "text-cyan-400" : "text-text-tertiary"
                    }`}
                  >
                    {cap.index}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

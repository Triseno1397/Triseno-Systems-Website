"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import ScrollReveal from "@/components/animations/ScrollReveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Button from "@/components/ui/Button";
import { ArrowRight } from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════
   DIVISION BREAK — The visual transition into Web Design
   ═══════════════════════════════════════════════════════ */

function DivisionBreak() {
  const breakRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion || !breakRef.current) return;

      gsap.fromTo(
        breakRef.current.querySelector(".scan-line"),
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 1.5,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: breakRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: breakRef }
  );

  return (
    <div ref={breakRef} className="relative py-20 md:py-28 overflow-hidden">
      <div className="scan-line absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent -translate-y-1/2" />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(0, 229, 255, 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col items-center text-center">
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-cyan-400/20 bg-cyan-400/[0.04] backdrop-blur-sm mb-8"
              style={{ animation: "badge-glow 3s ease-in-out infinite" }}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-cyan-400 font-medium">
                Division
              </span>
              <span className="w-px h-3 bg-cyan-400/30" />
              <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-text-secondary font-medium">
                Triseno Systems
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary mb-4">
              Web Design &{" "}
              <span className="gradient-text">Development</span>
            </h2>

            <p className="max-w-lg text-text-secondary text-base md:text-lg leading-relaxed">
              A dedicated division building websites engineered for
              intelligence, speed, and conversion.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TICKER — Scrolling marquee strip
   ═══════════════════════════════════════════════════════ */

function Ticker({
  items,
  reverse = false,
}: {
  items: string[];
  reverse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.04] bg-navy-900/50 py-4">
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{
          animation: `ticker ${reverse ? 35 : 30}s linear infinite${
            reverse ? " reverse" : ""
          }`,
          width: "max-content",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-8 font-mono text-[11px] tracking-[0.1em] uppercase text-text-tertiary"
          >
            {item}
            <span className="w-1 h-1 rounded-full bg-cyan-400/60 flex-shrink-0" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WD TEASER — Compact preview linking to full page
   ═══════════════════════════════════════════════════════ */

const metrics = [
  { value: 96, suffix: "+", label: "Perf Score" },
  { value: 3, suffix: ".2x", label: "Conversion Lift" },
  { value: 4, prefix: "<", suffix: " wk", label: "Delivery" },
];

function WDTeaser() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <ScrollReveal>
              <span className="inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] uppercase text-cyan-400 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Web Design & Development
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="text-[clamp(36px,5vw,64px)] font-bold leading-[1.05] tracking-[-0.03em] mb-6">
                Websites that{" "}
                <span className="gradient-text">actually convert.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-lg text-text-secondary leading-relaxed max-w-[480px] mb-8">
                AI-ready architecture. Conversion engineering. Performance that
                scores above 90. Custom-coded from scratch — no templates, no
                compromises.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <Button variant="primary" size="large" href="/web-design">
                <span className="flex items-center gap-2">
                  Explore Web Design
                  <ArrowRight size={18} weight="bold" />
                </span>
              </Button>
            </ScrollReveal>
          </div>

          {/* Right — Metrics */}
          <ScrollReveal delay={0.2} direction="right">
            <div className="grid grid-cols-3 gap-6 lg:gap-8">
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className={`py-6 ${
                    i < metrics.length - 1
                      ? "border-r border-white/[0.04] pr-6 lg:pr-8"
                      : ""
                  }`}
                >
                  <div className="text-[clamp(32px,4vw,48px)] font-bold text-text-primary leading-none mb-2 tracking-[-0.02em]">
                    <AnimatedCounter
                      target={m.value}
                      prefix={m.prefix}
                      suffix={m.suffix}
                      duration={2}
                    />
                  </div>
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-cyan-400">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT — Composed Web Design Division Teaser
   ═══════════════════════════════════════════════════════ */

const tickerItems = [
  "Custom Websites",
  "Web Applications",
  "E-Commerce",
  "AI Integration",
  "Landing Pages",
  "SaaS Platforms",
  "Redesigns",
  "CRO",
  "Performance",
  "SEO",
];

export default function WebDesignDivision() {
  return (
    <div id="web-design" className="relative">
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 229, 255, 0.01) 0%, transparent 20%, transparent 80%, rgba(0, 229, 255, 0.01) 100%)",
        }}
      />

      <div className="relative">
        <DivisionBreak />
        <Ticker items={tickerItems} />
        <WDTeaser />
      </div>
    </div>
  );
}

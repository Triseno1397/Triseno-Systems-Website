"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import ScrollReveal from "@/components/animations/ScrollReveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import PortalBlast from "@/components/contact/PortalBlast";
import { ArrowRight } from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════
   DIVISION BREAK — The visual transition into Web Design.
   Carries the division sub-brand: a cyan→violet identity
   that sets this apart from the core (pure-cyan) Triseno look.
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
      <div
        className="scan-line absolute top-1/2 left-0 right-0 h-px -translate-y-1/2"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.4) 38%, rgba(157,92,255,0.45) 62%, transparent 100%)",
        }}
      />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(157,92,255,0.07) 0%, rgba(0,229,255,0.04) 45%, transparent 72%)",
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col items-center text-center">
            <div
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border backdrop-blur-sm mb-8"
              style={{
                borderColor: "rgba(157,92,255,0.22)",
                background: "rgba(157,92,255,0.05)",
                animation: "badge-glow 3s ease-in-out infinite",
              }}
            >
              <span
                className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"
                style={{ boxShadow: "0 0 8px rgba(157,92,255,0.7)" }}
              />
              <span
                className="font-mono text-[11px] tracking-[0.28em] uppercase font-medium"
                style={{ color: "#c9a4ff" }}
              >
                Division 02
              </span>
              <span
                className="w-px h-3"
                style={{ background: "rgba(255,255,255,0.18)" }}
              />
              <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-text-secondary font-medium">
                Triseno Systems
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary mb-4">
              Web Design &{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(110deg,#00e5ff,#9d5cff)" }}
              >
                Development
              </span>
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
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#00e5ff,#9d5cff)" }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ENTER THE DIVISION — Threshold CTA.
   Reuses the easter-egg PortalBlast warp so clicking it feels
   like crossing into a different space, not just a page change.
   Stays a real <a href> so it's crawlable and supports
   new-tab / modified clicks.
   ═══════════════════════════════════════════════════════ */

function DivisionEnterButton() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [warping, setWarping] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  const enter = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let modified / non-primary clicks behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (warping) return;
    const r = ref.current?.getBoundingClientRect();
    setOrigin(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
    setWarping(true);
  };

  return (
    <>
      <a
        ref={ref}
        href="/web-design"
        onClick={enter}
        className="group relative inline-flex items-center gap-2.5 rounded-lg px-8 py-4 text-base font-semibold text-navy-950 transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background:
            "linear-gradient(110deg,#00e5ff 0%,#6ea8ff 48%,#9d5cff 100%)",
          boxShadow: "0 0 34px rgba(157,92,255,0.26)",
        }}
      >
        Enter the Division
        <ArrowRight
          size={18}
          weight="bold"
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </a>

      {warping && (
        <PortalBlast
          origin={origin}
          onNavigate={() => window.location.assign("/web-design")}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   WD TEASER — Compact preview linking to the full division
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
              <span
                className="inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] uppercase mb-6"
                style={{ color: "#c9a4ff" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: "linear-gradient(135deg,#00e5ff,#9d5cff)",
                    boxShadow: "0 0 8px rgba(157,92,255,0.7)",
                  }}
                />
                Web Design & Development
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="text-[clamp(36px,5vw,64px)] font-bold leading-[1.05] tracking-[-0.03em] mb-6">
                Websites that{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(110deg,#00e5ff,#9d5cff)",
                  }}
                >
                  actually convert.
                </span>
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
              <div className="flex flex-col items-start gap-4">
                <DivisionEnterButton />
                <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-tertiary">
                  The page is the demo
                </span>
              </div>
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
                  <span
                    className="font-mono text-[9px] tracking-[0.1em] uppercase"
                    style={{ color: "#9fb6e0" }}
                  >
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
   MAIN EXPORT — Composed Web Design Division band.
   A scroll-scrubbed wash shifts the ambient tint from cyan
   into violet as you move through the band, so crossing into
   the division reads as entering its own palette.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion || !rootRef.current) return;

      // Crossfade two ambient washes as the band scrolls through — cyan
      // recedes, violet rises. Opacity-only, so it stays compositor-cheap.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 90%",
            end: "bottom 20%",
            scrub: 0.6,
          },
        })
        .fromTo(
          ".wd-cyan-wash",
          { opacity: 0.8 },
          { opacity: 0.12, ease: "none" },
          0
        )
        .fromTo(
          ".wd-violet-wash",
          { opacity: 0.1 },
          { opacity: 0.95, ease: "none" },
          0
        );
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} id="web-design" className="relative overflow-hidden">
      {/* Top border accent — cyan bleeding into violet */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.3) 40%, rgba(157,92,255,0.35) 60%, transparent 100%)",
        }}
      />

      {/* Scroll-scrubbed palette shift */}
      <div
        className="wd-cyan-wash absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(0,229,255,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="wd-violet-wash absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.1,
          background:
            "radial-gradient(ellipse 85% 60% at 50% 60%, rgba(157,92,255,0.11) 0%, transparent 72%)",
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

"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CirclesThreePlus, Lightning, Brain } from "@phosphor-icons/react";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import OrchestrationPanel from "@/components/sections/panels/OrchestrationPanel";
import CompressionPanel from "@/components/sections/panels/CompressionPanel";
import DecisionPanel from "@/components/sections/panels/DecisionPanel";

const stages = [
  {
    id: "orchestration",
    icon: CirclesThreePlus,
    label: "01 · Orchestration",
    title: "Multi-agent systems that operate as a team.",
    body:
      "Coordinated AI agents that divide complex workflows into parallel execution paths — research, analysis, generation, and validation running simultaneously.",
    href: "/capabilities#orchestration",
    Panel: OrchestrationPanel,
  },
  {
    id: "compression",
    icon: Lightning,
    label: "02 · Compression",
    title: "40-hour workflows engineered down to minutes.",
    body:
      "Document processing, approval chains, data reconciliation — compressed, automated, and monitored end to end.",
    href: "/capabilities#compression",
    Panel: CompressionPanel,
  },
  {
    id: "decision",
    icon: Brain,
    label: "03 · Decision Intelligence",
    title: "Judgment that operates at machine speed.",
    body:
      "AI that doesn't just surface data — it makes recommendations, flags anomalies, and executes decisions within parameters you define.",
    href: "/capabilities#decision-intelligence",
    Panel: DecisionPanel,
  },
];

export default function CapabilitiesShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
      if (!sectionRef.current || !stageRef.current) return;
      if (isMobile) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const slides = stageRef.current.querySelectorAll<HTMLElement>(
        ".cap-slide"
      );
      const copies = sectionRef.current.querySelectorAll<HTMLElement>(
        ".cap-copy"
      );

      if (reduceMotion) {
        gsap.set(slides, { opacity: 0, scale: 1 });
        gsap.set(slides[0], { opacity: 1, scale: 1 });
        gsap.set(copies, { opacity: 0, y: 0 });
        gsap.set(copies[0], { opacity: 1 });
        return;
      }

      // Initial state — first slide framed, others hidden
      gsap.set(slides, { opacity: 0, scale: 0.78, filter: "blur(6px)" });
      gsap.set(slides[0], { opacity: 1, scale: 0.78, filter: "blur(0px)" });
      gsap.set(copies, { opacity: 0, y: 24 });
      gsap.set(copies[0], { opacity: 1, y: 0 });

      const total = stages.length; // 3
      const segment = 1 / total;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${window.innerHeight * total * 1.2}`,
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const idx = Math.min(
              total - 1,
              Math.floor(self.progress * total - 0.0001)
            );
            setActiveIndex(idx < 0 ? 0 : idx);
          },
        },
      });

      // For each stage: zoom in from framed → fullscreen, then hand off
      stages.forEach((_, i) => {
        const slide = slides[i];
        const copy = copies[i];
        const next = slides[i + 1];
        const nextCopy = copies[i + 1];
        const start = i * segment;
        const midZoom = start + segment * 0.55;
        const handoff = start + segment * 0.85;

        // Zoom in
        tl.to(
          slide,
          {
            scale: 1,
            ease: "power2.out",
            duration: segment * 0.6,
          },
          start
        );

        // Crossfade to next stage
        if (next) {
          tl.to(
            slide,
            {
              opacity: 0,
              scale: 1.08,
              filter: "blur(6px)",
              ease: "power2.in",
              duration: segment * 0.25,
            },
            handoff
          );
          tl.to(
            copy,
            {
              opacity: 0,
              y: -16,
              ease: "power2.in",
              duration: segment * 0.2,
            },
            handoff
          );
          tl.fromTo(
            next,
            { opacity: 0, scale: 0.78, filter: "blur(6px)" },
            {
              opacity: 1,
              scale: 0.78,
              filter: "blur(0px)",
              ease: "power2.out",
              duration: segment * 0.2,
            },
            handoff + segment * 0.05
          );
          tl.fromTo(
            nextCopy,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              duration: segment * 0.2,
            },
            handoff + segment * 0.05
          );
        }

        // Suppress unused var lint
        void midZoom;
      });
    },
    { scope: sectionRef, dependencies: [isMobile] }
  );

  // Mobile fallback — simple stacked panels with fade-in
  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        className="relative py-20 md:py-28"
        data-section="capabilities-showcase"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
              What we engineer
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight tracking-tight mb-4">
              AI infrastructure built for operations, not demos.
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              Three layers of intelligence that turn complex operations into
              leverage.
            </p>
          </div>

          <div className="space-y-12">
            {stages.map(({ id, icon: Icon, label, title, body, href, Panel }) => (
              <div key={id} className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon size={18} weight="duotone" className="text-cyan-400" />
                    <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-cyan-400">
                      {label}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary leading-snug">
                    {title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {body}
                  </p>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 text-sm text-cyan-400 font-medium"
                  >
                    Learn more
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
                <div className="aspect-[4/3] rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl">
                  <Panel />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#0a0e1a] overflow-hidden"
      data-section="capabilities-showcase"
      style={{ minHeight: "100dvh" }}
    >
      {/* Pinned stage */}
      <div className="relative h-[100dvh] w-full overflow-hidden">
        {/* Soft cyan field behind stage */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "var(--gradient-radial)" }}
        />

        <div className="relative h-full max-w-[1400px] mx-auto px-6 lg:px-8 grid grid-cols-12 gap-8 items-center">
          {/* Left rail — copy + step indicator */}
          <div className="col-span-4 relative h-full flex flex-col justify-center py-24">
            <div className="mb-10">
              <span className="font-mono text-xs tracking-[0.25em] uppercase text-cyan-400/70">
                What we engineer
              </span>
            </div>

            {/* Stacked copies — only one visible at a time */}
            <div className="relative min-h-[320px]">
              {stages.map(({ id, icon: Icon, label, title, body, href }) => (
                <div
                  key={id}
                  className="cap-copy absolute inset-0 flex flex-col gap-5"
                  style={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={18} weight="duotone" className="text-cyan-400" />
                    <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-cyan-400">
                      {label}
                    </span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-text-primary leading-tight tracking-tight">
                    {title}
                  </h3>
                  <p className="text-sm lg:text-base text-text-secondary leading-relaxed max-w-md">
                    {body}
                  </p>
                  <Link
                    href={href}
                    className="group inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-[#00e5ff] font-medium transition-colors duration-200 w-fit"
                  >
                    Learn more
                    <ArrowRight
                      size={14}
                      weight="bold"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              ))}
            </div>

            {/* Stage progress dots */}
            <div className="mt-12 flex items-center gap-3">
              {stages.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div
                    className={`h-px transition-all duration-500 ${
                      i === activeIndex
                        ? "w-10 bg-cyan-400"
                        : "w-5 bg-white/15"
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.22em] transition-colors duration-500 ${
                      i === activeIndex
                        ? "text-cyan-400"
                        : "text-text-tertiary"
                    }`}
                  >
                    0{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — zoom stage */}
          <div className="col-span-8 relative h-full flex items-center">
            <div
              ref={stageRef}
              className="relative w-full aspect-[16/10] max-h-[78vh]"
              style={{ perspective: "1200px" }}
            >
              {stages.map(({ id, Panel }) => (
                <div
                  key={id}
                  className="cap-slide absolute inset-0 rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_30px_120px_-20px_rgba(0,180,216,0.25),0_8px_32px_-8px_rgba(0,0,0,0.6)] will-change-transform"
                  style={{
                    transformOrigin: "center center",
                    background: "#0a0e1a",
                  }}
                >
                  {/* Subtle top sheen */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-10" />
                  <Panel />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

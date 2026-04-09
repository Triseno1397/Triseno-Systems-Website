"use client";

import { useRef } from "react";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import { useReducedMotion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import {
  MagnifyingGlass,
  Blueprint,
  Code,
  Rocket,
  TrendUp,
} from "@phosphor-icons/react";

const steps = [
  {
    number: "01",
    title: "DIAGNOSE",
    icon: MagnifyingGlass,
    description:
      "We map your operational workflows, identify compression opportunities, and quantify the cost of every problem worth solving. No guesswork. No generic audits. A technical assessment built around your actual architecture.",
  },
  {
    number: "02",
    title: "ARCHITECT",
    icon: Blueprint,
    description:
      "Solution blueprints that specify agent roles, data flows, integration points, fallback logic, and success metrics before a single line of code is written. You see the system before it exists.",
  },
  {
    number: "03",
    title: "BUILD",
    icon: Code,
    description:
      "Modular construction with continuous testing. Each agent, each pipeline, each decision node is built to be independently testable, replaceable, and scalable. No monoliths. No black boxes.",
  },
  {
    number: "04",
    title: "DEPLOY",
    icon: Rocket,
    description:
      "Production deployment with monitoring, performance benchmarking, and iterative refinement. Knowledge transfer to your team so the system isn't a black box. Continuous optimization begins immediately.",
  },
  {
    number: "05",
    title: "COMPOUND",
    icon: TrendUp,
    description:
      "Systems get smarter over time. Ongoing optimization, expansion roadmapping, and strategic advisory through infrastructure retainers. Your AI compounds — it doesn't depreciate.",
  },
];

export default function Process() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion) return;

      // Animate the timeline line drawing in
      const line = sectionRef.current?.querySelector(".process-timeline-line");
      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 60%",
              end: "bottom 40%",
              scrub: 0.8,
            },
          }
        );
      }

      // Staggered card reveals
      const cards = sectionRef.current?.querySelectorAll(".process-card");
      cards?.forEach((card, i) => {
        const isLeft = i % 2 === 0;
        gsap.from(card, {
          opacity: 0,
          x: isLeft ? -60 : 60,
          y: 30,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "top 55%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // Animate the timeline nodes
      const nodes = sectionRef.current?.querySelectorAll(".process-node");
      nodes?.forEach((node) => {
        gsap.from(node, {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          ease: "back.out(2)",
          scrollTrigger: {
            trigger: node,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        });
      });
    },
    { scope: sectionRef, dependencies: [shouldReduceMotion] }
  );

  return (
    <section
      id="process"
      ref={sectionRef}
      className="relative py-24 md:py-32"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <SectionHeading
          eyebrow="How We Work"
          title="Engineered Delivery"
          description="Every engagement follows a structured methodology designed to minimize risk and maximize measurable outcomes."
        />

        {/* Desktop: Alternating timeline layout */}
        <div className="hidden md:block relative mt-20">
          {/* Center timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <div className="process-timeline-line h-full w-full bg-gradient-to-b from-cyan-400/60 via-cyan-400/30 to-cyan-400/10 origin-top" />
          </div>

          <div className="space-y-16 lg:space-y-20">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={step.number} className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10">
                  {/* Left side */}
                  <div className={isLeft ? "" : "order-3"}>
                    {isLeft && (
                      <div className="process-card">
                        <StepCard step={step} align="right" />
                      </div>
                    )}
                    {!isLeft && (
                      <div className="process-card">
                        <StepCard step={step} align="left" />
                      </div>
                    )}
                  </div>

                  {/* Center node */}
                  <div className="order-2 flex items-center justify-center">
                    <div className="process-node relative w-12 h-12 rounded-full border-2 border-cyan-400/60 bg-navy-950 flex items-center justify-center z-10">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {step.number}
                      </span>
                      {/* Pulse ring */}
                      <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping" style={{ animationDuration: "3s" }} />
                    </div>
                  </div>

                  {/* Right side */}
                  <div className={isLeft ? "order-3" : ""}>
                    {isLeft ? (
                      <div className="opacity-0 pointer-events-none" aria-hidden />
                    ) : null}
                    {!isLeft ? (
                      <div className="opacity-0 pointer-events-none" aria-hidden />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="md:hidden mt-12">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/[0.06]">
              <div className="process-timeline-line h-full w-full bg-gradient-to-b from-cyan-400/60 via-cyan-400/30 to-cyan-400/10 origin-top" />
            </div>

            <div className="space-y-8">
              {steps.map((step) => (
                <div key={step.number} className="process-card relative pl-16">
                  {/* Node on timeline */}
                  <div className="process-node absolute left-4 top-2 w-4 h-4 rounded-full border-2 border-cyan-400 bg-navy-950" />

                  <span className="font-mono text-sm text-cyan-400 tracking-wider">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-bold text-text-primary tracking-wider mt-1 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  align,
}: {
  step: (typeof steps)[number];
  align: "left" | "right";
}) {
  return (
    <div
      className={`group relative p-8 rounded-2xl border border-white/[0.06] bg-navy-800/30 backdrop-blur-sm overflow-hidden transition-colors duration-500 hover:border-cyan-400/20 hover:bg-navy-800/50 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Corner glow on hover */}
      <div
        className={`absolute top-0 ${
          align === "right" ? "right-0" : "left-0"
        } w-32 h-32 bg-cyan-400/[0.03] rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 -translate-y-1/2 ${
          align === "right" ? "translate-x-1/2" : "-translate-x-1/2"
        }`}
      />

      <div
        className={`flex items-center gap-4 mb-6 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <step.icon
          size={28}
          weight="duotone"
          className="text-cyan-400/60 transition-colors duration-500 group-hover:text-cyan-400"
        />
      </div>

      <h3 className="text-xl font-bold text-text-primary tracking-wider mb-4">
        {step.title}
      </h3>

      <p className="text-text-secondary leading-relaxed">
        {step.description}
      </p>
    </div>
  );
}

"use client";

import {
  MagnifyingGlass,
  Blueprint,
  Code,
  Rocket,
  TrendUp,
  CurrencyDollar,
  StackSimple,
  ShieldCheck,
} from "@phosphor-icons/react";
import PageHero from "@/components/layout/PageHero";
import CtaBar from "@/components/layout/CtaBar";
import ProcessStep from "@/components/sections/ProcessStep";
import DifferentiatorBlock from "@/components/sections/DifferentiatorBlock";
import ScrollReveal from "@/components/animations/ScrollReveal";

const steps = [
  {
    step: 1,
    number: "01",
    title: "Diagnose",
    icon: MagnifyingGlass,
    body:
      "We map your operational workflows, identify compression opportunities, and quantify the cost of every problem worth solving. No guesswork. No generic audits. A technical assessment built around your actual architecture.",
  },
  {
    step: 2,
    number: "02",
    title: "Architect",
    icon: Blueprint,
    body:
      "Solution blueprints that specify agent roles, data flows, integration points, fallback logic, and success metrics before a single line of code is written. You see the system before it exists.",
  },
  {
    step: 3,
    number: "03",
    title: "Build",
    icon: Code,
    body:
      "Modular construction with continuous testing. Each agent, each pipeline, each decision node is built to be independently testable, replaceable, and scalable. No monoliths. No black boxes.",
  },
  {
    step: 4,
    number: "04",
    title: "Deploy",
    icon: Rocket,
    body:
      "Production deployment with monitoring, performance benchmarking, and iterative refinement. Knowledge transfer to your team so the system isn't a black box. Continuous optimization begins immediately.",
  },
  {
    step: 5,
    number: "05",
    title: "Compound",
    icon: TrendUp,
    body:
      "Systems get smarter over time. Ongoing optimization, expansion roadmapping, and strategic advisory through infrastructure retainers. Your AI compounds — it doesn't depreciate.",
  },
];

const differentiators = [
  {
    icon: CurrencyDollar,
    title: "Outcome-tied pricing",
    body:
      "We attach our fees to numbers you already track — revenue recovered, costs reduced, conversion rates increased, cycle times compressed. You see the result before you pay for it. We only win when the system proves itself.",
  },
  {
    icon: StackSimple,
    title: "Infrastructure, not features",
    body:
      "Most AI vendors sell you a tool. We build the layer underneath — the orchestration, the decision logic, the compression architecture that makes every tool on top of it work better. Features deprecate. Infrastructure compounds.",
  },
  {
    icon: ShieldCheck,
    title: "Broadcast-grade reliability",
    body:
      "Our systems are architected like broadcast infrastructure — built for environments where downtime isn't an option, decisions happen in real-time, and failure cascades have real consequences. Every agent has fallback logic. Every pipeline has monitoring. Every system is built to not go down.",
  },
];

export default function ProcessContent() {
  return (
    <>
      <PageHero
        eyebrow="How we work"
        title="Engineered delivery."
        subtitle="Every engagement follows a structured methodology designed to minimize risk and maximize measurable outcomes."
      />

      {/* Process steps */}
      <section className="relative py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div
            data-animate="process-timeline"
            className="grid grid-cols-1 gap-6 md:gap-8 max-w-4xl mx-auto"
          >
            {steps.map((s, i) => (
              <ProcessStep
                key={s.step}
                step={s.step}
                number={s.number}
                title={s.title}
                body={s.body}
                icon={s.icon}
                delay={Math.min(i * 0.05, 0.2)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Triseno */}
      <section
        id="why"
        className="relative py-20 md:py-28 border-t border-white/[0.06] scroll-mt-32"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl mb-16">
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
                Why Triseno
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight mb-6">
                Engineered to compound.
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                We don&apos;t just deliver systems — we engineer infrastructure that gets more valuable over time.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {differentiators.map((diff, i) => (
              <DifferentiatorBlock
                key={diff.title}
                title={diff.title}
                body={diff.body}
                icon={diff.icon}
                delay={Math.min(i * 0.1, 0.2)}
              />
            ))}
          </div>
        </div>
      </section>

      <CtaBar
        heading="Start with a diagnostic."
        buttonLabel="Start with a diagnostic"
        buttonHref="/contact"
      />
    </>
  );
}

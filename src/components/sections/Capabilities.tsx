"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import {
  CirclesThreePlus,
  Lightning,
  Brain,
  Package,
  Broadcast,
  ChartLineUp,
  Browser,
  Storefront,
  Buildings,
  FilmSlate,
  Code,
} from "@phosphor-icons/react";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import ScrollReveal from "@/components/animations/ScrollReveal";

const capabilities = [
  {
    icon: CirclesThreePlus,
    title: "Multi-Agent Orchestration",
    description:
      "Coordinated AI agent systems that divide complex workflows into parallel execution paths — research, analysis, generation, and validation running simultaneously. Not one bot. An entire operations team.",
    tag: "Core Platform",
    span: "md:col-span-2",
  },
  {
    icon: Lightning,
    title: "Workflow Compression Engines",
    description:
      "We identify the 40-hour processes buried in your operations and engineer them down to minutes. Document processing, approval chains, data reconciliation — compressed, automated, monitored.",
    tag: "Automation",
    span: "",
  },
  {
    icon: Brain,
    title: "Decision-Layer Automation",
    description:
      "AI systems that don't just surface data — they make recommendations, flag anomalies, and execute decisions within parameters you define. Your judgment, operating at machine speed.",
    tag: "Intelligence",
    span: "",
  },
  {
    icon: Package,
    title: "Product & Catalog Intelligence",
    description:
      "Transform sprawling product catalogs into intelligent systems that understand specifications, compatibility, and context. Your customers get expert-level guidance. Your team gets freed from repetitive inquiries.",
    tag: "Commerce",
    span: "",
  },
  {
    icon: Broadcast,
    title: "Broadcast & Production AI",
    description:
      "Production automation built by someone who's lived in the control room. Metadata intelligence, content routing, asset orchestration, and real-time decision systems for broadcast, film, live events, and media production workflows.",
    tag: "Media",
    span: "",
  },
  {
    icon: ChartLineUp,
    title: "Revenue Operations Intelligence",
    description:
      "Lead qualification, pipeline acceleration, and conversion optimization powered by AI that understands your sales process. Outcome-tied pricing means we only win when you do.",
    tag: "Revenue",
    span: "",
  },
];

const industries = [
  {
    icon: Broadcast,
    title: "Broadcast & Production",
    description:
      "The broadcast control room is one of the most complex operational environments in any industry. We bring domain expertise from inside the broadcast world combined with frontier AI architecture. Real-time decision-making, multi-source routing, metadata management, and workflow compression across pre-production, live, and post.",
    span: "",
  },
  {
    icon: Storefront,
    title: "E-Commerce & Large-Catalog",
    description:
      "Companies with hundreds or thousands of SKUs, complex product relationships, and technical specifications that overwhelm both customers and internal teams. We build intelligent catalog systems that turn static data into revenue-generating infrastructure.",
    span: "",
  },
  {
    icon: Buildings,
    title: "Enterprise Operations",
    description:
      "Complex operational workflows in logistics, supply chain, manufacturing, and large-scale service delivery. Agent systems and workflow compression engines for environments where operational throughput and decision accuracy directly impact revenue.",
    span: "",
  },
  {
    icon: FilmSlate,
    title: "Creative Production & Media Tech",
    description:
      "AI infrastructure for creative teams at scale — asset management intelligence, production pipeline automation, creative deployment engines, and systems that accelerate creative throughput without sacrificing quality.",
    span: "",
  },
  {
    icon: Code,
    title: "Technology & SaaS",
    description:
      "AI-native infrastructure for tech companies looking to embed intelligence deeper into their products and operations. From internal tooling automation to customer onboarding compression to intelligent support architecture.",
    span: "sm:col-span-2 lg:col-span-2",
  },
];

/* ─── Animated Network Graph ─── */
function NetworkVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // All infinite animations moved to CSS keyframes for GPU compositing

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 200"
      fill="none"
      className="w-full h-full"
      aria-hidden="true"
    >
      {/* Subtle grid (reduced) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={`vg-${i}`}
          x1={i * 84}
          y1="0"
          x2={i * 84}
          y2="200"
          stroke="rgba(0, 180, 216, 0.03)"
          strokeWidth="0.5"
        />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <line
          key={`hg-${i}`}
          x1="0"
          y1={i * 60}
          x2="800"
          y2={i * 60}
          stroke="rgba(0, 180, 216, 0.03)"
          strokeWidth="0.5"
        />
      ))}

      {/* Connection lines — CSS animated */}
      {[
        { d: "M120 100 L260 60", o: 0.2, delay: 0 },
        { d: "M120 100 L280 140", o: 0.15, delay: 0.8 },
        { d: "M260 60 L400 100", o: 0.2, delay: 1.6 },
        { d: "M280 140 L400 100", o: 0.15, delay: 2.4 },
        { d: "M400 100 L540 55", o: 0.2, delay: 3.2 },
        { d: "M400 100 L520 145", o: 0.15, delay: 4 },
        { d: "M540 55 L680 100", o: 0.2, delay: 4.8 },
        { d: "M520 145 L680 100", o: 0.15, delay: 5.6 },
      ].map((line, i) => (
        <path
          key={`flow-${i}`}
          d={line.d}
          stroke={`rgba(0, 180, 216, ${line.o})`}
          strokeWidth="1"
          strokeDasharray="4 8"
          style={{ animation: `dash-flow ${3 + i * 0.5}s linear infinite ${line.delay}s` }}
        />
      ))}

      {/* Central hub node — CSS animated */}
      <circle cx="400" cy="100" r="8" fill="#00b4d8" style={{ animation: "node-pulse 1.5s ease-in-out infinite", ["--pulse-max" as string]: "0.8" }} />
      <circle cx="400" cy="100" r="16" stroke="rgba(0, 180, 216, 0.3)" strokeWidth="1" fill="none" style={{ animation: "ring-pulse 2.5s ease-out infinite", transformOrigin: "400px 100px" }} />
      <circle cx="400" cy="100" r="3" fill="#fff" opacity="0.9" />

      {/* Input nodes - left */}
      <circle cx="120" cy="100" r="5" fill="#00b4d8" style={{ animation: "node-pulse 1.8s ease-in-out infinite 0.5s", ["--pulse-max" as string]: "0.6" }} />
      <circle cx="120" cy="100" r="10" stroke="rgba(0, 180, 216, 0.2)" strokeWidth="0.5" fill="none" style={{ animation: "ring-pulse 2.5s ease-out infinite 1.2s", transformOrigin: "120px 100px" }} />

      {/* Processing nodes */}
      <circle cx="260" cy="60" r="4" fill="#00b4d8" style={{ animation: "node-pulse 2.1s ease-in-out infinite 1s", ["--pulse-max" as string]: "0.7" }} />
      <circle cx="280" cy="140" r="4" fill="#00b4d8" style={{ animation: "node-pulse 1.5s ease-in-out infinite 1.5s", ["--pulse-max" as string]: "0.5" }} />
      <circle cx="540" cy="55" r="4" fill="#00b4d8" style={{ animation: "node-pulse 1.8s ease-in-out infinite 2s", ["--pulse-max" as string]: "0.6" }} />
      <circle cx="520" cy="145" r="4" fill="#00b4d8" style={{ animation: "node-pulse 2.1s ease-in-out infinite 2.5s", ["--pulse-max" as string]: "0.5" }} />

      {/* Output node - right */}
      <circle cx="680" cy="100" r="5" fill="#00b4d8" style={{ animation: "node-pulse 1.5s ease-in-out infinite 3s", ["--pulse-max" as string]: "0.6" }} />
      <circle cx="680" cy="100" r="10" stroke="rgba(0, 180, 216, 0.2)" strokeWidth="0.5" fill="none" style={{ animation: "ring-pulse 2.5s ease-out infinite 2.4s", transformOrigin: "680px 100px" }} />

      {/* Labels */}
      <text x="120" y="125" textAnchor="middle" fill="rgba(0, 180, 216, 0.4)" fontSize="8" fontFamily="monospace">INPUT</text>
      <text x="400" y="130" textAnchor="middle" fill="rgba(0, 180, 216, 0.5)" fontSize="8" fontFamily="monospace">ORCHESTRATION</text>
      <text x="680" y="125" textAnchor="middle" fill="rgba(0, 180, 216, 0.4)" fontSize="8" fontFamily="monospace">OUTPUT</text>

      {/* Gradient overlay */}
      <defs>
        <linearGradient id="capFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0e1a" stopOpacity="1" />
          <stop offset="10%" stopColor="#0a0e1a" stopOpacity="0" />
          <stop offset="90%" stopColor="#0a0e1a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="800" height="200" fill="url(#capFade)" />
    </svg>
  );
}

export default function Capabilities() {
  return (
    <section
      id="capabilities"
      className="relative py-24 md:py-32 lg:py-40"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <SectionHeading
          eyebrow="What We Build"
          title="Infrastructure That Thinks"
          description="We don't build chatbots. We build the operational intelligence layer underneath — the systems that compress decisions, orchestrate agents, and turn complexity into leverage."
        />

        {/* Animated network visualization */}
        <ScrollReveal className="mb-16">
          <div className="relative h-[160px] md:h-[200px] rounded-2xl overflow-hidden border border-white/[0.04] bg-navy-900/30">
            <NetworkVisualization />
          </div>
        </ScrollReveal>

        {/* Capability cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {capabilities.map((cap, i) => (
            <ScrollReveal key={i} delay={i * 0.08} className={cap.span}>
              <Card className="p-8 h-full group">
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-400/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <cap.icon
                      size={32}
                      weight="duotone"
                      className="relative text-cyan-400"
                    />
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-tertiary border border-white/[0.06] rounded-full px-3 py-1">
                    {cap.tag}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {cap.title}
                </h3>
                <p className="text-text-secondary leading-relaxed text-[15px]">
                  {cap.description}
                </p>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Industries — Built for Complex Operations */}
        <div className="mt-24 md:mt-32">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400/80 mb-4">
                Industries
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Built for Complex Operations
              </h3>
              <p className="max-w-2xl mx-auto text-text-secondary leading-relaxed">
                We work across industries — anywhere operational complexity, large data sets, or manual workflows are costing you money and time.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, i) => (
              <ScrollReveal key={i} delay={i * 0.1} className={industry.span}>
                <div className="relative h-full p-8 rounded-2xl border border-white/[0.06] bg-navy-800/20 group hover:border-cyan-400/20 transition-colors duration-500">
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <industry.icon
                    size={28}
                    weight="duotone"
                    className="text-cyan-400 mb-6"
                  />
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    {industry.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {industry.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

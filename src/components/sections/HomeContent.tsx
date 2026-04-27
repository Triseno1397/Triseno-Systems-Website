"use client";

import Link from "next/link";
import {
  CirclesThreePlus,
  Lightning,
  Brain,
  ArrowRight,
} from "@phosphor-icons/react";
import Hero from "@/components/sections/Hero";
import ScrollReveal from "@/components/animations/ScrollReveal";
import Button from "@/components/ui/Button";

const overviewCards = [
  {
    icon: CirclesThreePlus,
    label: "Orchestration",
    title: "Multi-agent systems that operate as a team.",
    body:
      "Coordinated AI agents that divide complex workflows into parallel execution paths — research, analysis, generation, and validation running simultaneously.",
    href: "/capabilities#orchestration",
  },
  {
    icon: Lightning,
    label: "Compression",
    title: "40-hour workflows engineered down to minutes.",
    body:
      "Document processing, approval chains, data reconciliation — compressed, automated, and monitored end to end.",
    href: "/capabilities#compression",
  },
  {
    icon: Brain,
    label: "Decision Intelligence",
    title: "Judgment that operates at machine speed.",
    body:
      "AI that doesn't just surface data — it makes recommendations, flags anomalies, and executes decisions within parameters you define.",
    href: "/capabilities#decision-intelligence",
  },
];

const industries = [
  "Broadcast",
  "Ecommerce",
  "Enterprise Operations",
  "Creative Production",
  "Tech & SaaS",
];

const whyBullets = [
  "Outcome-tied pricing",
  "Infrastructure, not features",
  "Broadcast-grade reliability",
];

export default function HomeContent() {
  return (
    <>
      <Hero />

      {/* What we engineer */}
      <section
        data-animate="home-intro"
        className="relative py-24 md:py-32"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl mb-16">
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
                What we engineer
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight mb-6">
                AI infrastructure built for operations, not demos.
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                Three layers of intelligence that turn complex operations into
                leverage — engineered to compound, not depreciate.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {overviewCards.map((card, i) => (
              <ScrollReveal key={card.href} delay={i * 0.1}>
                <Link
                  href={card.href}
                  className="group relative h-full block rounded-2xl border border-white/[0.06] bg-navy-800/30 backdrop-blur-sm p-8 transition-colors duration-300 hover:border-cyan-400/30"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy-700/60 border border-white/[0.06] mb-6">
                    <card.icon size={24} weight="duotone" className="text-cyan-400" />
                  </div>
                  <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-text-tertiary mb-3">
                    {card.label}
                  </span>
                  <h3 className="text-lg font-semibold text-text-primary mb-3 leading-snug group-hover:text-[#00e5ff] transition-colors duration-200">
                    {card.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed mb-6">
                    {card.body}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm text-cyan-400 font-medium">
                    Learn more
                    <ArrowRight
                      size={14}
                      weight="bold"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Built for — Industries strip */}
      <section className="relative py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="flex flex-col items-start gap-6">
              <span className="font-mono text-xs tracking-[0.25em] uppercase text-cyan-400/70">
                Built for
              </span>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-text-primary text-lg md:text-xl font-medium">
                {industries.map((industry, i) => (
                  <span key={industry} className="flex items-center gap-x-6">
                    <Link
                      href="/capabilities#industries"
                      className="hover:text-[#00e5ff] transition-colors duration-200"
                    >
                      {industry}
                    </Link>
                    {i < industries.length - 1 && (
                      <span className="text-cyan-400/40">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why Triseno teaser */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
                Why Triseno
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight">
                Built to compound, not depreciate.
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
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
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight mb-10">
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
    </>
  );
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Broadcast,
  Storefront,
  Buildings,
  FilmSlate,
  Code,
  ArrowUpRight,
} from "@phosphor-icons/react";
import ScrollReveal from "@/components/animations/ScrollReveal";
import GlowCard from "@/components/ui/GlowCard";
import { useMouseGlow } from "@/hooks/useMouseGlow";

const industries = [
  {
    id: "broadcast",
    icon: Broadcast,
    name: "Broadcast",
    subtitle: "Real-time routing",
    description: "Zero-downtime AI orchestration and multi-source routing for live production.",
    href: "/#capabilities",
    metadata: [
      { label: "ROUTING", val: "ACTIVE" },
      { label: "STREAMS", val: "4K LIVE" },
      { label: "FALLBACK", val: "AUTO" },
    ],
  },
  {
    id: "ecommerce",
    icon: Storefront,
    name: "Ecommerce",
    subtitle: "Catalog intelligence",
    description: "SKU catalog engines turning complex product data into active revenue assets.",
    href: "/#capabilities",
    metadata: [
      { label: "SYNC RATE", val: "10K/MIN" },
      { label: "INVENTORY", val: "DYNAMIC" },
      { label: "MATCHING", val: "AI-NEURAL" },
    ],
  },
  {
    id: "operations",
    icon: Buildings,
    name: "Operations",
    subtitle: "Process automation",
    description: "Autonomous agent networks engineered to compress enterprise cycles.",
    href: "/#capabilities",
    metadata: [
      { label: "LATENCY", val: "<50MS" },
      { label: "AGENTS", val: "ACTIVE" },
    ],
  },
  {
    id: "creative",
    icon: FilmSlate,
    name: "Creative",
    subtitle: "Pipeline acceleration",
    description: "Automated media pipelines scaling production without quality loss.",
    href: "/#capabilities",
    metadata: [
      { label: "RECONCILE", val: "AUTO" },
      { label: "CODECS", val: "RAW/H.265" },
    ],
  },
  {
    id: "saas",
    icon: Code,
    name: "Tech & SaaS",
    subtitle: "AI infrastructure",
    description: "AI-native systems built to embed operational intelligence at scale.",
    href: "/#capabilities",
    metadata: [
      { label: "THROUGHPUT", val: "UNLIMIT" },
      { label: "DECISIONS", val: "0.2S" },
    ],
  },
];

type StyleOption = "cyberpunk" | "editorial" | "bento";

export default function BuiltFor() {
  const [activeStyle, setActiveStyle] = useState<StyleOption>("cyberpunk");
  const containerRef = useRef<HTMLDivElement>(null);
  useMouseGlow(containerRef);

  return (
    <section className="relative py-24 md:py-32 border-t border-white/[0.06] overflow-hidden bg-navy-950/20">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <ScrollReveal>
            <div className="max-w-2xl">
              <span className="inline-block font-mono text-xs tracking-[0.25em] uppercase text-cyan-400/70 mb-3">
                Built For
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight">
                High-consequence operational domains.
              </h2>
            </div>
          </ScrollReveal>
          
          {/* Style Switcher */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] uppercase text-text-secondary tracking-widest">
                Choose Look & Feel:
              </span>
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                {(["cyberpunk", "editorial", "bento"] as StyleOption[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setActiveStyle(style)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 ${
                      activeStyle === style
                        ? "bg-cyan-500/10 border border-cyan-400/30 text-cyan-400"
                        : "text-text-secondary hover:text-text-primary border border-transparent"
                    }`}
                  >
                    {style.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Style A: Cyberpunk Grid */}
        {activeStyle === "cyberpunk" && (
          <div
            ref={containerRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6"
          >
            {industries.map((ind, i) => (
              <ScrollReveal key={ind.name} delay={i * 0.08}>
                <Link href={ind.href} className="block group/card h-full">
                  <GlowCard className="h-full p-6 flex flex-col justify-between min-h-[220px] hover:border-cyan-400/35 transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center justify-center p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-cyan-400 group-hover/card:text-[#00e5ff] group-hover/card:border-cyan-400/30 group-hover/card:bg-cyan-500/5 transition-all duration-300">
                          <ind.icon size={22} weight="duotone" />
                        </div>
                        <ArrowUpRight
                          size={16}
                          className="text-text-tertiary opacity-0 -translate-x-1 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-x-0 group-hover/card:translate-y-0 transition-all duration-300"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-text-primary mb-1 tracking-tight">
                        {ind.name}
                      </h3>
                      <span className="block font-mono text-[9px] tracking-[0.15em] uppercase text-cyan-400/55 mb-4 font-semibold">
                        {ind.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed font-light group-hover/card:text-text-primary transition-colors duration-300">
                      {ind.description}
                    </p>
                  </GlowCard>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Style B: Editorial Clean */}
        {activeStyle === "editorial" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 border-t border-white/[0.04] pt-12">
            {industries.map((ind, i) => (
              <ScrollReveal key={ind.name} delay={i * 0.08}>
                <Link href={ind.href} className="block group/card h-full">
                  <div className="flex flex-col h-full justify-between min-h-[200px] border-b border-white/[0.04] pb-6 hover:border-white/[0.12] transition-colors duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-8">
                        <ind.icon size={24} weight="light" className="text-text-secondary group-hover/card:text-text-primary transition-colors duration-300" />
                        <ArrowUpRight
                          size={14}
                          className="text-text-tertiary group-hover/card:text-text-primary transition-colors duration-300"
                        />
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">
                        {ind.name}
                      </h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed font-light group-hover/card:text-text-primary transition-colors duration-300">
                      {ind.description}
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Style C: Bento Grid */}
        {activeStyle === "bento" && (
          <div
            ref={containerRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6"
          >
            {industries.map((ind, i) => {
              const isLarge = ind.id === "broadcast" || ind.id === "ecommerce";
              const gridClass = isLarge 
                ? "lg:col-span-3 sm:col-span-2" 
                : "lg:col-span-2 sm:col-span-1";

              return (
                <ScrollReveal key={ind.name} delay={i * 0.08} className={gridClass}>
                  <Link href={ind.href} className="block group/card h-full">
                    <GlowCard className="h-full p-8 flex flex-col justify-between min-h-[250px] hover:border-cyan-400/40 transition-all duration-300">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center justify-center p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-cyan-400 group-hover/card:text-[#00e5ff] group-hover/card:border-cyan-400/30 group-hover/card:bg-cyan-500/5 transition-all duration-300">
                            <ind.icon size={24} weight="duotone" />
                          </div>
                          <ArrowUpRight
                            size={18}
                            className="text-text-tertiary opacity-0 -translate-x-1 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-x-0 group-hover/card:translate-y-0 transition-all duration-300"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-lg font-bold text-text-primary tracking-tight">
                              {ind.name}
                            </h3>
                            <span className="font-mono text-[9px] tracking-wider uppercase text-cyan-400/50">
                              {ind.subtitle}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed font-light group-hover/card:text-text-primary transition-colors duration-300 max-w-md">
                            {ind.description}
                          </p>
                        </div>
                      </div>

                      {/* Micro Metadata Panel for Bento Layout */}
                      <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-4 flex-wrap">
                        {ind.metadata.map((meta) => (
                          <div key={meta.label} className="flex flex-col gap-0.5">
                            <span className="font-mono text-[8px] text-text-tertiary uppercase tracking-wider">
                              {meta.label}
                            </span>
                            <span className="font-mono text-[9px] text-cyan-400/80 group-hover/card:text-[#00e5ff] font-medium transition-colors">
                              {meta.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </GlowCard>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

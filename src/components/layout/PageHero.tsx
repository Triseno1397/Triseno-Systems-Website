"use client";

import { type ReactNode } from "react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: PageHeroProps) {
  return (
    <section
      className="relative pt-40 pb-20 md:pt-48 md:pb-28 overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8">
        <ScrollReveal>
          <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
            {eyebrow}
          </span>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary leading-[1.05] tracking-tight mb-6 max-w-4xl">
            {title}
          </h1>
          <div className="h-px w-24 bg-gradient-to-r from-cyan-400 to-transparent" />
        </ScrollReveal>
        {subtitle && (
          <ScrollReveal delay={0.2}>
            <p className="mt-8 max-w-2xl text-lg md:text-xl text-text-secondary leading-relaxed">
              {subtitle}
            </p>
          </ScrollReveal>
        )}
        {children}
      </div>
    </section>
  );
}

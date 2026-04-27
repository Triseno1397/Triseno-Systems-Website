"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface CtaBarProps {
  heading: string;
  buttonLabel: string;
  buttonHref: string;
}

export default function CtaBar({
  heading,
  buttonLabel,
  buttonHref,
}: CtaBarProps) {
  return (
    <section className="relative py-20 md:py-24 border-t border-white/[0.06]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight max-w-2xl">
              {heading}
            </h2>
            <Link
              href={buttonHref}
              className="group inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600 text-navy-950 font-semibold text-base px-8 py-4 shadow-[0_0_30px_rgba(0,180,216,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] transition-shadow duration-300 whitespace-nowrap"
            >
              <span>{buttonLabel}</span>
              <ArrowRight
                size={18}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

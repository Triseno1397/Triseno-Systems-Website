"use client";

import { type ComponentType } from "react";
import { type IconProps } from "@phosphor-icons/react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface CapabilityCardProps {
  id: string;
  label: string;
  title: string;
  body: string[];
  bullets: string[];
  icon: ComponentType<IconProps>;
  delay?: number;
}

export default function CapabilityCard({
  id,
  label,
  title,
  body,
  bullets,
  icon: Icon,
  delay = 0,
}: CapabilityCardProps) {
  return (
    <ScrollReveal delay={delay}>
      <article
        id={id}
        className="group relative rounded-2xl border border-white/[0.06] bg-navy-800/30 backdrop-blur-sm p-8 md:p-10 transition-colors duration-500 hover:border-cyan-400/20 scroll-mt-32"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-10">
          <div className="flex flex-col items-start gap-5">
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-700/60 border border-white/[0.06]">
              <Icon size={28} weight="duotone" className="text-cyan-400" />
            </div>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-tertiary border border-white/[0.08] rounded-full px-3 py-1">
              {label}
            </span>
          </div>

          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight mb-5">
              {title}
            </h3>
            <div className="space-y-4 text-text-secondary leading-relaxed">
              {body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {bullets.length > 0 && (
              <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="relative pl-5 text-sm text-text-secondary/90 leading-relaxed"
                  >
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
}

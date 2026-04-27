"use client";

import { type ComponentType } from "react";
import { type IconProps } from "@phosphor-icons/react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface ProcessStepProps {
  step: number;
  number: string;
  title: string;
  body: string;
  icon: ComponentType<IconProps>;
  delay?: number;
}

export default function ProcessStep({
  step,
  number,
  title,
  body,
  icon: Icon,
  delay = 0,
}: ProcessStepProps) {
  return (
    <ScrollReveal delay={delay}>
      <article
        data-step={step}
        className="group relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-start p-8 md:p-10 rounded-2xl border border-white/[0.06] bg-navy-800/30 backdrop-blur-sm transition-colors duration-500 hover:border-cyan-400/20"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-6">
          <div className="relative w-16 h-16 rounded-2xl border border-cyan-400/30 bg-navy-950/60 flex items-center justify-center">
            <span className="font-mono text-base font-bold text-cyan-400 tracking-wider">
              {number}
            </span>
          </div>
          <Icon
            size={28}
            weight="duotone"
            className="text-cyan-400/70 group-hover:text-cyan-400 transition-colors duration-500"
          />
        </div>

        <div>
          <h3 className="text-xl md:text-2xl font-bold text-text-primary tracking-wider mb-4">
            {title}
          </h3>
          <p className="text-text-secondary leading-relaxed">{body}</p>
        </div>
      </article>
    </ScrollReveal>
  );
}

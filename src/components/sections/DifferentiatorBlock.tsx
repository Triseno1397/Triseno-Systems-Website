"use client";

import { type ComponentType } from "react";
import { type IconProps } from "@phosphor-icons/react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface DifferentiatorBlockProps {
  title: string;
  body: string;
  icon: ComponentType<IconProps>;
  delay?: number;
}

export default function DifferentiatorBlock({
  title,
  body,
  icon: Icon,
  delay = 0,
}: DifferentiatorBlockProps) {
  return (
    <ScrollReveal delay={delay}>
      <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-navy-800/40 backdrop-blur-sm p-8 lg:p-10 hover:border-cyan-400/20 transition-colors duration-500">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-400 to-cyan-600 opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-700/60 border border-white/[0.06] mb-8">
          <Icon size={28} weight="duotone" className="text-cyan-400" />
        </div>
        <h3 className="text-xl lg:text-2xl font-bold text-text-primary mb-4 tracking-tight">
          {title}
        </h3>
        <p className="text-text-secondary leading-relaxed">{body}</p>
      </div>
    </ScrollReveal>
  );
}

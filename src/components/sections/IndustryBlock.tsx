"use client";

import { type ComponentType } from "react";
import { type IconProps } from "@phosphor-icons/react";
import ScrollReveal from "@/components/animations/ScrollReveal";

interface IndustryBlockProps {
  title: string;
  body: string;
  icon: ComponentType<IconProps>;
  delay?: number;
}

export default function IndustryBlock({
  title,
  body,
  icon: Icon,
  delay = 0,
}: IndustryBlockProps) {
  return (
    <ScrollReveal delay={delay}>
      <div className="group relative h-full p-8 rounded-2xl border border-white/[0.06] bg-navy-800/20 hover:border-cyan-400/20 transition-colors duration-500">
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Icon size={28} weight="duotone" className="text-cyan-400 mb-6" />
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
      </div>
    </ScrollReveal>
  );
}

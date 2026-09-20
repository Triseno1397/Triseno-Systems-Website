"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { WarpLink } from "@/components/world/WarpProvider";

/**
 * Ghost button (design-system §4): transparent fill, 1px white stroke,
 * Unbounded 500 uppercase, radius 0. Hover wipes a white fill in with black
 * text — done with a clip-path on a duplicate layer so only clip-path animates.
 */
interface GhostButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export default function GhostButton({ href, children, className = "", ariaLabel }: GhostButtonProps) {
  const inner = (
    <>
      <span>{children}</span>
      <ArrowRight size={16} weight="light" aria-hidden="true" />
    </>
  );
  return (
    <WarpLink href={href} aria-label={ariaLabel} className={`ghost-btn ${className}`}>
      <span className="ghost-btn__layer">{inner}</span>
      <span aria-hidden="true" className="ghost-btn__layer ghost-btn__fill">
        {inner}
      </span>
    </WarpLink>
  );
}

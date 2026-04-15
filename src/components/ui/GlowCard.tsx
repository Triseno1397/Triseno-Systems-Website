"use client";

import { type ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  glowRadius?: number;
}

export default function GlowCard({
  children,
  className = "",
  glowColor = "rgba(0, 180, 216, 0.04)",
  glowRadius = 400,
}: GlowCardProps) {
  return (
    <div
      className={`glow-card group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-500 hover:border-cyan-400/15 hover:bg-white/[0.04] ${className}`}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Mouse-follow radial glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(${glowRadius}px circle at var(--mx, 50%) var(--my, 50%), ${glowColor}, transparent 60%)`,
        }}
      />

      {/* Top accent line on hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-cyan-400 via-cyan-600 to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

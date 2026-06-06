"use client";

import { Lightning, ArrowRight } from "@phosphor-icons/react";

const tasks = [
  { name: "intake", color: "bg-cyan-400" },
  { name: "extract", color: "bg-cyan-400" },
  { name: "classify", color: "bg-cyan-300" },
  { name: "validate", color: "bg-cyan-300" },
  { name: "reconcile", color: "bg-cyan-400" },
  { name: "approve", color: "bg-cyan-300" },
  { name: "post", color: "bg-cyan-400" },
  { name: "audit", color: "bg-cyan-300" },
];

export default function CompressionPanel() {
  return (
    <div className="w-full h-full bg-[#0a0e1a] rounded-[inherit] overflow-hidden flex flex-col">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-[#0d1224]/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Lightning size={14} weight="duotone" className="text-cyan-400" />
          <span className="font-mono text-[11px] tracking-wider text-text-secondary uppercase">
            triseno · workflow.compress
          </span>
        </div>
        <div className="ml-auto font-mono text-[10px] text-text-tertiary uppercase tracking-[0.2em]">
          run #04812
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-8 md:py-10 flex flex-col gap-8 md:gap-10 justify-center min-h-0">
        {/* Before */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
                Before
              </span>
              <span className="text-text-primary text-2xl md:text-3xl font-bold tracking-tight">
                40<span className="text-text-secondary text-lg ml-1">hours</span>
              </span>
            </div>
            <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.2em]">
              manual · sequential
            </span>
          </div>
          <div className="relative h-9 md:h-10 rounded-md bg-white/[0.025] border border-white/[0.05] overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-8 gap-1 p-1">
              {tasks.map((t, i) => (
                <div
                  key={`b-${i}`}
                  className="rounded-[3px] bg-text-tertiary/30 border border-white/[0.04]"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1 px-1">
            {tasks.map((t, i) => (
              <span
                key={`bl-${i}`}
                className="font-mono text-[8px] md:text-[9px] uppercase tracking-[0.1em] text-text-tertiary truncate text-center"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Compression arrow */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-cyan-400" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/40 bg-cyan-400/5">
            <ArrowRight size={12} weight="bold" className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
              compress 200×
            </span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-cyan-400/40 to-cyan-400" />
        </div>

        {/* After */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400">
                After
              </span>
              <span className="text-text-primary text-2xl md:text-3xl font-bold tracking-tight">
                12
                <span className="text-text-secondary text-lg ml-1">minutes</span>
              </span>
            </div>
            <span className="font-mono text-[10px] text-cyan-400/80 uppercase tracking-[0.2em]">
              orchestrated · parallel
            </span>
          </div>
          <div className="relative h-9 md:h-10 rounded-md bg-white/[0.025] border border-white/[0.05] overflow-hidden">
            <div className="absolute inset-y-1 left-1 right-[68%] flex gap-1">
              {tasks.map((t, i) => (
                <div
                  key={`a-${i}`}
                  className={`flex-1 rounded-[3px] ${t.color} shadow-[0_0_12px_rgba(0,229,255,0.4)]`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[10px] text-text-tertiary tracking-[0.18em]">
              t=0
            </span>
            <span className="font-mono text-[10px] text-cyan-400/80 tracking-[0.18em]">
              t=12m
            </span>
            <span className="font-mono text-[10px] text-text-tertiary tracking-[0.18em]">
              t=40h
            </span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-5 py-2 border-t border-white/[0.06] bg-[#0d1224]/80 flex items-center justify-between shrink-0">
        <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.18em]">
          throughput · 312 runs/day
        </span>
        <span className="font-mono text-[10px] text-cyan-400/80 uppercase tracking-[0.18em]">
          sla · 99.94%
        </span>
      </div>
    </div>
  );
}

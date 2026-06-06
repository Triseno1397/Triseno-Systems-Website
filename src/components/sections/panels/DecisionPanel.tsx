"use client";

import { Brain, TrendUp, ShieldCheck, Warning } from "@phosphor-icons/react";

const kpis = [
  {
    label: "Confidence",
    value: "0.946",
    delta: "+0.08",
    spark: [22, 28, 24, 30, 36, 34, 42, 48, 52, 60, 58, 66],
  },
  {
    label: "Decisions / hr",
    value: "1,284",
    delta: "+312",
    spark: [40, 36, 44, 50, 46, 56, 62, 58, 70, 74, 78, 84],
  },
  {
    label: "Anomalies",
    value: "3",
    delta: "−12",
    spark: [70, 64, 58, 52, 50, 44, 38, 30, 26, 22, 18, 14],
  },
];

const auditLog = [
  { t: "14:02:11", action: "approve · invoice #4821", conf: 0.98 },
  { t: "14:02:09", action: "flag · vendor mismatch #c41", conf: 0.71 },
  { t: "14:02:04", action: "approve · expense #9012", conf: 0.94 },
  { t: "14:01:58", action: "route · escalation #e08", conf: 0.62 },
];

function Sparkline({ points }: { points: number[] }) {
  const w = 88;
  const h = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke="rgb(0 180 216)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DecisionPanel() {
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
          <Brain size={14} weight="duotone" className="text-cyan-400" />
          <span className="font-mono text-[11px] tracking-wider text-text-secondary uppercase">
            triseno · decision.layer
          </span>
        </div>
        <div className="ml-auto font-mono text-[10px] text-text-tertiary uppercase tracking-[0.2em]">
          policy · v3.4
        </div>
      </div>

      {/* Body grid */}
      <div className="flex-1 grid grid-cols-12 gap-px bg-white/[0.04] overflow-hidden">
        {/* Left: KPIs + audit */}
        <div className="col-span-7 bg-[#0a0e1a] p-4 md:p-5 flex flex-col gap-4 min-h-0">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3 flex flex-col gap-1.5"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
                  {kpi.label}
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text-primary text-base md:text-lg font-semibold tracking-tight">
                    {kpi.value}
                  </span>
                  <span
                    className={`font-mono text-[9px] tracking-wider ${
                      kpi.delta.startsWith("−")
                        ? "text-emerald-400"
                        : "text-cyan-400"
                    }`}
                  >
                    {kpi.delta}
                  </span>
                </div>
                <div className="mt-1">
                  <Sparkline points={kpi.spark} />
                </div>
              </div>
            ))}
          </div>

          {/* Audit log */}
          <div className="flex-1 rounded-md border border-white/[0.05] bg-[#070a14] p-3 md:p-4 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
                audit log
              </span>
              <span className="font-mono text-[10px] text-cyan-400/70 tracking-[0.2em]">
                live
              </span>
            </div>
            <ul className="space-y-1.5 text-[10px] md:text-[11px]">
              {auditLog.map((row, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[64px_1fr_auto] gap-3 items-center font-mono"
                >
                  <span className="text-text-tertiary">{row.t}</span>
                  <span className="text-text-secondary truncate">
                    {row.action}
                  </span>
                  <span
                    className={`tabular-nums ${
                      row.conf >= 0.9
                        ? "text-emerald-400"
                        : row.conf >= 0.75
                        ? "text-cyan-400"
                        : "text-amber-400"
                    }`}
                  >
                    {row.conf.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Recommendation card */}
        <div className="col-span-5 bg-[#0a0e1a] p-4 md:p-5 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
              recommended action
            </span>
          </div>

          <h4 className="text-text-primary text-base md:text-lg font-semibold leading-snug">
            Approve invoice batch #4821 — 312 line items.
          </h4>

          <p className="text-text-secondary text-xs md:text-sm leading-relaxed">
            All vendors verified. Two minor anomalies flagged at low severity
            (rounding deltas under $0.50). Confidence 0.946 exceeds policy
            threshold 0.90.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 flex items-center gap-2">
              <ShieldCheck size={13} weight="duotone" className="text-emerald-400" />
              <span className="font-mono text-[10px] text-text-secondary">
                policy · pass
              </span>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 flex items-center gap-2">
              <Warning size={13} weight="duotone" className="text-amber-400" />
              <span className="font-mono text-[10px] text-text-secondary">
                anomalies · 2
              </span>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 flex items-center gap-2 col-span-2">
              <TrendUp size={13} weight="duotone" className="text-cyan-400" />
              <span className="font-mono text-[10px] text-text-secondary">
                expected impact · +$84,210 throughput
              </span>
            </div>
          </div>

          <div className="mt-auto flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 rounded-md bg-cyan-400 hover:bg-cyan-300 text-[#03101a] font-semibold text-xs md:text-sm py-2.5 transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-white/10 hover:border-cyan-400/40 text-text-primary font-medium text-xs md:text-sm py-2.5 transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-5 py-2 border-t border-white/[0.06] bg-[#0d1224]/80 flex items-center justify-between shrink-0">
        <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.18em]">
          decisions · 12,481 today
        </span>
        <span className="font-mono text-[10px] text-cyan-400/80 uppercase tracking-[0.18em]">
          override rate · 0.4%
        </span>
      </div>
    </div>
  );
}

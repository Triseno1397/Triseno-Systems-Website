"use client";

import { CirclesThreePlus, CheckCircle, Spinner } from "@phosphor-icons/react";

const agents = [
  {
    id: "agent-research-01",
    role: "Research",
    status: "active" as const,
    progress: 64,
    log: [
      "GET /sources/q3-financials.pdf",
      "embed.create(model=ada-002, n=42)",
      "vector.upsert(ns=research, id=doc_a91)",
    ],
  },
  {
    id: "agent-extract-02",
    role: "Extraction",
    status: "active" as const,
    progress: 81,
    log: [
      "parse.table(rows=128, cols=12)",
      "schema.match(target=line_items)",
      "extract.commit(rows=128, ok=true)",
    ],
  },
  {
    id: "agent-validate-03",
    role: "Validation",
    status: "complete" as const,
    progress: 100,
    log: [
      "rule.apply(ruleset=gaap-v3)",
      "anomalies.flag(found=2, severity=low)",
      "validate.pass(confidence=0.984)",
    ],
  },
  {
    id: "agent-synthesize-04",
    role: "Synthesis",
    status: "active" as const,
    progress: 38,
    log: [
      "join(research, extracted, validated)",
      "summarize(tokens_in=8412)",
      "draft.write(section=executive)",
    ],
  },
];

export default function OrchestrationPanel() {
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
          <CirclesThreePlus
            size={14}
            weight="duotone"
            className="text-cyan-400"
          />
          <span className="font-mono text-[11px] tracking-wider text-text-secondary uppercase">
            triseno · orchestrator
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.2em]">
            live
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-px bg-white/[0.04] overflow-hidden">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-[#0a0e1a] p-4 md:p-5 flex flex-col gap-3 min-h-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                    agent.status === "complete"
                      ? "bg-emerald-400"
                      : "bg-cyan-400 animate-pulse"
                  }`}
                />
                <span className="font-mono text-[10px] md:text-[11px] text-text-secondary truncate">
                  {agent.id}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {agent.status === "complete" ? (
                  <CheckCircle
                    size={11}
                    weight="fill"
                    className="text-emerald-400"
                  />
                ) : (
                  <Spinner
                    size={11}
                    weight="bold"
                    className="text-cyan-400 animate-spin"
                  />
                )}
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                    agent.status === "complete"
                      ? "text-emerald-400"
                      : "text-cyan-400"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-text-primary text-xs md:text-sm font-medium">
                {agent.role}
              </span>
              <span className="font-mono text-[10px] md:text-[11px] text-text-tertiary">
                {agent.progress}%
              </span>
            </div>

            <div className="h-[3px] w-full rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  agent.status === "complete"
                    ? "bg-emerald-400/80"
                    : "bg-gradient-to-r from-cyan-400 to-cyan-300"
                }`}
                style={{ width: `${agent.progress}%` }}
              />
            </div>

            <div className="mt-1 flex-1 rounded-md bg-[#070a14] border border-white/[0.04] p-2 md:p-2.5 overflow-hidden">
              <ul className="font-mono text-[9px] md:text-[10px] leading-[1.55] text-text-tertiary space-y-1">
                {agent.log.map((line, i) => (
                  <li key={i} className="truncate">
                    <span className="text-cyan-400/60">›</span> {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="px-5 py-2 border-t border-white/[0.06] bg-[#0d1224]/80 flex items-center justify-between shrink-0">
        <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.18em]">
          orch.dispatch · 4 agents · 1 task
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">
          uptime 99.97%
        </span>
      </div>
    </div>
  );
}

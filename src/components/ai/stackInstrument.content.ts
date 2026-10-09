/* ─────────────────────────────────────────────────────────────────────────
   07 / STACK — the words of the stack bench (StackFilm + StackInspector).

   Kept out of content.ts on purpose (parallel builders): the lead may fold
   these into content.ts later. The four layers' copy was carried over from
   StackFilm verbatim; the lede is new (the plan's). The chapter number is
   the plan's "07 / Stack"; swap for CHAPTERS once it lands in content.ts.
   ───────────────────────────────────────────────────────────────────────── */

export const STACK_CH = "07";

export type StackLayerCopy = {
  n: string;
  name: string;
  sub: string;
  body: string;
  spec: [string, string][];
};

/** bottom to top: Data, Models, Agents, Interface (index = layer) */
export const STACK_LAYERS: readonly StackLayerCopy[] = [
  {
    n: "01",
    name: "Data",
    sub: "Your systems & sources",
    body: "CRM, ERP, inboxes, warehouses and the files nobody opens. Connected read-first and indexed where they live, so nothing leaves your cloud.",
    spec: [
      ["Sources", "14 connected"],
      ["Access", "Read-first"],
      ["Residency", "Your tenant"],
    ],
  },
  {
    n: "02",
    name: "Models",
    sub: "Reasoning & retrieval",
    body: "The right model for each job, routed by cost and accuracy, grounded in your own records, and scored against an evaluation set before anything ships.",
    spec: [
      ["Routing", "Cost + accuracy"],
      ["Grounding", "Your records"],
      ["Release gate", "412 eval cases"],
    ],
  },
  {
    n: "03",
    name: "Agents",
    sub: "Orchestrator + workers",
    body: "One orchestrator plans the work; specialised workers carry it out. Every step is logged and every action sits inside a permission you set.",
    spec: [
      ["Workers", "6 specialised"],
      ["Audit trail", "Every step"],
      ["Limits", "Set by you"],
    ],
  },
  {
    n: "04",
    name: "Interface",
    sub: "Your team's tools",
    body: "Results land where people already work: chat, inbox, CRM, one dashboard. No new app to learn, and a person approves anything that matters.",
    spec: [
      ["Surfaces", "Chat · inbox · CRM"],
      ["Approval", "Human in the loop"],
      ["Latency", "Under 2 s"],
    ],
  },
];

export const STACK_COPY = {
  eyebrow: `${STACK_CH} / Stack`,
  title: ["Four layers.", "One system."],
  lede: "Every engagement builds the same four layers. Inspect one, or send a request through all four.",
  headline: "Built bottom-up · used top-down",
  hud: "Core online · 4 layers",
  controls: {
    send: "Send request",
    trace: "Trace",
    speed: ["1x", "0.5x"] as const,
    inspect: "Inspect",
    group: "Stack bench",
  },
  status: {
    idle: "IDLE . example trace",
    running: "RUNNING",
    done: "DONE",
    blocked: "BLOCKED . no fallback",
    breached: (ms: string) => `p95 breached by ${ms} ms`,
  },
  inspector: {
    region: "Layer inspector",
    close: "Close",
    tabs: ["CODE", "TRACE", "LOGS"] as const,
    copy: "Copy",
    copied: "copied",
    live: "live",
    flag: "Under 2 s",
    flagText: (ms: string) => `${ms} ms budget`,
    logsPlaceholder: "filter logs",
    hint: "drag the axis to zoom . W A S D",
    hintTouch: "tap the axis to zoom the last range",
    total: "total",
    replay: "Replay",
    axisLabel: "Time axis. Drag to zoom a range.",
    waterfallLabel: "Span waterfall",
  },
  foot: "An example request, timings illustrative. The config is real.",
  hint: {
    fine: "Hover a layer to inspect it . click to pin",
    touch: "Tap a layer to inspect it . tap again to open",
  },
  sr: {
    hotspot: (name: string) => `Open the ${name} layer in the inspector`,
    box: (name: string, w: number, h: number) => `${name} layer, ${w} by ${h} frame pixels`,
  },
} as const;

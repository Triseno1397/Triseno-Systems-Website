import type { TraceSpan } from "./session";

/* ─────────────────────────────────────────────────────────────────────────
   STACK TRACE — the data behind the stack bench. Pure: no DOM, no React.

   One request (the letter's PO-8841, or a catalog query, or a lead) is sent
   up the four layers of the film: Data, Models, Agents, Interface. It is
   timed as a span waterfall, and three declarations in the layers' config
   are live: flip them and generate() returns a different trace, the same
   way a real config would. Everything the film, the waterfall, the logs and
   the session ticket print is derived from the spans returned here, so the
   instruments can never disagree.

   Timings are illustrative; the config shapes are real.
   ───────────────────────────────────────────────────────────────────────── */

/* ── layers ── */

export type LayerIndex = 0 | 1 | 2 | 3;
export const LAYER_KEYS = ["data", "models", "agents", "interface"] as const;
export const LAYER_NAMES = ["Data", "Models", "Agents", "Interface"] as const;

/** y of each layer's slab in the film frame (0 top .. 1 bottom), bottom-up */
export const LAYER_Y: readonly number[] = [0.81, 0.59, 0.39, 0.22];
/** the stack's centre line in the source frame, and where the labels hang */
export const CX = 0.49;
export const LABEL_X = 0.79;
export const SRC_AR = 16 / 9;
/** half-width of a layer's slab around CX, and its height, as frame fractions */
export const QUAD_HW = 0.23;
export const QUAD_H = 0.14;
/** the source frame the film was rendered at: the inspect rulers print these */
export const FRAME_W = 1920;
export const FRAME_H = 1080;

/** a layer's slab in source-frame pixels (constant: the crop never changes the frame) */
export function frameQuad(layer: number): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.round((CX - QUAD_HW) * FRAME_W),
    y: Math.round((LAYER_Y[layer] - QUAD_H / 2) * FRAME_H),
    w: Math.round(QUAD_HW * 2 * FRAME_W),
    h: Math.round(QUAD_H * FRAME_H),
  };
}

/** what each layer takes in and hands up: the chip the inspect box prints */
export const CONTRACTS: readonly string[] = [
  "in: PO-8841.pdf -> out: 14 fields",
  "in: 14 fields -> out: 3 decisions . tier mid",
  "in: 3 decisions -> out: 2 writes . 1 approval",
  "in: 1 approval -> out: inbox . CRM",
];

/* ── presets ── */

export type PresetId = "intake" | "catalog" | "lead";

export type Span = TraceSpan & {
  layer: LayerIndex;
  /** a one-line note for the logs, printed when the span ends */
  note?: string;
};

export type Preset = {
  id: PresetId;
  /** the selector's label and the session's preset name */
  label: string;
  /** what the request is, for the logs */
  subject: { doc: string; who: string; figure: string };
  spans: readonly Span[];
};

/* the three traces, authored bottom-up: the packet climbs Data -> Models ->
   Agents -> Interface, and every layer's first span starts after the layer
   below has finished. The intake trace totals 1,310 ms by construction. */
const INTAKE: readonly Span[] = [
  { id: "d0", name: "edge.receive", layer: 0, start: 0, dur: 28 },
  { id: "d1", name: "data.parse", layer: 0, start: 28, dur: 118 },
  { id: "d2", name: "data.vector_search", layer: 0, start: 146, dur: 96, async: true },
  { id: "d3", name: "data.erp_read", layer: 0, start: 150, dur: 132, async: true },
  { id: "m0", name: "models.route", layer: 1, start: 284, dur: 34 },
  { id: "m1", name: "models.call", layer: 1, start: 318, dur: 620 },
  { id: "m2", name: "models.ground", layer: 1, start: 318, dur: 74, parent: "m1" },
  { id: "a0", name: "agents.plan", layer: 2, start: 940, dur: 48 },
  { id: "a1", name: "agents.extract", layer: 2, start: 988, dur: 112 },
  { id: "a2", name: "agents.verify", layer: 2, start: 1100, dur: 96 },
  { id: "a3", name: "guardrails.check", layer: 2, start: 1196, dur: 28 },
  { id: "i0", name: "interface.deliver", layer: 3, start: 1226, dur: 84 },
];

const CATALOG: readonly Span[] = [
  { id: "d0", name: "edge.receive", layer: 0, start: 0, dur: 22 },
  { id: "d1", name: "data.catalog_read", layer: 0, start: 22, dur: 88 },
  { id: "d2", name: "data.vector_search", layer: 0, start: 110, dur: 118, async: true },
  { id: "d3", name: "data.spec_lookup", layer: 0, start: 114, dur: 96, async: true },
  { id: "m0", name: "models.route", layer: 1, start: 230, dur: 30 },
  { id: "m1", name: "models.call", layer: 1, start: 260, dur: 336 },
  { id: "m2", name: "models.ground", layer: 1, start: 260, dur: 64, parent: "m1" },
  { id: "a0", name: "agents.plan", layer: 2, start: 598, dur: 40 },
  { id: "a1", name: "agents.compose", layer: 2, start: 638, dur: 118 },
  { id: "a2", name: "agents.verify", layer: 2, start: 756, dur: 72 },
  { id: "a3", name: "guardrails.check", layer: 2, start: 828, dur: 24 },
  { id: "i0", name: "interface.deliver", layer: 3, start: 854, dur: 86 },
];

const LEAD: readonly Span[] = [
  { id: "d0", name: "edge.receive", layer: 0, start: 0, dur: 24 },
  { id: "d1", name: "data.crm_read", layer: 0, start: 24, dur: 102 },
  { id: "d2", name: "data.enrich", layer: 0, start: 126, dur: 142, async: true },
  { id: "d3", name: "data.vector_search", layer: 0, start: 130, dur: 110, async: true },
  { id: "m0", name: "models.route", layer: 1, start: 270, dur: 36 },
  { id: "m1", name: "models.call", layer: 1, start: 306, dur: 412 },
  { id: "m2", name: "models.ground", layer: 1, start: 306, dur: 70, parent: "m1" },
  { id: "a0", name: "agents.plan", layer: 2, start: 720, dur: 44 },
  { id: "a1", name: "agents.score", layer: 2, start: 764, dur: 120 },
  { id: "a2", name: "agents.verify", layer: 2, start: 884, dur: 104 },
  { id: "a3", name: "guardrails.check", layer: 2, start: 988, dur: 30 },
  { id: "i0", name: "interface.deliver", layer: 3, start: 1020, dur: 100 },
];

export const PRESETS: readonly Preset[] = [
  { id: "intake", label: "intake", subject: { doc: "PO-8841.pdf", who: "Halvorsen Marine Supply", figure: "$18,420.00" }, spans: INTAKE },
  { id: "catalog", label: "catalog query", subject: { doc: "query#2210", who: "Nordhavn Fittings", figure: "412 SKUs" }, spans: CATALOG },
  { id: "lead", label: "lead qualification", subject: { doc: "lead#0917", who: "Brekke & Lund AS", figure: "score 0.78" }, spans: LEAD },
];

export function presetById(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/* ── live config ── */

export type Config = {
  /** Agents: fallback: human.review (on) / none (off) */
  fallback: boolean;
  /** Models: cache: warm (on) / cold (off) */
  cache: boolean;
  /** Interface: stream: true / false */
  stream: boolean;
};

export const DEFAULT_CONFIG: Config = Object.freeze({ fallback: true, cache: true, stream: true });

/** the seconds of run per millisecond of trace: the film plays at 1.5x real time */
export const SCALE = 1.5 / 1000;
/** the budget flag's default and its slider range, ms */
export const BUDGET_DEFAULT = 2000;
export const BUDGET_MIN = 400;
export const BUDGET_MAX = 3000;
export const BUDGET_STEP = 50;
/** cache off: the model call runs cold, 2.4x */
export const COLD_FACTOR = 2.4;
/** stream off: delivery waits for the whole response */
export const NO_STREAM_MS = 260;

export type TraceResult = {
  preset: PresetId;
  label: string;
  subject: Preset["subject"];
  config: Config;
  spans: readonly Span[];
  totalMs: number;
  /** "blocked" when the fallback is off and verify fails; "done" otherwise */
  state: "done" | "blocked";
  /** ms at which the packet enters each layer (the layer's first span start); -1 = never reached */
  layerFirst: readonly number[];
  /** ms at which each layer is finished with the request (its last span end); -1 = never reached */
  layerLast: readonly number[];
};

/**
 * Deterministic: the same preset and config always produce the same trace.
 *   cache off    models.call x COLD_FACTOR; every later span shifts by the difference
 *   stream off   interface.deliver + NO_STREAM_MS
 *   fallback off agents.verify fails, guardrails.check becomes guardrails.block
 *                (0 ms), interface.deliver is dropped, state "blocked"
 */
export function generate(presetId: PresetId, config: Config = DEFAULT_CONFIG): TraceResult {
  const preset = presetById(presetId);
  let spans: Span[] = preset.spans.map((s) => ({ ...s }));

  if (!config.cache) {
    const call = spans.find((s) => s.name === "models.call");
    if (call) {
      const oldEnd = call.start + call.dur;
      const dur = Math.round(call.dur * COLD_FACTOR);
      const delta = dur - call.dur;
      call.dur = dur;
      for (const s of spans) if (s !== call && s.start >= oldEnd) s.start += delta;
    }
  }
  if (!config.stream) {
    const d = spans.find((s) => s.name === "interface.deliver");
    if (d) d.dur += NO_STREAM_MS;
  }
  let state: TraceResult["state"] = "done";
  if (!config.fallback) {
    const verify = spans.find((s) => s.name === "agents.verify");
    if (verify) verify.failed = true;
    const guard = spans.find((s) => s.name === "guardrails.check");
    if (guard) {
      guard.name = "guardrails.block";
      guard.dur = 0;
      guard.failed = true;
      if (verify) guard.start = verify.start + verify.dur;
    }
    spans = spans.filter((s) => s.name !== "interface.deliver");
    state = "blocked";
  }

  let totalMs = 0;
  const layerFirst = [-1, -1, -1, -1];
  const layerLast = [-1, -1, -1, -1];
  for (const s of spans) {
    const end = s.start + s.dur;
    if (end > totalMs) totalMs = end;
    const k = s.layer;
    if (layerFirst[k] < 0 || s.start < layerFirst[k]) layerFirst[k] = s.start;
    if (end > layerLast[k]) layerLast[k] = end;
  }
  return { preset: preset.id, label: preset.label, subject: preset.subject, config, spans, totalMs, state, layerFirst, layerLast };
}

/** depth of a span in the waterfall (0 = root) */
export function spanDepth(span: Span, spans: readonly Span[]): number {
  let d = 0;
  let p = span.parent;
  while (p) {
    d++;
    p = spans.find((s) => s.id === p)?.parent;
    if (d > 6) break;
  }
  return d;
}

/* ── formatting ── */

/** "1,310" */
export function fmtMs(ms: number): string {
  return Math.round(ms).toLocaleString("en-US");
}

/** "1,310 ms" */
export function fmtMsUnit(ms: number): string {
  return `${fmtMs(ms)} ms`;
}

/** the console clock of the example request: 09:14:08.000 + t */
export function stamp(t: number): string {
  const base = 9 * 3600 * 1000 + 14 * 60 * 1000 + 8 * 1000;
  const ms = base + Math.max(0, Math.round(t));
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor(s / 60) % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${String(ms % 1000).padStart(3, "0")}`;
}

/* ── logs ── */

export type LogLine = {
  /** ms into the request */
  t: number;
  layer: LayerIndex;
  src: string;
  msg: string;
};

/** Eight-ish lines per layer, each stamped from the span it describes. */
export function logsFor(trace: TraceResult): LogLine[] {
  const { subject, config } = trace;
  const out: LogLine[] = [];
  const at = (name: string): Span | undefined => trace.spans.find((s) => s.name === name);
  const push = (span: Span | undefined, when: "start" | "end", msg: string) => {
    if (!span) return;
    out.push({ t: when === "start" ? span.start : span.start + span.dur, layer: span.layer, src: span.name, msg });
  };

  // Data
  push(at("edge.receive"), "start", `accept ${subject.doc} . 212 KB . checksum ok`);
  push(at("edge.receive"), "end", `tenant=eu-north . residency ok . handoff`);
  const parse = at("data.parse") ?? at("data.catalog_read") ?? at("data.crm_read");
  push(parse, "start", parse?.name === "data.parse" ? "pdf -> text . 3 pages . ocr skipped" : `read ${subject.who} . 1 record`);
  push(parse, "end", parse?.name === "data.parse" ? "14 fields . mean confidence 0.91" : "14 fields normalised . schema v3");
  push(at("data.vector_search"), "start", `vector_search "${subject.who}" . k=8`);
  push(at("data.vector_search"), "end", "8 hits . top score 0.87 . index 15m old");
  const side = at("data.erp_read") ?? at("data.spec_lookup") ?? at("data.enrich");
  push(side, "start", `${side?.name ?? "data.read"} . read-first . no write`);
  push(side, "end", `row found . ${subject.figure}`);

  // Models
  push(at("models.route"), "start", "route 3 candidates . small rejected (accuracy 0.71)");
  push(at("models.route"), "end", "policy cost_accuracy -> tier mid . est 1.1 ms/token");
  push(at("models.call"), "start", `call mid . ctx 3,214 tokens . cache=${config.cache ? "warm" : "cold"}`);
  push(at("models.call"), "start", config.cache ? "prefix cache hit 88% . 2,829 tokens reused" : "prefix cache miss . full prefill");
  push(at("models.ground"), "start", "ground on tenant records . 6 docs");
  push(at("models.ground"), "end", "grounded . 0 unsupported claims");
  push(at("models.call"), "end", `3 decisions . 612 tokens out${config.cache ? "" : " . cold start +" + fmtMs(Math.round((at("models.call")?.dur ?? 0) * (1 - 1 / COLD_FACTOR))) + " ms"}`);
  push(at("models.call"), "end", "eval gate 0.92 . passed on 412 cases");

  // Agents
  push(at("agents.plan"), "end", "plan 3 steps . tools erp.read, ledger.read, mail.send");
  const work = at("agents.extract") ?? at("agents.compose") ?? at("agents.score");
  push(work, "start", `${work?.name === "agents.score" ? "score" : work?.name === "agents.compose" ? "compose" : "extract"} . worker 02 of 6`);
  push(work, "end", "2 writes staged . vendor, terms");
  push(at("agents.verify"), "start", "verify terms . net 30 vs 14 May");
  push(
    at("agents.verify"),
    "end",
    config.fallback ? "confidence=0.61 threshold=0.80 -> route human.review" : "confidence=0.61 threshold=0.80 -> no fallback",
  );
  const guard = at("guardrails.check") ?? at("guardrails.block");
  push(guard, "end", config.fallback ? "policy 4.2 . 7 actions checked . 0 denied" : "policy 4.2 . BLOCKED . no fallback configured");
  push(guard, "end", config.fallback ? "approval requested . J. Okafor" : "request parked . audit trail written");

  // Interface
  const deliver = at("interface.deliver");
  push(deliver, "start", `deliver . stream=${config.stream ? "true" : "false"} . surfaces inbox, crm`);
  push(deliver, "start", "format markdown . 1 approval attached");
  push(deliver, "start", config.stream ? "first token at +41 ms" : `buffered . first byte at +${NO_STREAM_MS} ms`);
  push(deliver, "end", "inbox . delivered");
  push(deliver, "end", "crm . note written . 1 approval pending");
  push(deliver, "end", "notify on: done . 1 recipient");
  push(deliver, "end", `done . ${fmtMs(trace.totalMs)} ms . ${trace.spans.length} spans`);

  out.sort((a, b) => a.t - b.t || a.layer - b.layer);
  return out;
}

/* ── config (the CODE tab) ── */

export type Token = { c: "key" | "val" | "num" | "str" | "punct" | "comment" | "dash"; s: string };
export type LiveKey = keyof Config;
export type CodeLine = {
  tokens: Token[];
  /** a live declaration: the value is a control */
  live?: LiveKey;
  /** the value when on / off, for the live lines */
  on?: string;
  off?: string;
};

const RAW: readonly (readonly string[])[] = [
  [
    "layer: data",
    "sources:",
    "  - crm            # read-only",
    "  - erp",
    "  - inbox",
    "  - warehouse",
    "connectors: 14",
    "access: read_first",
    "residency: tenant",
    "index:",
    "  kind: vector",
    "  dims: 1536",
    "  refresh: 15m",
  ],
  [
    "layer: models",
    "router:",
    "  policy: cost_accuracy",
    "  tiers: [small, mid, large]",
    "  default: mid",
    "cache: warm",
    "grounding: tenant_records",
    "eval:",
    "  cases: 412",
    "  gate: 0.92",
    "timeout_ms: 2000",
    "retries: 1",
  ],
  [
    "layer: agents",
    "orchestrator: 1",
    "workers: 6",
    "steps_max: 6",
    "memory_window: 8192",
    "tools:",
    "  - erp.read",
    "  - vendor.lookup",
    "  - ledger.read",
    "  - mail.send",
    "policy: 4.2",
    "threshold: 0.80",
    "fallback: human.review",
    "audit: every_step",
  ],
  [
    "layer: interface",
    "surfaces:",
    "  - chat",
    "  - inbox",
    "  - crm",
    "stream: true",
    "approval: human_in_loop",
    "latency_budget_ms: 2000",
    "format: markdown",
    "notify:",
    "  on: [done, blocked]",
  ],
];

const LIVE: Record<string, { key: LiveKey; on: string; off: string }> = {
  "fallback: human.review": { key: "fallback", on: "human.review", off: "none" },
  "cache: warm": { key: "cache", on: "warm", off: "cold" },
  "stream: true": { key: "stream", on: "true", off: "false" },
};

const NUM = /^-?\d+(?:\.\d+)?(?:m|ms|s)?$/;

function tokenizeValue(v: string, out: Token[]): void {
  if (!v) return;
  if (v.startsWith("[") && v.endsWith("]")) {
    out.push({ c: "punct", s: "[" });
    v.slice(1, -1)
      .split(",")
      .map((x) => x.trim())
      .forEach((x, i, arr) => {
        out.push({ c: NUM.test(x) ? "num" : "val", s: x });
        if (i < arr.length - 1) out.push({ c: "punct", s: ", " });
      });
    out.push({ c: "punct", s: "]" });
    return;
  }
  out.push({ c: NUM.test(v) ? "num" : "val", s: v });
}

/** one YAML-shaped line -> coloured tokens; the three live lines are marked */
export function tokenize(line: string): CodeLine {
  const tokens: Token[] = [];
  let rest = line;
  let comment = "";
  const hash = rest.indexOf("#");
  if (hash >= 0) {
    comment = rest.slice(hash);
    rest = rest.slice(0, hash).replace(/\s+$/, "");
  }
  const m = /^(\s*)(- )?([\w.]+)?(:)?(\s*)(.*)$/.exec(rest);
  if (m) {
    const [, indent, dash, key, colon, gap, value] = m;
    if (indent) tokens.push({ c: "punct", s: indent });
    if (dash) tokens.push({ c: "dash", s: dash });
    if (key && colon) {
      tokens.push({ c: "key", s: key });
      tokens.push({ c: "punct", s: colon + gap });
      tokenizeValue(value, tokens);
    } else {
      // a list item: "- crm"
      const v = (key ?? "") + (colon ?? "") + gap + value;
      tokenizeValue(v.trim(), tokens);
    }
  } else {
    tokens.push({ c: "val", s: rest });
  }
  if (comment) tokens.push({ c: "comment", s: (hash > 0 && line[hash - 1] === " " ? " " : "") + comment });
  const live = LIVE[line.trim()];
  return live ? { tokens, live: live.key, on: live.on, off: live.off } : { tokens };
}

/** the four layers' config, tokenised once at module load */
export const CODE: readonly (readonly CodeLine[])[] = RAW.map((lines) => lines.map(tokenize));

/** the config as plain text, with the live values substituted (for Copy) */
export function codeText(layer: number, config: Config): string {
  return RAW[layer]
    .map((line) => {
      const live = LIVE[line.trim()];
      if (!live) return line;
      const indent = line.match(/^\s*/)?.[0] ?? "";
      return `${indent}${live.key}: ${config[live.key] ? live.on : live.off}`;
    })
    .join("\n");
}

/** which layer owns each live declaration */
export const LIVE_LAYER: Record<LiveKey, LayerIndex> = { fallback: 2, cache: 1, stream: 3 };

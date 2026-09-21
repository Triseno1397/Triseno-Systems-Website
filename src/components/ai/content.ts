// Copy for /ai-infrastructure. Source: the owner's approved copy doc
// (triseno-website-copy.md), trimmed hard so no viewport carries a wall of
// text — one idea per frame. Voice: precise systems engineer, numbers over
// adjectives. The word "chatbot" appears once, in contrast only.
//
// D3 (divisions stay separate): website design and development is the Web
// Design Division's offer and is NOT listed here. The only route to it from
// this page is the cross-division link in the gate.

export const HERO = {
  label: "Consulting / Architecture / Implementation",
  headline: ["We Build the", "Operational", "Intelligence", "Layer"],
  sub: "Multi-agent orchestration, workflow compression and decision-layer automation for organizations that need systems, not features.",
};

export type DiagramKind = "orchestration" | "catalog" | "compression" | "revenue" | "broadcast" | "retainer";

export interface Capability {
  id: DiagramKind;
  tag: string;
  title: string;
  body: string;
}

export const CAPABILITIES_INTRO = {
  title: "Infrastructure That Thinks",
  body: "We don't build chatbots. We build the layer underneath them.",
};

/** One per frame. Bodies are capped at ~22 words on purpose. */
export const CAPABILITIES: Capability[] = [
  {
    id: "orchestration",
    tag: "Core capability",
    title: "Multi-Agent Orchestration",
    body: "Research, analysis, generation and validation run as separate agents in parallel under one orchestrator. Not one bot. An operations team.",
  },
  {
    id: "compression",
    tag: "Core capability",
    title: "Workflow Compression Engines",
    body: "We find the manual processes buried in your operations and rebuild them as agent pipelines. Compressed, automated, monitored.",
  },
  {
    id: "catalog",
    tag: "Specialized system",
    title: "Product & Catalog Intelligence",
    body: "Sprawling catalogs become systems that understand specifications, compatibility and context, so your team stops answering the same question.",
  },
  {
    id: "revenue",
    tag: "Outcome-tied",
    title: "Revenue Operations Intelligence",
    body: "Lead qualification, pipeline acceleration and conversion work driven by AI that knows your sales process. Priced against numbers you already track.",
  },
  {
    id: "broadcast",
    tag: "Industry specialty",
    title: "Broadcast & Production AI",
    body: "Production automation built by someone who has lived in the control room. Metadata, routing, asset orchestration, real-time decisions.",
  },
  {
    id: "retainer",
    tag: "Ongoing engagement",
    title: "AI Infrastructure Retainers",
    body: "Ongoing architecture, optimization and expansion for organizations that need a dedicated infrastructure partner, not a support queue.",
  },
];

export const COMPRESSION = {
  title: "Not Automation. Compression.",
  body: "A twelve-step manual process, redesigned as a two-layer agent system.",
  note: "An example workflow, drawn to show the method.",
  steps: [
    "Intake email",
    "Manual data entry",
    "Spreadsheet check",
    "Manager approval",
    "Re-key to ERP",
    "Vendor lookup",
    "Compliance review",
    "Second approval",
    "Reconcile totals",
    "Export report",
    "Email handoff",
    "Archive",
  ],
  /** which of the five system nodes each manual step collapses into (0 = orchestrator) */
  collapseTo: [0, 1, 2, 0, 1, 3, 2, 0, 3, 4, 0, 4],
  agents: ["Orchestrator", "Extract", "Verify", "Reconcile", "Report"],
};

export interface ProcessStep {
  name: string;
  summary: string;
  happens: string[];
  deliverable: string;
}

export const PROCESS_INTRO = {
  title: "From Architecture to Deployment",
  body: "Five steps, every engagement. Select one, or let the orbit run.",
};

export const PROCESS: ProcessStep[] = [
  {
    name: "Diagnose",
    summary: "We map your workflows and quantify the cost of the problems worth solving.",
    happens: [
      "Deep-dive into current workflows, tools and data systems",
      "Highest-friction bottlenecks and manual processes identified",
      "Cost of each problem quantified in time, money and throughput",
      "Opportunity map ranked by impact and feasibility",
    ],
    deliverable: "A diagnostic report with specific compression targets, not generic recommendations.",
  },
  {
    name: "Architect",
    summary: "Blueprints specifying agent roles, data flows, fallback logic and success metrics before any code.",
    happens: [
      "Every component, data flow and decision point mapped",
      "Agent roles defined with input and output specifications",
      "Integration planned against your existing infrastructure",
      "Fallback and failure handling designed in from the start",
    ],
    deliverable: "A technical blueprint you approve. Nothing is built until the architecture is locked.",
  },
  {
    name: "Build",
    summary: "Modular construction with continuous testing. No monoliths, no black boxes.",
    happens: [
      "Iterative development in defined sprints with visible progress",
      "Each module built and tested before integration",
      "Continuous visibility: you see the system come together",
      "Quality assurance at every stage, not just the end",
    ],
    deliverable: "Tested modules, integrated sprint by sprint against the locked blueprint.",
  },
  {
    name: "Deploy",
    summary: "Production rollout with monitoring and benchmarking against the metrics set in Architect.",
    happens: [
      "Controlled production rollout, monitored from day one",
      "Benchmarking against the success metrics set in Architect",
      "Iterative tuning on real operational data",
      "Knowledge transfer so the system is not a black box",
    ],
    deliverable: "A production system measured against agreed metrics, with your team trained to run it.",
  },
  {
    name: "Compound",
    summary: "Each new module plugs into the layer already running, so every build costs less than the last.",
    happens: [
      "Ongoing monitoring, optimization and performance tuning",
      "New compression opportunities surfaced from live data",
      "Architecture expanded as operations change",
      "Priority access for new builds and integrations",
    ],
    deliverable: "Monthly performance reporting, plus a standing roadmap for the next expansion.",
  },
];

export interface Industry {
  title: string;
  full: string;
  body: string;
  log: Array<[agent: string, message: string]>;
}

export const INDUSTRIES_INTRO = {
  title: "Built for Complex Operations",
};

export const INDUSTRIES: Industry[] = [
  {
    title: "Broadcast & Production",
    full: "Broadcast & Production",
    body: "One of the most complex operational environments in any industry, and one of the least touched by AI. Real-time decisioning, multi-source routing and metadata management, from rundown to post.",
    log: [
      ["intake", "rundown received, segments indexed"],
      ["router", "sources mapped to program bus"],
      ["metadata", "clips tagged: speaker, topic, rights"],
      ["qc", "loudness and caption check passed"],
      ["handoff", "post package assembled, editor notified"],
    ],
  },
  {
    title: "E-Commerce & Catalog",
    full: "E-Commerce & Large-Catalog Companies",
    body: "Thousands of SKUs with technical specifications that overwhelm customers and internal teams alike. If your catalog is big enough to be a problem, it is big enough to be an advantage.",
    log: [
      ["catalog", "spec sheets parsed into attributes"],
      ["graph", "compatibility rules linked across SKUs"],
      ["advisor", "buyer requirements matched to configuration"],
      ["quote", "line items assembled, constraints verified"],
      ["learn", "unanswered question logged for catalog team"],
    ],
  },
  {
    title: "Enterprise Operations",
    full: "Enterprise Operations & Services",
    body: "Logistics, supply chain, manufacturing and large-scale service delivery: environments where throughput and decision accuracy move revenue directly.",
    log: [
      ["intake", "purchase order read, fields extracted"],
      ["verify", "totals reconciled against ledger"],
      ["route", "exception flagged, approver assigned"],
      ["fallback", "low confidence, human review requested"],
      ["report", "cycle closed, audit trail written"],
    ],
  },
  {
    title: "Technology & SaaS",
    full: "Technology & SaaS Companies",
    body: "Intelligence pushed deeper into the product and the operations around it: internal tooling, onboarding compression, support architecture.",
    log: [
      ["signup", "account context gathered from intake form"],
      ["onboard", "setup steps sequenced for this use case"],
      ["support", "ticket classified, known fix attached"],
      ["escalate", "novel issue routed to engineer on call"],
      ["tooling", "internal runbook updated from resolution"],
    ],
  },
];

/** Odometer counts. `parts` are rolled digits (numbers) or static glyphs (strings). */
export interface Stat {
  parts: Array<number | string>;
  text: string;
  label: string;
}

/**
 * The odometer demonstrates the component by counting what the offer and the
 * drawings on this page are made of — never results. Every speed-up figure has
 * been cut from the page on the owner's instruction.
 */
export const STATS: Stat[] = [
  { parts: [1, 2, "→", 0, 2], text: "12 to 2", label: "Manual steps to agent layers, section 03" },
  { parts: [0, 5], text: "5", label: "Phases, Diagnose to Compound" },
  { parts: [0, 6], text: "6", label: "Capabilities, one system each" },
];

/**
 * Why Triseno as a two-state comparison. The "vendor" column describes the
 * generic alternative a buyer is weighing, not any named company.
 */
export const WHY = {
  title: "Why Triseno",
  label: "Why Triseno",
  states: ["Typical AI vendor", "Triseno"] as const,
  /** phone labels — the long one does not fit half a 300px switch */
  statesShort: ["Vendor", "Triseno"] as const,
  rows: [
    {
      topic: "Pricing",
      vendor: "Per-seat licence, whatever the outcome",
      triseno: "Fees tied to numbers you already track",
    },
    {
      topic: "Scope",
      vendor: "A tool bolted onto your stack",
      triseno: "The orchestration layer underneath it",
    },
    {
      topic: "Failure",
      vendor: "A support ticket and a wait",
      triseno: "Fallback logic built into every agent",
    },
  ],
};

export const GATE = {
  title: "Ready to Build Something That Compounds?",
  body: "Start with the AI Operations Audit: a focused diagnostic that finds your highest-leverage opportunities before you commit to a build.",
  primary: "Start with a diagnostic",
  secondary: "Start a Conversation",
};

// Copy for /ai-infrastructure. Source: the owner's approved copy doc
// (triseno-website-copy.md), trimmed to fit the sections. Voice: precise
// systems engineer, numbers over adjectives. The word "chatbot" appears once,
// in contrast only.

export const HERO = {
  label: "Consulting / Architecture / Implementation",
  headline: ["We Build the", "Operational", "Intelligence", "Layer"],
  sub: "Triseno Systems designs and deploys AI infrastructure: multi-agent orchestration, workflow compression engines and decision-layer automation for organizations that need systems, not features.",
};

export type DiagramKind =
  | "orchestration"
  | "catalog"
  | "compression"
  | "revenue"
  | "broadcast"
  | "retainer"
  | "web";

export interface Capability {
  id: DiagramKind;
  tag: string;
  title: string;
  body: string;
  /** bento slot, see .ai-bento in ai.css */
  slot: "a" | "b" | "c" | "d" | "e" | "f" | "g";
}

export const CAPABILITIES_INTRO = {
  title: "Infrastructure That Thinks",
  body: "We don't build chatbots. We build the operational intelligence layer underneath: the systems that compress decisions, orchestrate agents and turn complexity into leverage.",
};

export const CAPABILITIES: Capability[] = [
  {
    id: "orchestration",
    slot: "a",
    tag: "Core capability",
    title: "Multi-Agent Orchestration",
    body: "Coordinated AI agent systems that divide complex workflows into parallel execution paths: research, analysis, generation and validation running simultaneously. Not one bot. An entire operations team.",
  },
  {
    id: "catalog",
    slot: "b",
    tag: "Specialized system",
    title: "Product & Catalog Intelligence",
    body: "Sprawling product catalogs become systems that understand specifications, compatibility and context. Customers get expert-level guidance. Your team is freed from repetitive inquiries.",
  },
  {
    id: "compression",
    slot: "c",
    tag: "Core capability",
    title: "Workflow Compression Engines",
    body: "We identify the 40-hour processes buried in your operations and engineer them down to minutes. Document processing, approval chains, data reconciliation: compressed, automated, monitored.",
  },
  {
    id: "revenue",
    slot: "d",
    tag: "Outcome-tied",
    title: "Revenue Operations Intelligence",
    body: "Lead qualification, pipeline acceleration and conversion optimization powered by AI that understands your sales process. Outcome-tied pricing means we only win when you do.",
  },
  {
    id: "web",
    slot: "g",
    tag: "Digital infrastructure",
    title: "Website Design & Development",
    body: "High-performance websites engineered with the same systems thinking: custom-built, conversion-optimized, integrated with your existing tools, CRMs and business systems.",
  },
  {
    id: "broadcast",
    slot: "e",
    tag: "Industry specialty",
    title: "Broadcast & Production AI",
    body: "Production automation built by someone who has lived in the control room. Metadata intelligence, content routing, asset orchestration and real-time decision systems, from pre-production through post.",
  },
  {
    id: "retainer",
    slot: "f",
    tag: "Ongoing engagement",
    title: "AI Infrastructure Retainers",
    body: "Ongoing architecture, optimization and expansion for organizations that need a dedicated AI infrastructure partner, not a support ticket queue. Monthly performance tracking. Priority builds. Strategic advisory.",
  },
];

export const COMPRESSION = {
  title: "Not Automation. Compression.",
  body: "We analyze operational workflows and redesign them as compressed intelligent pipelines. A 12-step manual process becomes a 2-layer agent system.",
  note: "Illustrative workflow",
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
  compressed: [
    "Document processing and approval chains",
    "Data reconciliation across systems",
    "Quote and proposal generation",
    "Compliance and audit workflows",
    "Reporting and analytics pipelines",
    "Customer onboarding and intake",
  ],
};

export interface ProcessStep {
  name: string;
  summary: string;
  happens: string[];
  deliverable: string;
}

export const PROCESS_INTRO = {
  title: "From Architecture to Deployment",
  body: "Every engagement follows the same discipline. Select a step, or let the orbit run.",
};

export const PROCESS: ProcessStep[] = [
  {
    name: "Diagnose",
    summary:
      "We map your operational workflows, identify compression opportunities and quantify the cost of the problems worth solving. No guesswork. No generic audits.",
    happens: [
      "Deep-dive into current workflows, tools and data systems",
      "Highest-friction bottlenecks and manual processes identified",
      "Cost of each problem quantified in time, money and throughput",
      "Opportunity map ranked by impact and feasibility",
    ],
    deliverable: "A diagnostic report with specific compression and automation targets, not a generic PDF of recommendations.",
  },
  {
    name: "Architect",
    summary:
      "Solution blueprints that specify agent roles, data flows, integration points, fallback logic and success metrics before a single line of code is written.",
    happens: [
      "Every component, data flow and decision point mapped",
      "Agent roles defined with input and output specifications",
      "Integration planned against your existing infrastructure",
      "Fallback and failure handling designed in from the start",
    ],
    deliverable: "A complete technical blueprint you can review, question and approve. Nothing gets built until the architecture is locked.",
  },
  {
    name: "Build",
    summary:
      "Modular construction with continuous testing. Each agent, pipeline and decision node is independently testable, replaceable and scalable. No monoliths. No black boxes.",
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
    summary:
      "Production deployment with monitoring, performance benchmarking and iterative refinement. We stay engaged until the metrics prove the architecture works.",
    happens: [
      "Controlled production rollout, monitored from day one",
      "Benchmarking against the success metrics set in Architect",
      "Iterative tuning on real operational data",
      "Knowledge transfer so the system is not a black box",
    ],
    deliverable: "A production system measured against the agreed metrics, with your team trained to run it.",
  },
  {
    name: "Compound",
    summary:
      "Systems get smarter over time, and retainers expand them. Each new module plugs into the layer already running, so every build costs less than the one before.",
    happens: [
      "Ongoing monitoring, optimization and performance tuning",
      "New compression opportunities surfaced from live data",
      "Architecture expanded as operations change",
      "Priority access for new builds and integrations",
    ],
    deliverable: "Monthly performance and ROI reporting, plus a standing roadmap for the next expansion.",
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
  body: "We work across industries: anywhere operational complexity, large data sets or manual workflows are costing you money and time.",
};

export const INDUSTRIES: Industry[] = [
  {
    title: "Broadcast & Production",
    full: "Broadcast & Production",
    body: "The broadcast control room is one of the most complex operational environments in any industry, and one of the least touched by AI. Triseno brings domain expertise from inside the broadcast world combined with frontier AI architecture: real-time decision-making, multi-source routing, metadata management and workflow compression across pre-production, live and post.",
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
    body: "Companies with hundreds or thousands of SKUs, complex product relationships and technical specifications that overwhelm both customers and internal teams. We build intelligent catalog systems, configuration engines and product expertise layers. If your catalog is big enough to be a problem, it is big enough to be a competitive advantage.",
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
    body: "Complex operational workflows in logistics, supply chain, manufacturing, professional services and large-scale service delivery. Agent systems and workflow compression engines for environments where operational throughput and decision accuracy directly impact revenue.",
    log: [
      ["intake", "purchase order read, fields extracted"],
      ["verify", "totals reconciled against ledger"],
      ["route", "exception flagged, approver assigned"],
      ["fallback", "low confidence, human review requested"],
      ["report", "cycle closed, audit trail written"],
    ],
  },
  {
    title: "Creative & Media Tech",
    full: "Creative Production & Media Technology",
    body: "AI infrastructure for creative teams at scale: asset management intelligence, production pipeline automation, creative deployment engines and systems that accelerate creative throughput without sacrificing quality.",
    log: [
      ["ingest", "new assets fingerprinted and versioned"],
      ["tagger", "scenes, products and usage rights labelled"],
      ["pipeline", "deliverable specs resolved per platform"],
      ["render", "variants queued, naming convention applied"],
      ["review", "approval link sent to creative lead"],
    ],
  },
  {
    title: "Technology & SaaS",
    full: "Technology & SaaS Companies",
    body: "AI-native infrastructure for tech companies embedding intelligence deeper into their products, internal operations or customer-facing systems. From internal tooling automation to onboarding compression to intelligent support architecture.",
    log: [
      ["signup", "account context gathered from intake form"],
      ["onboard", "setup steps sequenced for this use case"],
      ["support", "ticket classified, known fix attached"],
      ["escalate", "novel issue routed to engineer on call"],
      ["tooling", "internal runbook updated from resolution"],
    ],
  },
];

/** Odometer stats. `parts` are rolled digits (numbers) or static glyphs (strings). */
export interface Stat {
  parts: Array<number | string>;
  text: string;
  label: string;
}

export const STATS: Stat[] = [
  { parts: [5, 0, "+"], text: "50+", label: "AI systems architected" },
  { parts: [3, "x"], text: "3x", label: "Average workflow compression" },
  { parts: [2, 4, "/", 7], text: "24/7", label: "Autonomous operations" },
  { parts: ["<", 6], text: "<6 weeks", label: "Weeks, concept to deployment" },
];

export const WHY = {
  title: "Why Triseno",
  label: "AI infrastructure for operations, intelligence and scale",
  blocks: [
    {
      title: "Outcome-Tied Pricing",
      body: "We attach our fees to numbers you already track: revenue recovered, costs reduced, conversion rates increased, cycle times compressed. You see the result before you pay for it. We only win when the system proves itself.",
    },
    {
      title: "Infrastructure, Not Features",
      body: "Most AI vendors sell you a tool. We build the layer underneath: the orchestration, the decision logic, the compression architecture that makes every tool on top of it work better. Features deprecate. Infrastructure compounds.",
    },
    {
      title: "Broadcast-Grade Reliability",
      body: "Our systems are architected like broadcast infrastructure, for environments where downtime is not an option. Every agent has fallback logic. Every pipeline has monitoring. Every system is built to not go down.",
    },
  ],
};

export const GATE = {
  title: "Ready to Build Something That Compounds?",
  body: "The fastest way in is the AI Operations Audit: a focused diagnostic that finds your highest-leverage opportunities before you commit to a full build.",
  primary: "Start with a diagnostic",
  secondary: "Start a Conversation",
  email: "Tristen@trisenosystems.com",
};

// Copy for Fig. 05 / Anatomy (AgentAnatomy.tsx). Kept beside the component
// rather than in content.ts so the lead can merge it in one move. Voice:
// precise systems engineer, numbers over adjectives. Every figure here is
// fictional and consistent with the rest of the reel: PO-8841, the 0.80
// threshold and the 0.61 that falls under it.

export type AnatomyBlockId = "planner" | "memory" | "router" | "guardrails" | "evaluator";

export interface AnatomyBlock {
  id: AnatomyBlockId;
  /** printed inside the block, uppercase */
  label: string;
  /** the full spec line, printed under the label at >= 10x */
  spec: string;
  /** the first clause only: phones */
  short: string;
}

export const ANATOMY = {
  n: "05",
  label: "Anatomy",
  title: "Inside one agent.",
  aside: "Five blocks, one permission check, one threshold. Every request walks this floor.",

  /** which of Compression's five agents the camera pushes into (index into COMPRESSION.agents) */
  agent: { index: 2, name: "Verify" },

  blocks: [
    { id: "planner", label: "Planner", spec: "steps <= 6", short: "steps <= 6" },
    { id: "memory", label: "Memory", spec: "window 8,192 tokens", short: "window 8,192" },
    { id: "router", label: "Tool router", spec: "tools 4", short: "tools 4" },
    { id: "guardrails", label: "Guardrails", spec: "policy 4.2 . 7 actions", short: "policy 4.2" },
    { id: "evaluator", label: "Evaluator", spec: "threshold 0.80", short: "threshold 0.80" },
  ] as AnatomyBlock[],

  /** the tool router's four rows (desktop only; phones keep the count) */
  tools: ["erp.read", "vendor.lookup", "ledger.read", "mail.send"],

  ports: { in: "In", out: "Out", human: "Human" },

  trace: {
    request: "PO-8841",
    readout: "0.61 < 0.80",
    exit: "to a named person",
    threshold: "0.80",
  },

  /** the drafting title block beside the die */
  titleBlock: "Verify . agent 02 . rev 4.2",

  hud: {
    zoom: "Zoom",
    agent: "Agent 02 . Verify",
  },

  figcap: { fig: "Fig. 05", text: "An example agent, drawn to its parts." },

  aria: "A drafted plan of one agent: planner, memory, tool router, guardrails and evaluator, and the path one request takes through them to a human reviewer",

  /** the trace, as text, for the visually hidden list */
  steps: [
    "Request PO-8841 enters at the In port.",
    "Planner: at most six steps are planned for it.",
    "Memory: the request and its record are held in an 8,192-token window.",
    "Tool router: four tools are available; the vendor lookup and the ledger read run.",
    "Guardrails: policy 4.2 checks the action against seven permitted actions.",
    "Evaluator: confidence 0.61 is below the 0.80 threshold.",
    "The request leaves through the Human port, to a named person.",
  ],
} as const;

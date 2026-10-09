// Copy for Fig. 05 / Anatomy (AgentAnatomy.tsx). Kept beside the component
// rather than in content.ts so the lead can merge it in one move. Voice:
// precise systems engineer, numbers over adjectives. Every figure here is
// fictional and consistent with the rest of the reel: PO-8841, the 0.80
// threshold and the 0.61 that falls under it. No emojis.

export type AnatomyBlockId = "planner" | "memory" | "router" | "guardrails" | "evaluator";

export interface AnatomyBlock {
  id: AnatomyBlockId;
  /** printed inside the block, uppercase */
  label: string;
  /** phones: the label that fits a 105px block */
  labelShort: string;
  /** the full spec line, printed under the label from about 13x */
  spec: string;
  /** the first clause only: phones */
  short: string;
  /** the HUD's line while the pointer (or a tap) is on this block */
  line: string;
}

export const ANATOMY = {
  n: "05",
  label: "Anatomy",
  title: "Inside one agent.",
  aside: "Five blocks, one permission check, one threshold. Every request walks this floor.",

  /** which of Compression's five agents the camera pushes into (index into COMPRESSION.agents) */
  agent: { index: 2, name: "Verify" },

  blocks: [
    { id: "planner", label: "Planner", labelShort: "Planner", spec: "steps <= 6", short: "steps <= 6", line: "Planner . steps <= 6 . 4 planned" },
    { id: "memory", label: "Memory", labelShort: "Memory", spec: "window 8,192 tokens", short: "window 8,192", line: "Memory . 2,816 of 8,192 tokens held" },
    { id: "router", label: "Tool router", labelShort: "Tools", spec: "tools 4", short: "tools 4", line: "Tool router . 4 tools . 2 called" },
    { id: "guardrails", label: "Guardrails", labelShort: "Guardrails", spec: "policy 4.2 . 7 actions", short: "policy 4.2", line: "Guardrails . policy 4.2 . 1 of 7 actions checked" },
    { id: "evaluator", label: "Evaluator", labelShort: "Evaluator", spec: "threshold 0.80", short: "threshold 0.80", line: "Evaluator . threshold 0.80 . scored 0.61" },
  ] as AnatomyBlock[],

  /** the tool router's four rows (desktop only; phones keep the count) */
  tools: ["erp.read", "vendor.lookup", "ledger.read", "mail.send"],

  ports: { in: "In", out: "Out", human: "Human" },

  gauge: { lo: "0.0", hi: "1.0", threshold: "0.80" },

  trace: {
    request: "PO-8841",
    readout: "0.61 < 0.80",
    exit: "to a named person",
  },

  /** the drafting title block beside the die (desktop) */
  titleBlock: "Verify . agent 02 . rev 4.2",

  hud: {
    zoom: "Zoom",
    /** before the camera locks on */
    plan: "System . 05 agents . 2 layers",
    agent: "Agent 02 . Verify",
  },

  /**
   * The HUD narrates the walk, one line per trace segment (index = segment).
   * Written only when the segment changes.
   */
  walk: [
    "In . PO-8841 received",
    "Planner . 4 of 6 steps",
    "Memory . 2,816 of 8,192 tokens",
    "Ring bus . to the tool router",
    "Ring bus . to the tool router",
    "Tool router . vendor.lookup, ledger.read",
    "Guardrails . ledger.read permitted",
    "Evaluator . scoring",
    "Evaluator . 0.61 < 0.80",
    "Held . routed to the human port",
    "Human . to a named person",
  ],

  hint: { fine: "Hover a block", touch: "Tap a block" },

  figcap: { fig: "Fig. 05", text: "An example agent, drawn to its parts." },

  aria: "A drafted plan of one agent: planner, memory, tool router, guardrails and evaluator, and the path one request takes through them to a human reviewer",

  /** the trace, as text, for the visually hidden list */
  steps: [
    "Request PO-8841 enters at the In port.",
    "Planner: at most six steps; four are planned for it.",
    "Memory: the request and its record are held in an 8,192-token window, 2,816 tokens used.",
    "Tool router: four tools are available; the vendor lookup and the ledger read run.",
    "Guardrails: policy 4.2 checks the action against seven permitted actions.",
    "Evaluator: confidence 0.61 is below the 0.80 threshold.",
    "The request leaves through the Human port, to a named person.",
  ],
} as const;

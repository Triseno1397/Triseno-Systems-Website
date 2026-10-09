/**
 * Words for the console's halt and the routing slip it prints (item
 * "console-slip" in design-loop/ai-revamp-plan.json). Kept out of content.ts
 * while that file is being edited by other builders; the lead may fold it in.
 *
 * Everything here is fictional: the person, the vendor, the order, the clock.
 */
export const CONSOLE_SLIP = {
  /** sessionStorage key: once a slip is resolved, later runs do not halt */
  storageKey: "ai:slip-done",

  /** appended to the boot line when the stack has timed a trace this session */
  bootBench: (totalMs: number) => `last run ${Math.round(totalMs).toLocaleString("en-US")} ms`,

  /** the halted step's message, wiped in over the typed one */
  halt: { lead: "unusual order", cmp: "3x the normal size", tail: "asking a person" },

  /** the human's row in the trace, before "report" */
  reviewAgent: "review",
  approvedLine: "approved by J. Okafor . 00:00:41",
  correctedLine: (vendor: string) => `fixed . supplier: ${vendor} . carrying on`,

  slip: {
    title: "Needs your OK",
    cycle: "order check",
    dialogLabel: "Needs your OK",
    person: "J. Okafor",
    role: "Operations lead",
    why: { lead: "unusual order", cmp: "3x the normal size", tail: "please confirm" },
    item: { po: "PO-8841", vendor: "Halvorsen Marine Supply", amount: "$18,420.00" },
    trail: [
      ["intake", "00:00:02"],
      ["extract", "00:00:09"],
      ["verify", "00:00:27"],
      ["policy", "00:00:41"],
    ] as const,
    /** the cycle clock the slip was resolved at (printed on the ticket) */
    at: "00:00:41",
    approve: "Approve",
    correct: "Correct",
    resume: "Resume",
    keep: "esc . keep",
    tear: "tear here",
    vendorLabel: "Supplier name",
    /** sr-only description of what the slip does */
    description: "This order looks unusual, so the tool paused and asked a person. Approve it, or fix the supplier name and it carries on.",
    vendorMax: 32,
    /** inked onto the slip the moment it is decided, before it tears or files */
    stamp: {
      approve: { word: "Approved", line: "J. Okafor . 00:00:41" },
      correct: { word: "Corrected", line: "vendor amended . 00:00:41" },
    },
  },

  /** the printer bay under the glass, reserved while the Enterprise cycle runs */
  bay: {
    standby: "slot 01 . standby",
    filed: "slip 0418 . filed to the audit trail",
  },

  /** the halted step's live wait, printed beside its spinner (not announced) */
  waitLabel: "waiting on a person",
} as const;

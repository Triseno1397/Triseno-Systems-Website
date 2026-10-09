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
  bootBench: (totalMs: number) => `bench . last trace ${Math.round(totalMs).toLocaleString("en-US")} ms`,

  /** the halted step's message, wiped in over the typed one */
  halt: { lead: "confidence", cmp: "0.61 < 0.80", tail: "routing to a person" },

  /** the human's row in the trace, before "report" */
  reviewAgent: "review",
  approvedLine: "approved by J. Okafor . 00:00:41",
  correctedLine: (vendor: string) => `corrected . vendor: ${vendor} . resuming`,

  slip: {
    title: "Routing slip",
    cycle: "cycle 0418",
    dialogLabel: "Routing slip . cycle 0418",
    person: "J. Okafor",
    role: "Operations lead",
    why: { lead: "confidence", cmp: "0.61 < 0.80", tail: "terms conflict" },
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
    vendorLabel: "Vendor name, corrected",
    /** sr-only description of what the slip does */
    description: "The cycle is paused. Approve to let it resume as planned, or correct the vendor name before it resumes.",
    vendorMax: 32,
  },
} as const;

// Copy for Fig. 04, the mercury compression (MercuryCompression.tsx). The
// heading, aside, step names, agent names and the note stay in content.ts
// (COMPRESSION); everything the mercury stage adds lives here. Voice: precise
// systems engineer, numbers over adjectives. No emojis.

export const MERCURY = {
  /** the chapter mark: "04 / Compression" */
  chapter: ["03", "Before / after"] as const,
  figure: "compression",
  readout: { before: "12 steps", after: "1 run" },
  state: {
    resting: "Twelve manual steps, done by hand every morning.",
    pressed: "Twelve steps, now one automatic run. Nobody touched it.",
    /** after an early merge: "merged early · Vendor lookup → Extract" */
    merged: (step: string, agent: string) => `merged early · ${step} → ${agent}`,
  },
  control: {
    compress: "Automate it",
    reset: "Reset",
    compressAria: "Automate the twelve steps",
    resetAria: "Reset to the twelve manual steps",
  },
  /** under each agent body: "<name> · absorbed n" */
  absorbed: "absorbed",
  floors: [
    ["Step 01", "It starts itself"],
    ["Step 02", "It does the work"],
  ] as const,
  hint: {
    fine: "Drag a bead onto another to merge it",
    touch: "Hold a bead, then drag it onto another",
  },
  figcap: ["Before / after", "Each part of the run does the work of the steps it absorbed."] as const,
  /** the figure, for readers who cannot see it */
  sr: "Twelve beads of ink mercury, one per manual step, lie along a dotted trail. They roll together into five larger beads: one automatic run that does the work of all twelve. A bead can be dragged onto another to merge it early.",
  /** written to the session when the field settles */
  log: "12 steps -> 05 agents . 2 layers",
};

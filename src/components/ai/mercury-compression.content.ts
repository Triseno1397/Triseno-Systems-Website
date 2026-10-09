// Copy for Fig. 04, the mercury compression (MercuryCompression.tsx). The
// heading, aside, step names, agent names and the note stay in content.ts
// (COMPRESSION); everything the mercury stage adds lives here. Voice: precise
// systems engineer, numbers over adjectives. No emojis.

export const MERCURY = {
  /** the chapter mark: "04 / Compression" */
  chapter: ["04", "Compression"] as const,
  figure: "compression",
  readout: { before: "12 steps", after: "02 layers" },
  state: {
    resting: "Twelve beads resting on the trail.",
    pressed: "Twelve steps pressed into five agents on two layers.",
    /** after an early merge: "merged early · Vendor lookup → Extract" */
    merged: (step: string, agent: string) => `merged early · ${step} → ${agent}`,
  },
  control: {
    compress: "Compress",
    reset: "Reset",
    compressAria: "Compress the twelve steps into five agents",
    resetAria: "Reset to the twelve manual steps",
  },
  /** under each agent body: "<name> · absorbed n" */
  absorbed: "absorbed",
  floors: [
    ["Layer 01", "Orchestration"],
    ["Layer 02", "Execution agents"],
  ] as const,
  hint: {
    fine: "Drag a bead onto its neighbour to merge it early",
    touch: "Hold a bead, then drag it onto another",
  },
  figcap: ["Fig. 04", "Volume conserved: each agent is the sum of the steps it absorbed."] as const,
  /** the figure, for readers who cannot see it */
  sr: "Twelve beads of ink mercury, one per manual step, lie along a dotted trail. They roll together into five larger beads on two layers: an orchestrator made of four steps over four agents made of two each. A bead can be dragged onto another to merge it early.",
  /** written to the session when the field settles */
  log: "12 steps -> 05 agents . 2 layers",
};

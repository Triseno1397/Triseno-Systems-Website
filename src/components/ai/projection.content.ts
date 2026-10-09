// Words and tables for the projection system of /ai-infrastructure: the
// chapter numbering every section's label and data-ch read from, the five
// chapter-frame loglines, the slate's labels, the operator-keys sheet, and
// the build sheet (CREDITS) that both the SPEC notes and the credits roll
// read, so the two can never disagree.
//
// Voice: precise systems engineer, numbers over adjectives. No emojis.
// (Kept out of content.ts by the build brief; the lead may fold it in.)

/* ── chapters ── */

/** [number, name] in page order. Questions keeps no number. */
export const CHAPTERS = [
  ["01", "Layer"],
  ["02", "Capabilities"],
  ["03", "Intake"],
  ["04", "Compression"],
  ["05", "Anatomy"],
  ["06", "Scale"],
  ["07", "Stack"],
  ["08", "Industries"],
  ["09", "Night"],
  ["10", "Process"],
  ["11", "Why"],
  ["12", "Gate"],
] as const;

export type ChapterName = (typeof CHAPTERS)[number][1];

/** "Compression" -> "04"; unknown or unnumbered (Questions) -> null. */
export function chapterNumber(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase();
  const hit = CHAPTERS.find(([, n]) => n.toLowerCase() === key);
  return hit ? hit[0] : null;
}

/** One logline per chapter frame; at most fourteen words each. */
export const LOGLINES: Readonly<Partial<Record<ChapterName, string>>> = {
  Intake: "A request arrives the way they always do. As a message.",
  Compression: "Twelve steps a person carried. Pressed into five that run themselves.",
  Scale: "Designed to scale, then photographed at scale.",
  Stack: "Four layers, one request, one thousand three hundred and ten milliseconds.",
  Night: "Eighteen hundred to oh six hundred. Nobody at the desk.",
};

/* ── the slate ── */

export const SLATE = {
  label: "Reel slate",
  tc: "TC",
  ch: "CH",
  chSr: "Chapter",
  fps: "FPS",
  spec: "SPEC",
  specLabel: "Spec notes",
  keys: "?",
  keysLabel: "Operator keys",
} as const;

/* ── operator keys ── */

export type KeyRow = { keys: readonly string[]; action: string };

export const KEYS = {
  title: "Operator keys",
  rows: [
    { keys: ["g", "s"], action: "stack" },
    { keys: ["g", "c"], action: "compression" },
    { keys: ["g", "n"], action: "night" },
    { keys: ["g", "i"], action: "industries" },
    { keys: ["g", "p"], action: "process" },
    { keys: ["g", "w"], action: "why" },
    { keys: ["."], action: "send a request through the stack" },
    { keys: ["/"], action: "filter the logs" },
    { keys: ["x"], action: "spec notes on, off" },
    { keys: ["space"], action: "dive, on the core" },
    { keys: ["esc"], action: "close" },
    { keys: ["?"], action: "this sheet" },
  ] as readonly KeyRow[],
  foot: "Keys are ignored while you type.",
  close: "Esc",
  /** touch devices: no chords; the sheet lists the gestures instead */
  touchTitle: "Gestures",
  gestures: [
    { keys: ["hold"], action: "the core . dive" },
    { keys: ["hold", "drag"], action: "a bead onto another . merge early" },
    { keys: ["tap"], action: "the scale plate . develop" },
    { keys: ["tap", "tap"], action: "a layer of the stack . inspect" },
    { keys: ["tap"], action: "approve or correct . the routing slip" },
    { keys: ["pull"], action: "the stub . tear the ticket" },
  ] as readonly KeyRow[],
  touchFoot: "Scroll drives the reel. The slate reads it back.",
  touchClose: "Close",
  /** the spec switch inside the sheet, where the slate has no SPEC button */
  specRow: "Spec notes",
  specHint: "every figure shows its working",
} as const;

/* ── the build sheet ── */

/**
 * One row per figure. `line` is what the credits roll prints; `notes` are the
 * two margin notes SpecNote renders inside that figure (never more than two).
 * COUNTS MUST BE TRUE TO THE SHIPPED BUILD: counted, not estimated. Auditing
 * them against the components is a launch checklist item.
 */
export type Credit = {
  /** the figure id SpecNote is addressed by: "01", "01b", "03" ... "amb", "assets" */
  fig: string;
  /** the credits-roll line (without the "FIG. nn ." prefix) */
  line: string;
  notes: readonly [string, string];
};

export const CREDITS_TITLE = "BUILD SHEET . /ai-infrastructure";
export const CREDITS_END = "END OF SPECIFICATION";

export const CREDITS: readonly Credit[] = [
  {
    fig: "01",
    line: "liquid chrome core . three.js . vertex noise + pointer pull . 200 boids . 1 PMREM env",
    notes: [
      "three.js . 200 agents in one InstancedMesh . chrome: vertex-displaced MeshPhysicalMaterial, normals rebuilt",
      "hold: one scalar . portal RT at 0.5x only while held . the cut lands when the core's angular radius clears the frame",
    ],
  },
  {
    fig: "01b",
    line: "the nucleus . MARK_OUTLINE extruded . same chrome . portal RT 0.5x . 2 routes . 1 point light",
    notes: [
      "MARK_OUTLINE -> ExtrudeGeometry . depth 0.18 . bevel 3 segments . one chromeMaterial(envDark)",
      "dome: BackSide sphere, hairlines every 10 degrees . floor: 0.25-unit grid fading with distance squared",
    ],
  },
  {
    fig: "03",
    line: "the reading . 7 entities . 1 scroll trigger . 0 canvas",
    notes: [
      "DOM + 1 ScrollTrigger, scrub 0.6 . 7 marks measured once on fonts.ready and resize",
      "reader: 1px, mix-blend multiply . chips travel by transform . values reveal by clip-path",
    ],
  },
  {
    fig: "04",
    line: "ink mercury . raymarched SDF . 19 bodies . 40 steps . volume conserved",
    notes: [
      "WebGL1 . 12 sphere SDFs + 5 bodies, smooth-min k 10-46 px . 40 steps . DPR 0.75",
      "r = cube root of the sum of r cubed . the reflection is the paper's own grid, not a PMREM",
    ],
  },
  {
    fig: "05",
    line: "anatomy . 1 SVG . 14x . 11 trace segments . 1px at every zoom",
    notes: [
      "1 SVG, 1 transform write per frame . 1x -> 14x over +160% of scroll",
      "vector-effect: non-scaling-stroke . 11 clip-path segments, 0.02 of progress each",
    ],
  },
  {
    fig: "06",
    line: "designed to scale . WebGL1 . 1-bit Bayer -> 45deg halftone -> colour",
    notes: ["WebGL1 . 1-bit Bayer -> 45deg halftone -> colour . pinned +200%", "pointer develops the plate . touch: tap, k 1 -> 0 over 1.2 s"],
  },
  {
    fig: "07",
    line: "four layers . 1 film . 4 hotspots . 11 spans . 1 timeline . 3 live lines",
    notes: ["DOM + clip-path . 11 spans on one GSAP clock . config -> spans", "packet, flares and waterfall share one timeline . 3 live declarations change the next run"],
  },
  {
    fig: "08",
    line: "industries . 4 plates . 1 radial mask . 1 typed trace . 1 paper slip",
    notes: ["4 plates . 1 radial mask . 1 typed trace on a setTimeout scheduler", "halt at step 4 . 1 paper slip . 2 outcomes, both logged"],
  },
  {
    fig: "09",
    line: "one night . 2,318 points . 1 canvas . 12 rows",
    notes: ["2,318 points . 1 canvas . a full redraw under 1 ms . dirty only", "p -> 18:00 + 12 h . ink at 23:00, paper again at 06:00"],
  },
  {
    fig: "10",
    line: "process . 1 slider . 4 brackets . 1 stroke",
    notes: ["1 drag rail . 4 true-focus brackets . 1 stroke-dasharray draw", "the page's only 1-D slider, on purpose"],
  },
  {
    fig: "11",
    line: "why . 4 flip cards . 1 liquid alloy mark",
    notes: ["4 flip cards . 1 radiogroup master switch", "1 liquid alloy mark . WebGL1 . the page's third metal, on paper"],
  },
  {
    fig: "amb",
    line: "AMBIENCE . 1 paper . 1 grain . 1 lens . 1 slate . 5 frames",
    notes: ["1 paper . 1 grain . 1 lens . 1 slate . 5 frames", "gate streak: 2 style writes per frame while moving, 0 at rest"],
  },
  {
    fig: "assets",
    line: "ASSETS . 6 plates . 7 loops . 0 added this round",
    notes: ["6 plates . 7 loops . 0 added this round", "every generated asset was already in /worlds or /videos"],
  },
];

export function creditFor(fig: string): Credit | undefined {
  return CREDITS.find((c) => c.fig === fig);
}

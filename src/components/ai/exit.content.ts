/* ─────────────────────────────────────────────────────────────────────────
   THE EXIT — words for the diagnostic ticket and the build sheet.

   Kept out of content.ts while the revamp lands in parallel; the lead may
   fold these into content.ts (CREDITS is the table the SpecNote margin notes
   are meant to read from, so the two can never disagree).

   Voice: precise systems engineer, numbers over adjectives. Every count in
   CREDITS must be true to the shipped build — counted, not estimated. The
   audit is a launch checklist item; see the note on each row.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The one href both controls at the gate travel to: the "Start with a
 * diagnostic" ghost button and the ticket's torn stub. One constant, so the
 * gate convention can never fork.
 */
export const DIAGNOSTIC_HREF = "/contact?division=ai";

export const TICKET = {
  head: "Diagnostic ticket",
  sub: "trisenosystems . AI infrastructure . spec session",
  rows: {
    req: "REQ",
    minted: "MINTED",
    steps: "STEPS",
    trace: "TRACE",
    slip: "SLIP",
    night: "NIGHT",
    figures: "FIGURES",
    cookies: "COOKIES",
  },
  /** printed after the minted clock: "14:02:11 PDT . inside the core" */
  mintedTail: "inside the core",
  cookies: "0",
  /** "9 rendered" */
  rendered: "rendered",
  /** the stub */
  stub: "Tear to start",
  stubSr: "Tear the stub to start with a diagnostic",
  /** the text link under the rows */
  copy: "Copy ticket",
  copied: "Copied",
  /** when the visitor operated nothing on the way down */
  empty: "Nothing operated yet. The page works as a specification; tear here to start anyway.",
  /** the value printed for a row with nothing behind it */
  blank: "-",
} as const;

export const CREDITS_TITLE = "Build sheet . /ai-infrastructure";
export const CREDITS_END = "End of specification";

export type Credit = {
  /** the figure's id, as SpecNote addresses it: "01", "01b", "amb" … */
  id: string;
  /** the first column: "Fig. 01", "Ambience" */
  fig: string;
  /** what the figure is made of */
  line: string;
  /** the two margin notes SPEC mode draws on this figure */
  notes: [string, string];
};

/**
 * One row per figure in the reel, in page order. Counts audited 2026-10-09
 * against the worktree: rows for figures still landing from other builders
 * (01b, 03, 04, 05, 07's spans, 09) carry the counts their locked plans
 * specify and are re-checked at launch.
 */
export const CREDITS: Credit[] = [
  {
    id: "01",
    fig: "Fig. 01",
    line: "liquid chrome core . three.js . vertex noise + pointer pull . 200 boids . 1 PMREM env",
    notes: [
      "three.js . 200 agents in one InstancedMesh . chrome: vertex-displaced MeshPhysicalMaterial, normals rebuilt",
      "hold: one scalar, portal RT at 0.5x only while held . cleanDark('dive') past v 0.66",
    ],
  },
  {
    id: "01b",
    fig: "Fig. 01b",
    line: "the nucleus . MARK_OUTLINE extruded . same chrome . portal RT 0.5x . 2 routes . 1 point light",
    notes: [
      "ExtrudeGeometry from the four traced loops . bevel 0.04 . envDark PMREM built once",
      "the cut: core angular radius > frame half-diagonal, then the inner scene draws direct",
    ],
  },
  {
    id: "03",
    fig: "Fig. 03",
    line: "the reading . 7 entities . 1 scroll trigger . 0 canvas",
    notes: [
      "DOM + one ScrollTrigger . thresholds measured once per resize, never per frame",
      "seven chips, transform only . underline by clip-path . conflict routed to Verify",
    ],
  },
  {
    id: "04",
    fig: "Fig. 04",
    line: "ink mercury . raymarched SDF . 19 bodies . 40 steps . volume conserved",
    notes: [
      "WebGL1 . 12 sphere SDFs + 5 bodies, smooth-min k 10-46 px . 40 steps . DPR 0.75",
      "r = cube root of the sum of r cubed . the only reflection is the paper and its grid",
    ],
  },
  {
    id: "05",
    fig: "Fig. 05",
    line: "anatomy . 1 SVG . 14x . 11 trace segments . 1px at every zoom",
    notes: [
      "one <g> transform per frame . vector-effect: non-scaling-stroke",
      "trace revealed by clip-path per segment . no stroke-dasharray (Process owns the draw)",
    ],
  },
  {
    id: "06",
    fig: "Fig. 06",
    line: "designed to scale . WebGL1 . 1-bit Bayer -> 45deg halftone -> colour",
    notes: [
      "one fragment program . bayer8 ordered dither . halftone cell in px",
      "pinned +200% / +130% . a tap develops the plate on touch",
    ],
  },
  {
    id: "07",
    fig: "Fig. 07",
    line: "four layers . 1 film . 4 hotspots . 11 spans . 1 timeline . 3 live lines",
    notes: [
      "DOM + clip-path . 11 spans on one GSAP clock . config -> spans",
      "packet y from LAYERS 0.81 / 0.59 / 0.39 / 0.22 . budget flag is a slider on an axis",
    ],
  },
  {
    id: "08",
    fig: "Fig. 08",
    line: "industries . 4 plates . 1 radial mask . 1 typed trace . 1 paper slip",
    notes: [
      "2x2 chroma grid . one circle mask across all four . loops gated by IntersectionObserver",
      "setTimeout step scheduler halts at step 4 . the slip is paper, not a terminal",
    ],
  },
  {
    id: "09",
    fig: "Fig. 09",
    line: "one night . 2,318 points . 1 canvas . 12 rows",
    notes: [
      "2D canvas, DPR <= 1.5 . 2,318 fillRects, redrawn only when p changed",
      "sky = two opacities of p . cleanDark('night') while ink > 0.5",
    ],
  },
  {
    id: "10",
    fig: "Fig. 10",
    line: "process . 1 slider . 4 brackets . 1 stroke",
    notes: [
      "role=slider, pointer capture . brackets slide by transform only",
      "the page's one stroke-dasharray draw . step sheet wipes by clip-path",
    ],
  },
  {
    id: "11",
    fig: "Fig. 11",
    line: "why . 4 flip cards . 1 liquid alloy mark",
    notes: [
      "radiogroup master switch . cards turn in 3D, backface hidden",
      "one WebGL1 quad . height field from the traced outlines, blurred at two radii",
    ],
  },
  {
    id: "12",
    fig: "Fig. 12",
    line: "the exit . 1 ticket . 10 fibres . 1 roll . 0 cookies",
    notes: [
      "rows from the session store . stub hinged at the nearer corner . fibres snap at 2 d sin(a/2)",
      "credits: CSS sticky + one scrubbed transform . the tear travels by the same href as the button",
    ],
  },
  {
    id: "amb",
    fig: "Ambience",
    line: "ambience . 1 paper . 1 grain . 1 lens . 1 slate . 5 frames",
    notes: [
      "one fixed sheet, never animated . grain steps between offsets, transform only",
      "the lens is pointer-fine only . the streak is velocity only . both off under the dark",
    ],
  },
  {
    id: "ast",
    fig: "Assets",
    line: "assets . 8 plates . 6 loops . 0 added this round",
    notes: [
      "/worlds: interlude (desktop + mobile), stack poster, station 3 (+ mobile), chip, 4 industries",
      "/videos: stack, chip, 4 industries . every loop plays only on screen",
    ],
  },
];

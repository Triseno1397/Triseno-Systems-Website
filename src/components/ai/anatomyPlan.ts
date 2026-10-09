/* ─────────────────────────────────────────────────────────────────────────
   Fig. 05 / Anatomy — the geometry and the camera.

   Two drawings in one SVG:
   · the PLAN, in viewBox units (1600 x 1000; 1000 x 1000 on phones): the
     five agents from Compression redrawn as hairline circles on a bus, the
     size of a hand in the middle of an empty page;
   · the DIE, authored in its own 400-unit square (360 on phones) centred on
     the Verify circle and scaled down (k, measured) to sit inside it. Five
     blocks, a ring bus, three ports, pins along the edges, a 20-unit drafting
     grid, a confidence gauge in the evaluator, and the eleven straight
     segments the request PO-8841 walks: in at the IN port, through the
     planner into memory, up and round the ring bus to the tool router,
     across to guardrails, up into the evaluator where it enters the gauge
     at 1.0 and rides it past the 0.80 tick down to 0.61, and straight down
     out of the HUMAN port.

   Everything is pre-authored so the component writes one transform per
   frame and never measures geometry while scrolling. All strokes are
   non-scaling, so a hairline is 1px at 1x and at 14x.

   The camera is a pure function of one scrubbed progress p (frameAt): the
   same p always draws the same frame, forwards or back.
   ───────────────────────────────────────────────────────────────────────── */

import type { AnatomyBlockId } from "./agent-anatomy.content";

export type { AnatomyBlockId };
export type Dir = "r" | "l" | "d" | "u";

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Seg extends Pt {
  x2: number;
  y2: number;
  /** which way the segment travels: the clip-path reveals along this axis */
  dir: Dir;
  /** length in die units */
  len: number;
  /** the padded box the segment's group is clipped against (die units) */
  box: Box;
}

export interface Block {
  id: AnatomyBlockId;
  x: number;
  y: number;
  w: number;
  h: number;
  /** label baseline */
  lx: number;
  ly: number;
  /** spec baseline */
  sx: number;
  sy: number;
  /** "end" for the evaluator, whose spec sits at the strip's right */
  sAnchor: "start" | "end";
  /** drafted detail inside the block, as one stroked path */
  detail: string;
  /** the part of the detail this request lights, as one filled path */
  lit: string;
  /** index of the trace segment whose arrival lights it */
  litAt: number;
}

export interface Port {
  id: "in" | "out" | "human";
  x: number;
  y: number;
  w: number;
  h: number;
  lx: number;
  ly: number;
  anchor: "start" | "middle" | "end";
}

export interface TextAt extends Pt {
  anchor: "start" | "middle" | "end";
}

export interface Gauge {
  x0: number;
  x1: number;
  y: number;
  /** the ten minor ticks (0.8 excluded) */
  ticks: string;
  /** the 0.80 tick, taller */
  tick80: string;
  label80: TextAt;
  /** the two end labels, 0.0 and 1.0 */
  lo: TextAt;
  hi: TextAt;
  /** where 0.61 lands: a signal tick */
  tickValue: string;
}

export interface Die {
  /** the die square's edge, in die units */
  size: number;
  half: number;
  /** the ring bus half-size */
  ring: number;
  blocks: Block[];
  ports: Port[];
  pins: string;
  grid: string;
  /** ink wiring under the trace, plus the stubs the request does not take */
  wires: string;
  /** pin one: a small filled triangle, the division's glyph */
  pin1: string;
  /** the four tool rows inside the router: square + text baseline */
  toolRows: Array<{ sq: Box; tx: number; ty: number }>;
  gauge: Gauge;
  trace: Seg[];
  /** the arrowhead at the end of the walk */
  arrow: string;
  labels: { request: TextAt; readout: TextAt; exit: TextAt; title: TextAt };
  /** the drawing's extent in die units, labels included: the camera frames this */
  ext: Box;
}

export interface AnatomyPlan {
  phone: boolean;
  vb: { w: number; h: number };
  /** the camera looks here at rest */
  centre: Pt;
  /** circle radius */
  r: number;
  /** index = COMPRESSION agent index (0 the orchestrator, 1..4 the workers) */
  agents: Pt[];
  /** the agent the camera pushes into */
  verify: number;
  bus: string;
  /** name positions under / beside each circle */
  names: TextAt[];
  /** the lock-on brackets: screen-fixed at the viewBox centre, the size the
      Verify circle reaches at 3x, so the circle grows into them */
  reticle: string;
  die: Die;
}

const f2 = (v: number) => Math.round(v * 100) / 100;

/* ── the die, authored at 400 and scaled by f ─────────────────────────── */
function buildDie(size: number, phone: boolean): Die {
  const f = size / 400;
  // label and spec baselines below a block's top edge: phones set larger type, so wider leading
  const LY = phone ? 25 : 22;
  const SY = phone ? 45 : 38;
  const u = (v: number) => f2(v * f);
  const half = u(200);
  const ring = u(185);

  // 2 x 2 + a centre strip, 30 in from the edge, a 40-wide channel between
  const bx = { l: -170, r: 20, w: 150 };
  const rows = { top: -170, bot: 60, h: 110 };

  const square = (x: number, y: number, s: number) => `M${u(x)} ${u(y)}h${u(s)}v${u(s)}h${u(-s)}z`;
  const squares = (x0: number, y: number, n: number, s: number, step: number, only?: number[]) =>
    Array.from({ length: n }, (_, i) => i)
      .filter((i) => !only || only.includes(i))
      .map((i) => square(x0 + i * step, y, s))
      .join("");
  const cells = (x0: number, y0: number, cols: number, rowsN: number, c: number) => {
    let d = "";
    for (let i = 0; i <= cols; i++) d += `M${u(x0 + i * c)} ${u(y0)}V${u(y0 + rowsN * c)}`;
    for (let j = 0; j <= rowsN; j++) d += `M${u(x0)} ${u(y0 + j * c)}H${u(x0 + cols * c)}`;
    return d;
  };
  const filledCells = (x0: number, y0: number, cols: number, c: number, n: number) =>
    Array.from({ length: n }, (_, i) => square(x0 + (i % cols) * c + 1.5, y0 + Math.floor(i / cols) * c + 1.5, c - 3)).join("");

  // the four tool rows inside the router, under the trace line at y 115
  const toolY = [130, 142, 154, 166];
  const toolRows = toolY.map((y) => ({
    sq: { x: u(bx.l + 10), y: u(y - 5.5), w: u(5), h: u(5) },
    tx: u(bx.l + 22),
    ty: u(y),
  }));
  const toolSq = (i: number) => square(bx.l + 10, toolY[i] - 5.5, 5);

  // the trace leaves memory at x 95, and rides the gauge in the evaluator
  const g0 = -152.5;
  const g1 = 97.5;
  const gx = (c: number) => g0 + (g1 - g0) * c;
  const xv = gx(0.61); // = 0: the drop to the human port runs down the channel

  const blocks: Block[] = [
    {
      id: "planner",
      x: u(bx.l), y: u(rows.top), w: u(bx.w), h: u(rows.h),
      lx: u(bx.l + 10), ly: u(rows.top + LY), sx: u(bx.l + 10), sy: u(rows.top + SY), sAnchor: "start",
      // six steps, as six squares; this request plans four
      detail: squares(bx.l + 10, rows.top + 82, 6, 10, 18),
      lit: squares(bx.l + 10, rows.top + 82, 6, 10, 18, [0, 1, 2, 3]),
      litAt: 1,
    },
    {
      id: "memory",
      x: u(bx.r), y: u(rows.top), w: u(bx.w), h: u(rows.h),
      lx: u(bx.r + 10), ly: u(rows.top + LY), sx: u(bx.r + 10), sy: u(rows.top + SY), sAnchor: "start",
      // the window as an 8 x 4 cell grid (256 tokens a cell); this request holds 11 cells
      detail: cells(bx.r + 10, rows.top + 70, 8, 4, 8),
      lit: filledCells(bx.r + 10, rows.top + 70, 8, 8, 11),
      litAt: 2,
    },
    {
      id: "evaluator",
      x: u(bx.l), y: u(-40), w: u(340), h: u(80),
      lx: u(bx.l + 10), ly: u(-24), sx: u(170 - 10), sy: u(-24), sAnchor: "end",
      detail: "",
      lit: "",
      litAt: 9,
    },
    {
      id: "router",
      x: u(bx.l), y: u(rows.bot), w: u(bx.w), h: u(rows.h),
      lx: u(bx.l + 10), ly: u(rows.bot + LY), sx: u(bx.l + 10), sy: u(rows.bot + SY), sAnchor: "start",
      detail: toolY.map((_, i) => toolSq(i)).join(""),
      // vendor.lookup and ledger.read run
      lit: toolSq(1) + toolSq(2),
      litAt: 6,
    },
    {
      id: "guardrails",
      x: u(bx.r), y: u(rows.bot), w: u(bx.w), h: u(rows.h),
      lx: u(bx.r + 10), ly: u(rows.bot + LY), sx: u(bx.r + 10), sy: u(rows.bot + SY), sAnchor: "start",
      // seven permitted actions; one is checked
      detail: squares(bx.r + 10, rows.bot + 78, 7, 8, 16),
      lit: squares(bx.r + 10, rows.bot + 78, 7, 8, 16, [2]),
      litAt: 7,
    },
  ];

  // ports straddle the edge; IN and OUT on the top row's line, HUMAN at the foot
  const ports: Port[] = [
    { id: "in", x: u(-216), y: u(-123), w: u(16), h: u(16), lx: u(-208), ly: u(-130), anchor: "middle" },
    { id: "out", x: u(200), y: u(-123), w: u(16), h: u(16), lx: u(208), ly: u(-130), anchor: "middle" },
    { id: "human", x: u(-8), y: u(200), w: u(16), h: u(16), lx: u(14), ly: u(227), anchor: "start" },
  ];

  // pins every 20 along each edge, 12 deep, skipping the port zones
  let pins = "";
  for (let v = -180; v <= 180; v += 20) {
    pins += `M${u(v)} ${u(-200)}V${u(-212)}`;
    if (v !== 0) pins += `M${u(v)} ${u(200)}V${u(212)}`;
    if (v !== -120 && v !== -100) {
      pins += `M${u(-200)} ${u(v)}H${u(-212)}`;
      pins += `M${u(200)} ${u(v)}H${u(212)}`;
    }
  }

  // the paper's drafting grid, continued inside the die at 20 units
  let grid = "";
  for (let v = -180; v <= 180; v += 20) grid += `M${u(v)} ${u(-200)}V${u(200)}M${u(-200)} ${u(v)}H${u(200)}`;

  // the confidence gauge along the evaluator's centre line: 0.0 at g0, 1.0 at g1
  let ticks = "";
  for (let i = 0; i <= 10; i++) if (i !== 8) ticks += `M${u(gx(i / 10))} ${u(-4)}V0`;
  ticks += `M${u(g0)} 0H${u(g1)}`;
  const gauge: Gauge = {
    x0: u(g0), x1: u(g1), y: 0,
    ticks,
    tick80: `M${u(gx(0.8))} ${u(-11)}V${u(3)}`,
    label80: { x: u(gx(0.8)), y: u(15), anchor: "middle" },
    lo: { x: u(g0), y: u(15), anchor: "middle" },
    hi: { x: u(g1), y: u(15), anchor: "middle" },
    tickValue: `M${u(xv)} ${u(-9)}V${u(3)}`,
  };

  // the request's walk, eleven straight segments
  // the climbs run up the blocks' right margins (x 160), clear of every spec line
  const cx = 160;
  const raw: Array<[number, number, number, number]> = [
    [-216, -115, -95, -115], // 0 in port -> planner
    [-95, -115, cx, -115], // 1 planner -> memory, across the channel
    [cx, -115, cx, -185], // 2 memory -> up to the ring bus
    [cx, -185, -185, -185], // 3 along the top of the ring
    [-185, -185, -185, 115], // 4 down the left of the ring
    [-185, 115, -95, 115], // 5 into the tool router
    [-95, 115, cx, 115], // 6 tool router -> guardrails
    [cx, 115, cx, 0], // 7 guardrails -> up into the evaluator
    [cx, 0, xv, 0], // 8 into the gauge at 1.0, past 0.80, down to 0.61
    [xv, 0, xv, 200], // 9 straight down the channel to the human port
    [xv, 200, xv, 234], // 10 out through the port
  ];
  const pad = 3;
  const trace: Seg[] = raw.map(([x, y, x2, y2]) => {
    const dir: Dir = x2 > x ? "r" : x2 < x ? "l" : y2 > y ? "d" : "u";
    const bx0 = Math.min(x, x2) - pad;
    const by0 = Math.min(y, y2) - pad;
    return {
      x: u(x), y: u(y), x2: u(x2), y2: u(y2), dir,
      len: u(Math.abs(x2 - x) + Math.abs(y2 - y)),
      box: { x: u(bx0), y: u(by0), w: u(Math.abs(x2 - x) + 2 * pad), h: u(Math.abs(y2 - y) + 2 * pad) },
    };
  });

  // ink wiring: every trace route, plus the stubs this request never takes
  let wires = raw.map(([x, y, x2, y2]) => `M${u(x)} ${u(y)}L${u(x2)} ${u(y2)}`).join("");
  wires +=
    `M${u(-95)} ${u(-170)}V${u(-185)}` + // planner -> ring
    `M${u(170)} ${u(-115)}H${u(200)}` + // memory -> out port
    `M${u(170)} ${u(115)}H${u(185)}` + // guardrails -> ring
    `M${u(-170)} ${u(0)}H${u(-185)}` + // evaluator -> ring, left
    `M${u(170)} ${u(0)}H${u(185)}`; // evaluator -> ring, right

  const pin1 = `M${u(-196)} ${u(-196)}h${u(9)}l${u(-9)} ${u(9)}z`;
  const arrow = `M${u(xv - 4)} ${u(234)}h${u(8)}l${u(-4)} ${u(7)}z`;

  return {
    size,
    half,
    ring,
    blocks,
    ports,
    pins,
    grid,
    wires,
    pin1,
    toolRows,
    gauge,
    trace,
    arrow,
    labels: {
      request: { x: u(-193), y: u(-92), anchor: "end" },
      readout: { x: u(xv - 10), y: u(28), anchor: "end" },
      exit: { x: u(xv - 10), y: u(239), anchor: "end" },
      title: { x: u(212), y: u(239), anchor: "end" },
    },
    // labels included: IN's request tag reaches x -244 (desktop; phones print
    // the request in the HUD instead), the walk's arrow and labels y 244
    ext: phone ? { x: u(-218), y: u(-216), w: u(436), h: u(462) } : { x: u(-246), y: u(-216), w: u(466), h: u(462) },
  };
}

/* ── the plan ─────────────────────────────────────────────────────────── */
export function buildPlan(phone: boolean): AnatomyPlan {
  const r = 48;
  // phones: the stage between the chrome lanes is about 350 x 310 px, so the
  // sheet is square; a portrait sheet would shrink the plan to fit its height
  const vb = phone ? { w: 1000, h: 1000 } : { w: 1600, h: 1000 };
  const o = phone ? { x: 500, y: 330 } : { x: 800, y: 360 };
  const busY = phone ? 430 : 470;
  const ay = phone ? 550 : 600;
  const xs = phone ? [260, 420, 580, 740] : [500, 700, 900, 1100];
  const agents: Pt[] = [o, ...xs.map((x) => ({ x, y: ay }))];
  const bus = `M${o.x} ${o.y + r}V${busY}M${xs[0]} ${busY}H${xs[3]}` + xs.map((x) => `M${x} ${busY}V${ay - r}`).join("");
  const names: TextAt[] = [
    { x: o.x + r + 18, y: o.y + 5, anchor: "start" },
    ...xs.map((x) => ({ x, y: ay + r + 34, anchor: "middle" as const })),
  ];
  const c = { x: vb.w / 2, y: vb.h / 2 };
  return {
    phone,
    vb,
    centre: phone ? { x: 500, y: 470 } : { x: 800, y: 500 },
    r,
    agents,
    verify: 2,
    bus,
    names,
    reticle: reticle(c, r * 3, 26),
    die: buildDie(phone ? 360 : 400, phone),
  };
}

/** four corner brackets round a point: the camera locking on */
function reticle(c: Pt, half: number, arm: number): string {
  const { x, y } = c;
  return (
    `M${x - half} ${y - half + arm}V${y - half}H${x - half + arm}` +
    `M${x + half - arm} ${y - half}H${x + half}V${y - half + arm}` +
    `M${x + half} ${y + half - arm}V${y + half}H${x + half - arm}` +
    `M${x - half + arm} ${y + half}H${x - half}V${y + half - arm}`
  );
}

/* ── the camera, as pure functions of the scrubbed progress p ─────────── */
export const ZOOM_MAX = 14;
/** the zoom reaches ZOOM_MAX here; the trace runs after it */
export const ZOOM_END = 0.75;
/** the look-at slides from the plan's centre onto Verify by here */
export const PAN_END = 0.22;
export const TRACE_START = 0.74;
/** per segment, in p (0.02 x 11 = 0.22: the walk ends at 0.96) */
export const TRACE_STEP = 0.02;

/** opacity windows, in p: [from, to] */
export const WIN = {
  copyOut: [0.08, 0.2],
  reticleIn: [0.04, 0.14],
  reticleOut: [0.26, 0.34],
  vnameOut: [0.14, 0.24],
  othersOut: [0.18, 0.3],
  dieIn: [0.2, 0.32],
  blocksIn: [0.3, 0.4],
  specsIn: [0.56, 0.64],
} as const;
/** the HUD names the agent once the camera has locked on */
export const LOCK_AT = 0.16;
/** blocks answer the pointer once their labels are legible */
export const LIVE_AT = 0.38;
/** the request tag at the IN port */
export const REQUEST_AT = TRACE_START - 0.012;

export const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = (a: number, b: number, v: number) => {
  const t = sat((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const zoomAt = (p: number) => 1 + (ZOOM_MAX - 1) * inOutCubic(sat(p / ZOOM_END));
const win = (w: readonly [number, number], p: number) => smooth(w[0], w[1], p);

/** p at which trace segment i starts and ends */
export const segStart = (i: number) => TRACE_START + i * TRACE_STEP;
export const segEnd = (i: number) => TRACE_START + (i + 1) * TRACE_STEP;
/** how much of segment i is lit at p, 0..1 */
export const segAt = (i: number, p: number) => sat((p - segStart(i)) / TRACE_STEP);

/* ── fitting the die to the frame (measured on resize only) ───────────── */
export interface Camera {
  /** px per viewBox unit (preserveAspectRatio meet) */
  m: number;
  /** die units -> viewBox units */
  k: number;
  /** px per die unit at ZOOM_MAX: what type sizes are solved against */
  ppu: number;
  /** the look-at at ZOOM_MAX: Verify, nudged to the die drawing's centre */
  focus: Pt;
}

/**
 * The largest die that (a) fits the frame at ZOOM_MAX with 8% of air and
 * (b) still sits inside the Verify circle at 1x (it is the circle's
 * interior), for a figure box of W x H px.
 */
export function fitCamera(plan: AnatomyPlan, W: number, H: number): Camera {
  const m = Math.max(1e-3, Math.min(W / plan.vb.w, H / plan.vb.h));
  const visW = W / (m * ZOOM_MAX);
  const visH = H / (m * ZOOM_MAX);
  const { ext, half } = plan.die;
  const fitK = Math.min((0.92 * visW) / ext.w, (0.92 * visH) / ext.h);
  // the die's far corner (pins included) inside the circle, with 6% of air
  const circleK = (0.94 * plan.r) / Math.hypot(half * 1.06, half);
  const k = Math.min(fitK, circleK);
  const v = plan.agents[plan.verify];
  return {
    m,
    k,
    ppu: m * ZOOM_MAX * k,
    focus: { x: v.x + k * (ext.x + ext.w / 2), y: v.y + k * (ext.y + ext.h / 2) },
  };
}

/** type sizes in die units: legible at ZOOM_MAX (minPx), never larger than the block allows */
export function typeSizes(plan: AnatomyPlan, cam: Camera) {
  // [min px at 14x, base, max] in die units; the max is what the block's width
  // allows (phones print shorter labels and specs, so their ceiling is higher)
  const fit = (minPx: number, base: number, max: number) => f2(Math.min(max, Math.max(base, minPx / cam.ppu)));
  const ph = plan.phone;
  return {
    agent: f2(12 / cam.m), // plan type, in viewBox units: 12px at 1x
    block: ph ? fit(12, 10, 15) : fit(13, 10, 12),
    spec: ph ? fit(10, 8, 13) : fit(11, 8, 9),
    tiny: ph ? fit(9, 6.5, 12) : fit(10, 6.5, 7.5),
    trace: ph ? fit(11, 9, 14) : fit(12, 9, 11),
    /** the paper halo under labels that cross line-work */
    halo: f2(Math.max(2, 2.5 / cam.ppu)),
  };
}

/* ── one frame ────────────────────────────────────────────────────────── */
export interface Frame {
  s: number;
  /** the zoom group's transform attribute */
  zoom: string;
  /** "14.0x" */
  zoomText: string;
  copy: number;
  reticle: number;
  vname: number;
  others: number;
  die: number;
  blocks: number;
  specs: number;
  locked: boolean;
  live: boolean;
}

export function frameAt(p: number, plan: AnatomyPlan, cam: Camera): Frame {
  const s = zoomAt(p);
  const w = smooth(0.02, PAN_END, p);
  const fx = plan.centre.x + (cam.focus.x - plan.centre.x) * w;
  const fy = plan.centre.y + (cam.focus.y - plan.centre.y) * w;
  const cx = plan.vb.w / 2;
  const cy = plan.vb.h / 2;
  const zoom = `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${(-fx).toFixed(3)} ${(-fy).toFixed(3)})`;
  return {
    s,
    zoom,
    zoomText: `${(Math.round(s * 10) / 10).toFixed(1)}x`,
    copy: 1 - win(WIN.copyOut, p),
    reticle: win(WIN.reticleIn, p) * (1 - win(WIN.reticleOut, p)),
    vname: 1 - win(WIN.vnameOut, p),
    others: 1 - win(WIN.othersOut, p),
    die: win(WIN.dieIn, p),
    blocks: win(WIN.blocksIn, p),
    specs: win(WIN.specsIn, p),
    locked: p >= LOCK_AT,
    live: p >= LIVE_AT,
  };
}

/** the clip that shows fraction q of segment g, along its own axis */
export function segClip(g: Seg, q: number): string {
  const { box } = g;
  const pct = (v: number, of: number) => `${(sat(v / of) * 100).toFixed(2)}%`;
  switch (g.dir) {
    case "r":
      return `inset(0 ${pct(box.x + box.w - (g.x + q * g.len), box.w)} 0 0)`;
    case "l":
      return `inset(0 0 0 ${pct(g.x - q * g.len - box.x, box.w)})`;
    case "d":
      return `inset(0 0 ${pct(box.y + box.h - (g.y + q * g.len), box.h)} 0)`;
    default:
      return `inset(${pct(g.y - q * g.len - box.y, box.h)} 0 0 0)`;
  }
}

/** where the request is at p: the packet sits at the head of the lit trace */
export function packetAt(plan: AnatomyPlan, p: number): Pt | null {
  const segs = plan.die.trace;
  if (p < segStart(0)) return null;
  for (let i = 0; i < segs.length; i++) {
    if (p <= segEnd(i)) {
      const g = segs[i];
      const q = segAt(i, p);
      return { x: g.x + (g.x2 - g.x) * q, y: g.y + (g.y2 - g.y) * q };
    }
  }
  const last = segs[segs.length - 1];
  return { x: last.x2, y: last.y2 };
}

/** which trace segment the walk is on (or just finished) at p; -1 before it starts */
export function segIndexAt(p: number, n: number): number {
  if (p < segStart(0)) return -1;
  return Math.min(n - 1, Math.floor((p - TRACE_START) / TRACE_STEP));
}

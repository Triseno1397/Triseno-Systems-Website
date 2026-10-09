/* ─────────────────────────────────────────────────────────────────────────
   Fig. 05 / Anatomy — the geometry.

   Two drawings in one SVG:
   · the PLAN, in viewBox units (1600 x 1000; 1000 x 1250 on phones): the
     five agents from Compression redrawn as hairline circles on a bus, the
     size of a hand in the middle of an empty page;
   · the DIE, authored in its own 400-unit square (360 on phones) centred on
     the Verify circle and scaled down to sit inside it. Five blocks, a ring
     bus, three ports, pins along the edges, a 20-unit drafting grid, a
     confidence gauge in the evaluator, and the eleven straight segments the
     request PO-8841 walks: in at the IN port, through the planner into
     memory, up and round the ring bus to the tool router, across to
     guardrails, up into the evaluator where it rides the gauge from the right
     end past the 0.80 tick to 0.61, and straight down out of the HUMAN port.

   Everything is pre-authored so the component writes one transform per
   frame and never measures geometry. All strokes are non-scaling, so a
   hairline is 1px at 1x and at 14x.
   ───────────────────────────────────────────────────────────────────────── */

export type AnatomyBlockId = "planner" | "memory" | "router" | "guardrails" | "evaluator";
export type Dir = "r" | "l" | "d" | "u";

export interface Pt {
  x: number;
  y: number;
}

export interface Seg extends Pt {
  x2: number;
  y2: number;
  /** which way the segment travels: the clip-path reveals along this axis */
  dir: Dir;
  /** length in die units */
  len: number;
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
  /** drafted detail inside the block, as one path */
  detail: string;
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
  /** the ten minor ticks */
  ticks: string;
  /** the 0.80 tick */
  threshold: Pt & { label: TextAt };
  /** where 0.61 lands */
  value: Pt;
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
  /** the four tool rows inside the router: square + rule + text baseline */
  toolRows: Array<{ sq: Pt; x1: number; x2: number; tx: number; ty: number }>;
  gauge: Gauge;
  trace: Seg[];
  labels: { request: TextAt; readout: TextAt; exit: TextAt; title: TextAt };
}

export interface AnatomyPlan {
  vb: { w: number; h: number };
  /** the frame centre: the camera looks here at rest and zooms about it */
  centre: Pt;
  /** circle radius */
  r: number;
  /** index = COMPRESSION agent index (0 the orchestrator, 1..4 the workers) */
  agents: Pt[];
  /** the agent the camera pushes into */
  verify: number;
  bus: string;
  /** the lock-on brackets round Verify */
  reticle: string;
  die: Die;
}

const f2 = (v: number) => Math.round(v * 100) / 100;

/* ── the die, authored at 400 and scaled by f ─────────────────────────── */
function buildDie(size: number): Die {
  const f = size / 400;
  const u = (v: number) => f2(v * f);
  const half = u(200);
  const ring = u(185);

  // 2 x 2 + a centre strip, 30 in from the edge, a 20-wide channel between
  const bx = { l: -170, r: 20, w: 150 };
  const rows = { top: -170, bot: 60, h: 110 };

  const squares = (x0: number, y: number, n: number, s: number, step: number) =>
    Array.from({ length: n }, (_, i) => `M${u(x0 + i * step)} ${u(y)}h${u(s)}v${u(s)}h${u(-s)}z`).join("");
  const cells = (x0: number, y0: number, cols: number, rowsN: number, c: number) => {
    let d = "";
    for (let i = 0; i <= cols; i++) d += `M${u(x0 + i * c)} ${u(y0)}V${u(y0 + rowsN * c)}`;
    for (let j = 0; j <= rowsN; j++) d += `M${u(x0)} ${u(y0 + j * c)}H${u(x0 + cols * c)}`;
    return d;
  };

  const blocks: Block[] = [
    {
      id: "planner",
      x: u(bx.l), y: u(rows.top), w: u(bx.w), h: u(rows.h),
      lx: u(bx.l + 10), ly: u(rows.top + 22), sx: u(bx.l + 10), sy: u(rows.top + 38),
      // six steps, as six squares
      detail: squares(bx.l + 10, rows.top + 84, 6, 10, 18),
    },
    {
      id: "memory",
      x: u(bx.r), y: u(rows.top), w: u(bx.w), h: u(rows.h),
      lx: u(bx.r + 10), ly: u(rows.top + 22), sx: u(bx.r + 10), sy: u(rows.top + 38),
      // the window, as an 8 x 4 cell grid
      detail: cells(bx.r + 12, rows.top + 70, 8, 4, 8),
    },
    {
      id: "evaluator",
      x: u(bx.l), y: u(-40), w: u(340), h: u(80),
      lx: u(bx.l + 10), ly: u(-22), sx: u(170 - 10), sy: u(-22),
      detail: "",
    },
    {
      id: "router",
      x: u(bx.l), y: u(rows.bot), w: u(bx.w), h: u(rows.h),
      lx: u(bx.l + 10), ly: u(rows.bot + 22), sx: u(bx.l + 10), sy: u(rows.bot + 38),
      detail: "",
    },
    {
      id: "guardrails",
      x: u(bx.r), y: u(rows.bot), w: u(bx.w), h: u(rows.h),
      lx: u(bx.r + 10), ly: u(rows.bot + 22), sx: u(bx.r + 10), sy: u(rows.bot + 38),
      // seven permitted actions
      detail: squares(bx.r + 10, rows.bot + 76, 7, 8, 16),
    },
  ];

  // the four tool rows inside the router, under the trace line at y 115
  const toolRows = [124, 136, 148, 160].map((y) => ({
    sq: { x: u(bx.l + 10), y: u(y - 5) },
    x1: u(bx.l + 22),
    x2: u(bx.l + bx.w - 10),
    tx: u(bx.l + 24),
    ty: u(y - 7),
  }));

  // ports straddle the edge; IN and OUT on the top row's line, HUMAN at the foot
  const ports: Port[] = [
    { id: "in", x: u(-216), y: u(-123), w: u(16), h: u(16), lx: u(-224), ly: u(-110), anchor: "end" },
    { id: "out", x: u(200), y: u(-123), w: u(16), h: u(16), lx: u(224), ly: u(-110), anchor: "start" },
    { id: "human", x: u(-8), y: u(200), w: u(16), h: u(16), lx: u(14), ly: u(212), anchor: "start" },
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

  // the 32px paper grid, continued inside the die at 20 units
  let grid = "";
  for (let v = -180; v <= 180; v += 20) grid += `M${u(v)} ${u(-200)}V${u(200)}M${u(-200)} ${u(v)}H${u(200)}`;

  // the confidence gauge along the evaluator's centre line: 0.0 at x0, 1.0 at x1
  const g0 = -152.5;
  const g1 = 97.5;
  const gx = (c: number) => g0 + (g1 - g0) * c;
  let ticks = "";
  for (let i = 0; i <= 10; i++) if (i !== 8) ticks += `M${u(gx(i / 10))} ${u(-5)}V0`;
  const gauge: Gauge = {
    x0: u(g0), x1: u(g1), y: 0,
    ticks,
    threshold: { x: u(gx(0.8)), y: u(-12), label: { x: u(gx(0.8)), y: u(16), anchor: "middle" } },
    value: { x: u(gx(0.61)), y: 0 },
  };
  const xv = u(gx(0.61)); // 0.0 on this gauge: the drop to the human port

  // the request's walk, eleven straight segments
  const raw: Array<[number, number, number, number]> = [
    [-216, -115, -95, -115], // in port -> planner
    [-95, -115, 95, -115], // planner -> memory, through the channel
    [95, -115, 95, -185], // memory -> up to the ring bus
    [95, -185, -185, -185], // along the top of the ring
    [-185, -185, -185, 115], // down the left of the ring
    [-185, 115, -95, 115], // into the tool router
    [-95, 115, g1, 115], // tool router -> guardrails
    [g1, 115, g1, 0], // guardrails -> up into the evaluator, at the gauge's end
    [g1, 0, gx(0.61), 0], // along the gauge, past 0.80, to 0.61
    [gx(0.61), 0, gx(0.61), 200], // straight down to the human port
    [gx(0.61), 200, gx(0.61), 250], // out through the port
  ];
  const trace: Seg[] = raw.map(([x, y, x2, y2]) => {
    const dir: Dir = x2 > x ? "r" : x2 < x ? "l" : y2 > y ? "d" : "u";
    return { x: u(x), y: u(y), x2: u(x2), y2: u(y2), dir, len: u(Math.abs(x2 - x) + Math.abs(y2 - y)) };
  });

  return {
    size,
    half,
    ring,
    blocks,
    ports,
    pins,
    grid,
    toolRows,
    gauge,
    trace,
    labels: {
      request: { x: u(-224), y: u(-94), anchor: "end" },
      readout: { x: f2(xv - u(12)), y: u(26), anchor: "end" },
      exit: { x: u(14), y: u(242), anchor: "start" },
      title: { x: u(212), y: u(236), anchor: "end" },
    },
  };
}

/* ── the plan ─────────────────────────────────────────────────────────── */
export function buildPlan(phone: boolean): AnatomyPlan {
  const r = 48;
  if (phone) {
    const vb = { w: 1000, h: 1250 };
    const o = { x: 500, y: 440 };
    const busY = 540;
    const ay = 660;
    const xs = [260, 420, 580, 740];
    const agents: Pt[] = [o, ...xs.map((x) => ({ x, y: ay }))];
    const bus = `M${o.x} ${o.y + r}V${busY}M${xs[0]} ${busY}H${xs[3]}` + xs.map((x) => `M${x} ${busY}V${ay - r}`).join("");
    const v = agents[2];
    return { vb, centre: { x: 500, y: 600 }, r, agents, verify: 2, bus, reticle: reticle(v, 72, 16), die: buildDie(360) };
  }
  const vb = { w: 1600, h: 1000 };
  const o = { x: 800, y: 360 };
  const busY = 470;
  const ay = 600;
  const xs = [500, 700, 900, 1100];
  const agents: Pt[] = [o, ...xs.map((x) => ({ x, y: ay }))];
  const bus = `M${o.x} ${o.y + r}V${busY}M${xs[0]} ${busY}H${xs[3]}` + xs.map((x) => `M${x} ${busY}V${ay - r}`).join("");
  const v = agents[2];
  return { vb, centre: { x: 800, y: 500 }, r, agents, verify: 2, bus, reticle: reticle(v, 72, 16), die: buildDie(400) };
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
export const PAN_END = 0.22;
export const TRACE_START = 0.74;
/** per segment, in p */
export const TRACE_STEP = 0.02;

export const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = (a: number, b: number, v: number) => {
  const t = sat((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const zoomAt = (p: number) => 1 + (ZOOM_MAX - 1) * inOutCubic(sat(p / ZOOM_END));

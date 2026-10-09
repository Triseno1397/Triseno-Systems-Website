import { COMPRESSION } from "./content";

/* ─────────────────────────────────────────────────────────────────────────
   THE COMPRESSION STAGE, IN STAGE PIXELS.

   computeLayout() is CubeCompression's layout, moved here unchanged so the
   mercury stage (MercuryCompression.tsx) reads the same positions: twelve
   manual steps on a serpentine trail (two rows of six; four rows of three on
   a phone), five system nodes (an orchestrator over four agents), the two
   floor hairlines and the cyan bus. Everything is in px of the measured
   stage, so the DOM trail, floors and tags and the raymarched canvas share
   one coordinate frame with no projection to match.

   mercuryFrame() derives what differs for spheres: the bead radius, the
   final agent radii (volume conserved, so r = r0 · cbrt(steps absorbed)),
   floors drawn just under the bodies, a bus that meets them, and whether the
   step tags fit beside a bead or go under it.
   ───────────────────────────────────────────────────────────────────────── */

const STEPS = COMPRESSION.steps;
const COLLAPSE = COMPRESSION.collapseTo;
const AGENT_N = COMPRESSION.agents.length;

/** a fixed, hand-set mess: x (fraction of cell), y (fraction of cube), rotation in degrees */
const JITTER: Array<[number, number, number]> = [
  [-0.06, -0.12, -6],
  [0.1, 0.16, 5],
  [-0.08, -0.05, 8],
  [0.12, 0.2, -4],
  [-0.1, -0.18, 3],
  [0.05, 0.08, -8],
  [0.09, -0.14, 6],
  [-0.12, 0.12, -5],
  [0.07, -0.2, 4],
  [-0.05, 0.15, -7],
  [0.11, -0.06, 9],
  [-0.09, 0.1, -3],
];

export interface Pt {
  x: number;
  y: number;
}

export interface Layout {
  W: number;
  H: number;
  /** cube edge in px */
  s: number;
  pad: number;
  narrow: boolean;
  manual: Array<Pt & { r: number }>;
  /** 0 = orchestrator, 1..4 = agents */
  nodes: Pt[];
  oScale: number;
  floors: [number, number];
  trail: string;
  bus: string;
}

export function computeLayout(W: number): Layout {
  const narrow = W < 860;
  const pad = narrow ? 14 : 28;
  const inner = W - pad * 2;

  if (narrow) {
    const cols = 3;
    const cell = inner / cols;
    const s = Math.round(Math.min(112, cell * 0.84));
    const rh = s * 1.42;
    const oScale = 1.15;

    const manual = STEPS.map((_, i) => {
      const row = Math.floor(i / cols);
      const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      const [jx, jy, jr] = JITTER[i];
      return { x: pad + cell * (col + 0.5) + jx * cell * 0.7, y: pad + s * 0.78 + row * rh + jy * s * 0.6, r: jr * 0.7 };
    });
    const manualH = pad + s * 0.78 + 3 * rh + s * 0.8 + pad;

    const y0 = pad + s * 0.72 * oScale + 6;
    const floor1 = y0 + s * 0.66 * oScale;
    const ya = floor1 + 34 + s * 0.72;
    const yb = ya + s * 1.5;
    const floor2 = yb + s * 0.66;
    const xl = pad + inner * 0.27;
    const xr = pad + inner * 0.73;
    const nodes: Pt[] = [
      { x: W / 2, y: y0 },
      { x: xl, y: ya },
      { x: xr, y: ya },
      { x: xl, y: yb },
      { x: xr, y: yb },
    ];
    const compH = floor2 + 34 + pad;
    const bus = `M${W / 2} ${floor1} V${yb} M${xl} ${ya} H${xr} M${xl} ${yb} H${xr}`;

    return {
      W,
      H: Math.ceil(Math.max(manualH, compH)),
      s,
      pad,
      narrow,
      manual,
      nodes,
      oScale,
      floors: [floor1, floor2],
      trail: "M" + manual.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L"),
      bus,
    };
  }

  const cols = 6;
  const cell = inner / cols;
  const s = Math.round(Math.min(136, cell * 0.66));
  const oScale = 1.2;
  const rh = s * 1.55 + 40;
  const y0 = pad + s * 0.72 * oScale + 6;
  const y1 = y0 + rh;

  const manual = STEPS.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    const [jx, jy, jr] = JITTER[i];
    return { x: pad + cell * (col + 0.5) + jx * cell, y: (row === 0 ? y0 : y1) + jy * s, r: jr };
  });

  const xs = [0.125, 0.375, 0.625, 0.875].map((f) => pad + inner * f);
  const nodes: Pt[] = [{ x: W / 2, y: y0 }, ...xs.map((x) => ({ x, y: y1 }))];
  const floor1 = y0 + s * 0.66 * oScale;
  const floor2 = y1 + s * 0.66;
  const agentTop = y1 - s * 0.74;
  const busY = agentTop - 20;
  const bus =
    `M${W / 2} ${floor1} V${busY} M${xs[0]} ${busY} H${xs[3]} ` + xs.map((x) => `M${x} ${busY} V${agentTop}`).join(" ");

  return {
    W,
    H: Math.ceil(floor2 + 34 + pad),
    s,
    pad,
    narrow,
    manual,
    nodes,
    oScale,
    floors: [floor1, floor2],
    trail: "M" + manual.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L"),
    bus,
  };
}

/* ── the mercury's own frame, derived from the same nodes ── */

export interface MercuryFrame {
  /** resting bead radius, px */
  r0: number;
  /** each node's final radius once every step it owns has arrived (r0 · cbrt(n)) */
  rAgent: number[];
  /** how many steps each node absorbs in the scripted run */
  counts: number[];
  /** the two floor hairlines, just under the bodies */
  floors: [number, number];
  /** the cyan bus, meeting the bodies */
  bus: string;
  /** true: a step's name sits to the right of its bead; false: under it */
  tagBeside: boolean;
}

export function mercuryFrame(layout: Layout): MercuryFrame {
  const { W, pad, s, nodes, narrow } = layout;
  const r0 = Math.min(24, Math.max(14, s * 0.42));
  const counts = Array.from({ length: AGENT_N }, (_, n) => COLLAPSE.filter((c) => c === n).length);
  const rAgent = counts.map((n) => r0 * Math.cbrt(n));
  // a step name is ~150px of mono at 11px: beside the bead only when the cell has room
  const tagBeside = !narrow && (W - pad * 2) / 6 >= 190;
  // under each body: the floor, or the tag then the floor
  const under = tagBeside ? 14 : 34;
  const rO = rAgent[0];
  const rW = Math.max(...rAgent.slice(1));
  const f = (n: number) => n.toFixed(1);

  if (narrow) {
    const [o, a, b, c] = nodes;
    const floor1 = o.y + rO + under;
    const floor2 = c.y + rW + under;
    // the spine drops from the orchestrator's floor through the 2x2; the rungs run centre to centre behind the bodies
    const bus = `M${f(o.x)} ${f(floor1)} V${f(c.y)} M${f(a.x)} ${f(a.y)} H${f(b.x)} M${f(a.x)} ${f(c.y)} H${f(b.x)}`;
    return { r0, rAgent, counts, floors: [floor1, floor2], bus, tagBeside };
  }

  const o = nodes[0];
  const workers = nodes.slice(1);
  const floor1 = o.y + rO + under;
  const floor2 = workers[0].y + rW + under;
  const top = workers[0].y - rW - 4;
  const busY = Math.round((floor1 + 10 + top) / 2);
  const bus =
    `M${f(o.x)} ${f(floor1)} V${busY} M${f(workers[0].x)} ${busY} H${f(workers[workers.length - 1].x)} ` +
    workers.map((w) => `M${f(w.x)} ${busY} V${f(top)}`).join(" ");
  return { r0, rAgent, counts, floors: [floor1, floor2], bus, tagBeside };
}

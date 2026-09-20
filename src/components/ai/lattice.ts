// The "intelligence layer" lattice: three stacked planes of nodes joined by
// hairline edges. Pure data — shared by the R3F scene (LatticeScene) and the
// 2D poster fallback (LatticePoster) so both draw the same object.

export interface Lattice {
  count: number;
  /** xyz per node, lattice-local */
  positions: Float32Array;
  /** 0 | 1 | 2 — bottom (data), middle (intelligence), top (operations) */
  layer: Uint8Array;
  /** per-node breathing phase */
  phase: Float32Array;
  /** node index pairs */
  edges: Uint16Array;
  /** for each node, the edges that touch it */
  adjacency: number[][];
}

export const LAYERS = 3;
const COLS = 9;
const ROWS = 5;
const SPACING_X = 1.05;
const SPACING_Z = 1.0;
const LAYER_GAP = 1.55;

// Deterministic PRNG so server, client, poster and scene agree.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cached: Lattice | null = null;

export function buildLattice(): Lattice {
  if (cached) return cached;
  const rnd = mulberry32(20260920);
  const perLayer = COLS * ROWS;
  const count = perLayer * LAYERS;
  const positions = new Float32Array(count * 3);
  const layer = new Uint8Array(count);
  const phase = new Float32Array(count);
  const id = (l: number, r: number, c: number) => l * perLayer + r * COLS + c;

  for (let l = 0; l < LAYERS; l++) {
    // the middle plane — the intelligence layer — is the most regular one
    const jitter = l === 1 ? 0.1 : 0.24;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = id(l, r, c);
        positions[i * 3] = (c - (COLS - 1) / 2) * SPACING_X + (rnd() - 0.5) * jitter * 2;
        positions[i * 3 + 1] = (l - 1) * LAYER_GAP + (rnd() - 0.5) * jitter;
        positions[i * 3 + 2] = (r - (ROWS - 1) / 2) * SPACING_Z + (rnd() - 0.5) * jitter * 2;
        layer[i] = l;
        phase[i] = rnd() * Math.PI * 2;
      }
    }
  }

  const pairs: number[] = [];
  for (let l = 0; l < LAYERS; l++) {
    const keep = l === 1 ? 0.96 : 0.7;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c < COLS - 1 && rnd() < keep) pairs.push(id(l, r, c), id(l, r, c + 1));
        if (r < ROWS - 1 && rnd() < keep) pairs.push(id(l, r, c), id(l, r + 1, c));
        if (l === 1 && c < COLS - 1 && r < ROWS - 1 && rnd() < 0.22) pairs.push(id(l, r, c), id(l, r + 1, c + 1));
        if (l < LAYERS - 1) {
          if (rnd() < 0.42) pairs.push(id(l, r, c), id(l + 1, r, c));
          else if (c < COLS - 1 && rnd() < 0.16) pairs.push(id(l, r, c), id(l + 1, r, c + 1));
        }
      }
    }
  }

  const edges = new Uint16Array(pairs);
  const adjacency: number[][] = Array.from({ length: count }, () => []);
  for (let e = 0; e < edges.length / 2; e++) {
    adjacency[edges[e * 2]].push(e);
    adjacency[edges[e * 2 + 1]].push(e);
  }

  cached = { count, positions, layer, phase, edges, adjacency };
  return cached;
}

// Mutable bridge between the DOM (pointer, hero readout) and the scene.
// Written from event handlers, read in useFrame — no React render in between.
export const latticeState = {
  /** pointer in NDC, -1..1 (y up) */
  px: 0.35,
  py: 0.1,
  /** performance.now() of the last real pointer move; 0 = never */
  lastMove: 0,
  /** live counters for the hero readout */
  lit: 0,
  pulses: 0,
  /**
   * Which side of the frame the object should occupy: -1 left, +1 right.
   * Sections write this as they come on screen so the world slides away from
   * whichever side the copy card is on (bar.md rule 5) and the backdrop keeps
   * moving across what used to be hard cuts between sections.
   */
  side: 1,
};

/**
 * Where the light is: the real pointer, or — before the first move and after
 * 3.5s idle — a slow roaming point, so the lattice and the headline spotlight
 * always show the mechanism. Scene and hero both call this with the same clock
 * so the lit nodes and the spotlight stay together.
 */
export function pointerTarget(nowMs: number, wide: boolean): { x: number; y: number; idle: boolean } {
  const idle = latticeState.lastMove === 0 || nowMs - latticeState.lastMove > 3500;
  if (!idle) return { x: latticeState.px, y: latticeState.py, idle };
  const t = nowMs / 1000;
  return {
    x: (wide ? 0.1 : 0) + 0.62 * Math.sin(t * 0.31),
    y: 0.04 + 0.38 * Math.sin(t * 0.47 + 1.1),
    idle,
  };
}

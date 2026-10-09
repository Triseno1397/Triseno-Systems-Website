/* ─────────────────────────────────────────────────────────────────────────
   ONE EXAMPLE NIGHT — the figures Fig. 09 (NightWatch) is drawn from.

   Twelve hours, 18:00 to 06:00, nobody at the desk. One row per hour, counts
   only, all fictional. The totals are the ones the rest of the reel prints
   (the ticket at the gate, the session store, the credits roll): 2,318 tasks
   and 41 escalations (approvals + exceptions), 0 unhandled. The rows below
   are tuned so they sum to exactly those two numbers; NIGHT_TOTALS is
   computed from them, never typed twice.

   The second half of the file builds the constellation: one point of light
   per finished task, born at the frame's edge in the minute it finished and
   drifting in a slow loop to its place in the silhouette of the compressed
   system from chapter four (one orchestrator, four agents, the four buses
   between them). Everything is seeded, so the same night is drawn on every
   visit and every scroll back.
   ───────────────────────────────────────────────────────────────────────── */

export type NightHour = {
  /** wall-clock hour, 0..23 */
  readonly h: number;
  readonly tasks: number;
  readonly approvals: number;
  readonly exceptions: number;
};

/** the night starts at 18:00 and runs 12 hours */
export const NIGHT_START_HOUR = 18;
export const NIGHT_LEN = 12;

export const NIGHT_HOURS: readonly NightHour[] = [
  { h: 18, tasks: 212, approvals: 4, exceptions: 2 },
  { h: 19, tasks: 198, approvals: 2, exceptions: 1 },
  { h: 20, tasks: 184, approvals: 1, exceptions: 3 },
  { h: 21, tasks: 211, approvals: 0, exceptions: 2 },
  { h: 22, tasks: 226, approvals: 0, exceptions: 4 },
  { h: 23, tasks: 231, approvals: 0, exceptions: 3 },
  { h: 0, tasks: 219, approvals: 0, exceptions: 5 },
  { h: 1, tasks: 197, approvals: 0, exceptions: 2 },
  { h: 2, tasks: 184, approvals: 0, exceptions: 3 },
  { h: 3, tasks: 166, approvals: 0, exceptions: 3 },
  { h: 4, tasks: 151, approvals: 0, exceptions: 4 },
  { h: 5, tasks: 139, approvals: 0, exceptions: 2 },
];

export const NIGHT_TOTALS = (() => {
  let tasks = 0;
  let approvals = 0;
  let exceptions = 0;
  for (const r of NIGHT_HOURS) {
    tasks += r.tasks;
    approvals += r.approvals;
    exceptions += r.exceptions;
  }
  return { tasks, approvals, exceptions, escalations: approvals + exceptions, unhandled: 0 } as const;
})();

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** "HH:00" for a wall-clock hour */
export function hourLabel(h: number): string {
  return `${pad2(((h % 24) + 24) % 24)}:00`;
}

/** "2,318" */
export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/* ── the constellation ── */

/**
 * The silhouette, in ring units (the ring's radius is 1, the ring's centre
 * is the origin, y down): the orchestrator at the centre, four agents at the
 * compass points, a bus of points from the orchestrator to each agent. The
 * same figure Compression settles into, drawn in two thousand stars.
 */
export const CLUSTERS = {
  orchestrator: { x: 0, y: 0, r: 0.26 },
  agentDist: 0.62,
  agentR: 0.18,
  /** N, E, S, W */
  agentAngles: [-Math.PI / 2, 0, Math.PI / 2, Math.PI] as const,
  /** share of points: the rest become the four buses */
  orchestratorShare: 0.36,
  agentShare: 0.14,
} as const;

export type Constellation = {
  readonly n: number;
  /** hours since 18:00 at which the task finished, ascending */
  readonly birth: Float32Array;
  /** row index 0..11 of the hour it belongs to */
  readonly hour: Uint8Array;
  /** where it enters: 0..4 along the frame's perimeter, clockwise from the top-left corner */
  readonly edge: Float32Array;
  /** its place in the silhouette, ring units */
  readonly tx: Float32Array;
  readonly ty: Float32Array;
  /** loop radius as a fraction of the stage's shorter side, and the loop's y/x ratio */
  readonly lr: Float32Array;
  readonly lk: Float32Array;
  /** loop angular speed (rad per hour, signed) and phase */
  readonly lw: Float32Array;
  readonly lp: Float32Array;
  /** sideways drift while sinking (-1..1) and a delay 0..1 so the field lets go unevenly */
  readonly sx: Float32Array;
  readonly sd: Float32Array;
  /** 1 for the points drawn in the signal colour (every 16th) */
  readonly cyan: Uint8Array;
};

/** a small, fast, seeded generator (mulberry32) */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a standard normal from two uniforms (Box-Muller) */
function gauss(rand: () => number): number {
  const u = Math.max(1e-6, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

let cached: Constellation | null = null;

/**
 * Build (once) the point set. Points are in birth order, hour by hour, so a
 * reader can stop at the first point not yet born.
 */
export function buildConstellation(seed = 1809): Constellation {
  if (cached) return cached;
  const rand = rng(seed);
  const n = NIGHT_TOTALS.tasks;
  const birth = new Float32Array(n);
  const hour = new Uint8Array(n);
  const edge = new Float32Array(n);
  const tx = new Float32Array(n);
  const ty = new Float32Array(n);
  const lr = new Float32Array(n);
  const lk = new Float32Array(n);
  const lw = new Float32Array(n);
  const lp = new Float32Array(n);
  const sx = new Float32Array(n);
  const sd = new Float32Array(n);
  const cyan = new Uint8Array(n);

  const { orchestrator: O, agentDist, agentR, agentAngles, orchestratorShare, agentShare } = CLUSTERS;
  const busFrom = O.r + 0.03;
  const busTo = agentDist - agentR - 0.03;

  let i = 0;
  NIGHT_HOURS.forEach((row, hi) => {
    for (let j = 0; j < row.tasks; j++, i++) {
      // finished somewhere in its hour, in order, with a little slack
      birth[i] = hi + (j + 0.5) / row.tasks + (rand() - 0.5) * (0.6 / row.tasks);
      hour[i] = hi;
      edge[i] = rand() * 4;

      // where it belongs
      const pick = rand();
      if (pick < orchestratorShare) {
        let x = gauss(rand) * O.r * 0.42;
        let y = gauss(rand) * O.r * 0.42;
        const d = Math.hypot(x, y);
        if (d > O.r) {
          x *= O.r / d;
          y *= O.r / d;
        }
        tx[i] = O.x + x;
        ty[i] = O.y + y;
      } else if (pick < orchestratorShare + agentShare * 4) {
        const a = agentAngles[Math.min(3, Math.floor((pick - orchestratorShare) / agentShare))];
        const cx = Math.cos(a) * agentDist;
        const cy = Math.sin(a) * agentDist;
        let x = gauss(rand) * agentR * 0.42;
        let y = gauss(rand) * agentR * 0.42;
        const d = Math.hypot(x, y);
        if (d > agentR) {
          x *= agentR / d;
          y *= agentR / d;
        }
        tx[i] = cx + x;
        ty[i] = cy + y;
      } else {
        // a bus: a thin thread of points from the orchestrator to one agent
        const a = agentAngles[Math.floor(rand() * 4) % 4];
        const along = busFrom + (busTo - busFrom) * rand();
        const across = gauss(rand) * 0.012;
        tx[i] = Math.cos(a) * along - Math.sin(a) * across;
        ty[i] = Math.sin(a) * along + Math.cos(a) * across;
      }

      // the loop it drifts in on the way
      lr[i] = 0.05 + rand() * 0.11;
      lk[i] = 0.35 + rand() * 0.65;
      lw[i] = (0.9 + rand() * 1.4) * (rand() < 0.5 ? -1 : 1);
      lp[i] = rand() * Math.PI * 2;
      sx[i] = rand() * 2 - 1;
      sd[i] = rand();
      cyan[i] = i % 16 === 0 ? 1 : 0;
    }
  });

  cached = { n, birth, hour, edge, tx, ty, lr, lk, lw, lp, sx, sd, cyan };
  return cached;
}

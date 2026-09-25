import * as THREE from "three";
import { glyphPoints } from "@/lib/glyph-path";
import { N } from "@/components/world/scene/loop";

/* ─────────────────────────────────────────────────────────────────────────
   THE STATUE — the signature object as a solid piece standing on the hall's
   floor, and the places on it where the Operator puts his hands and feet.

   The object used to float in the light shaft and he stood through it. Now it
   rests on the floor (its lowest rail on the wet floor) and holds still, and
   he uses it: leans on it, sits in it, hangs from it for pull-ups. Every
   contact is read off the live outline, so a hand lands on the glass wherever
   the shape actually is.

   Units: glyph space is the outline's own -1..1 box (lib/glyph-path); the
   world is the portal scene's (floor at y = 0, the robot 2.6 tall).
   ───────────────────────────────────────────────────────────────────────── */

export const STATUE_SCALE = 1.42;
/** half the tube's width, glyph units (loop.tsx GLASS.halfW) */
export const TUBE = 0.125;
/** half the tube's depth, glyph units (loop.tsx GLASS.halfD) */
export const TUBE_D = 0.19;

/** Live transform of the statue, written by SignatureObject every frame. */
export const statue = {
  /** world y of the glyph's centre (it moves with the morph: every glyph's
   *  bottom rail rests on the floor) */
  y: 1.6,
  yaw: 0,
  /** its outline as it stands right now (the morph in progress, if any) */
  points: glyphPoints("circle", N) as Float32Array,
  /** true while he is on a part of it a morph would pull out from under him
   *  (leaning on its side, hanging from its top): the headline holds its glyph */
  hold: false,
  /** true while it is changing from one glyph to another */
  morphing: false,
};

/** Centre height that stands a glyph's bottom rail on the floor. */
export function groundY(points: Float32Array): number {
  let minY = Infinity;
  for (let i = 0; i < N; i++) minY = Math.min(minY, points[i * 2 + 1]);
  return (-minY + TUBE) * STATUE_SCALE;
}

/** Glyph space -> world, at the statue's resting yaw. */
export function toWorld(out: THREE.Vector3, x: number, y: number, z: number, cy: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const wx = x * STATUE_SCALE;
  const wz = z * STATUE_SCALE;
  return out.set(wx * c + wz * s, cy + y * STATUE_SCALE, -wx * s + wz * c);
}

/** Rightmost point of the outline's centreline at height y (glyph units). */
export function rightAt(points: Float32Array, y: number): number {
  let best = -Infinity;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const ay = points[i * 2 + 1];
    const by = points[j * 2 + 1];
    if ((ay - y) * (by - y) > 0) continue;
    const t = by === ay ? 0 : (y - ay) / (by - ay);
    best = Math.max(best, points[i * 2] + (points[j * 2] - points[i * 2]) * t);
  }
  return best;
}


/** Highest point of the outline's centreline above x (glyph units). */
export function topAt(points: Float32Array, x: number): number {
  let best = -Infinity;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const ax = points[i * 2];
    const bx = points[j * 2];
    if ((ax - x) * (bx - x) > 0) continue;
    const t = bx === ax ? 0 : (x - ax) / (bx - ax);
    best = Math.max(best, points[i * 2 + 1] + (points[j * 2 + 1] - points[i * 2 + 1]) * t);
  }
  return best;
}

/* ── what he does on it ────────────────────────────────────────────────── */

/** What the Operator does with his body, in world space. Hands and feet are
 *  wrist and ankle targets; a missing one is left to his own animation. */
export interface Pose {
  /** where his root (the middle of him) goes, and which way he faces */
  root: THREE.Vector3;
  yaw: number;
  /** lean of the whole body, radians, about the screen's axis (+ = toward -x) */
  tilt: number;
  /** the whole body tipped back, radians (leaning on something behind him) */
  back: number;
  feet: [THREE.Vector3 | null, THREE.Vector3 | null];
  hands: [THREE.Vector3 | null, THREE.Vector3 | null];
  /** hand rests on its own knee (after the legs are placed) */
  knee: [boolean, boolean];
  /** chest pitch forward, radians */
  lean: number;
  /** knees point this far up (0 standing, 1 sitting) */
  kneesUp: number;
  /** hanging: knees bent back, feet off the ground */
  hang: number;
  /** where he stands on the floor to get into (and out of) it, and facing */
  spot: THREE.Vector3;
  spotYaw: number;
}

export function makePose(): Pose {
  return { root: new THREE.Vector3(), yaw: 0, tilt: 0, back: 0, feet: [null, null], hands: [null, null], knee: [false, false], lean: 0, kneesUp: 0, hang: 0, spot: new THREE.Vector3(), spotYaw: 0 };
}

/** Body measurements the poses are built from, world units at his stand scale
 *  (the Operator measures them off the rig). */
export interface Build {
  /** hip joint height relative to the root (negative: below it) */
  hipY: number;
  /** ankle height above the floor when standing */
  ankleY: number;
  /** half the distance between the hips */
  hipW: number;
  /** shoulder joint height above the root */
  shoulderY: number;
  /** half the distance between the shoulder joints */
  shoulderW: number;
  /** shoulder joint to wrist, straight */
  armLen: number;
  /** hip joint to ankle, straight */
  legLen: number;
}

/**
 * His four things to do on the statue, taken in turns at random:
 *   lean  — his back against its right rail, ankles crossed, arms folded
 *   sit   — sat inside it on the bottom rail, forearms on his knees
 *   blade — stood in front of it, drawing his blade to look it over, then away
 *   pull  — hanging from its top in front of it, doing pull-ups
 * `stage` is where he performs a sword move when he is tapped.
 */
export type PoseKey = "lean" | "sit" | "blade" | "pull" | "stage";

/** how far the hip joints sit above the seat's surface */
const SEAT = 0.13;
/** top of the lowest rail: what he sits on */
export const RAIL = TUBE * 2 * STATUE_SCALE;
/** the lowest a pull-up bar may be: under it his knees would reach the floor */
const BAR_MIN = 2.62;
/** how far a pull-up lifts him: chin over the bar */
export const PULL_RISE = 0.5;

const _v = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();

/**
 * Resolve a pose against the statue as it stands right now (its live outline,
 * so a contact follows the glass even through a morph). `lift` is 0..1 of a
 * pull-up.
 */
export function resolvePose(
  out: Pose,
  key: PoseKey,
  pts: Float32Array,
  cy: number,
  yaw: number,
  build: Build,
  stage: THREE.Vector3,
  stageYaw: number,
  lift = 0,
): Pose {
  const S = STATUE_SCALE;
  // his forward and his right-hand side, for a body turned by `bodyYaw`
  const facing = (bodyYaw: number) => {
    _f.set(Math.sin(bodyYaw), 0, Math.cos(bodyYaw));
    _r.set(-Math.cos(bodyYaw), 0, Math.sin(bodyYaw));
  };
  const set = (arr: [THREE.Vector3 | null, THREE.Vector3 | null], i: 0 | 1, p: THREE.Vector3 | null) => {
    if (!p) arr[i] = null;
    else (arr[i] ??= new THREE.Vector3()).copy(p);
  };
  // the statue's own axes in the world: x across it, z out of its face
  const sx = Math.cos(yaw);
  const sz = -Math.sin(yaw);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  /** statue-local offsets (world units, y absolute) -> world */
  const at = (o: THREE.Vector3, x: number, y: number, z: number) => o.set(x * sx + z * fx, y, x * sz + z * fz);
  /** a point on his body: along his right, up from his root, along his forward */
  const body = (o: THREE.Vector3, r: number, u: number, f: number) =>
    o.set(out.root.x + _r.x * r + _f.x * f, out.root.y + u, out.root.z + _r.z * r + _f.z * f);
  const face = TUBE_D * S; // the statue's front face, out from its centre plane

  out.knee[0] = out.knee[1] = false;
  out.tilt = 0;
  out.back = 0;
  out.lean = 0;
  out.kneesUp = 0;
  out.hang = 0;
  set(out.feet, 0, null);
  set(out.feet, 1, null);
  set(out.hands, 0, null);
  set(out.hands, 1, null);

  switch (key) {
    case "lean": {
      // his back against the front of the statue's right rail, the body tipped
      // back into it, ankles crossed out in front, arms folded
      const hS = stage.y + build.shoulderY - 0.3; // his shoulder blades
      const rail = (rightAt(pts, (hS - cy) / S) - TUBE * 0.4) * S;
      const back = 0.14; // tipped back, radians
      const bodyYaw = yaw * 0.6 - 0.2;
      facing(bodyYaw);
      // the back of his chest (about a fifth of his depth behind the spine) on the glass
      const depth = 0.24;
      at(out.root, Math.max(0.4, rail), stage.y - (1 - Math.cos(back)) * build.shoulderY, face + depth + Math.sin(back) * (build.shoulderY - 0.3));
      out.yaw = bodyYaw;
      out.back = back;
      // feet out in front of him, the left crossed over the right
      const fwd = Math.sin(back) * (0.5 * build.legLen - build.hipY) + 0.12;
      set(out.feet, 1, body(_v, build.hipW * 0.6, 0, fwd));
      out.feet[1]!.y = build.ankleY;
      set(out.feet, 0, body(_v, build.hipW * 0.5, 0, fwd + 0.16));
      out.feet[0]!.y = build.ankleY;
      // arms folded across the chest: each wrist over the other forearm
      const chest = build.shoulderY - 0.36;
      set(out.hands, 1, body(_v, -0.2, chest, 0.24));
      set(out.hands, 0, body(_v, 0.19, chest - 0.06, 0.2));
      out.spot.set(out.root.x + _f.x * 0.08, 0, out.root.z + _f.z * 0.08);
      out.spotYaw = bodyYaw;
      break;
    }
    case "sit": {
      // inside the statue on its bottom rail, forearms across his knees
      const bodyYaw = yaw * 0.35 - 0.12;
      facing(bodyYaw);
      at(out.root, 0.05, RAIL + SEAT - build.hipY, face * 0.55);
      out.yaw = bodyYaw;
      // feet on the floor in front, a little apart and splayed
      const fw = 0.72;
      set(out.feet, 0, body(_v, -build.hipW * 1.9, 0, fw));
      out.feet[0]!.y = build.ankleY;
      set(out.feet, 1, body(_v, build.hipW * 1.5, 0, fw - 0.08));
      out.feet[1]!.y = build.ankleY;
      out.knee[0] = out.knee[1] = true;
      out.lean = 0.3;
      out.kneesUp = 1;
      // he stands up over his own feet
      out.spot.set((out.feet[0]!.x + out.feet[1]!.x) / 2, 0, (out.feet[0]!.z + out.feet[1]!.z) / 2);
      out.spotYaw = bodyYaw;
      break;
    }
    case "pull": {
      // hanging from the top of the statue, in front of it and facing it: the
      // widest grip the shape gives at a height he can hang from
      let gx = 0.7;
      let top = -Infinity;
      for (; gx >= 0.22; gx -= 0.03) {
        top = (topAt(pts, gx / S) + TUBE) * S + cy;
        if (top >= BAR_MIN) break;
      }
      gx = Math.max(gx, 0.22);
      const bodyYaw = yaw + Math.PI;
      facing(bodyYaw);
      // fingers over the top, wrists at its front edge
      const wy = top + 0.02;
      at(out.root, 0, wy - build.armLen * 0.97 - build.shoulderY + lift * PULL_RISE, face + 0.36);
      out.yaw = bodyYaw;
      // facing the statue, his left hand is on its -x side
      set(out.hands, 0, at(_v, -gx, wy, face * 0.55));
      set(out.hands, 1, at(_v, gx, wy, face * 0.55));
      out.hang = 1;
      out.lean = -0.08 + lift * 0.12;
      // stood under the bar, facing it, before the jump to grab it
      out.spot.set(out.root.x, 0, out.root.z);
      out.spotYaw = bodyYaw;
      break;
    }
    case "blade":
    case "stage": {
      out.root.copy(stage);
      out.yaw = stageYaw;
      out.spot.set(stage.x, 0, stage.z);
      out.spotYaw = stageYaw;
      break;
    }
  }
  return out;
}

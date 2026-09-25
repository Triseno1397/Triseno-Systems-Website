import * as THREE from "three";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";
import { N } from "@/components/world/scene/loop";

/* ─────────────────────────────────────────────────────────────────────────
   THE STATUE — the signature object as a solid piece standing on the hall's
   floor, and the places on it where the Operator puts his hands and feet.

   The object used to float in the light shaft and he stood through it. Now it
   rests on the floor (its lowest rail on the wet floor) and holds still, and
   he uses it: sits in the ring, leans on the frame, plants a foot on the
   triangle's slope. Every contact is read off the glyph's own outline, so a
   hand lands on the glass wherever the shape actually is.

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

/* ── poses ─────────────────────────────────────────────────────────────── */

/** What the Operator does with his body, in world space. Hands and feet are
 *  wrist and ankle targets; a missing one is left to his own animation. */
export interface Pose {
  /** where his root (the middle of him) goes, and which way he faces */
  root: THREE.Vector3;
  yaw: number;
  /** lean of the whole body, radians, about the screen's axis (+ = toward -x) */
  tilt: number;
  feet: [THREE.Vector3 | null, THREE.Vector3 | null];
  hands: [THREE.Vector3 | null, THREE.Vector3 | null];
  /** hand rests on its own knee (after the legs are placed) */
  knee: [boolean, boolean];
  /** chest pitch forward, radians */
  lean: number;
  /** knees point this far up (0 standing, 1 sitting) */
  kneesUp: number;
  /** knees point this far out to the sides (a wide stance) */
  kneesOut: number;
}

export function makePose(): Pose {
  return {
    root: new THREE.Vector3(),
    yaw: 0,
    tilt: 0,
    feet: [null, null],
    hands: [null, null],
    knee: [false, false],
    lean: 0,
    kneesUp: 0,
    kneesOut: 0,
  };
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
  /** shoulder height above the root */
  shoulderY: number;
  /** hip joint to ankle, straight */
  legLen: number;
}

export type PoseKey = "sit" | "brace" | "hero" | "palm" | "stage";

export function poseFor(glyph: GlyphKind): PoseKey {
  if (glyph === "circle") return "sit";
  if (glyph === "square") return "brace";
  if (glyph === "triangle") return "hero";
  return "palm";
}

/** how far the hip joints sit above the seat's surface */
const SEAT = 0.13;
/** top of the lowest rail: what he sits on and stands on */
const RAIL = TUBE * 2 * STATUE_SCALE;

const _v = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();

/**
 * Resolve a pose against a glyph at the statue's yaw. `stage` is the spot in
 * front of the statue where he performs his sword moves.
 */
export function resolvePose(
  out: Pose,
  key: PoseKey,
  glyph: GlyphKind,
  build: Build,
  stage: THREE.Vector3,
  stageYaw: number,
  yaw: number,
): Pose {
  const pts = glyphPoints(glyph, N);
  const cy = groundY(pts);
  // his forward and right, for a body turned by `bodyYaw`
  const facing = (bodyYaw: number) => {
    _f.set(Math.sin(bodyYaw), 0, Math.cos(bodyYaw));
    _r.set(-Math.cos(bodyYaw), 0, Math.sin(bodyYaw)); // his right hand side
  };
  const foot = (i: 0 | 1, p: THREE.Vector3 | null) => {
    if (!p) out.feet[i] = null;
    else (out.feet[i] ??= new THREE.Vector3()).copy(p);
  };
  const hand = (i: 0 | 1, p: THREE.Vector3 | null) => {
    if (!p) out.hands[i] = null;
    else (out.hands[i] ??= new THREE.Vector3()).copy(p);
  };
  out.knee[0] = out.knee[1] = false;
  out.tilt = 0;
  out.lean = 0;
  out.kneesUp = 0;
  out.kneesOut = 0;

  // local +x of the statue, and its forward (toward the camera), in world
  const sx = Math.cos(yaw);
  const sz = -Math.sin(yaw);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const floorFoot = (x: number, z: number) => _v.set(x, build.ankleY, z);
  /** statue-local offsets (world units, y absolute) -> world */
  const at = (o: THREE.Vector3, x: number, y: number, z: number) => o.set(x * sx + z * fx, y, x * sz + z * fz);
  // the front half of the rails, where he puts his weight
  const zf = TUBE_D * STATUE_SCALE * 0.45;

  switch (key) {
    case "sit": {
      // in the ring (or on the bottom rail): the seat is the top of the lowest rail
      const seatY = RAIL;
      const bodyYaw = yaw * 0.35 - 0.12;
      facing(bodyYaw);
      // he sits on the front half of the rail, so his back clears the glass
      toWorld(out.root, 0.05, 0, TUBE_D * 0.55, 0, yaw);
      out.root.y = seatY + SEAT - build.hipY;
      out.yaw = bodyYaw;
      // feet on the floor in front, a little apart and splayed
      const base = _v.copy(out.root);
      const fw = 0.72;
      foot(0, floorFoot(base.x - _r.x * build.hipW * 1.9 + _f.x * fw, base.z - _r.z * build.hipW * 1.9 + _f.z * fw));
      foot(1, floorFoot(base.x + _r.x * build.hipW * 1.5 + _f.x * (fw - 0.08), base.z + _r.z * build.hipW * 1.5 + _f.z * (fw - 0.08)));
      hand(0, null);
      hand(1, null);
      out.knee[0] = out.knee[1] = true;
      out.lean = 0.3;
      out.kneesUp = 1;
      break;
    }
    case "brace": {
      // stood in the frame on its bottom rail, in a wide low stance, a palm
      // flat on each post: holding the walls of the square apart
      const xi = (0.9 - TUBE) * STATUE_SCALE;
      const bodyYaw = yaw;
      facing(bodyYaw);
      at(out.root, 0, RAIL + stage.y - 0.34, zf);
      out.yaw = bodyYaw;
      // wrist targets a hand's length short of the glass: the palm on it
      const hy = out.root.y + build.shoulderY + 0.06;
      hand(0, at(_v, xi - 0.17, hy, zf + 0.02));
      hand(1, at(_v, -xi + 0.17, hy, zf + 0.02));
      foot(0, at(_v, 0.6, RAIL + build.ankleY, zf + 0.06));
      foot(1, at(_v, -0.6, RAIL + build.ankleY, zf + 0.06));
      out.lean = 0.12;
      out.kneesOut = 1;
      break;
    }
    case "hero": {
      // a superhero landing on the triangle's base rail: one knee down, a
      // fist planted on the glass, the other arm thrown back, eyes up
      const bodyYaw = yaw * 0.5 - 0.3;
      facing(bodyYaw);
      at(out.root, -0.08, 0, zf);
      const thigh = build.legLen * 0.5;
      out.root.y = RAIL + thigh * 0.95 + 0.07 - build.hipY;
      out.yaw = bodyYaw;
      const rx = out.root.x;
      const rz = out.root.z;
      // right knee on the rail, the shin lying back along it
      foot(1, _v.set(rx + _r.x * build.hipW * 1.25 - _f.x * 0.5, RAIL + 0.1, rz + _r.z * build.hipW * 1.25 - _f.z * 0.5));
      // left foot planted out in front
      foot(0, _v.set(rx - _r.x * build.hipW * 1.5 + _f.x * 0.5, RAIL + build.ankleY, rz - _r.z * build.hipW * 1.5 + _f.z * 0.5));
      // right fist down on the rail, left arm back and out
      hand(1, _v.set(rx + _r.x * 0.12 + _f.x * 0.42, RAIL + 0.1, rz + _r.z * 0.12 + _f.z * 0.42));
      hand(0, _v.set(rx - _r.x * 0.5 - _f.x * 0.62, out.root.y + build.shoulderY - 0.5, rz - _r.z * 0.5 - _f.z * 0.62));
      out.lean = 0.55;
      out.kneesUp = 0.2;
      break;
    }
    case "palm": {
      // stood on the floor in front of the piece, a hand laid on its edge
      const hy = 1.15;
      const edge = (rightAt(pts, (hy - cy) / STATUE_SCALE) + TUBE * 0.6) * STATUE_SCALE;
      const bodyYaw = yaw * 0.5 - 0.1;
      facing(bodyYaw);
      at(out.root, edge - 0.55, stage.y, zf + 0.42);
      out.yaw = bodyYaw;
      hand(0, at(_v, edge, hy, TUBE_D * STATUE_SCALE + 0.03));
      hand(1, null);
      foot(0, null);
      foot(1, null);
      break;
    }
    case "stage": {
      out.root.copy(stage);
      out.yaw = stageYaw;
      foot(0, null);
      foot(1, null);
      hand(0, null);
      hand(1, null);
      break;
    }
  }
  return out;
}

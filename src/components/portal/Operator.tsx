"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DBG } from "@/components/world/scene/env";
import { deviceClass } from "@/lib/device";
import type { Build } from "./statue";
import { makeEmblem } from "./emblem";

/* ─────────────────────────────────────────────────────────────────────────
   THE OPERATOR — Triseno's rigged robot (21st: splite, rebuilt).

   - Generated character (Higgsfield image → Tripo mesh → Meshy rig), with a
     generated ninja hilt; meshopt-compressed, phones load a 50k-triangle cut.
   - It tracks the pointer through the skeleton: hips, chest, neck and head
     each take a share of the turn, damped, so the body leads and the head
     settles last. On touch it looks around on its own.
   - Click / tap: both hands meet at the chest, light spirals into the palms,
     a hilt is fabricated there by a travelling scan line, the right hand
     draws it and the blade ignites in the next division's hue. Then it
     alternates two moves: a twin-blade spin (a second sword forges in the
     left hand) and a 360 power spin jump. The blades retract and the hilts
     dissolve back to light.
   ───────────────────────────────────────────────────────────────────────── */

export const OPERATOR_HUES = ["#ff8a3d", "#9d5cff", "#00b4d8"] as const;

export interface OperatorState {
  /** pointer, -1..1 across the viewport */
  px: number;
  py: number;
  fine: boolean;
  /** incremented by the section to request an action */
  strike: number;
  /** true while the page has scrolled him out of the picture. The scene sets
   *  this rather than hiding his group: his light lives in that group, and a
   *  light inside a hidden group stops being counted — which changes how many
   *  lights three builds into every shader, and the whole world recompiles. */
  hidden?: boolean;
  /** 0..1 — how far into his exit of the frame he is */
  exit?: number;
  /** 0..1 — knees to the chest, fists in, chin down (the somersault) */
  tuck?: number;
  /** his facing, when the scene decides it (otherwise stand.yaw) */
  yaw?: number;
  /** hands and feet placed on things, world space (see statue.ts) */
  limbs?: Limbs;
  /** his measurements at his stand scale, written by him once his rig is read */
  build?: Build;
  /** seconds into looking his blade over (draw, turn it in the light, run a
   *  hand along it, put it away); -1 or unset when he is not */
  inspect?: number;
  /** something in the world he looks at instead of the visitor */
  gaze?: THREE.Vector3 | null;
  /** 0..1 — the jets under his feet (take-off and landing) */
  thrust?: number;
  /** touch screens: performance.now() of the last touch — he looks at the
   *  finger (px/py) while it is down and for a moment after */
  touchAt?: number;
}

export interface Limbs {
  feet: [THREE.Vector3 | null, THREE.Vector3 | null];
  footW: [number, number];
  hands: [THREE.Vector3 | null, THREE.Vector3 | null];
  handW: [number, number];
  /** the hand rests on its own knee instead of a point */
  knee: [boolean, boolean];
  /** chest pitch forward, radians */
  lean: number;
  /** 0 knees forward (standing, crouching) .. 1 knees up (sitting) */
  kneesUp: number;
  /** knees out to the sides, for a wide stance */
  kneesOut: number;
  /** 0..1 hanging (or flying): knees bent back, feet off the ground */
  hang: number;
}

/** the chest orb's radius, in his root units (he is 1 tall): the size of the
 *  round medallion painted on him, which it covers */
const EMBLEM_SIZE = 0.046;

/** how long looking his blade over takes, seconds */
export const INSPECT = 7;

/* the blade inspection, seconds. A cross-draw: his right hand goes to his
   left hip, where the hilt forms in his grip as if from a scabbard; he draws
   in one sweep up and out, the blade running out of the guard along the
   swing, and it locks upright at arm's length with a glint down the steel.
   He turns it in the light, then sheathes it the same way back to the hip —
   the blade running in as it goes — and the hilt is gone. */
const INS = {
  hilt: [0.3, 0.5],
  draw: [0.5, 1.1],
  out: [0.62, 0.95],
  glint: [0.92, 1.3],
  turn: [1.45, 4.25],
  sheathe: [4.4, 5.1],
  in: [4.55, 4.9],
  gone: [5.15, 5.35],
  down: [5.4, 6.3],
} as const;

/* ── the jets under his feet ───────────────────────────────────────────────
   Two flames per boot, a white-hot core inside a wider pale-blue plume, drawn
   additively with a flicker in the shader. In the scene from the start at
   zero thrust (nothing to compile at take-off, and no light: a light would
   change the light count and recompile every shader in the world). */
function makeJets() {
  const mk = (color: string, alpha: number) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color(color) }, uThrust: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: alpha } },
      vertexShader: /* glsl */ `
        varying float vT;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vT = -position.y; // 0 at the nozzle, 1 at the tip
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uThrust;
        uniform float uTime;
        uniform float uAlpha;
        varying float vT;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float t = clamp(vT, 0.0, 1.0);
          // brightest face-on, soft at the silhouette, gone at the tip
          float rim = pow(abs(dot(vN, vV)), 0.7);
          float flick = 0.82 + 0.18 * sin(uTime * 57.0 + t * 23.0) * sin(uTime * 31.0 - t * 11.0);
          // a hard bright throat at the nozzle, fading down the plume
          float a = (pow(1.0 - t, 1.8) + 0.6 * exp(-t * 14.0)) * rim * flick * uThrust * uAlpha;
          vec3 c = mix(vec3(1.0), uColor, smoothstep(0.0, 0.45, t));
          gl_FragColor = vec4(c * a, a);
        }
      `,
    });
  const core = mk("#9fd2ff", 2.4);
  const plume = mk("#2f7dff", 1.5);
  // a cone with its base at the nozzle (y = 0) and its point down (y = -1)
  const geo = new THREE.ConeGeometry(1, 1, 18, 1, true);
  geo.rotateX(Math.PI);
  geo.translate(0, -0.5, 0);
  const group = new THREE.Group();
  // the white-hot glow at each nozzle
  const nozzle = new THREE.MeshBasicMaterial({ color: "#d8ecff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ball = new THREE.SphereGeometry(1, 16, 12);
  const boots = [0, 1].map(() => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(geo, core);
    const p = new THREE.Mesh(geo, plume);
    const n = new THREE.Mesh(ball, nozzle);
    c.renderOrder = p.renderOrder = n.renderOrder = 18;
    c.frustumCulled = p.frustumCulled = n.frustumCulled = false;
    g.add(p, c, n);
    group.add(g);
    return { g, c, p, n };
  });
  return { group, boots, core, plume, nozzle };
}

const DESK = "/models/robot-desk.glb";
const MOB = "/models/robot-mob.glb";
const SPIN = "/models/robot-anim-spin.glb";
const JUMP = "/models/robot-anim-jump.glb";

/* Which body he wears: the 125k-triangle desktop cut on a strong machine,
   the 50k one (half the download, less than half the skinning work) on
   phones and on any machine that is not high-end (lib/device.ts). */
function lightBody(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches || deviceClass() !== "high";
}

// Three useGLTF calls in one component suspend one after another: the clips
// were not even requested until the body had loaded and parsed,
// 3.5s in. Asked for here, together, they are all in flight from the moment
// this chunk lands.
if (typeof window !== "undefined") {
  useGLTF.preload(lightBody() ? MOB : DESK);
  useGLTF.preload(SPIN);
  useGLTF.preload(JUMP);
}

/* choreography, seconds from the click */
const GATHER = 0.6; // hands meet, light spirals in
const FORGE_END = 1.45; // the scan has built the hilt
const DRAW_END = 1.8; // the right hand has drawn it
const BLEND = 0.35; // hand-off from the forge pose into the move

/* the tuck of the roll-out, radians at full tuck: thigh up, knee bent */
const TUCK_THIGH = 1.55;
const TUCK_KNEE = 1.9;

/* sizes in scene units (the robot stands 1 unit tall) */
const BLADE = 0.5;

const damp = (c: number, t: number, l: number, dt: number) => THREE.MathUtils.lerp(c, t, 1 - Math.exp(-l * dt));
const ease = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
};
const smooth = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/* ── where a sword sits in the fist ──────────────────────────────────────
   Each fist is read once, in the bind pose, from the vertices skinned to its
   hand bone: where its mass is centred and how far it reaches along the
   bone's own axes. The fingers run along the bone's Y; the shaft lies across
   them, along whichever of the other two axes the fist is widest, through
   the centre of that mass. On top of that a fixed, hand-tuned seating
   (SOCKET) — the same numbers on every device, so what was checked in the
   hand cam (design-loop/grip-shot.mjs) is what every visitor sees. */
type HandFrame = {
  /** centre of the fist's mass, hand-bone space */
  centre: THREE.Vector3;
  /** half-extents of the hand along the bone's own x, y, z */
  ext: THREE.Vector3;
  /** unit axis, hand-bone space, that the shaft runs along */
  axis: THREE.Vector3;
};

/** seating per hand: position in fractions of the fist's half-extents along
 *  the bone's own axes; rotation in degrees about the mount's own axes
 *  (x = tilt toward/away from the fingers, y = roll of the blade's flat,
 *  z = lean across the fist). ?gsr= ?gsl= ?grr= ?grl= override for tuning. */
const SOCKET = {
  r: { pos: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
  l: { pos: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
};
const DEG = Math.PI / 180;

function handFrame(skinned: THREE.SkinnedMesh, boneIndex: number): HandFrame | null {
  const geo = skinned.geometry;
  const pos = geo.attributes.position;
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  if (!pos || !si || !sw || boneIndex < 0) return null;
  // bind-pose vertex -> hand-bone space, whatever pose happens to be playing
  const toBone = skinned.skeleton.boneInverses[boneIndex].clone().multiply(skinned.bindMatrix);
  const v = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === boneIndex) w += sw.getComponent(i, k);
    if (w < 0.6) continue; // the hand proper, not the wrist blend
    v.fromBufferAttribute(pos, i).applyMatrix4(toBone);
    centre.add(v);
    min.min(v);
    max.max(v);
    n++;
  }
  if (n < 64) return null;
  centre.multiplyScalar(1 / n);
  const ext = max.clone().sub(min).multiplyScalar(0.5);
  const axis = ext.x >= ext.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  return { centre, ext, axis };
}

/* ── two-bone arm IK, world space ─────────────────────────────────────── */
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _S = new THREE.Vector3();
const _E = new THREE.Vector3();
const _H = new THREE.Vector3();
const _E2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pd = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const _pw = new THREE.Quaternion();
const _bw = new THREE.Quaternion();
const _id = new THREE.Quaternion();
const insQ = {
  hip: new THREE.Vector3(),
  front: new THREE.Vector3(),
  q2: new THREE.Quaternion(),
  dir: new THREE.Vector3(),
  x: new THREE.Vector3(),
  z: new THREE.Vector3(),
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  mInv: new THREE.Quaternion(),
};

function aimBone(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, pivot: THREE.Vector3, w: number) {
  _a.subVectors(from, pivot).normalize();
  _b.subVectors(to, pivot).normalize();
  _dq.setFromUnitVectors(_a, _b);
  // part of the way: the full correction eased back toward no rotation
  if (w < 1) _dq.slerp(_id, 1 - w);
  bone.parent!.getWorldQuaternion(_pw);
  bone.getWorldQuaternion(_bw);
  bone.quaternion.copy(_pw.invert().multiply(_dq.multiply(_bw)));
  bone.updateMatrixWorld(true);
}

function solveArm(upper: THREE.Bone, fore: THREE.Bone, hand: THREE.Bone, T: THREE.Vector3, pole: THREE.Vector3, w: number) {
  if (w <= 0.001) return;
  upper.getWorldPosition(_S);
  fore.getWorldPosition(_E);
  hand.getWorldPosition(_H);
  const a = _S.distanceTo(_E);
  const b = _E.distanceTo(_H);
  const d = THREE.MathUtils.clamp(_S.distanceTo(T), Math.abs(a - b) + 1e-3, (a + b) * 0.999);
  _dir.subVectors(T, _S).normalize();
  _pd.subVectors(pole, _S);
  _pd.addScaledVector(_dir, -_pd.dot(_dir)).normalize();
  const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  _E2.copy(_S).addScaledVector(_dir, a * cosA).addScaledVector(_pd, a * sinA);
  aimBone(upper, _E, _E2, _S, w);
  fore.getWorldPosition(_E);
  hand.getWorldPosition(_H);
  aimBone(fore, _H, T, _E, w);
}

/* ── one sword: machined here, in his own finish ───────────────────────────
   No glow and no generated prop: a robotic sword built from lathe and loft
   geometry in the same three finishes as his armour — mirror-polished edges
   and trim, satin flats, gunmetal grip and fuller — so it reads as a part of
   him. The origin is the centre of the fist, +Y runs up the blade and the
   blade's flat lies along X (the fingers' direction, set by the mount). */
interface SwordRig {
  group: THREE.Group;
  /** the forge scan: cuts the hilt off above the line being fabricated */
  plane: THREE.Plane;
  /** the guard's mouth: the blade is only drawn above it, so it can slide out */
  bladePlane: THREE.Plane;
  /** hilt + blade: what is hidden between moves. The group itself stays in
   *  the scene — see the note in makeSword. */
  body: THREE.Group;
  blade: THREE.Group;
  /** the blade's mirror-polished edges: lit for the glint when it locks */
  edge: THREE.MeshStandardMaterial;
}

const GRIP_LO = -0.05; // pommel end of the grip, below the fist's centre
const GRIP_HI = 0.028; // top of the grip, under the guard
const GUARD_H = 0.016;
const BLADE_BASE = GRIP_HI + GUARD_H; // where the blade leaves the guard
const BLADE_W = 0.046;
const BLADE_T = 0.0075;
const POMMEL_LO = GRIP_LO - 0.018;

/** one flat-shaded, uv-less geometry per finish, so a sword is six draws */
function finish(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("uv");
    n.deleteAttribute("normal");
    n.computeVertexNormals();
    return n;
  });
  const out = mergeGeometries(flat, false)!;
  out.computeBoundingSphere();
  return out;
}
function at<T extends THREE.BufferGeometry>(g: T, x: number, y: number, z: number, rz = 0): T {
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** The blade, lofted: a hexagonal section with a ground edge bevel, satin
 *  flats and a fuller down the middle that runs out before the point, tapering
 *  to an off-centre chisel tip. Returned as [polished, satin, dark] faces. */
function bladeParts(): [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  const TIP = 0.8; // the point begins here
  const stations: number[] = [];
  for (let i = 0; i <= 14; i++) stations.push((i / 14) * TIP);
  for (let i = 1; i <= 8; i++) stations.push(TIP + (i / 8) * (1 - TIP));
  // across the blade, right edge to left: [position -1..1, height 0..0.5
  // (-1 = the fuller's floor), finish of the strip to the next point]
  const prof = [
    [1, 0, 0],
    [0.62, 0.5, 1],
    [0.3, 0.5, 2],
    [0.2, -1, 2],
    [-0.2, -1, 2],
    [-0.3, 0.5, 1],
    [-0.62, 0.5, 0],
    [-1, 0, -1],
  ] as const;
  const section = (s: number) => {
    const w0 = BLADE_W * (1 - 0.14 * Math.min(s, TIP));
    const u = s <= TIP ? 0 : (s - TIP) / (1 - TIP);
    const xr = w0 / 2 - w0 * 0.22 * u * u;
    const xl = -w0 / 2 + w0 * 0.78 * u;
    const mid = (xr + xl) / 2;
    const half = (xr - xl) / 2;
    const t = BLADE_T * (1 - 0.35 * Math.min(s, TIP)) * (1 - u);
    // the fuller: sunk just past the root, run out by two thirds
    const sink = 0.3 * smooth(s / 0.06) * (1 - smooth((s - 0.42) / 0.26));
    return prof.map(([f, h]) => [mid + f * half, (h < 0 ? 0.5 - sink : h) * t] as [number, number]);
  };
  const out: number[][] = [[], [], []];
  const quad = (m: number, a: number[], b: number[], c: number[], d: number[]) => out[m].push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < stations.length - 1; i++) {
    const y0 = stations[i] * BLADE;
    const y1 = stations[i + 1] * BLADE;
    const s0 = section(stations[i]);
    const s1 = section(stations[i + 1]);
    for (let j = 0; j < prof.length - 1; j++) {
      const m = prof[j][2];
      for (const side of [1, -1]) {
        const a = [s0[j][0], y0, s0[j][1] * side];
        const b = [s0[j + 1][0], y0, s0[j + 1][1] * side];
        const c = [s1[j + 1][0], y1, s1[j + 1][1] * side];
        const d = [s1[j][0], y1, s1[j][1] * side];
        if (side > 0) quad(m, a, d, c, b);
        else quad(m, a, b, c, d);
      }
    }
  }
  return out.map((v) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }) as [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry];
}

/** The hilt: an octagonal gunmetal grip ringed with satin bands, a machined
 *  pommel, and a swept crossguard with a polished mouth plate. */
function hiltParts(): [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  const len = GRIP_HI - GRIP_LO;
  const polish = [
    at(new THREE.CylinderGeometry(0.0115, 0.0135, 0.01, 8), 0, GRIP_LO - 0.005, 0),
    at(new THREE.CylinderGeometry(0.006, 0.0115, 0.008, 8), 0, GRIP_LO - 0.014, 0),
    at(new THREE.BoxGeometry(BLADE_W * 1.2, 0.0025, BLADE_T * 2.2), 0, BLADE_BASE - 0.00125, 0),
  ];
  const satin: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) satin.push(at(new THREE.CylinderGeometry(0.0101, 0.0101, 0.0035, 8), 0, GRIP_LO + len * (0.12 + i * 0.19), 0));
  // the crossguard: a swept plate across the blade's flat, bevelled
  const g = new THREE.Shape();
  g.moveTo(-0.022, 0);
  g.lineTo(0.022, 0);
  g.lineTo(0.036, 0.009);
  g.lineTo(0.03, GUARD_H - 0.0025);
  g.lineTo(-0.03, GUARD_H - 0.0025);
  g.lineTo(-0.036, 0.009);
  g.closePath();
  const guard = new THREE.ExtrudeGeometry(g, { depth: 0.013, bevelEnabled: true, bevelThickness: 0.0018, bevelSize: 0.0014, bevelSegments: 1, curveSegments: 1 });
  satin.push(at(guard, 0, GRIP_HI, -0.0065));
  const dark = [
    at(new THREE.CylinderGeometry(0.0088, 0.0088, len, 8), 0, GRIP_LO + len / 2, 0),
    // the guard's core block, and a piston head either side of it
    at(new THREE.BoxGeometry(0.03, GUARD_H * 0.8, 0.02), 0, GRIP_HI + GUARD_H * 0.4, 0),
    at(new THREE.CylinderGeometry(0.0035, 0.0035, 0.024, 8), 0.029, GRIP_HI + 0.009, 0, Math.PI / 2),
    at(new THREE.CylinderGeometry(0.0035, 0.0035, 0.024, 8), -0.029, GRIP_HI + 0.009, 0, Math.PI / 2),
  ];
  return [finish(polish), finish(satin), finish(dark)];
}

function makeSword(): SwordRig {
  // The group stays visible for good and the body inside it is what appears and
  // disappears. three only counts the lights it can reach when it decides how
  // many to build into every shader, so a light inside a hidden group counts
  // for nothing — and showing that group at the click changed the count, which
  // recompiled every material in the world. That was the half-second freeze at
  // the moment of the click.
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.visible = false;
  group.add(body);
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const bladePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // his three finishes: mirror chrome, a satin grade, and gunmetal
  const kit = (clip: THREE.Plane) => [
    // emissive white at zero intensity: the glint animates the intensity,
    // which (unlike switching emissive on) never rebuilds the shader
    new THREE.MeshStandardMaterial({ color: "#f4f6f9", metalness: 1, roughness: 0.1, envMapIntensity: 2, clippingPlanes: [clip], side: THREE.DoubleSide, emissive: "#ffffff", emissiveIntensity: 0 }),
    new THREE.MeshStandardMaterial({ color: "#c3c8cf", metalness: 0.92, roughness: 0.28, envMapIntensity: 1.8, clippingPlanes: [clip], side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: "#2b2e34", metalness: 0.9, roughness: 0.4, envMapIntensity: 1.1, clippingPlanes: [clip], side: THREE.DoubleSide }),
  ];
  const hiltMats = kit(plane);
  hiltParts().forEach((geo, i) => body.add(new THREE.Mesh(geo, hiltMats[i])));

  // the blade slides up out of the guard: drawn only above its mouth
  const blade = new THREE.Group();
  const bladeMats = kit(bladePlane);
  bladeParts().forEach((geo, i) => blade.add(new THREE.Mesh(geo, bladeMats[i])));
  blade.position.y = BLADE_BASE - BLADE;
  blade.visible = false;
  body.add(blade);
  return { group, body, plane, bladePlane, blade, edge: bladeMats[0] };
}

const _up = new THREE.Vector3();
const _p = new THREE.Vector3();
/** Reveal (0..1) the hilt from its pommel up. */
function setScan(sw: SwordRig, k: number) {
  sw.group.updateMatrixWorld(true);
  _up.set(0, 1, 0).transformDirection(sw.group.matrixWorld);
  const y = THREE.MathUtils.lerp(POMMEL_LO - 0.003, BLADE_BASE + 0.004, k);
  _p.set(0, y, 0).applyMatrix4(sw.group.matrixWorld);
  sw.plane.setFromNormalAndCoplanarPoint(_up.negate(), _p);
}

const WHITE = new THREE.Color("#ffffff");
/** Deploy (0..1) the blade: it runs up out of the guard and locks. */
function setBlade(sw: SwordRig, k: number) {
  sw.blade.visible = k > 0.002;
  sw.blade.position.y = BLADE_BASE - BLADE * (1 - k);
  // the group's world matrix is fresh from setScan this frame
  _up.set(0, 1, 0).transformDirection(sw.group.matrixWorld);
  _p.set(0, BLADE_BASE, 0).applyMatrix4(sw.group.matrixWorld);
  sw.bladePlane.setFromNormalAndCoplanarPoint(_up, _p);
}

/* ── light gathering into the palms ─────────────────────────────────────── */
const SPARKS = 110;
function makeSparks() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
  const mat = new THREE.PointsMaterial({ size: 0.009, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const seed = Array.from({ length: SPARKS }, () => ({
    dir: new THREE.Vector3().randomDirection(),
    r: 0.18 + Math.random() * 0.3,
    spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5),
    lag: Math.random() * 0.35,
  }));
  return { pts, mat, seed };
}

type Move = "spin" | "jump";

export default function Operator({
  state,
  onHue,
  busy,
  stand,
  light,
}: {
  state: OperatorState;
  onHue?: (hex: string) => void;
  busy: { current: boolean };
  stand?: { position: [number, number, number]; scale: number; yaw?: number };
  /** the forge light, when the host owns it (see OperatorInWorld): in the
   *  scene before he is, so his arrival never changes the light count */
  light?: THREE.PointLight;
}) {
  const robot = useGLTF(lightBody() ? MOB : DESK, false, true);
  const spinG = useGLTF(SPIN, false, true);
  const jumpG = useGLTF(JUMP, false, true);
  const root = useRef<THREE.Group>(null);
  const shown = useRef<THREE.Group>(null);

  const rig = useMemo(() => {
    const scene = robot.scene;
    let mesh: THREE.SkinnedMesh | null = null;
    scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
    });
    const skinned = mesh as unknown as THREE.SkinnedMesh;
    skinned.frustumCulled = false;
    const mat = skinned.material as THREE.MeshStandardMaterial;
    // ?dbg=F for the design-loop fps series: his shell drawn front faces only
    if (DBG.includes("F")) mat.side = THREE.FrontSide;
    // the rig bakes base colour only: chrome comes from real reflections.
    // The export also wires that colour in as a full-strength emissive, which
    // lit him flat from inside — every panel the same brightness whatever the
    // light did, the reflections washed out. A trace of it stays, so the
    // white armour still reads in the dark corners of the world.
    mat.emissiveIntensity = 0.34;
    // The desktop body carries the source's own detail maps: a normal map (his
    // panel lines and machining catch the light) and a metal/roughness map
    // whose gloss averages ~0.12, so the factors scale it to the satin chrome
    // he always had (~0.26) while keeping its variation panel to panel. The
    // light phone body has neither and takes the flat values.
    mat.metalness = mat.metalnessMap ? 0.85 : 0.78;
    mat.roughness = mat.roughnessMap ? 2.2 : 0.26;
    mat.envMapIntensity = 1.6;
    // the sharpest filtering the GPU has (three clamps to its maximum): his
    // panel lines stay crisp where the armour turns away from the camera
    if (mat.map) mat.map.anisotropy = 16;
    if (mat.emissiveMap) mat.emissiveMap.anisotropy = 16;
    if (mat.normalMap) mat.normalMap.anisotropy = 16;
    // the shoulder plates are re-bound to the collarbone in the model file
    // itself (design-loop/art-src/robot/_gt/bake-shoulders.mjs) — no per-load
    // pass over every vertex on the visitor's device
    const bone = (n: string) => skinned.skeleton.bones.find((b) => b.name === n)!;
    const b = {
      hips: bone("Hips"),
      // the upper chest: the bone the shoulders and neck hang from, and the
      // chest plate the emblem is mounted on
      upper: bone("Spine"),
      spine: bone("Spine01"),
      chest: bone("Spine02"),
      neck: bone("neck"),
      head: bone("Head"),
      lArm: bone("LeftArm"),
      lFore: bone("LeftForeArm"),
      lHand: bone("LeftHand"),
      rArm: bone("RightArm"),
      rFore: bone("RightForeArm"),
      rHand: bone("RightHand"),
      // legs: only for the tuck of the roll-out; a rig without them stays straight
      lUp: skinned.skeleton.bones.find((b) => b.name === "LeftUpLeg"),
      lLeg: skinned.skeleton.bones.find((b) => b.name === "LeftLeg"),
      rUp: skinned.skeleton.bones.find((b) => b.name === "RightUpLeg"),
      rLeg: skinned.skeleton.bones.find((b) => b.name === "RightLeg"),
      lFoot: skinned.skeleton.bones.find((b) => b.name === "LeftFoot"),
      rFoot: skinned.skeleton.bones.find((b) => b.name === "RightFoot"),
    };
    const rest = new Map<THREE.Bone, THREE.Quaternion>();
    skinned.skeleton.bones.forEach((bn) => rest.set(bn, bn.quaternion.clone()));
    const restHips = b.hips.position.clone();
    const mixer = new THREE.AnimationMixer(scene);
    // each move anchored to the rest stance: the hips never travel, and a
    // jump keeps only part of its height so the robot stays in frame
    const prep = (src: THREE.AnimationClip, lift: number, speed: number) => {
      const clip = src.clone();
      const hp = clip.tracks.find((t) => /Hips\.position/.test(t.name));
      if (hp) {
        // The exported track has rest-pose keyframes scattered through the move
        // — single frames where the hips sit at their bind height (109.38)
        // while the clip is crouched at 62 — so he jumped a quarter of his
        // height and back at random, one keyframe at a time. Measured off the
        // rig: hips.y 61.7 -> 109.380 -> 61.7 with the arm rotations perfectly
        // smooth. A three-wide median takes single-frame outliers out of the
        // height without softening the move, and the track is read linearly so
        // what remains is never held as a step.
        const n = hp.values.length / 3;
        const ys = new Float32Array(n);
        for (let i = 0; i < n; i++) ys[i] = hp.values[i * 3 + 1];
        // the outliers come in short runs, so each key is judged against the
        // median of the seven around it and replaced by it when it sits more
        // than a tenth of the rig's height away — a real crouch or leap never
        // moves that far between neighbouring keys
        const half = 3;
        const win: number[] = [];
        const bindY = b.hips.position.y;
        const gate = Math.abs(bindY) * 0.1;
        const smooth = new Float32Array(n);
        let outliers = 0;
        for (let i = 0; i < n; i++) {
          win.length = 0;
          for (let k = Math.max(0, i - half); k <= Math.min(n - 1, i + half); k++) win.push(ys[k]);
          win.sort((a, c) => a - c);
          const m = win[win.length >> 1];
          const far = Math.abs(ys[i] - m) > gate;
          if (far) outliers++;
          smooth[i] = far ? m : ys[i];
        }
        const y0 = smooth[0];
        for (let i = 0; i < n; i++) {
          hp.values[i * 3] = restHips.x;
          hp.values[i * 3 + 1] = y0 + (smooth[i] - y0) * lift;
          hp.values[i * 3 + 2] = restHips.z;
        }
        hp.setInterpolation(THREE.InterpolateLinear);
        if (typeof window !== "undefined" && window.location.search.includes("gdbg")) {
          let nearBind = 0;
          for (let i = 0; i < n; i++) if (Math.abs(hp.values[i * 3 + 1] - bindY) < 0.5) nearBind++;
          console.log("[hips]", src.name || "clip", "keys", n, "at", (1 / (hp.times[1] - hp.times[0])).toFixed(0) + "fps",
            "interp", hp.getInterpolation(), "bind y", bindY.toFixed(2), "range", Math.min(...ys).toFixed(1) + "-" + Math.max(...ys).toFixed(1),
            "outliers replaced", outliers, "keys still at bind height", nearBind);
        }
      }
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = speed;
      return { clip, action, duration: clip.duration / speed };
    };
    const moves = {
      // Speeds that 60 frames a second can actually show. At 1.12x the sword
      // hand crossed 110-390 thousandths of the scene per frame through the
      // blade spin — four revolutions a second — which strobes, and its trail
      // ribbons opened into the big flat fans that read as glitching.
      spin: prep(spinG.animations[0], 1, 0.72),
      jump: prep(jumpG.animations[0], 0.55, 0.85),
    };
    const box = new THREE.Box3().setFromObject(scene);
    const height = box.getSize(new THREE.Vector3()).y;
    // his measurements in the bind pose, in his root's own units (he is one
    // unit tall there, feet at -0.5): where the hips, ankles and shoulders are,
    // so the scene can seat him and plant his feet on real surfaces
    scene.updateMatrixWorld(true);
    const at = (bn: THREE.Object3D | undefined) => {
      const v = bn ? bn.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
      return v.set(v.x / height, (v.y - box.min.y) / height - 0.5, v.z / height);
    };
    const lHip = at(b.lUp);
    const rHip = at(b.rUp);
    const unit = {
      hipY: (lHip.y + rHip.y) / 2,
      hipW: Math.abs(lHip.x - rHip.x) / 2,
      ankleY: (at(b.lFoot).y + at(b.rFoot).y) / 2 + 0.5,
      shoulderY: (at(b.lArm).y + at(b.rArm).y) / 2,
      legLen: lHip.distanceTo(at(b.lFoot)),
      shoulderW: Math.abs(at(b.lArm).x - at(b.rArm).x) / 2,
      armLen: at(b.lArm).distanceTo(at(b.lHand)),
    };
    // The emblem's seat: the front of the chest plate on his midline, at the
    // height of the emblem painted into his texture — the frontmost surface
    // there, read off his vertices in the bind pose. Kept as an offset in
    // that bone's own space, so the emblem rides every turn of his torso.
    const emblemAt = (() => {
      const geo = skinned.geometry;
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      const u = new THREE.Vector3();
      // a vertex in the skin's bind space, into the bones' (scene) space: via
      // the upper chest bone's inverse and its bind-pose transform — the same
      // road handFrame takes, since the mesh node's own transform carries the
      // quantization, not the skeleton's space
      const bi = skinned.skeleton.bones.indexOf(b.upper);
      const toScene = b.upper.matrixWorld.clone().multiply(skinned.skeleton.boneInverses[bi]).multiply(skinned.bindMatrix);
      // his midline: halfway between the shoulders
      const mid = b.lArm.getWorldPosition(new THREE.Vector3()).add(b.rArm.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
      const yLo = unit.shoulderY - 0.2;
      const yHi = unit.shoulderY - 0.04;
      let best = -Infinity;
      let bestY = (yLo + yHi) / 2;
      for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i).applyMatrix4(toScene);
        // (the model is not centred on x: measure from its own middle)
        u.set((v.x - mid.x) / height, (v.y - box.min.y) / height - 0.5, v.z / height);
        if (Math.abs(u.x) > 0.04 || u.y < yLo || u.y > yHi) continue;
        if (u.z > best) {
          best = u.z;
          bestY = u.y;
        }
      }
      // back to model space, then into the bone's own frame
      if (typeof window !== "undefined" && window.location.search.includes("gdbg")) console.log("[emblem] seat", bestY.toFixed(3), best.toFixed(3), "mid x", (mid.x / height).toFixed(3), "verts", pos.count);
      const p = new THREE.Vector3(mid.x, (bestY + 0.5) * height + box.min.y, best * height);
      const m = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
      return { local: b.upper.matrixWorld.clone().invert().multiply(m), unit: new THREE.Vector3(0, bestY, best) };
    })();
    return { scene, skinned, b, rest, restHips, mixer, moves, height, minY: box.min.y, unit, emblemAt };
  }, [robot, spinG, jumpG]);

  const swords = useMemo(() => [makeSword(), makeSword()], []);
  const jets = useMemo(() => makeJets(), []);
  const emblem = useMemo(() => makeEmblem(), []);
  useEffect(() => () => emblem.dispose(), [emblem]);
  // ?emb=dx,dy,dz,size nudges the emblem's seat (root units) for tuning
  const embTune = useMemo(() => {
    const d = typeof window === "undefined" ? [] : (new URLSearchParams(window.location.search).get("emb") ?? "").split(",").map(Number);
    return { dx: d[0] || 0, dy: d[1] || 0, dz: d[2] || 0, size: d[3] || EMBLEM_SIZE };
  }, []);
  const bladeMid = useMemo(() => new THREE.Vector3(), []);
  const fistAt = useMemo(() => new THREE.Vector3(), []);
  const sparks = useMemo(() => makeSparks(), []);
  const orb = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 20, 16),
      new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    return { mesh: m, mat: m.material as THREE.MeshBasicMaterial };
  }, []);

  /** The only light he carries: between the palms while the blade is forged,
   *  then on the blade itself. Always in the scene, at zero brightness when
   *  there is nothing to light — switching a light on and off changes how many
   *  three builds into every shader, and the whole world recompiles. */
  const own = useMemo(() => new THREE.PointLight("#ffffff", 0, 1.5, 1.6), []);
  const forge = light ?? own;

  // grip frames in each fist, read off the model (see handFrame) and seated (SOCKET)
  const mounts = useMemo(() => ({ r: new THREE.Object3D(), l: new THREE.Object3D() }), []);
  useEffect(() => {
    rig.b.rHand.add(mounts.r);
    rig.b.lHand.add(mounts.l);
    let top: THREE.Object3D = rig.b.rHand;
    while (top.parent) top = top.parent;
    top.updateMatrixWorld(true);
    const s = rig.b.rHand.getWorldScale(new THREE.Vector3()).x || 1;
    const u = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const bones = rig.skinned.skeleton.bones;
    const basis = new THREE.Matrix4();
    const x = new THREE.Vector3();
    const z = new THREE.Vector3();
    const probe = new THREE.Vector3();
    const hands = [
      [mounts.r, rig.b.rHand, 1],
      [mounts.l, rig.b.lHand, -1],
    ] as const;
    const t0 = performance.now();
    const frames = hands.map(([, hand]) => handFrame(rig.skinned, bones.indexOf(hand)));
    if (u?.has("gdbg")) console.log("[grip] measured both hands in", (performance.now() - t0).toFixed(1), "ms");
    const nums = (k: string) => (u?.get(k) ?? "").split(",").map(Number).filter((v) => !Number.isNaN(v));
    const tilt = new THREE.Quaternion();
    for (const [h, [m, hand, sign]] of hands.entries()) {
      m.scale.setScalar(1 / s);
      const fr = frames[h];
      if (!fr) {
        // no skin data to read: a plain fixed seating, so he still holds something
        m.position.set(0, 0.065 / s, 0);
        m.rotation.set(0, 0, (sign * Math.PI) / 2);
        continue;
      }
      const side = sign > 0 ? "r" : "l";
      const seat = { pos: [...SOCKET[side].pos], rot: [...SOCKET[side].rot] };
      nums("gs" + side).forEach((v, i) => (seat.pos[i] = v));
      nums("gr" + side).forEach((v, i) => (seat.rot[i] = v));
      // +Y of the mount is the blade, along the shaft. Both ends of the shaft
      // are the same line, so the blade takes the one that leaves the fist
      // upward in the rest stance — which mirrors onto the other hand by itself.
      const y = fr.axis.clone();
      probe.copy(fr.centre).add(y);
      hand.localToWorld(probe).sub(hand.localToWorld(fr.centre.clone()));
      if (probe.y < 0) y.negate();
      if (u?.has("gflip")) y.negate();
      // the blade's flat lies along the fingers
      x.set(0, 1, 0).projectOnPlane(y).normalize();
      if (x.lengthSq() < 0.5) x.set(1, 0, 0).projectOnPlane(y).normalize();
      z.crossVectors(x, y).normalize();
      basis.makeBasis(x, y, z);
      m.quaternion.setFromRotationMatrix(basis);
      tilt.setFromEuler(new THREE.Euler(seat.rot[0] * DEG, seat.rot[1] * DEG, seat.rot[2] * DEG));
      m.quaternion.multiply(tilt);
      m.position.set(
        fr.centre.x + seat.pos[0] * fr.ext.x,
        fr.centre.y + seat.pos[1] * fr.ext.y,
        fr.centre.z + seat.pos[2] * fr.ext.z,
      );
      if (u?.has("gdbg")) {
        const dir = (a: THREE.Vector3) => a.clone().transformDirection(hand.matrixWorld).toArray().map((n) => +n.toFixed(2));
        console.log("[grip]", side, JSON.stringify({
          centre: fr.centre.toArray().map((n) => +n.toFixed(2)),
          ext: fr.ext.toArray().map((n) => +n.toFixed(2)),
          shaft: fr.axis.toArray(),
          up: +probe.y.toFixed(2),
          worldX: dir(new THREE.Vector3(1, 0, 0)),
          worldY: dir(new THREE.Vector3(0, 1, 0)),
          worldZ: dir(new THREE.Vector3(0, 0, 1)),
          seat,
        }));
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(Math.min(fr.ext.x, fr.ext.z) * 0.35, 10, 8),
          new THREE.MeshBasicMaterial({ color: sign > 0 ? "#ff4466" : "#44aaff", wireframe: true, depthTest: false }),
        );
        ball.renderOrder = 999;
        ball.position.copy(m.position);
        hand.add(ball);
      }
    }
    // Which end of the fist's channel the blade leaves by. Both ends are the
    // same line, and in the rest stance (arms hanging) that line is level, so
    // "whichever points up at rest" was a coin toss — one hand came out
    // pommel-up. It is decided in the pose the sword is made in instead: the
    // fists meeting at the chest for the forge (the same targets the frame
    // loop solves for), where the blade must rise out of the grip.
    const r = root.current;
    if (r && !u?.has("gflip")) {
      const saved = rig.skinned.skeleton.bones.map((bn) => bn.quaternion.clone());
      rig.rest.forEach((qr, bn) => bn.quaternion.copy(qr));
      r.updateMatrixWorld(true);
      const chest = rig.b.chest.getWorldPosition(new THREE.Vector3());
      const fwd = new THREE.Vector3(0, 0, 1).transformDirection(r.matrixWorld);
      const side = new THREE.Vector3(1, 0, 0).transformDirection(r.matrixWorld);
      const F = chest.clone().addScaledVector(fwd, 0.2);
      F.y += 0.05;
      const TR = F.clone().addScaledVector(side, -0.035);
      const TL = F.clone().addScaledVector(side, 0.035);
      const PR = rig.b.rArm.getWorldPosition(new THREE.Vector3()).addScaledVector(side, -0.3).addScaledVector(fwd, -0.1);
      PR.y -= 0.35;
      const PL = rig.b.lArm.getWorldPosition(new THREE.Vector3()).addScaledVector(side, 0.3).addScaledVector(fwd, -0.1);
      PL.y -= 0.35;
      solveArm(rig.b.rArm, rig.b.rFore, rig.b.rHand, TR, PR, 1);
      solveArm(rig.b.lArm, rig.b.lFore, rig.b.lHand, TL, PL, 1);
      const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
      for (const m of [mounts.r, mounts.l]) {
        m.updateMatrixWorld(true);
        const up = new THREE.Vector3(0, 1, 0).transformDirection(m.matrixWorld);
        if (up.y < 0) m.quaternion.multiply(flip);
        if (u?.has("gdbg")) console.log("[grip] forge-pose blade y", up.y.toFixed(2), up.y < 0 ? "flipped" : "kept");
      }
      rig.skinned.skeleton.bones.forEach((bn, i) => bn.quaternion.copy(saved[i]));
      r.updateMatrixWorld(true);
    }
    if (u?.has("axes")) {
      // tuning aid: the raw hand-bone axes (red X, green Y, blue Z)
      const ax = new THREE.AxesHelper(0.12 / s);
      (ax.material as THREE.Material).depthTest = false;
      ax.renderOrder = 999;
      rig.b.rHand.add(ax);
    }
    return () => {
      rig.b.rHand.remove(mounts.r);
      rig.b.lHand.remove(mounts.l);
    };
  }, [rig, mounts]);

  // ?opmotion=1 — per-frame trace of the move (design-loop/move-trace.mjs)
  const trace = useMemo(() => {
    if (typeof window === "undefined" || !window.location.search.includes("opmotion")) return null;
    const w = window as unknown as { __motion?: unknown[] };
    w.__motion = [];
    return { rows: w.__motion as number[][], last: new THREE.Quaternion(), lastHand: new THREE.Vector3() };
  }, []);

  const hue = useMemo(() => new THREE.Color(OPERATOR_HUES[0]), []);
  const sim = useRef({
    yaw: 0,
    pitch: 0,
    t: 0,
    seen: 0,
    hueIdx: -1,
    count: 0,
    follow: 1,
    seq: -1, // seconds since the click, -1 = idle
    move: "jump" as Move,
    playing: false,
    queued: false,
    ik: 0,
    arrive: 0, // 0 -> 1 over his first half second on screen
  });

  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const turn = (bone: THREE.Bone, yaw: number, pitch: number) => {
    e.set(pitch, yaw, 0, "YXZ");
    q.setFromEuler(e);
    bone.quaternion.multiply(q);
  };

  const tmp = useMemo(
    () => ({
      F: new THREE.Vector3(),
      FL: new THREE.Vector3(),
      TL: new THREE.Vector3(),
      TR: new THREE.Vector3(),
      PL: new THREE.Vector3(),
      PR: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      inv: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      scl: new THREE.Vector3(),
      pos2: new THREE.Vector3(),
      quat2: new THREE.Quaternion(),
      fwd: new THREE.Vector3(),
      side: new THREE.Vector3(),
      chest: new THREE.Vector3(),
      tint: new THREE.Color(),
    }),
    [],
  );

  // Clicking him used to cost about 200ms per pointer event — three works out
  // where every skinned vertex is, on the CPU, to hit-test a SkinnedMesh, and
  // pointerdown, pointerup and click each paid for it. Nothing he is made of is
  // hit-tested now; the plain box below stands in for his silhouette, which is
  // also a kinder target than his actual outline.
  useEffect(() => {
    const none = () => {};
    const blank = (o: THREE.Object3D) => o.traverse((c) => ((c as THREE.Mesh).raycast = none));
    blank(rig.scene);
    swords.forEach((sw) => blank(sw.group));
    blank(sparks.pts);
    blank(orb.mesh);
    blank(jets.group);
  }, [rig, swords, sparks, orb, jets]);

  const { camera, gl, scene } = useThree();
  const [warmedEnv, setWarmedEnv] = useState(false);
  // he is not drawn until his own shaders are linked: a first draw that links
  // them itself would hold the main thread for every one of them
  const linked = useRef(false);
  // Compile every shader and upload the textures in the background as soon as
  // the robot exists, so the first visible frame doesn't stall the GPU.
  //
  // The three lights he carries — one in each blade, one in the forge orb —
  // are in the scene from here on, at zero intensity. three counts the VISIBLE
  // lights when it builds a program, so switching one on at the moment of the
  // click made every material in the world recompile: one frozen frame of
  // 762ms, right where the move was supposed to start. Their brightness is
  // animated instead, and nothing recompiles.
  useEffect(() => {
    // Not before the environment map is in place: a shader linked without it
    // is linked again, in full, the first time it is drawn with it — with his
    // body now arriving before the world's own boot, that was every lit
    // shader in the world built twice. Until then the world's own boot
    // (ReadySignal) links him along with everything else.
    if (!scene.environment) return;
    const rootObj = root.current;
    if (!rootObj) return;
    // everything he brings out mid-move is shown for the compile and the
    // texture upload, then hidden again: the blades, the jets,
    // the sparks and the forge orb.
    const hidden: THREE.Object3D[] = [];
    const show = (o: THREE.Object3D | null | undefined) => {
      if (!o || o.visible) return;
      hidden.push(o);
      o.visible = true;
    };
    swords.forEach((sw) => {
      show(sw.body);
      show(sw.blade);
    });
    [sparks.pts, orb.mesh, jets.group].forEach((o) => show(o));
    const done = () => hidden.forEach((o) => (o.visible = false));
    // A real draw, into a 1x1 target nobody sees: it links exactly the programs
    // a real draw needs and uploads every texture on the way. compileAsync
    // could not promise the same program key as the click's own draw — three
    // programs linked on every first click regardless, ~175ms.
    // The programs link in the background first (KHR_parallel_shader_compile,
    // with the target bound so they are the ones a draw into the composer's
    // buffer needs), and only then does the draw run — by then it has nothing
    // left to do but upload his textures. Linking inside the draw held the
    // main thread ~600ms while the loader was trying to animate.
    const tiny = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const prev = gl.getRenderTarget();
    let alive = true;
    const draw = () => {
      if (!alive) return;
      try {
        gl.setRenderTarget(tiny);
        gl.render(scene, camera);
      } finally {
        gl.setRenderTarget(prev);
        tiny.dispose();
        done();
        linked.current = true;
      }
    };
    const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    if (r.compileAsync) {
      // only his own objects, against the world's lights and environment
      gl.setRenderTarget(tiny);
      r.compileAsync(rootObj, camera, scene).then(
        () => {
          gl.setRenderTarget(prev);
          draw();
        },
        () => {
          gl.setRenderTarget(prev);
          draw();
        },
      );
    } else draw();
    return () => {
      // unmounted mid-compile: leave nothing shown that should be hidden
      if (alive) {
        alive = false;
        done();
      }
    };
  }, [gl, scene, camera, swords, orb, sparks, jets, warmedEnv]);

  // The world's environment map arrives after he does, and a material compiled
  // without it is compiled again the first time it is drawn with it — for the
  // hilt and the trails, that was the first click (three programs, ~175ms).
  // The pass above runs once more the frame the environment lands.
  useFrame(() => {
    if (!warmedEnv && scene.environment) setWarmedEnv(true);
  });
  const dbg = useMemo(() => {
    if (typeof window === "undefined") return null;
    const u = new URLSearchParams(window.location.search);
    if (!u.has("opt")) return null;
    return {
      t: Number(u.get("opt")),
      move: (u.get("opm") === "jump" ? "jump" : "spin") as Move,
      cam: u.get("opc") || "body",
      zoom: Number(u.get("opz") ?? 1),
    };
  }, []);

  useFrame((_, rawDt) => {
    let dt = Math.min(rawDt, 1 / 20);
    const s = sim.current;
    const r = root.current;
    if (!r) return;
    if (shown.current) shown.current.visible = !state.hidden && linked.current;
    // ?dbg=o: where he is in his start-up, for the design-loop tools
    if (DBG.includes("o")) (window as unknown as { __op: unknown }).__op = { linked: linked.current, env: !!scene.environment, warmedEnv, hidden: !!state.hidden, arrive: s.arrive };
    s.arrive = damp(s.arrive, 1, 5, dt);
    r.scale.setScalar((stand?.scale ?? 1) * (0.001 + 0.999 * ease(s.arrive)));
    if (dbg) {
      // inspection: the whole choreography held at one instant
      dt = 0;
      s.seq = dbg.t;
      s.move = dbg.move;
      s.follow = 0;
      hue.set(OPERATOR_HUES[dbg.move === "spin" ? 0 : 1]);
    }
    s.t += dt;

    // a click: start the forge; a click mid-move is queued and plays next
    if (state.strike !== s.seen) {
      s.seen = state.strike;
      s.queued = true;
    }
    if (s.queued && s.seq < 0) {
      s.queued = false;
      {
        s.hueIdx = (s.hueIdx + 1) % OPERATOR_HUES.length;
        hue.set(OPERATOR_HUES[s.hueIdx]);
        onHue?.(OPERATOR_HUES[s.hueIdx]);
        s.move = s.count % 2 === 0 ? "spin" : "jump";
        s.count++;
        s.seq = 0;
        s.playing = false;
      }
    }

    busy.current = s.seq >= 0;
    const mv = rig.moves[s.move];
    const twin = s.move === "spin";
    if (s.seq >= 0) s.seq += dt;
    const t = s.seq;
    const moveEnd = DRAW_END + mv.duration;

    // ── base pose: the rest pose, with the move blended over it ──
    // Only while the mixer is not driving him. three's PropertyMixer writes
    // a bone only when the clip's value differs from what it wrote last frame,
    // so on the flat stretches of a crouch (hips at 61.750 two frames running)
    // it writes nothing — and a rest-pose reset made every frame stood, with
    // the hips back at their bind height of 109.38. He jumped a quarter of his
    // height and back, one flat frame at a time. Rotations never showed it: a
    // spinning body's rotations are never equal two frames running.
    if (!s.playing || dbg) {
      rig.rest.forEach((qr, bn) => bn.quaternion.copy(qr));
      rig.b.hips.position.copy(rig.restHips);
    }
    if (t >= DRAW_END - BLEND && !s.playing) {
      s.playing = true;
      rig.mixer.stopAllAction();
      mv.action.reset().setEffectiveWeight(1).fadeIn(BLEND).play();
    }
    if (dbg) {
      rig.mixer.stopAllAction();
      const tm = (t - (DRAW_END - BLEND)) * mv.action.timeScale;
      s.playing = tm > 0;
      if (s.playing) {
        mv.action.reset().play();
        mv.action.setEffectiveWeight(Math.min(1, (t - (DRAW_END - BLEND)) / BLEND));
        mv.action.time = Math.min(tm, mv.clip.duration - 1e-3);
        rig.mixer.update(0);
      }
    } else if (s.playing) {
      rig.mixer.update(dt);
      // he stands back up over most of a second; half a second read as a snap
      if (t > moveEnd - 0.9 && mv.action.getEffectiveWeight() > 0.99) mv.action.fadeOut(0.9);
    }
    if (t >= moveEnd && !dbg) {
      s.seq = -1;
      s.playing = false;
      mv.action.stop();
    }

    // ── look at the visitor (or scan around on touch) ──
    let tx: number, ty: number;
    const touching = !state.fine && !!state.touchAt && performance.now() - state.touchAt < 1800;
    if (state.fine || touching) {
      tx = state.px;
      ty = state.py;
    } else {
      tx = Math.sin(s.t * 0.37) * 0.6 + Math.sin(s.t * 0.13) * 0.3;
      ty = Math.sin(s.t * 0.29 + 1.2) * 0.25;
    }
    const ins = s.seq < 0 ? state.inspect ?? -1 : -1;
    // his eyes: on the fist as it draws and as it sheathes, on the blade while
    // it is held out (following the blade to his hip twisted his whole spine)
    const held = ins >= INS.draw[1] - 0.15 && ins < INS.sheathe[0] + 0.15;
    const look = state.gaze ?? (held ? bladeMid : ins >= INS.hilt[0] && ins < INS.gone[1] ? fistAt : null);
    if (look) {
      // a look at something in the world, turned into the same yaw and pitch
      // the pointer drives (the spine, neck and head share ~1.4x of the yaw
      // with the root, ~1.08x of the pitch)
      tmp.pos2.copy(look);
      r.worldToLocal(tmp.pos2);
      tx = THREE.MathUtils.clamp(Math.atan2(tmp.pos2.x, tmp.pos2.z) / (1.05 * 1.4), -1, 1);
      ty = THREE.MathUtils.clamp(-Math.atan2(tmp.pos2.y - 0.4, Math.hypot(tmp.pos2.x, tmp.pos2.z)) / (0.6 * 1.08), -1, 1);
    }
    s.follow = damp(s.follow, s.seq >= 0 ? 0 : 1, 4, dt);
    s.yaw = damp(s.yaw, THREE.MathUtils.clamp(tx, -1, 1) * 1.05, 3.4, dt);
    s.pitch = damp(s.pitch, THREE.MathUtils.clamp(ty, -1, 1) * 0.6, 3.4, dt);
    // While a move plays the mixer owns the bones, and it only rewrites a bone
    // whose value changed since the last frame: anything turned on top of it
    // would stack up frame after frame and leave him twisted when the move
    // ended. So nothing procedural touches him while a move plays.
    const free = s.playing ? 0 : 1;
    const y = s.yaw * s.follow * free;
    const p = s.pitch * s.follow * free;
    turn(rig.b.spine, y * 0.2, p * 0.1);
    turn(rig.b.chest, y * 0.26, p * 0.16);
    turn(rig.b.neck, y * 0.3, p * 0.32);
    turn(rig.b.head, y * 0.42, p * 0.5);
    if (s.seq < 0 && free) turn(rig.b.chest, 0, Math.sin(s.t * 1.3) * 0.012); // breathing
    // ── the roll-out (OperatorInWorld drives the travel and the roll): he
    //    tucks — chin down, knees up, fists to the chest — as he goes ──
    const tuck = smooth(state.tuck ?? 0);
    const L = state.limbs;
    if (L && L.lean && free) turn(rig.b.chest, 0, L.lean);
    if (tuck > 0.001 && free) {
      turn(rig.b.chest, 0, tuck * 0.55);
      turn(rig.b.neck, 0, tuck * 0.35);
      turn(rig.b.head, 0, tuck * 0.3);
      if (!s.playing) rig.b.hips.position.y = rig.restHips.y - Math.abs(rig.restHips.y) * 0.16 * tuck;
      const legs = [
        [rig.b.lUp, rig.b.lLeg],
        [rig.b.rUp, rig.b.rLeg],
      ] as const;
      for (const [up, low] of legs) {
        if (up) turn(up, 0, -tuck * TUCK_THIGH);
        if (low) turn(low, 0, tuck * TUCK_KNEE);
      }
    }
    // hanging from a bar (or in flight): knees bent back, one more than the other
    const hang = L && free ? L.hang : 0;
    if (hang > 0.001) {
      if (rig.b.lUp) turn(rig.b.lUp, 0, -hang * 0.3);
      if (rig.b.lLeg) turn(rig.b.lLeg, 0, hang * 1.15);
      if (rig.b.rUp) turn(rig.b.rUp, 0, -hang * 0.18);
      if (rig.b.rLeg) turn(rig.b.rLeg, 0, hang * 1.5);
    }
    // planted, he turns from the waist up rather than swivelling on his seat
    const planted = L ? Math.max(L.footW[0], L.footW[1]) : 0;
    r.rotation.y = (state.yaw ?? stand?.yaw ?? 0) + y * 0.22 * (1 - 0.8 * planted);
    r.updateMatrixWorld(true);
    if (!state.build) {
      const k = stand?.scale ?? 1;
      const u = rig.unit;
      state.build = {
        hipY: u.hipY * k,
        hipW: u.hipW * k,
        ankleY: u.ankleY * k,
        shoulderY: u.shoulderY * k,
        shoulderW: u.shoulderW * k,
        armLen: u.armLen * k,
        legLen: u.legLen * k,
      };
    }

    // ── feet on surfaces: two-bone IK down each leg, the foot kept level ──
    tmp.fwd.set(0, 0, 1).transformDirection(r.matrixWorld);
    tmp.side.set(1, 0, 0).transformDirection(r.matrixWorld);
    if (L && free) {
      const legs = [
        [rig.b.lUp, rig.b.lLeg, rig.b.lFoot, 1],
        [rig.b.rUp, rig.b.rLeg, rig.b.rFoot, -1],
      ] as const;
      for (let i = 0; i < 2; i++) {
        const [up, low, foot, sd] = legs[i];
        const T = L.feet[i];
        const w = L.footW[i];
        if (!up || !low || !foot || !T || w < 0.001) continue;
        foot.getWorldQuaternion(tmp.quat2);
        // knees forward and a touch outward; up toward the chest when seated
        up.getWorldPosition(tmp.PL);
        tmp.PL.addScaledVector(tmp.fwd, 1.2).addScaledVector(tmp.side, sd * (0.25 + L.kneesOut * 1.1));
        tmp.PL.y += L.kneesUp * 1.1;
        solveArm(up, low, foot, T, tmp.PL, w);
        // the sole stays flat on what it stands on
        low.getWorldQuaternion(_pw);
        _bw.copy(_pw).invert().multiply(tmp.quat2);
        foot.quaternion.slerp(_bw, w);
        foot.updateMatrixWorld(true);
      }
    }

    // ── the forge: both hands meet at the chest, then the right hand draws ──
    // the hands are gathered over GATHER and, once the draw is done, released
    // to the clip over BLEND — velocity-continuous at both ends, so neither
    // hand-off reads as a cut
    if (t < 0) s.ik = 0;
    else if (t < DRAW_END) s.ik = ease(t / GATHER);
    else s.ik = 1 - smooth((t - DRAW_END) / BLEND);
    rig.b.chest.getWorldPosition(tmp.chest);
    tmp.fwd.set(0, 0, 1).transformDirection(r.matrixWorld);
    tmp.side.set(1, 0, 0).transformDirection(r.matrixWorld); // the robot's left
    tmp.F.copy(tmp.chest).addScaledVector(tmp.fwd, 0.2);
    tmp.F.y += 0.05;
    const draw = ease((t - FORGE_END) / (DRAW_END - FORGE_END));
    tmp.TL.copy(tmp.F).addScaledVector(tmp.side, 0.035);
    tmp.TR.copy(tmp.F).addScaledVector(tmp.side, -0.035);
    if (t > FORGE_END) {
      // the right fist pulls out and up; for the twin the left opens away too
      tmp.TR.addScaledVector(tmp.side, -0.24 * draw).addScaledVector(tmp.fwd, 0.06 * draw);
      tmp.TR.y += 0.08 * draw;
      if (twin) tmp.TL.addScaledVector(tmp.side, 0.2 * draw).addScaledVector(tmp.fwd, 0.04 * draw);
    }
    rig.b.rArm.getWorldPosition(tmp.PR);
    tmp.PR.addScaledVector(tmp.side, -0.3).addScaledVector(tmp.fwd, -0.1);
    tmp.PR.y -= 0.35;
    rig.b.lArm.getWorldPosition(tmp.PL);
    tmp.PL.addScaledVector(tmp.side, 0.3).addScaledVector(tmp.fwd, -0.1);
    tmp.PL.y -= 0.35;
    // the tuck brings both fists to the chest the same way the forge does
    const grab = Math.max(s.ik, tuck);
    solveArm(rig.b.rArm, rig.b.rFore, rig.b.rHand, tmp.TR, tmp.PR, grab);
    solveArm(rig.b.lArm, rig.b.lFore, rig.b.lHand, tmp.TL, tmp.PL, grab);
    // At rest the hands follow the pointer as well, a little and after the
    // head: each fist drifts toward the cursor's side and lifts with it, so he
    // reaches toward the visitor rather than only looking at them.
    if (s.seq < 0 && (state.fine || touching) && tuck < 0.999 && ins < 0) {
      const placed = L ? Math.max(L.handW[0], L.handW[1], L.footW[0] * 0.6) : 0;
      const reach = 0.42 * s.follow * (1 - tuck) * (1 - placed);
      const lift = 0.05 - s.pitch * 0.14;
      rig.b.rHand.getWorldPosition(tmp.TR).addScaledVector(tmp.side, -s.yaw * 0.07).addScaledVector(tmp.fwd, 0.07);
      tmp.TR.y += lift;
      rig.b.lHand.getWorldPosition(tmp.TL).addScaledVector(tmp.side, -s.yaw * 0.07).addScaledVector(tmp.fwd, 0.07);
      tmp.TL.y += lift;
      solveArm(rig.b.rArm, rig.b.rFore, rig.b.rHand, tmp.TR, tmp.PR, reach);
      solveArm(rig.b.lArm, rig.b.lFore, rig.b.lHand, tmp.TL, tmp.PL, reach);
    }
    // ── hands on things: a palm on the glass, a forearm across a knee ──
    if (L) {
      const arms = [
        [rig.b.lArm, rig.b.lFore, rig.b.lHand, tmp.PL, rig.b.lLeg, 1],
        [rig.b.rArm, rig.b.rFore, rig.b.rHand, tmp.PR, rig.b.rLeg, -1],
      ] as const;
      for (let i = 0; i < 2; i++) {
        const [arm, fore, handB, pole, knee, sd] = arms[i];
        const w = L.handW[i] * (1 - s.ik);
        if (w < 0.001) continue;
        let T = L.hands[i];
        if (L.knee[i] && knee) {
          // the wrist just past the kneecap, the forearm lying along the thigh
          T = knee.getWorldPosition(tmp.TL);
          T.y += 0.07 * (stand?.scale ?? 1) / 2.6;
          T.addScaledVector(tmp.fwd, 0.05).addScaledVector(tmp.side, -sd * 0.02);
        }
        if (!T) continue;
        arm.getWorldPosition(pole).addScaledVector(tmp.side, sd * 0.4).addScaledVector(tmp.fwd, -0.15);
        pole.y -= 0.3;
        solveArm(arm, fore, handB, T, pole, w);
      }
    }
    // ── looking his blade over: drawn from the left hip in one sweep, held
    //    out at arm's length and turned in the light, sheathed the same way ──
    if (ins >= 0) {
      const span = (x: readonly [number, number]) => ease((ins - x[0]) / (x[1] - x[0]));
      const w = smooth(ins / 0.35) * (1 - smooth((ins - INS.down[0]) / (INS.down[1] - INS.down[0])));
      // the scabbard's mouth at his left hip, and where he holds the blade out
      // (within his reach: the arm is ~0.85 long, and a target past it leaves
      // the arm locked straight and straining)
      insQ.hip.copy(tmp.chest).addScaledVector(tmp.side, 0.17).addScaledVector(tmp.fwd, 0.2);
      insQ.hip.y -= 0.26;
      insQ.front.copy(tmp.chest).addScaledVector(tmp.fwd, 0.44).addScaledVector(tmp.side, -0.16);
      insQ.front.y += 0.02 + Math.sin(ins * 0.9) * 0.015;
      // k: 0 at the hip .. 1 held out. The fist travels an arc, out to his
      // right and up, so the blade sweeps clear of his body both ways.
      const k = span(INS.draw) * (1 - span(INS.sheathe));
      const arc = Math.sin(Math.PI * k);
      tmp.TR.lerpVectors(insQ.hip, insQ.front, k).addScaledVector(tmp.side, -arc * 0.24).addScaledVector(tmp.fwd, arc * 0.14);
      tmp.TR.y += arc * 0.1;
      solveArm(rig.b.rArm, rig.b.rFore, rig.b.rHand, tmp.TR, tmp.PR, w);
      // his left hand steadies the scabbard at the hip for the draw and the sheathe
      const lw = w * (1 - smooth((k - 0.15) / 0.45));
      if (lw > 0.001) {
        tmp.TL.copy(insQ.hip).addScaledVector(tmp.side, 0.1).addScaledVector(tmp.fwd, -0.05);
        tmp.TL.y -= 0.1;
        solveArm(rig.b.lArm, rig.b.lFore, rig.b.lHand, tmp.TL, tmp.PL, lw);
      }
      // held out: upright, leaning a touch away, tipped out to his right and
      // rolled to catch the light — never across his face
      const turnK = smooth((ins - INS.turn[0]) / 0.6) * (1 - smooth((ins - (INS.turn[1] - 0.6)) / 0.6));
      const tip = -0.42 * turnK * Math.sin(((ins - INS.turn[0]) / (INS.turn[1] - INS.turn[0])) * Math.PI);
      const roll = 1.1 * turnK * Math.sin((ins - INS.turn[0]) * 1.25);
      insQ.dir.set(0, 1, 0).multiplyScalar(Math.cos(0.14)).addScaledVector(tmp.fwd, Math.sin(0.14));
      insQ.dir.multiplyScalar(Math.cos(tip)).addScaledVector(tmp.side, Math.sin(tip)).addScaledVector(tmp.fwd, Math.abs(Math.sin(tip)) * 0.5).normalize();
      insQ.z.copy(tmp.fwd).multiplyScalar(-1).projectOnPlane(insQ.dir).normalize();
      insQ.z.applyAxisAngle(insQ.dir, roll);
      insQ.x.crossVectors(insQ.dir, insQ.z).normalize();
      insQ.m.makeBasis(insQ.x, insQ.dir, insQ.z);
      insQ.q.setFromRotationMatrix(insQ.m);
      // at the hip: the line a scabbard hangs on — down, back and out along
      // his thigh, the flat against it
      insQ.dir.set(0, -0.8, 0).addScaledVector(tmp.fwd, -0.45).addScaledVector(tmp.side, 0.3).normalize();
      insQ.z.copy(tmp.side).projectOnPlane(insQ.dir).normalize();
      insQ.x.crossVectors(insQ.dir, insQ.z).normalize();
      insQ.m.makeBasis(insQ.x, insQ.dir, insQ.z);
      insQ.q2.setFromRotationMatrix(insQ.m);
      // the mount's world rotation along the sweep, then the hand that gives it
      insQ.q2.slerp(insQ.q, k);
      insQ.q2.multiply(insQ.mInv.copy(mounts.r.quaternion).invert());
      rig.b.rFore.getWorldQuaternion(_pw);
      insQ.q2.premultiply(_pw.invert());
      rig.b.rHand.quaternion.slerp(insQ.q2, w);
      rig.b.rHand.updateMatrixWorld(true);
      rig.b.rHand.getWorldPosition(fistAt);
    }
    r.updateMatrixWorld(true);
    tmp.FL.copy(tmp.F);
    r.worldToLocal(tmp.FL);

    // ── light spiralling into the palms ──
    const gatherK = t < 0 ? 0 : THREE.MathUtils.clamp(t / FORGE_END, 0, 1);
    const sparkVis = t >= 0 && t < FORGE_END + 0.2 ? Math.min(1, t / 0.2) * (1 - THREE.MathUtils.clamp((t - FORGE_END) / 0.2, 0, 1)) : 0;
    sparks.mat.opacity = 0.95 * sparkVis;
    sparks.mat.color.copy(hue).lerp(WHITE, 0.35);
    sparks.pts.visible = sparkVis > 0;
    if (sparkVis > 0) {
      const arr = sparks.pts.geometry.attributes.position.array as Float32Array;
      sparks.seed.forEach((sd, i) => {
        const k = THREE.MathUtils.clamp((gatherK - sd.lag) / (1 - sd.lag), 0, 1);
        const rad = sd.r * Math.pow(1 - k, 1.6);
        const ang = sd.spin * k;
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        arr[i * 3] = tmp.FL.x + (sd.dir.x * c - sd.dir.z * sn) * rad;
        arr[i * 3 + 1] = tmp.FL.y + sd.dir.y * rad;
        arr[i * 3 + 2] = tmp.FL.z + (sd.dir.x * sn + sd.dir.z * c) * rad;
      });
      sparks.pts.geometry.attributes.position.needsUpdate = true;
    }
    // the orb between the palms swells, then is spent into the hilt
    const orbK = t >= 0 && t < FORGE_END + 0.25 ? ease(t / GATHER) * (1 - THREE.MathUtils.clamp((t - FORGE_END + 0.2) / 0.45, 0, 1)) : 0;
    // never hidden: the forge orb carries a light, and hiding it would change
    // how many lights three builds into every shader (see makeSword). At rest
    // its opacity is zero, so there is nothing to see either way.
    orb.mesh.position.copy(tmp.FL);
    orb.mesh.scale.setScalar(0.4 + orbK * (0.8 + 0.15 * Math.sin(s.t * 30)));
    orb.mat.opacity = orbK;
    orb.mat.color.copy(hue).lerp(WHITE, 0.5).multiplyScalar(1.5);

    // the one light: with the orb while it is burning (the blades are steel
    // and carry none)
    forge.color.copy(hue);
    const lit = orbK * 4;
    // his own light sits under his root; a lent one lives in the host's space
    if (orbK > 0.001) forge.position.copy(light ? tmp.F : tmp.FL);

    // ── swords: forged upright at the meeting point, then carried by the fists ──
    const end = t > moveEnd - 0.75 ? ease((t - (moveEnd - 0.75)) / 0.6) : 0;
    tmp.inv.copy(r.matrixWorld).invert();
    swords.forEach((sw, i) => {
      sw.edge.emissiveIntensity = 0;
      if (ins >= 0) {
        // looking it over: only the main blade, built in the fist, run out,
        // run back in, and the hilt dissolved again
        sw.body.visible = i === 0 && ins > INS.hilt[0] && ins < INS.gone[1];
        if (!sw.body.visible) return;
        mounts.r.updateMatrixWorld(true);
        tmp.m.multiplyMatrices(tmp.inv, mounts.r.matrixWorld);
        tmp.m.decompose(tmp.pos, tmp.quat, tmp.scl);
        sw.group.position.copy(tmp.pos);
        sw.group.quaternion.copy(tmp.quat);
        const span = (a: readonly [number, number]) => ease((ins - a[0]) / (a[1] - a[0]));
        setScan(sw, span(INS.hilt) * (1 - span(INS.gone)));
        setBlade(sw, span(INS.out) * (1 - span(INS.in)));
        // the glint: light runs off the polished edges as the blade locks
        const g = (ins - INS.glint[0]) / (INS.glint[1] - INS.glint[0]);
        sw.edge.emissiveIntensity = g > 0 && g < 1 ? Math.sin(Math.PI * g) ** 2 * 1.4 : 0;
        // where his eyes go next frame: halfway up the blade
        bladeMid.set(0, BLADE_BASE + BLADE * 0.45, 0).applyQuaternion(tmp.quat).add(tmp.pos);
        r.localToWorld(bladeMid);
        return;
      }
      const isTwin = i === 1;
      const start = isTwin ? FORGE_END : GATHER * 0.7;
      sw.body.visible = t >= start && (!isTwin || twin);
      if (!sw.body.visible) return;
      // scan: the main hilt builds at the chest; the twin builds in the left fist as the hands part
      const scan = isTwin ? ease((t - FORGE_END) / 0.45) : ease((t - start) / (FORGE_END - start));
      const mount = isTwin ? mounts.l : mounts.r;
      mount.updateMatrixWorld(true);
      tmp.m.multiplyMatrices(tmp.inv, mount.matrixWorld); // fist frame, in root space
      tmp.m.decompose(tmp.pos, tmp.quat, tmp.scl);
      // always in the fist: during the forge the fists are clasped at the chest,
      // so the hilt is built right inside the grip and then simply drawn out
      sw.group.position.copy(tmp.pos);
      sw.group.quaternion.copy(tmp.quat);
      setScan(sw, scan * (1 - end));
      // blade: runs out of the guard as the draw completes, back in before the end
      const on = isTwin ? ease((t - FORGE_END - 0.3) / 0.28) : ease((t - (FORGE_END + 0.15)) / 0.28);
      setBlade(sw, on * (1 - end));
    });
    forge.intensity = lit;

    // ── the emblem: seated on his chest plate, following the torso; it
    //    breathes, and surges with the forge and the jets ──
    tmp.m.multiplyMatrices(rig.b.upper.matrixWorld, rig.emblemAt.local);
    tmp.m.premultiply(tmp.inv.copy(r.matrixWorld).invert());
    tmp.m.decompose(tmp.pos, tmp.quat, tmp.scl);
    emblem.group.position.copy(tmp.pos);
    emblem.group.quaternion.copy(tmp.quat);
    // the seat is the plate's front on the midline: the bezel sits on it and
    // the recess sinks into him
    // (the plate is curved: the core is held just in front of its surface,
    // or the plate itself would cut across the light)
    emblem.group.translateZ(0.011 + embTune.dz);
    emblem.group.translateX(embTune.dx);
    // centred on the mark sculpted into the plate, a little above the seat
    emblem.group.translateY(0.024 + embTune.dy);
    emblem.group.scale.setScalar(embTune.size);
    // the reactor pulses, slow and steady, like something alive in him
    const breathe = 0.78 + 0.2 * Math.sin(s.t * 2.1) * Math.sin(s.t * 0.7 + 1);
    emblem.update(s.t, breathe + orbK * 0.9 + (state.thrust ?? 0) * 0.8);

    // ── the jets: at each boot, pointing down his body, as long as the thrust ──
    const thrust = state.thrust ?? 0;
    jets.core.uniforms.uThrust.value = thrust;
    jets.plume.uniforms.uThrust.value = thrust;
    jets.core.uniforms.uTime.value = s.t;
    jets.plume.uniforms.uTime.value = s.t;
    jets.nozzle.opacity = Math.min(1, thrust * 1.6);
    // not drawn at all while they are out (six transparent draws saved every
    // frame); their program was linked with his at start-up
    jets.group.visible = thrust > 0.001;
    if (DBG.includes("o")) (window as unknown as { __jets: unknown }).__jets = jets;
    const feet = [rig.b.lFoot, rig.b.rFoot];
    for (let i = 0; i < 2 && jets.group.visible; i++) {
      const j = jets.boots[i];
      const f = feet[i];
      if (!f) continue;
      f.getWorldPosition(tmp.pos2);
      r.worldToLocal(tmp.pos2);
      // just under the heel, straight down his body
      j.g.position.set(tmp.pos2.x, tmp.pos2.y - 0.012, tmp.pos2.z - 0.004);
      const k = Math.max(0.001, thrust);
      const flick = 1 + 0.08 * Math.sin(s.t * 43 + i * 2.1);
      j.c.scale.set(0.02 + 0.01 * k, (0.1 + 0.26 * k) * flick, 0.02 + 0.01 * k);
      j.p.scale.set(0.034 + 0.02 * k, (0.14 + 0.42 * k) * flick, 0.034 + 0.02 * k);
      j.n.scale.setScalar((0.02 + 0.012 * k) * flick);
    }

    if (trace) {
      const q = rig.b.chest.quaternion;
      const turn = 2 * Math.acos(Math.min(1, Math.abs(q.dot(trace.last))));
      trace.last.copy(q);
      const hand = rig.b.rHand.getWorldPosition(tmp.PL);
      const moved = trace.lastHand.lengthSq() === 0 ? 0 : hand.distanceTo(trace.lastHand);
      trace.lastHand.copy(hand);
      trace.rows.push([
        +(t >= 0 ? t : -1).toFixed(3),
        +(turn * 1000).toFixed(2),
        +(moved * 1000).toFixed(2),
        swords[0].body.visible ? 1 : 0,
        swords[0].blade.visible ? 1 : 0,
        +mv.action.getEffectiveWeight().toFixed(3),
        +rawDt.toFixed(4),
        +mv.action.time.toFixed(3),
        +hand.x.toFixed(4),
        +hand.y.toFixed(4),
        +hand.z.toFixed(4),
        +rig.b.hips.position.y.toFixed(4),
        +rig.b.rArm.getWorldPosition(tmp.PR).y.toFixed(4),
        +rig.b.rArm.quaternion.x.toFixed(4),
        +rig.b.rHand.quaternion.x.toFixed(4),
      ]);
    }

    if (dbg && dbg.cam !== "body") {
      // inspection only: hold the camera on one hand, at the robot's own scale
      const h = dbg.cam === "lhand" ? rig.b.lHand : rig.b.rHand;
      const at = h.getWorldPosition(new THREE.Vector3());
      const k = (stand?.scale ?? 1) * dbg.zoom;
      camera.position.set(at.x + (dbg.cam === "lhand" ? -0.12 : 0.12) * k, at.y + 0.06 * k, at.z + 0.42 * k);
      camera.lookAt(at);
    }
  });

  const scale = 1 / rig.height;
  return (
    <group ref={root} position={stand?.position} scale={stand?.scale ?? 1}>
      {/* the light stays outside the part of him that can be hidden (see
          OperatorState.hidden); at rest it is at zero and lights nothing */}
      {light ? null : <primitive object={forge} />}
      <group ref={shown}>
      {/* what the pointer actually hits (see the note above): a box his size.
          It paints nothing — but it cannot be visible={false}, because three
          does not hit-test what it cannot see. */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.62, 1.08, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <group scale={scale} position={[0, -rig.minY * scale - 0.5, 0]}>
        <primitive object={rig.scene} />
      </group>
      <primitive object={swords[0].group} />
      <primitive object={swords[1].group} />
      <primitive object={sparks.pts} />
      <primitive object={jets.group} />
      <primitive object={emblem.group} />
      <primitive object={orb.mesh} />
      </group>
    </group>
  );
}


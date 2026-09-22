"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

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
}

const DESK = "/models/robot-desk.glb";
const MOB = "/models/robot-mob.glb";
const SPIN = "/models/robot-anim-spin.glb";
const JUMP = "/models/robot-anim-jump.glb";
const SWORD = "/models/robot-sword.glb";

/* choreography, seconds from the click */
const GATHER = 0.6; // hands meet, light spirals in
const FORGE_END = 1.45; // the scan has built the hilt
const DRAW_END = 1.8; // the right hand has drawn it
const BLEND = 0.35; // hand-off from the forge pose into the move

/* sizes in scene units (the robot stands 1 unit tall) */
const HILT = 0.15;
const GRIP = 0.2; // where the fist closes, above the hilt's centre (just under the guard)
const BLADE = 0.56;

const damp = (c: number, t: number, l: number, dt: number) => THREE.MathUtils.lerp(c, t, 1 - Math.exp(-l * dt));
const ease = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
};

/** eigenvectors of a symmetric 3x3, largest first (cyclic Jacobi) */
function principalAxes(cov: number[][]) {
  const a = cov.map((r) => r.slice());
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 24; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] * a[p][q];
    if (off < 1e-20) break;
    for (let p = 0; p < 3; p++)
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k++) {
          const kp = a[k][p];
          const kq = a[k][q];
          a[k][p] = c * kp - s * kq;
          a[k][q] = s * kp + c * kq;
        }
        for (let k = 0; k < 3; k++) {
          const pk = a[p][k];
          const qk = a[q][k];
          a[p][k] = c * pk - s * qk;
          a[q][k] = s * pk + c * qk;
        }
        for (let k = 0; k < 3; k++) {
          const kp = v[k][p];
          const kq = v[k][q];
          v[k][p] = c * kp - s * kq;
          v[k][q] = s * kp + c * kq;
        }
      }
  }
  return [0, 1, 2]
    .sort((i, j) => a[j][j] - a[i][i])
    .map((i) => new THREE.Vector3(v[0][i], v[1][i], v[2][i]).normalize());
}

type Fist = {
  /** the middle of the channel through the fist */
  hold: THREE.Vector3;
  /** the channel's axis: the shaft runs along it */
  axis: THREE.Vector3;
  /** across the shaft, for the blade's flats */
  flat: THREE.Vector3;
  /** how much room the channel has, in bone units */
  room: number;
};

const WEDGES = 8; // octants: classified by sign and slope, no atan2 per point

/** The fattest circle that fits in a fist's cross-section. A circle only counts
 *  if the hand rings it — hand in every direction around it — otherwise the
 *  widest gap found is the open side of the curl, out in front of the fingers,
 *  and not a channel at all. Among circles of much the same size it takes the
 *  one nearest the middle of the hand, so the two fists settle alike instead of
 *  each landing on its own local best. */
function widestGap(flat: number[][], reach: number, cx: number, cy: number) {
  const xs = flat.map((q) => q[0]);
  const ys = flat.map((q) => q[1]);
  let box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  let best = { r: -1, x: 0, y: 0 };
  const seen = new Array<boolean>(WEDGES);
  const room = (x: number, y: number) => {
    seen.fill(false);
    let near = Infinity;
    let ringed = 0;
    for (const q of flat) {
      const dx = q[0] - x;
      const dy = q[1] - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < near) near = d;
      if (d > reach) continue;
      const w = (dy >= 0 ? 4 : 0) | (dx >= 0 ? 2 : 0) | (Math.abs(dy) > Math.abs(dx) ? 1 : 0);
      if (!seen[w]) {
        seen[w] = true;
        ringed++;
      }
    }
    return ringed === WEDGES ? near : -1;
  };
  const cell: number[] = [];
  for (let pass = 0; pass < 3; pass++) {
    const N = pass === 0 ? 20 : 8;
    const stepX = (box[2] - box[0]) / N;
    const stepY = (box[3] - box[1]) / N;
    cell.length = 0;
    let top = -1;
    for (let i = 0; i <= N; i++)
      for (let j = 0; j <= N; j++) {
        const x = box[0] + stepX * i;
        const y = box[1] + stepY * j;
        const r = room(x, y);
        if (r < 0) continue;
        cell.push(x, y, r);
        if (r > top) top = r;
      }
    if (top < 0) break;
    best = { r: -1, x: 0, y: 0 };
    let nearest = Infinity;
    for (let k = 0; k < cell.length; k += 3) {
      if (cell[k + 2] < top * 0.9) continue;
      const d = (cell[k] - cx) * (cell[k] - cx) + (cell[k + 1] - cy) * (cell[k + 1] - cy);
      if (d < nearest) {
        nearest = d;
        best = { r: cell[k + 2], x: cell[k], y: cell[k + 1] };
      }
    }
    box = [best.x - stepX, best.y - stepY, best.x + stepX, best.y + stepY];
  }
  return best;
}

/* ── where a sword actually sits in the fist ──────────────────────────────
   Nothing here is guessed at. The hands are closed in the model itself (see
   design-loop/art-src/robot/_gt/curl-fingers.mjs), which leaves a channel
   through each fist. This finds it: every vertex skinned to the hand is read
   in the bind pose, and for each of the hand's own principal axes the widest
   circle that fits inside its outline is measured. The roomiest of the three
   is the channel a hilt can lie in, and its centre is where the sword goes. */
function measureFist(skinned: THREE.SkinnedMesh, boneIndex: number): Fist[] | null {
  const geo = skinned.geometry;
  const pos = geo.attributes.position;
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  if (!pos || !si || !sw || boneIndex < 0) return null;
  // bind-pose vertex → hand-bone space, whatever pose happens to be playing
  const toBone = skinned.skeleton.boneInverses[boneIndex].clone().multiply(skinned.bindMatrix);
  const v = new THREE.Vector3();
  const pts: THREE.Vector3[] = [];
  const centre = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === boneIndex) w += sw.getComponent(i, k);
    if (w < 0.6) continue; // the hand proper, not the wrist blend
    v.fromBufferAttribute(pos, i).applyMatrix4(toBone);
    pts.push(v.clone());
    centre.add(v);
  }
  if (pts.length < 64) return null;
  centre.multiplyScalar(1 / pts.length);
  const cov = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const q of pts) {
    const d = [q.x - centre.x, q.y - centre.y, q.z - centre.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j];
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] /= pts.length;
  const axes = principalAxes(cov);
  // a few hundred points describe the outline as well as thousands do, and
  // this runs on the visitor's device
  const step = Math.max(1, Math.ceil(pts.length / 400));
  const sample = pts.filter((_, i) => i % step === 0);

  // how far out to look for hand around a candidate channel: a fist is about a
  // third of the hand's length across
  let reach = 0;
  for (const q of sample) reach = Math.max(reach, q.distanceTo(centre));

  const found: Fist[] = [];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  for (const axis of axes) {
    e1.copy(axes[0] === axis ? axes[1] : axes[0]).projectOnPlane(axis).normalize();
    e2.crossVectors(axis, e1).normalize();
    const flat = sample.map((q) => [q.dot(e1), q.dot(e2)]);
    const gap = widestGap(flat, reach * 0.9, centre.dot(e1), centre.dot(e2));
    const mid = sample.reduce((t, q) => t + q.dot(axis), 0) / sample.length;
    found.push({
      room: gap.r,
      hold: new THREE.Vector3().addScaledVector(e1, gap.x).addScaledVector(e2, gap.y).addScaledVector(axis, mid),
      axis: axis.clone(),
      flat: e1.clone(),
    });
  }
  return found;
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

function aimBone(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, pivot: THREE.Vector3, w: number) {
  _a.subVectors(from, pivot).normalize();
  _b.subVectors(to, pivot).normalize();
  _dq.setFromUnitVectors(_a, _b);
  if (w < 1) _dq.copy(_id).slerp(_dq, w);
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

/* ── one sword: generated hilt + coded energy blade ─────────────────────── */
interface SwordRig {
  group: THREE.Group;
  plane: THREE.Plane;
  ring: THREE.Mesh;
  blade: THREE.Group;
  core: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  halo: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
}

function makeSword(src: THREE.Object3D): SwordRig {
  const group = new THREE.Group();
  group.visible = false;
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const hilt = src.clone(true);
  const box = new THREE.Box3().setFromObject(hilt);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = HILT / size.y;
  hilt.scale.setScalar(s);
  // centre the hilt, then drop it so the fist (GRIP) sits at the group origin
  hilt.position.set(-center.x * s, -center.y * s - GRIP * HILT, -center.z * s);
  hilt.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.metalness = 1;
      mat.roughness = 0.28;
      mat.envMapIntensity = 1.3;
      mat.clippingPlanes = [plane];
      m.material = mat;
    }
  });
  group.add(hilt);

  // blade runs out of the emitter at the top of the hilt
  const base = (0.5 - GRIP) * HILT;
  const blade = new THREE.Group();
  blade.position.y = base;
  const core = new THREE.MeshBasicMaterial({ toneMapped: false });
  const glow = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false });
  const bar = (w: number, d: number, mat: THREE.Material, len = BLADE) => {
    const g = new THREE.BoxGeometry(w, len, d);
    g.translate(0, len / 2, 0);
    return new THREE.Mesh(g, mat);
  };
  blade.add(bar(0.007, 0.003, core), bar(0.02, 0.01, glow, BLADE * 1.02), bar(0.055, 0.03, halo, BLADE * 1.06));
  // a tapered tip
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 4), glow);
  tip.position.y = BLADE + 0.022;
  blade.add(tip);
  const light = new THREE.PointLight("#ffffff", 0, 1.2, 1.6);
  light.visible = false;
  light.position.y = BLADE * 0.45;
  blade.add(light);
  blade.scale.set(1, 0.001, 1);
  blade.visible = false;
  group.add(blade);

  // the fabrication ring that travels up the hilt with the scan
  const ringMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0025, 6, 32), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  group.add(ring);
  return { group, plane, ring, blade, core, glow, halo, ringMat, light };
}

const _up = new THREE.Vector3();
const _p = new THREE.Vector3();
/** Reveal (0..1) the hilt from its pommel up; the ring rides the cut. */
function setScan(sw: SwordRig, k: number) {
  sw.group.updateMatrixWorld(true);
  _up.set(0, 1, 0).transformDirection(sw.group.matrixWorld);
  const bottom = -(0.5 + GRIP) * HILT;
  const y = THREE.MathUtils.lerp(bottom - 0.005, (0.5 - GRIP) * HILT + 0.01, k);
  _p.set(0, y, 0).applyMatrix4(sw.group.matrixWorld);
  sw.plane.setFromNormalAndCoplanarPoint(_up.negate(), _p);
  sw.ring.position.set(0, y, 0);
  sw.ring.visible = k > 0.001 && k < 0.999;
}

const WHITE = new THREE.Color("#ffffff");
function setBlade(sw: SwordRig, k: number, hue: THREE.Color) {
  sw.blade.visible = k > 0.002;
  sw.blade.scale.set(1, Math.max(0.001, k), 1);
  sw.core.color.copy(hue).lerp(WHITE, 0.6).multiplyScalar(1.7);
  sw.glow.color.copy(hue).multiplyScalar(1.4);
  sw.halo.color.copy(hue);
  sw.ringMat.color.copy(hue).multiplyScalar(1.6);
  sw.light.color.copy(hue);
  sw.light.intensity = 5 * k;
  sw.light.visible = k > 0.01;
}

/* ── blade trails: a short ribbon of the blade's last positions ─────────── */
const TRAIL = 16;
function makeTrail() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(TRAIL * 2 * 3);
  const col = new Float32Array(TRAIL * 2 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const idx: number[] = [];
  for (let i = 0; i < TRAIL - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, pos, col, geo, samples: [] as Array<[THREE.Vector3, THREE.Vector3]> };
}
type Trail = ReturnType<typeof makeTrail>;
const _base = new THREE.Vector3();
const _tipv = new THREE.Vector3();
function stepTrail(tr: Trail, sw: SwordRig, root: THREE.Object3D, k: number, hue: THREE.Color) {
  if (k < 0.2) {
    tr.samples.length = 0;
    tr.mesh.visible = false;
    return;
  }
  // blade base and tip, in the root's space
  _base.set(0, 0.02, 0);
  _tipv.set(0, BLADE * k, 0);
  sw.blade.localToWorld(_base);
  sw.blade.localToWorld(_tipv);
  root.worldToLocal(_base);
  root.worldToLocal(_tipv);
  tr.samples.unshift([_base.clone(), _tipv.clone()]);
  if (tr.samples.length > TRAIL) tr.samples.length = TRAIL;
  const n = tr.samples.length;
  for (let i = 0; i < TRAIL; i++) {
    const smp = tr.samples[Math.min(i, n - 1)];
    const fade = Math.pow(1 - i / (TRAIL - 1), 1.8);
    for (let j = 0; j < 2; j++) {
      const v = smp[j];
      const o = (i * 2 + j) * 3;
      tr.pos[o] = v.x;
      tr.pos[o + 1] = v.y;
      tr.pos[o + 2] = v.z;
      // brighter toward the tip, gone at the tail
      const w = fade * (j === 1 ? 1 : 0.25);
      tr.col[o] = hue.r * w;
      tr.col[o + 1] = hue.g * w;
      tr.col[o + 2] = hue.b * w;
    }
  }
  tr.geo.attributes.position.needsUpdate = true;
  tr.geo.attributes.color.needsUpdate = true;
  tr.mesh.visible = n > 2;
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

export default function Operator({ state, onHue, busy, stand }: { state: OperatorState; onHue?: (hex: string) => void; busy: { current: boolean }; stand?: { position: [number, number, number]; scale: number; yaw?: number } }) {
  const small = typeof window !== "undefined" && window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const robot = useGLTF(small ? MOB : DESK, false, true);
  const spinG = useGLTF(SPIN, false, true);
  const jumpG = useGLTF(JUMP, false, true);
  const swordG = useGLTF(SWORD, false, true);
  const root = useRef<THREE.Group>(null);

  const rig = useMemo(() => {
    const scene = robot.scene;
    let mesh: THREE.SkinnedMesh | null = null;
    scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
    });
    const skinned = mesh as unknown as THREE.SkinnedMesh;
    skinned.frustumCulled = false;
    const mat = skinned.material as THREE.MeshStandardMaterial;
    // the rig bakes base colour only: chrome comes from real reflections
    mat.metalness = 0.82;
    mat.roughness = 0.3;
    mat.envMapIntensity = 1.25;
    // the shoulder plates are re-bound to the collarbone in the model file
    // itself (design-loop/art-src/robot/_gt/bake-shoulders.mjs) — no per-load
    // pass over every vertex on the visitor's device
    const bone = (n: string) => skinned.skeleton.bones.find((b) => b.name === n)!;
    const b = {
      hips: bone("Hips"),
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
        const y0 = hp.values[1];
        for (let i = 0; i < hp.values.length; i += 3) {
          hp.values[i] = restHips.x;
          hp.values[i + 1] = y0 + (hp.values[i + 1] - y0) * lift;
          hp.values[i + 2] = restHips.z;
        }
      }
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = speed;
      return { clip, action, duration: clip.duration / speed };
    };
    const moves = {
      spin: prep(spinG.animations[0], 1, 1.12),
      jump: prep(jumpG.animations[0], 0.55, 1),
    };
    const box = new THREE.Box3().setFromObject(scene);
    const height = box.getSize(new THREE.Vector3()).y;
    return { scene, skinned, b, rest, restHips, mixer, moves, height, minY: box.min.y };
  }, [robot, spinG, jumpG]);

  const swords = useMemo(() => [makeSword(swordG.scene), makeSword(swordG.scene)], [swordG]);
  const trails = useMemo(() => [makeTrail(), makeTrail()], []);
  const sparks = useMemo(() => makeSparks(), []);
  const orb = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 20, 16),
      new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const l = new THREE.PointLight("#ffffff", 0, 1, 1.6);
    l.visible = false;
    m.add(l);
    return { mesh: m, mat: m.material as THREE.MeshBasicMaterial, light: l };
  }, []);

  // grip frames in each fist, measured off the model (see measureFist)
  const mounts = useMemo(() => ({ r: new THREE.Object3D(), l: new THREE.Object3D() }), []);
  useEffect(() => {
    rig.b.rHand.add(mounts.r);
    rig.b.lHand.add(mounts.l);
    let top: THREE.Object3D = rig.b.rHand;
    while (top.parent) top = top.parent;
    top.updateMatrixWorld(true);
    const s = rig.b.rHand.getWorldScale(new THREE.Vector3()).x || 1;
    const u = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    // seating nudges while tuning: along the channel, and around it
    const along = Number(u?.get("galong") ?? 0);
    const roll = (Number(u?.get("groll") ?? 0) * Math.PI) / 180;
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
    const found = hands.map(([, hand]) => measureFist(rig.skinned, bones.indexOf(hand)));
    if (u?.has("gdbg")) console.log("[grip] measured both hands in", (performance.now() - t0).toFixed(1), "ms");
    // the hands are mirrors of each other, so they take the same channel: the
    // one with the most room across the pair, never one each
    let pick = 0;
    if (found[0] && found[1]) {
      let bestRoom = -Infinity;
      for (let i = 0; i < found[0].length; i++) {
        const room = Math.min(found[0][i].room, found[1][i].room);
        if (room > bestRoom) {
          bestRoom = room;
          pick = i;
        }
      }
    }
    for (const [h, [m, hand, sign]] of hands.entries()) {
      m.scale.setScalar(1 / s);
      const fist = found[h]?.[pick];
      if (!fist || fist.room <= 0) {
        // no skin data to read: a plain fixed seating, so he still holds something
        m.position.set(0, 0.065 / s, 0);
        m.rotation.set(0, 0, (sign * Math.PI) / 2);
        continue;
      }
      // +Y of the mount is the blade, up the channel. Both ends of the channel
      // are the same line, so the blade takes the one that leaves the fist
      // upward in the rest stance — which mirrors onto the other hand by itself.
      const y = fist.axis.clone();
      probe.copy(fist.hold).add(y);
      hand.localToWorld(probe).sub(hand.localToWorld(fist.hold.clone()));
      if (probe.y < 0) y.negate();
      if (u?.has("gflip")) y.negate();
      x.copy(fist.flat).projectOnPlane(y).normalize();
      if (roll) x.applyAxisAngle(y, sign * roll).normalize();
      z.crossVectors(x, y).normalize();
      basis.makeBasis(x, y, z);
      m.quaternion.setFromRotationMatrix(basis);
      m.position.copy(fist.hold).addScaledVector(y, along * fist.room);
      if (u?.has("gdbg")) {
        console.log("[grip]", sign > 0 ? "right" : "left", {
          hold: fist.hold.toArray().map((n) => +n.toFixed(3)),
          axis: y.toArray().map((n) => +n.toFixed(3)),
          room: +fist.room.toFixed(3),
        });
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(fist.room, 10, 8),
          new THREE.MeshBasicMaterial({ color: sign > 0 ? "#ff4466" : "#44aaff", wireframe: true, depthTest: false }),
        );
        ball.renderOrder = 999;
        ball.position.copy(fist.hold);
        hand.add(ball);
      }
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

  const { camera, gl, scene } = useThree();
  // compile every shader and upload the textures in the background as soon as
  // the robot exists, so the first visible frame doesn't stall the GPU
  useEffect(() => {
    const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    swords.forEach((sw) => {
      sw.group.visible = true;
      sw.light.visible = true;
    });
    orb.light.visible = true;
    const done = () =>
      swords.forEach((sw) => {
        sw.group.visible = false;
        sw.light.visible = false;
        orb.light.visible = false;
      });
    if (r.compileAsync) r.compileAsync(scene, camera).then(done, done);
    else {
      r.compile(scene, camera);
      done();
    }
  }, [gl, scene, camera, swords, orb]);
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
    rig.rest.forEach((qr, bn) => bn.quaternion.copy(qr));
    rig.b.hips.position.copy(rig.restHips);
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
      if (t > moveEnd - 0.5 && mv.action.getEffectiveWeight() > 0.99) mv.action.fadeOut(0.5);
    }
    if (t >= moveEnd && !dbg) {
      s.seq = -1;
      s.playing = false;
      mv.action.stop();
    }

    // ── look at the visitor (or scan around on touch) ──
    let tx: number, ty: number;
    if (state.fine) {
      tx = state.px;
      ty = state.py;
    } else {
      tx = Math.sin(s.t * 0.37) * 0.6 + Math.sin(s.t * 0.13) * 0.3;
      ty = Math.sin(s.t * 0.29 + 1.2) * 0.25;
    }
    s.follow = damp(s.follow, s.seq >= 0 ? 0 : 1, 4, dt);
    s.yaw = damp(s.yaw, THREE.MathUtils.clamp(tx, -1, 1) * 1.25, 3.4, dt);
    s.pitch = damp(s.pitch, THREE.MathUtils.clamp(ty, -1, 1) * 0.6, 3.4, dt);
    const y = s.yaw * s.follow;
    const p = s.pitch * s.follow;
    turn(rig.b.spine, y * 0.2, p * 0.1);
    turn(rig.b.chest, y * 0.26, p * 0.16);
    turn(rig.b.neck, y * 0.3, p * 0.32);
    turn(rig.b.head, y * 0.42, p * 0.5);
    if (s.seq < 0) turn(rig.b.chest, 0, Math.sin(s.t * 1.3) * 0.012); // breathing
    r.rotation.y = (stand?.yaw ?? 0) + y * 0.22;
    r.updateMatrixWorld(true);

    // ── the forge: both hands meet at the chest, then the right hand draws ──
    if (t < 0) s.ik = 0;
    else if (t < DRAW_END) s.ik = ease(t / GATHER);
    else s.ik = Math.max(0, 1 - (t - DRAW_END + BLEND) / BLEND);
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
    solveArm(rig.b.rArm, rig.b.rFore, rig.b.rHand, tmp.TR, tmp.PR, s.ik);
    solveArm(rig.b.lArm, rig.b.lFore, rig.b.lHand, tmp.TL, tmp.PL, s.ik);
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
    orb.mesh.visible = orbK > 0.001;
    orb.mesh.position.copy(tmp.FL);
    orb.mesh.scale.setScalar(0.4 + orbK * (0.8 + 0.15 * Math.sin(s.t * 30)));
    orb.mat.opacity = orbK;
    orb.mat.color.copy(hue).lerp(WHITE, 0.5).multiplyScalar(1.5);
    orb.light.color.copy(hue);
    orb.light.intensity = orbK * 4;
    orb.light.visible = orbK > 0.01;

    // ── swords: forged upright at the meeting point, then carried by the fists ──
    const end = t > moveEnd - 0.75 ? ease((t - (moveEnd - 0.75)) / 0.6) : 0;
    tmp.inv.copy(r.matrixWorld).invert();
    swords.forEach((sw, i) => {
      const isTwin = i === 1;
      const start = isTwin ? FORGE_END : GATHER * 0.7;
      sw.group.visible = t >= start && (!isTwin || twin);
      if (!sw.group.visible) return;
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
      // blade: ignites as the draw completes, retracts before the end
      const on = isTwin ? ease((t - FORGE_END - 0.3) / 0.3) : ease((t - (FORGE_END + 0.15)) / 0.32);
      setBlade(sw, on * (1 - end), hue);
      if (!dbg) stepTrail(trails[i], sw, r, on * (1 - end), hue);
    });
    swords.forEach((sw, i) => {
      if (!sw.group.visible) stepTrail(trails[i], sw, r, 0, hue);
    });

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
      <group scale={scale} position={[0, -rig.minY * scale - 0.5, 0]}>
        <primitive object={rig.scene} />
      </group>
      <primitive object={swords[0].group} />
      <primitive object={swords[1].group} />
      <primitive object={trails[0].mesh} />
      <primitive object={trails[1].mesh} />
      <primitive object={sparks.pts} />
      <primitive object={orb.mesh} />
    </group>
  );
}


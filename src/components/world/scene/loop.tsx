"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { TierContext } from "./env";

/* ─────────────────────────────────────────────────────────────────────────
   The signature form every Triseno world is built from: a square-section tube
   swept along a glyph outline (circle / square / triangle / diamond / plus),
   in glass, with an emissive core running through it. Because every glyph is
   sampled to the same N points, any glyph morphs into any other by lerping
   point i -> point i.
   ───────────────────────────────────────────────────────────────────────── */

/** samples per loop — divisible by 3, 4 and 8 so corners land on samples */
export const N = 192;

export interface LoopSpec {
  halfW: number;
  halfD: number;
  offN?: number;
  offZ?: number;
}

export class LoopGeometry extends THREE.BufferGeometry {
  private spec: Required<LoopSpec>;
  private pos: Float32Array;

  constructor(spec: LoopSpec) {
    super();
    this.spec = { offN: 0, offZ: 0, ...spec };
    this.pos = new Float32Array(4 * (N + 1) * 2 * 3);
    const index: number[] = [];
    for (let f = 0; f < 4; f++) {
      const base = f * (N + 1) * 2;
      for (let i = 0; i < N; i++) {
        const a = base + i * 2;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    this.setIndex(index);
    this.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
  }

  /** points: flat [x,y,...] of N samples, clockwise from the top. */
  update(points: Float32Array) {
    const { halfW, halfD, offN, offZ } = this.spec;
    const pos = this.pos;
    const cn = [1, 1, -1, -1];
    const cz = [1, -1, -1, 1];
    for (let i = 0; i <= N; i++) {
      const k = i % N;
      const kp = (k + N - 1) % N;
      const kn = (k + 1) % N;
      const x = points[k * 2];
      const y = points[k * 2 + 1];
      let ax = x - points[kp * 2];
      let ay = y - points[kp * 2 + 1];
      let bx = points[kn * 2] - x;
      let by = points[kn * 2 + 1] - y;
      const al = Math.hypot(ax, ay) || 1;
      const bl = Math.hypot(bx, by) || 1;
      ax /= al;
      ay /= al;
      bx /= bl;
      by /= bl;
      const n1x = -ay;
      const n1y = ax;
      let mx = n1x - by;
      let my = n1y + bx;
      const ml = Math.hypot(mx, my) || 1;
      mx /= ml;
      my /= ml;
      const mitre = 1 / Math.max(0.5, mx * n1x + my * n1y);

      for (let f = 0; f < 4; f++) {
        const o = (f * (N + 1) * 2 + i * 2) * 3;
        for (let v = 0; v < 2; v++) {
          const c = v === 0 ? f : (f + 1) % 4;
          const d = (offN + cn[c] * halfW) * mitre;
          pos[o + v * 3] = x + mx * d;
          pos[o + v * 3 + 1] = y + my * d;
          pos[o + v * 3 + 2] = offZ + cz[c] * halfD;
        }
      }
    }
    this.attributes.position.needsUpdate = true;
    this.computeVertexNormals();
    this.computeBoundingSphere();
  }
}

// Glass body, with the emissive glyph running through its core and a fine
// bright seam on the inner rim.
const GLASS: LoopSpec = { halfW: 0.125, halfD: 0.19 };
const CORE: LoopSpec = { halfW: 0.02, halfD: 0.035 };
const SEAM: LoopSpec = { halfW: 0.004, halfD: 0.192, offN: -0.13 };

export function useLoopSet() {
  const set = useMemo(
    () => ({ glass: new LoopGeometry(GLASS), core: new LoopGeometry(CORE), seam: new LoopGeometry(SEAM) }),
    [],
  );
  useEffect(
    () => () => {
      set.glass.dispose();
      set.core.dispose();
      set.seam.dispose();
    },
    [set],
  );
  return set;
}
export type LoopSet = ReturnType<typeof useLoopSet>;

export function updateLoopSet(set: LoopSet, pts: Float32Array) {
  set.glass.update(pts);
  set.core.update(pts);
  set.seam.update(pts);
}

/**
 * Glass loop + emissive core. `coreMat` is owned by the caller so it can drive
 * the colour. Real refraction (drei MeshTransmissionMaterial, its own low-res
 * buffer) is only mounted while the object is near the camera — each one costs
 * a scene render. Far away, in the fog, the same loop is plain clear-coated
 * glass, which is indistinguishable at that distance and free.
 */
export function GlassLoop({
  set,
  coreMat,
  near,
}: {
  set: LoopSet;
  coreMat: THREE.Material;
  near: boolean;
}) {
  const high = useContext(TierContext) === "high";
  const refract = near && high;
  return (
    <>
      <mesh geometry={set.glass}>
        {refract ? (
          <MeshTransmissionMaterial
            resolution={192}
            samples={3}
            transmission={1}
            thickness={0.55}
            roughness={0.04}
            ior={1.42}
            chromaticAberration={0}
            anisotropicBlur={0.2}
            distortion={0}
            color="#ffffff"
            envMapIntensity={1.6}
            clearcoat={1}
            clearcoatRoughness={0.08}
          />
        ) : (
          // far glass: lighter body and stronger reflections so, out of
          // refraction range, the loop still reads as glass catching the
          // light rather than a dark lump
          <meshPhysicalMaterial
            color="#34343c"
            metalness={0.15}
            roughness={0.05}
            transparent
            opacity={0.62}
            envMapIntensity={2.6}
            clearcoat={1}
            clearcoatRoughness={0.08}
          />
        )}
      </mesh>
      <mesh geometry={set.core} material={coreMat} />
      <mesh geometry={set.seam} material={coreMat} />
    </>
  );
}

/** true while `test()` holds; only re-renders when it flips. */
export function useNear(test: (camZ: number) => boolean, initial: boolean) {
  const [near, setNear] = useState(initial);
  const cur = useRef(initial);
  useFrame((state) => {
    const v = test(state.camera.position.z);
    if (v !== cur.current) {
      cur.current = v;
      setNear(v);
    }
  });
  return near;
}

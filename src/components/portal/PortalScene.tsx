"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  MeshTransmissionMaterial,
  PerformanceMonitor,
} from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";
import {
  DOOR_ITEMS,
  DOOR_Z,
  MENU_ITEMS,
  dollyZ,
  doorLit,
  framing,
  portalState,
  smooth,
} from "./portalState";

/* ─────────────────────────────────────────────────────────────────────────
   The portal world — a place, not a void. One fixed canvas behind the page:
   · a wet, rippled floor that breaks reflections up into puddles;
   · a horizon glow, drifting haze layers and a silhouetted skyline of
     monoliths flanking a corridor;
   · the signature object: a loop of glass with an emissive glyph core that
     morphs between glyphs and lights the floor, the haze and the monoliths;
   · three glass doors the camera flies through, and a gate object that
     morphs and recolours the whole scene behind the final CTA;
   · depth of field, bloom, vignette.
   At rest everything is white light and neutral grey haze. A hovered division
   (or the door ahead) floods the environment with its hue.
   ───────────────────────────────────────────────────────────────────────── */

const N = 192; // samples per loop — divisible by 3, 4 and 8 so corners land on samples
const RING_Y = 1.95;
const RING_SCALE = 1.42;
const CAM_Y = 2.35;
const REST_YAW = -0.42; // the object rests turned toward the type column so its depth reads
const GATE_POS = new THREE.Vector3(0, 2.45, -64);
const GATE_SCALE = 2.1;
const WHITE = "#ffffff";
const DBG = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("dbg") || "";

/**
 * Quality tier. Everyone starts on "high". If frames drop (weak GPU, software
 * rendering) the scene sheds its three most expensive passes — real refraction,
 * depth of field, the large mirror buffer — and keeps the place, the light and
 * the bloom.
 */
type Tier = "high" | "low";
const TierContext = createContext<Tier>("high");

/* ── shared, mutable environment light: written by EnvDirector, read by all ── */

const env = {
  /** the light colour the focal object is throwing into the world (white at rest) */
  light: new THREE.Color(WHITE),
  /** 0..1 brightness envelope used for the dip between two hues */
  level: 1,
  /** world position of whatever is in focus (DOF target, key light) */
  focus: new THREE.Vector3(0, RING_Y, 0),
};

/**
 * A hue never blends into another hue (that would show a third colour, or a
 * pale version of itself). It dips to dark, swaps, and comes back up.
 */
class HueDip {
  hex = WHITE;
  color = new THREE.Color(WHITE);
  level = 1;
  out = new THREE.Color(WHITE);
  update(dt: number, targetHex: string) {
    if (targetHex !== this.hex) {
      this.level -= dt / 0.22;
      if (this.level <= 0) {
        this.level = 0;
        this.hex = targetHex;
        this.color.set(targetHex);
      }
    } else if (this.level < 1) {
      this.level = Math.min(1, this.level + dt / 0.55);
    }
    const e = this.level * this.level * (3 - 2 * this.level);
    this.out.copy(this.color).multiplyScalar(e);
    return this.out;
  }
}

/* ── Loop geometry: a square-section tube swept along a glyph outline ──── */

interface LoopSpec {
  halfW: number;
  halfD: number;
  offN?: number;
  offZ?: number;
}

class LoopGeometry extends THREE.BufferGeometry {
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

function useLoopSet() {
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
type LoopSet = ReturnType<typeof useLoopSet>;

function updateLoopSet(set: LoopSet, pts: Float32Array) {
  set.glass.update(pts);
  set.core.update(pts);
  set.seam.update(pts);
}

/**
 * Glass loop + emissive core. `coreMat` is owned by the caller so it can drive
 * the colour. Real refraction (drei MeshTransmissionMaterial, its own low-res
 * buffer) is only mounted while the object is near the camera — each one costs
 * a scene render, and at most two are ever in range. Far away, in the fog, the
 * same loop is plain clear-coated glass.
 */
function GlassLoop({ set, coreMat, near }: { set: LoopSet; coreMat: THREE.Material; near: boolean }) {
  const high = useContext(TierContext) === "high";
  near = near && high;
  return (
    <>
      <mesh geometry={set.glass}>
        {near ? (
          <MeshTransmissionMaterial
            resolution={256}
            samples={4}
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
          <meshPhysicalMaterial
            color="#1b1b1e"
            metalness={0.2}
            roughness={0.08}
            transparent
            opacity={0.55}
            envMapIntensity={1.6}
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
function useNear(test: (camZ: number) => boolean, initial: boolean) {
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

/* ── procedural textures ───────────────────────────────────────────────── */

function tilingNoise(size: number, cells: number, octaves: number): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 0.55;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    const c = cells * freq;
    const grid = Float32Array.from({ length: c * c }, () => Math.random());
    const at = (x: number, y: number) => grid[((y + c) % c) * c + ((x + c) % c)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c;
        const fy = (y / size) * c;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    amp *= 0.5;
    freq *= 2;
  }
  return out;
}

function canvasTexture(size: number, fill: (img: ImageData) => void, repeat: [number, number], srgb = false) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  fill(img);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Wet ground: a rippled normal map, puddle roughness, and a distortion map for the mirror. */
function makeFloorMaps() {
  const size = 256;
  const h = tilingNoise(size, 6, 4);
  const p = tilingNoise(size, 3, 3);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  const repeat: [number, number] = [10, 16];
  const normal = canvasTexture(
    size,
    (img) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2;
          const dy = (at(x, y + 1) - at(x, y - 1)) * 3.2;
          const l = Math.hypot(dx, dy, 1);
          const i = (y * size + x) * 4;
          img.data[i] = (-dx / l) * 127 + 128;
          img.data[i + 1] = (-dy / l) * 127 + 128;
          img.data[i + 2] = (1 / l) * 127 + 128;
          img.data[i + 3] = 255;
        }
    },
    repeat,
  );
  const rough = canvasTexture(
    size,
    (img) => {
      for (let i = 0; i < size * size; i++) {
        // puddles (smooth) inside drier, rougher ground
        const v = smooth(0.42, 0.62, p[i]);
        const g = 30 + v * 190;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
        img.data[i * 4 + 3] = 255;
      }
    },
    [5, 8],
  );
  const distort = canvasTexture(
    size,
    (img) => {
      for (let i = 0; i < size * size; i++) {
        const g = Math.min(255, h[i] * 255);
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
        img.data[i * 4 + 3] = 255;
      }
    },
    repeat,
  );
  return { normal, rough, distort };
}

function makeGlowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.4)");
  g.addColorStop(0.5, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft, horizontally tiling cloud bank used by the haze layers. */
function makeHazeTexture(): THREE.Texture {
  const size = 256;
  const n = tilingNoise(size, 4, 4);
  const t = canvasTexture(
    size,
    (img) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const v = y / (size - 1);
          const band = Math.sin(v * Math.PI) ** 2.2; // fades to nothing at top and bottom
          const a = smooth(0.35, 0.85, n[y * size + x]) * band;
          const i = (y * size + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
          img.data[i + 3] = a * 255;
        }
    },
    [1, 1],
    true,
  );
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ── environment director: decides what colour the world is lit in ─────── */

function EnvDirector() {
  const dip = useMemo(() => new HueDip(), []);
  const { scene } = useThree();
  const fogColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const step = Math.min(dt, 1); // wall-clock time, even at a frame a second
    const { hero, doors, gate, hot, active, warpAt } = portalState;
    const camZ = state.camera.position.z;

    let target = WHITE;
    if (doors <= 0) {
      if ((hot && hero < 0.5) || warpAt) target = MENU_ITEMS[active].hue;
    } else if (gate < 0.42) {
      for (let i = 0; i < DOOR_Z.length; i++) if (doorLit(i, camZ) > 0.02) target = DOOR_ITEMS[i].hue;
    }
    env.light.copy(dip.update(step, target));
    env.level = dip.level;

    // Haze never goes black: at the bottom of a dip it is dim neutral grey.
    fogColor.copy(env.light).multiplyScalar(0.085).addScalar(0.012);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogColor);
  });
  return null;
}

/* ── sky: a horizon glow that takes the world's light colour ───────────── */

function Horizon() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uLight: { value: new THREE.Color(WHITE) } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uLight;
          varying vec3 vDir;
          void main() {
            float h = max(vDir.y, 0.0);
            // a tight bright band on the horizon, a wide soft dome of haze above it
            float band = exp(-h * 26.0) * 0.26 + exp(-h * 5.5) * 0.07;
            // brighter where the corridor leads (down -z)
            float ahead = pow(max(-vDir.z, 0.0), 3.0) * 0.75 + 0.25;
            vec3 c = (uLight * 0.9 + 0.035) * band * ahead;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    mat.uniforms.uLight.value.copy(env.light);
    ref.current?.position.copy(state.camera.position);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[100, 32, 16]} />
    </mesh>
  );
}

/* ── layered haze that drifts past as the camera travels ───────────────── */

const HAZE_LAYERS = [
  { z: -7, y: 0.9, w: 46, h: 5, o: 0.1, s: 0.011 },
  { z: -12, y: 1.6, w: 60, h: 8, o: 0.13, s: -0.008 },
  { z: -19, y: 2.2, w: 80, h: 11, o: 0.16, s: 0.006 },
  { z: -29, y: 3.0, w: 120, h: 16, o: 0.2, s: -0.004 },
  { z: -44, y: 4.0, w: 180, h: 24, o: 0.24, s: 0.003 },
];

function Haze({ texture }: { texture: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const layers = useMemo(
    () =>
      HAZE_LAYERS.map((l) => {
        const map = texture.clone();
        map.needsUpdate = true;
        map.repeat.set(l.w / 30, 1);
        return new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          opacity: l.o,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        });
      }),
    [texture],
  );
  useEffect(
    () => () =>
      layers.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [layers],
  );
  useFrame((state) => {
    const cam = state.camera.position;
    if (group.current) group.current.position.set(cam.x * 0.5, 0, cam.z);
    const t = state.clock.elapsedTime;
    layers.forEach((m, i) => {
      // nearer layers slide faster as the camera moves: parallax without moving geometry
      if (m.map) m.map.offset.x = t * HAZE_LAYERS[i].s + cam.z * (0.02 / (i + 1));
      m.color.copy(env.light).multiplyScalar(0.3).addScalar(0.02);
    });
  });
  return (
    <group ref={group}>
      {HAZE_LAYERS.map((l, i) => (
        <mesh key={i} position={[0, l.y, l.z]} material={layers[i]} renderOrder={2 + i}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── monoliths: a corridor of dark slabs and a skyline on the horizon ──── */

function Monoliths() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 96;
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // deterministic layout so every visit (and every screenshot) is the same place
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    for (let i = 0; i < count; i++) {
      const skyline = i >= 60;
      const side = i % 2 === 0 ? -1 : 1;
      const h = skyline ? 10 + rnd() * 34 : 2.5 + rnd() * rnd() * 13;
      const w = skyline ? 2 + rnd() * 7 : 0.7 + rnd() * 2.4;
      const d = skyline ? 2 + rnd() * 6 : 0.7 + rnd() * 2.4;
      if (skyline) p.set((rnd() * 2 - 1) * 95, h / 2, -96 - rnd() * 50);
      else p.set(side * (9.5 + rnd() * rnd() * 22), h / 2, 6 - (Math.floor(i / 2) / 30) * 104 - rnd() * 2.5);
      e.set(0, (rnd() - 0.5) * 0.5, 0);
      q.setFromEuler(e);
      s.set(w, h, d);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#08080a" roughness={0.5} metalness={0.5} envMapIntensity={0.12} />
    </instancedMesh>
  );
}

/* ── dust, in two depths ───────────────────────────────────────────────── */

function Dust({ sprite }: { sprite: THREE.Texture }) {
  const near = useRef<THREE.Points>(null);
  const far = useRef<THREE.Points>(null);
  const [gNear, gFar] = useMemo(() => {
    const make = (count: number, spread: number) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * spread;
        pos[i * 3 + 1] = Math.random() * 7 + 0.1;
        pos[i * 3 + 2] = 10 - Math.random() * 90;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      return g;
    };
    return [make(260, 5), make(1500, 16)];
  }, []);
  const mNear = useRef<THREE.PointsMaterial>(null);
  const mFar = useRef<THREE.PointsMaterial>(null);
  useEffect(
    () => () => {
      gNear.dispose();
      gFar.dispose();
    },
    [gNear, gFar],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (near.current) near.current.position.set(Math.sin(t * 0.11) * 0.4, Math.sin(t * 0.17) * 0.3, 0);
    if (far.current) far.current.position.set(Math.sin(t * 0.07) * 0.6, Math.sin(t * 0.13) * 0.25, 0);
    mNear.current?.color.copy(env.light).addScalar(0.25);
    mFar.current?.color.copy(env.light).addScalar(0.25);
  });
  const common = {
    map: sprite,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  } as const;
  return (
    <>
      <points ref={near} geometry={gNear}>
        <pointsMaterial ref={mNear} {...common} size={0.1} opacity={0.22} />
      </points>
      <points ref={far} geometry={gFar}>
        <pointsMaterial ref={mFar} {...common} size={0.045} opacity={0.5} />
      </points>
    </>
  );
}

/* ── floor ─────────────────────────────────────────────────────────────── */

function WetFloor({ maps }: { maps: ReturnType<typeof makeFloorMaps> }) {
  const high = useContext(TierContext) === "high";
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]}>
      <planeGeometry args={[240, 260]} />
      <MeshReflectorMaterial
        key={high ? "hi" : "lo"}
        resolution={high ? 1024 : 256}
        blur={high ? [420, 140] : [160, 60]}
        mixBlur={1}
        mixStrength={38}
        mixContrast={1.05}
        roughness={1}
        roughnessMap={maps.rough}
        normalMap={maps.normal}
        normalScale={new THREE.Vector2(0.55, 0.55)}
        distortion={0.55}
        distortionMap={maps.distort}
        depthScale={0.6}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.3}
        color="#141416"
        metalness={0.72}
        mirror={0.78}
      />
    </mesh>
  );
}

/* ── key light: the focal object lights its surroundings ───────────────── */

function KeyLight() {
  const point = useRef<THREE.PointLight>(null);
  const pool = useRef<THREE.SpotLight>(null);
  const back = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const f = env.focus;
    if (point.current) {
      point.current.position.set(f.x, f.y, f.z + 0.4);
      point.current.color.copy(env.light);
      point.current.intensity = 34;
    }
    if (pool.current) {
      // a pool of the object's light thrown onto the wet floor beneath it
      pool.current.position.set(f.x, f.y + 3.2, f.z + 1.2);
      target.position.set(f.x, 0, f.z + 1.6);
      target.updateMatrixWorld();
      pool.current.color.copy(env.light);
    }
    if (back.current) back.current.color.copy(env.light).addScalar(0.06);
  });
  return (
    <>
      <pointLight ref={point} distance={34} decay={1.7} />
      <spotLight ref={pool} target={target} angle={0.95} penumbra={1} intensity={110} distance={30} decay={1.6} />
      <primitive object={target} />
      {/* rim: light coming back down the corridor, catching glass and slab edges */}
      <directionalLight ref={back} position={[2, 5, -60]} intensity={0.55} />
      <directionalLight position={[-6, 7, 6]} intensity={0.18} color="#ffffff" />
    </>
  );
}

/* ── the signature object ──────────────────────────────────────────────── */

function SignatureObject({ glow }: { glow: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const loops = useLoopSet();
  const dip = useMemo(() => new HueDip(), []);
  const near = useNear((z) => z > -4, true);

  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glow,
        color: WHITE,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [glow],
  );

  const morph = useRef({
    from: new Float32Array(glyphPoints(MENU_ITEMS[0].glyph, N)),
    to: glyphPoints(MENU_ITEMS[0].glyph, N),
    cur: new Float32Array(glyphPoints(MENU_ITEMS[0].glyph, N)),
    t: 1,
    index: 0,
    spin: 0,
    spinFrom: 0,
    spinTo: 0,
  });

  useEffect(() => {
    updateLoopSet(loops, morph.current.cur);
    return () => {
      coreMat.dispose();
      haloMat.dispose();
    };
  }, [loops, coreMat, haloMat]);

  useFrame((state, dt) => {
    const m = morph.current;
    const step = Math.min(dt, 1); // wall-clock time, even at a frame a second

    if (portalState.active !== m.index) {
      m.index = portalState.active;
      m.from.set(m.cur);
      m.to = glyphPoints(MENU_ITEMS[m.index].glyph as GlyphKind, N);
      m.t = 0;
      m.spinFrom = m.spin;
      m.spinTo = m.spinTo + Math.PI; // half-turn per swap; the loop is symmetric front/back
    }
    if (m.t < 1) {
      m.t = Math.min(1, m.t + step / 0.95);
      const e = 1 - Math.pow(1 - m.t, 4);
      for (let i = 0; i < N * 2; i++) m.cur[i] = m.from[i] + (m.to[i] - m.from[i]) * e;
      m.spin = m.spinFrom + (m.spinTo - m.spinFrom) * e;
      updateLoopSet(loops, m.cur);
    }

    const lit = (portalState.hot && portalState.hero < 0.5) || portalState.warpAt > 0;
    coreMat.color.copy(dip.update(step, lit ? MENU_ITEMS[m.index].hue : WHITE));
    haloMat.color.copy(coreMat.color);

    const t = state.clock.elapsedTime;
    const still = portalState.capture ? 0 : 1;
    // the resting yaw unwinds so the camera flies through a square-on gate
    const away = 1 - Math.min(1, Math.max(0, portalState.hero / 0.6));
    const warp = portalState.warpAt ? smooth(0, 700, performance.now() - portalState.warpAt) : 0;
    if (group.current) {
      group.current.position.y = RING_Y + Math.sin(t * 0.9) * 0.05 * still;
      group.current.rotation.y =
        m.spin + (REST_YAW * away + Math.sin(t * 0.35) * 0.2 * still + portalState.px * 0.18) * (1 - warp);
      group.current.rotation.x = (Math.sin(t * 0.27) * 0.05 * still - portalState.py * 0.08) * (1 - warp);
    }
    // the glow is a billboard — it has to be gone before the camera reaches it
    haloMat.opacity = 0.12 * (1 - Math.min(1, Math.max(0, portalState.hero / 0.45))) * (1 - warp);
    halo.current?.lookAt(state.camera.position);

    if (portalState.doors <= 0) env.focus.set(0, RING_Y, 0);
  });

  return (
    <>
      <group ref={group} position={[0, RING_Y, 0]} scale={RING_SCALE}>
        <GlassLoop set={loops} coreMat={coreMat} near={near} />
      </group>
      <mesh ref={halo} position={[0, RING_Y, -0.8]} material={haloMat} renderOrder={20}>
        <planeGeometry args={[7, 7]} />
      </mesh>
    </>
  );
}

/* ── doors ─────────────────────────────────────────────────────────────── */

const DOOR_SCALE = 2.05;

function Door({ index, onEnter }: { index: number; onEnter: (route: string) => void }) {
  const division = DOOR_ITEMS[index];
  const loops = useLoopSet();
  const near = useNear((z) => z - DOOR_Z[index] < 15 && z - DOOR_Z[index] > -1.5, false);
  const hue = useMemo(() => new THREE.Color(division.hue), [division.hue]);
  const white = useMemo(() => new THREE.Color(WHITE), []);

  const { points, y, shape } = useMemo(() => {
    const pts = glyphPoints(division.glyph, N);
    let minY = Infinity;
    for (let i = 0; i < N; i++) minY = Math.min(minY, pts[i * 2 + 1]);
    const s = new THREE.Shape();
    for (let i = 0; i < N; i++) {
      if (i === 0) s.moveTo(pts[0], pts[1]);
      else s.lineTo(pts[i * 2], pts[i * 2 + 1]);
    }
    s.closePath();
    return { points: pts, y: -minY * DOOR_SCALE + 0.22, shape: s };
  }, [division.glyph]);

  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }), []);
  // The door's surface: a veil of light in the division hue, brightest at the sill.
  const veilMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color(WHITE) }, uLit: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uLit;
          uniform float uTime;
          varying vec2 vP;
          void main() {
            float h = clamp((vP.y + 1.2) / 2.4, 0.0, 1.0);
            float sill = pow(1.0 - h, 2.2);
            float bands = 0.5 + 0.5 * sin(vP.y * 9.0 - uTime * 0.8 + sin(vP.x * 3.0 + uTime * 0.3));
            float a = (0.05 + 0.34 * sill + 0.05 * bands) * uLit;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [],
  );

  useEffect(() => {
    updateLoopSet(loops, points);
    return () => {
      coreMat.dispose();
      veilMat.dispose();
    };
  }, [loops, points, coreMat, veilMat]);

  useFrame((state) => {
    const camZ = state.camera.position.z;
    const lit = doorLit(index, camZ);
    const d = camZ - DOOR_Z[index];
    // white -> dark -> hue: the door ignites, it never shows a pale tint of its hue
    if (lit < 0.5) coreMat.color.copy(white).multiplyScalar(1 - lit * 2);
    else coreMat.color.copy(hue).multiplyScalar(lit * 2 - 1);
    veilMat.uniforms.uColor.value.copy(coreMat.color);
    // the veil thins out as the camera passes through it
    veilMat.uniforms.uLit.value = (0.55 + (portalState.hoverDoor === index ? 0.35 : 0)) * smooth(0.2, 3.5, d);
    veilMat.uniforms.uTime.value = state.clock.elapsedTime;

    // this door is the world's focal object while it is the next one ahead
    const prev = index === 0 ? Infinity : camZ - DOOR_Z[index - 1];
    if (portalState.doors > 0 && d > 0.4 && prev <= 0.4 && portalState.gate < 0.3) {
      env.focus.set(0, y, DOOR_Z[index]);
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    portalState.hoverDoor = index;
    document.documentElement.setAttribute("data-cursor-hot", "");
  };
  const out = () => {
    if (portalState.hoverDoor === index) portalState.hoverDoor = -1;
    document.documentElement.removeAttribute("data-cursor-hot");
  };

  return (
    <group position={[0, y, DOOR_Z[index]]}>
      <group scale={DOOR_SCALE}>
        <GlassLoop set={loops} coreMat={coreMat} near={near} />
        <mesh
          material={veilMat}
          onPointerOver={over}
          onPointerOut={out}
          onClick={(e) => {
            e.stopPropagation();
            out();
            onEnter(division.route);
          }}
        >
          <shapeGeometry args={[shape]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── the gate object: last door's glyph morphs into Contact's, cyan -> white ── */

function GateObject() {
  const group = useRef<THREE.Group>(null);
  const loops = useLoopSet();
  const near = useNear((z) => z < DOOR_Z[2] + 1, false);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }), []);
  const from = useMemo(() => glyphPoints("triangle", N), []);
  const to = useMemo(() => glyphPoints("plus", N), []);
  const cur = useMemo(() => new Float32Array(N * 2), []);
  const last = useRef(-1);
  const hue = useMemo(() => new THREE.Color(DOOR_ITEMS[2].hue), []);
  const white = useMemo(() => new THREE.Color(WHITE), []);

  useEffect(() => () => coreMat.dispose(), [coreMat]);

  useFrame((state) => {
    const g = portalState.gate;
    const e = smooth(0.12, 0.8, g);
    if (Math.abs(e - last.current) > 0.002) {
      last.current = e;
      for (let i = 0; i < N * 2; i++) cur[i] = from[i] + (to[i] - from[i]) * e;
      updateLoopSet(loops, cur);
    }
    // cyan -> dark -> white, in step with the environment
    const c = smooth(0.2, 0.7, g);
    if (c < 0.5) coreMat.color.copy(hue).multiplyScalar(1 - c * 2);
    else coreMat.color.copy(white).multiplyScalar(c * 2 - 1);

    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = -0.35 + e * Math.PI + Math.sin(t * 0.3) * 0.12;
      group.current.position.y = GATE_POS.y + Math.sin(t * 0.8) * 0.06;
    }
    if (state.camera.position.z < DOOR_Z[2] + 0.4 || g >= 0.3) env.focus.copy(GATE_POS);
  });

  return (
    <group ref={group} position={GATE_POS} scale={GATE_SCALE}>
      <GlassLoop set={loops} coreMat={coreMat} near={near} />
    </group>
  );
}

/* ── camera rig: scroll moves the camera, not a document ───────────────── */

const ease = (t: number) => t * t * (3 - 2 * t);

function CameraRig() {
  const { camera, size } = useThree();
  const pos = useMemo(() => new THREE.Vector3(0, CAM_Y, 7.6), []);
  const look = useMemo(() => new THREE.Vector3(0, RING_Y, 0), []);
  const curLook = useRef(new THREE.Vector3(0, RING_Y, 0));
  const lastShift = useRef(Number.NaN);
  const curFrame = useRef(1);
  const first = useRef(true);
  const probe = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const { hero, doors, gate, px, py, warpAt, capture } = portalState;
    const h = ease(Math.min(1, hero));
    let z = 7.6 - 9.6 * h;

    if (hero < 1 || doors <= 0) {
      // Hero: dolly straight through the signature object. A warp out of the
      // portal pushes the camera at the object while the tunnel closes in.
      const w = warpAt ? smooth(0, 1900, performance.now() - warpAt) : 0;
      z -= w * 5.2;
      const k = 1 - h;
      pos.set(px * 0.35 * k * (1 - w), CAM_Y + (RING_Y - CAM_Y) * Math.max(h, w) + py * 0.12 * k * (1 - w), z);
      look.set(0, RING_Y - 0.55 * k * (1 - w), z - 8);
    }
    if (doors > 0) {
      z = dollyZ(doors) - gate * 4.5;
      pos.set(px * 0.2, 2.05 + py * 0.08 + gate * 0.35, z);
      look.set(0, 2.05 + gate * 0.35, z - 9);
    }
    if (capture === "door") pos.y = look.y = 2.05;

    // even at a few frames per second the camera must arrive on wall-clock time
    const k = first.current ? 1 : 1 - Math.exp(-Math.min(dt, 1) * 6);
    first.current = false;
    camera.position.lerp(pos, k);
    curLook.current.lerp(look, k);
    camera.lookAt(curLook.current);

    // Framing: push the focal object off-centre so copy never sits on top of it.
    const wide = capture ? 0 : size.width >= 1024 ? 0.2 : size.width >= 768 ? 0.16 : 0;
    let f = framing(hero, doors, gate, z);
    if (warpAt) f *= 1 - smooth(0, 650, performance.now() - warpAt);
    curFrame.current += (f - curFrame.current) * k;
    const shift = Math.round(wide * curFrame.current * size.width);
    if (shift !== lastShift.current) {
      lastShift.current = shift;
      const cam = camera as THREE.PerspectiveCamera;
      if (shift === 0) cam.clearViewOffset();
      else cam.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height);
    }

    // where the wet floor under the gate object lands on screen — the beams fall to it
    probe.set(GATE_POS.x, 0, GATE_POS.z).project(camera);
    portalState.gateFloorY = Math.min(0.94, Math.max(0.55, (1 - probe.y) / 2));
  });

  useEffect(() => {
    lastShift.current = Number.NaN;
  }, [size.width, size.height]);

  return null;
}

/* ── post: depth of field that follows the focal object, bloom, vignette ── */

function Post() {
  const high = useContext(TierContext) === "high";
  const dof = useRef<DepthOfFieldEffect>(null);
  const focus = useMemo(() => new THREE.Vector3(0, RING_Y, 0), []);
  useFrame((_, dt) => {
    focus.lerp(env.focus, 1 - Math.exp(-Math.min(dt, 1) * 3));
    if (dof.current) dof.current.target = focus;
  });
  const bloom = (
    <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.82} luminanceSmoothing={0.12} radius={0.72} />
  );
  const vignette = <Vignette eskil={false} offset={0.22} darkness={0.72} />;
  return high ? (
    <EffectComposer key="hi" multisampling={0} enableNormalPass={false}>
      <DepthOfField ref={dof} target={[0, RING_Y, 0]} worldFocusRange={9} bokehScale={3.4} resolutionScale={0.5} />
      {bloom}
      {vignette}
      <SMAA />
    </EffectComposer>
  ) : (
    <EffectComposer key="lo" multisampling={0} enableNormalPass={false}>
      {bloom}
      {vignette}
      <SMAA />
    </EffectComposer>
  );
}

/* ── ready signal ──────────────────────────────────────────────────────── */

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const sent = useRef(false);
  useFrame(() => {
    if (sent.current) return;
    frames.current += 1;
    if (frames.current >= 4) {
      sent.current = true;
      onReady();
    }
  });
  return null;
}

/* ── scene ─────────────────────────────────────────────────────────────── */

interface PortalSceneProps {
  onReady: () => void;
  onEnter: (route: string) => void;
}

export default function PortalScene({ onReady, onEnter }: PortalSceneProps) {
  const glow = useMemo(() => makeGlowTexture(), []);
  const haze = useMemo(() => makeHazeTexture(), []);
  const floor = useMemo(() => makeFloorMaps(), []);
  // never render above the device's own pixel ratio; cap at 1.5 and fall to 1 if frames drop
  const [maxDpr, setMaxDpr] = useState(1.5);
  // "H" pins the high tier so headless/software-GPU captures show what a real
  // GPU renders; without it PerformanceMonitor degrades to "low" within a second.
  const pinHigh = DBG.includes("H");
  const [tier, setTier] = useState<Tier>(DBG.includes("l") ? "low" : "high");
  const dpr = DBG.includes("r") ? 0.5 : Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, maxDpr);
  useEffect(
    () => () => {
      glow.dispose();
      haze.dispose();
      floor.normal.dispose();
      floor.rough.dispose();
      floor.distort.dispose();
    },
    [glow, haze, floor],
  );

  return (
    <Canvas
      flat // no tone mapping: a division hue must reach the screen as that hue
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: false }}
      camera={{ fov: 36, near: 0.1, far: 260, position: [0, CAM_Y, 7.6] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#000000", 1);
        scene.fog = new THREE.Fog("#0a0a0a", 6, 58);
      }}
    >
      {pinHigh ? null : (
        <PerformanceMonitor
          ms={200}
          iterations={6}
          threshold={0.8}
          bounds={() => [24, 50]}
          flipflops={2}
          onDecline={() => {
            setMaxDpr(1);
            setTier("low");
          }}
          onFallback={() => setTier("low")}
        />
      )}
      <TierContext.Provider value={tier}>
      <ambientLight intensity={0.05} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={5} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={3} position={[-6, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
        <Lightformer form="rect" intensity={3} position={[6, 2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[0, 2, 8]} scale={3} />
      </Environment>

      <EnvDirector />
      <CameraRig />
      <KeyLight />
      <Horizon />
      {DBG.includes("m") ? null : <Monoliths />}
      {DBG.includes("h") ? null : <Haze texture={haze} />}
      <SignatureObject glow={glow} />
      {DOOR_ITEMS.map((_, i) => (
        <Door key={i} index={i} onEnter={onEnter} />
      ))}
      <GateObject />
      {DBG.includes("d") ? null : <Dust sprite={glow} />}
      {DBG.includes("f") ? null : <WetFloor maps={floor} />}
      {DBG.includes("p") ? null : <Post />}
      <ReadySignal onReady={onReady} />
      </TierContext.Provider>
    </Canvas>
  );
}

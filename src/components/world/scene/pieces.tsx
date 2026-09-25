"use client";

import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, PerformanceMonitor } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, FXAA, SMAA, Vignette } from "@react-three/postprocessing";
import type { DepthOfFieldEffect, EffectComposer as ComposerImpl } from "postprocessing";
import { TierContext, WHITE, env, DBG, type Tier } from "./env";
import { deviceClass, gpuClass, gpuName } from "@/lib/device";
import type { FloorMaps } from "./textures";
import { addFrameJob, frameInterval } from "../frameLoop";

/* ─────────────────────────────────────────────────────────────────────────
   The place every Triseno world is made of, in pieces any world can mount:
   a horizon glow, drifting haze banks, a corridor of silhouetted monoliths,
   floating dust in two depths, a wet reflective ground plane, and a key light
   that spills the world's current hue onto that ground.
   Nothing here knows about the portal or about a division — they all read the
   shared `env` record, which one director per world writes.
   ───────────────────────────────────────────────────────────────────────── */

/* ── sky: a horizon glow that takes the world's light colour ───────────── */

export function Horizon() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uLight: { value: new THREE.Color(WHITE) }, uBoost: { value: new THREE.Vector2(1, 0) } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uLight;
          uniform vec2 uBoost;
          varying vec3 vDir;
          void main() {
            float h = max(vDir.y, 0.0);
            // a tight bright band on the horizon, a wide soft dome of haze above it
            float band = exp(-h * 26.0) * 0.26 + exp(-h * 5.5) * 0.07;
            // brighter where the corridor leads (down -z)
            float ahead = pow(max(-vDir.z, 0.0), 3.0) * 0.75 + 0.25;
            vec3 c = (uLight * 0.9 + 0.035) * band * ahead * uBoost.x;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    mat.uniforms.uLight.value.copy(env.light);
    mat.uniforms.uBoost.value.set(1 + 0.75 * env.white, 0);
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

export function Haze({ texture }: { texture: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  // every haze layer is a screen-wide additive sheet: on the low tier the
  // three far ones carry the look, and the fill-rate cost halves
  const low = useContext(TierContext) === "low";
  const list = low ? HAZE_LAYERS.slice(2) : HAZE_LAYERS;
  const layers = useMemo(
    () =>
      list.map((l) => {
        const map = texture.clone();
        map.needsUpdate = true;
        map.repeat.set(l.w / 30, 1);
        return new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          opacity: low ? l.o * 1.25 : l.o,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture, low],
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
      if (m.map) m.map.offset.x = t * list[i].s + cam.z * (0.02 / (i + 1));
      m.color.copy(env.light).multiplyScalar(0.3 * (1 - 0.35 * env.white)).addScalar(0.02 * (1 - env.white * 0.5));
    });
  });
  return (
    <group ref={group}>
      {list.map((l, i) => (
        <mesh key={i} position={[0, l.y, l.z]} material={layers[i]} renderOrder={2 + i}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── monoliths: a corridor of dark slabs and a skyline on the horizon ──── */

export function Monoliths({
  count = 96,
  seed = 7,
  corridor = 104,
  start = 6,
}: {
  count?: number;
  /** change the seed and the same place is laid out differently — one seed per world */
  seed?: number;
  /** how far down -z the flanking slabs run */
  corridor?: number;
  /** z the corridor starts at */
  start?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // deterministic layout so every visit (and every screenshot) is the same place
    let s0 = seed;
    const rnd = () => {
      s0 = (s0 * 16807) % 2147483647;
      return s0 / 2147483647;
    };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const flank = Math.floor(count * 0.625);
    for (let i = 0; i < count; i++) {
      const skyline = i >= flank;
      const side = i % 2 === 0 ? -1 : 1;
      const h = skyline ? 10 + rnd() * 34 : 2.5 + rnd() * rnd() * 13;
      const w = skyline ? 2 + rnd() * 7 : 0.7 + rnd() * 2.4;
      const d = skyline ? 2 + rnd() * 6 : 0.7 + rnd() * 2.4;
      if (skyline) p.set((rnd() * 2 - 1) * 95, h / 2, -96 - rnd() * 50);
      else
        p.set(
          side * (9.5 + rnd() * rnd() * 22),
          h / 2,
          start - (Math.floor(i / 2) / (flank / 2)) * corridor - rnd() * 2.5,
        );
      e.set(0, (rnd() - 0.5) * 0.5, 0);
      q.setFromEuler(e);
      s.set(w, h, d);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count, seed, corridor, start]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#08080a" roughness={0.5} metalness={0.5} envMapIntensity={0.12} />
    </instancedMesh>
  );
}

/* ── dust, in two depths ───────────────────────────────────────────────── */

/**
 * Deterministic mote field: the same dust in the same places on every visit,
 * so two captures of the same scroll position are comparable frame for frame.
 */
function dustGeometry(count: number, spread: number, depth: number, seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() * 2 - 1) * spread;
    pos[i * 3 + 1] = rnd() * 7 + 0.1;
    pos[i * 3 + 2] = 10 - rnd() * depth;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return g;
}

export function Dust({ sprite, depth = 90 }: { sprite: THREE.Texture; depth?: number }) {
  const near = useRef<THREE.Points>(null);
  const far = useRef<THREE.Points>(null);
  const low = useContext(TierContext) === "low";
  const [gNear, gFar] = useMemo(
    () => [dustGeometry(low ? 140 : 260, 5, depth, 1337), dustGeometry(low ? 600 : 1500, 16, depth, 90211)],
    [depth, low],
  );
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

export function WetFloor({ maps, z = -40 }: { maps: FloorMaps; z?: number }) {
  const high = useContext(TierContext) === "high";
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
      <planeGeometry args={[240, 260]} />
      <MeshReflectorMaterial
        key={high ? "hi" : "lo"}
        // The mirror re-renders the whole scene every frame. At 640 the wet
        // ground read as visibly pixelated, so the high tier is back at 1024;
        // the cost is recovered elsewhere (one refracting object at a time,
        // 0.4-scale depth of field, and no scene rendering under a warp).
        resolution={high ? 1024 : 384}
        blur={high ? [400, 140] : [200, 80]}
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

export function KeyLight() {
  const point = useRef<THREE.PointLight>(null);
  const pool = useRef<THREE.SpotLight>(null);
  const back = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const f = env.focus;
    if (point.current) {
      point.current.position.set(f.x, f.y, f.z + 0.4);
      point.current.color.copy(env.light);
      point.current.intensity = 34 * (1 + 0.9 * env.white);
    }
    if (pool.current) {
      // a pool of the object's light thrown onto the wet floor beneath it
      pool.current.position.set(f.x, f.y + 3.2, f.z + 1.2);
      target.position.set(f.x, 0, f.z + 1.6);
      target.updateMatrixWorld();
      pool.current.color.copy(env.light);
      pool.current.intensity = 110 * (1 + 0.8 * env.white);
    }
    if (back.current) {
      back.current.color.copy(env.light).addScalar(0.06);
      back.current.intensity = 0.55 * (1 + 1.4 * env.white);
    }
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

/* ── studio lightformers: what the glass reflects ──────────────────────── */

/* Shared boot state for the one world canvas on the page (scene/pieces):
   its post chain, and whether the frame driver may advance it. */
export const boot = {
  /** the post chain, once Post has built it — its shaders are pre-linked too */
  composer: null as ComposerImpl | null,
  /** true once the shaders are linked and the world may draw */
  resumed: false,
  /** true while a warp tunnel covers the canvas: nothing is drawn underneath */
  paused: false,
  /** the shortest time between two drawn frames: 1/60, or 1/30 on a machine
   *  that cannot hold 60 — a steady 30 reads smoother than a ragged 40 */
  minInterval: 1 / 60,
};

/* ── quality governor: every world starts where this machine is smooth ──── */

export interface Quality {
  /** ceiling on the device pixel ratio */
  maxDpr: number;
  /** render this far under the device's pixels (the post chain scales it up) */
  under: number;
  tier: Tier;
  /** drawn at a steady 30 instead of 60 */
  cap30: boolean;
}

/** Where a world starts, from what the machine says about itself. */
export function initialQuality(): Quality {
  if (DBG.includes("H")) return { maxDpr: 1.5, under: 1, tier: "high", cap30: false };
  const dc = deviceClass();
  // A phone: its screen is small in CSS pixels, so twice its density is about
  // a laptop's worth of pixels — below that a 3x screen looks smeared. It
  // keeps the lighter pass chain. (Phones rarely report their memory, and
  // iOS reports few cores, so the class alone would leave them at 1x.)
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-width: 1023px)").matches && dc !== "low")
    return { maxDpr: 2, under: 1, tier: "low", cap30: false };
  if (dc === "low") return { maxDpr: 1, under: 0.75, tier: "low", cap30: false };
  if (dc === "mid") return { maxDpr: 1, under: 1, tier: "low", cap30: false };
  // a strong machine draws at the screen's own density up to 2x, so a 4K or
  // Retina display gets every pixel; the Governor sheds it first if frames drop
  return { maxDpr: 2, under: 1, tier: DBG.includes("l") ? "low" : "high", cap30: false };
}

/** A weak GPU (named on the real canvas) starts lower still. */
export function gpuQuality(q: Quality, cls: ReturnType<typeof gpuClass>): Quality {
  if (cls !== "weak") return q;
  return { ...q, maxDpr: 1, under: Math.min(q.under, 0.875), tier: "low" };
}

/** One step down: sharpness first, then passes, then frame rate. null when
 *  nothing is left to give. */
export function stepDown(q: Quality): Quality | null {
  const device = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  if (q.maxDpr > 1.5 && device > 1.5) return { ...q, maxDpr: 1.5 };
  if (q.maxDpr > 1 && device > 1) return { ...q, maxDpr: 1 };
  if (q.under > 0.8) return { ...q, under: +(q.under - 0.125).toFixed(3) };
  if (q.tier === "high") return { ...q, tier: "low" };
  if (!q.cap30) return { ...q, cap30: true };
  if (q.under > 0.6) return { ...q, under: 0.625 };
  return null;
}

export function qualityDpr(q: Quality): number {
  if (DBG.includes("r")) return 0.5;
  const device = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(device, q.maxDpr) * q.under;
}

/**
 * Watches the frame rate once the world is up and walks the quality down a
 * step at a time while it is short. At 60 it judges against ~52fps; once
 * capped at 30 it judges against ~25. With nothing left, `onGiveUp` hands
 * the page to its 2D world, which runs on anything.
 * Reads the GPU's name on the real context the first time it renders.
 */
export function Governor({
  quality,
  setQuality,
  armed,
  onGiveUp,
}: {
  quality: Quality;
  setQuality: (q: Quality) => void;
  armed: boolean;
  onGiveUp?: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const checked = useRef(false);
  const qRef = useRef(quality);
  useEffect(() => {
    qRef.current = quality;
    boot.minInterval = quality.cap30 ? 1 / 30 : 1 / 60;
    document.documentElement.dataset.worldQuality = `${quality.tier}|${qualityDpr(quality).toFixed(2)}|${quality.cap30 ? 30 : 60}`;
  }, [quality]);
  useEffect(
    () => () => {
      boot.minInterval = 1 / 60;
    },
    [],
  );
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (DBG.includes("H")) return;
    const name = gpuName(gl.getContext());
    const cls = gpuClass(name);
    document.documentElement.dataset.gpu = `${cls}|${name.slice(0, 80)}`;
    // no GPU at all: the CPU is drawing WebGL, and nothing of this size is
    // smooth there — the 2D world instead, before the loader even leaves
    if (cls === "software") onGiveUp?.();
    else if (cls === "weak") setQuality(gpuQuality(qRef.current, cls));
  }, [gl, setQuality, onGiveUp]);

  if (!armed || DBG.includes("H")) return null;
  return (
    <PerformanceMonitor
      // a new monitor per frame-rate target: its history is of the old target
      key={quality.cap30 ? "30" : "60"}
      ms={200}
      iterations={5}
      threshold={0.75}
      bounds={() => (quality.cap30 ? [24, 1000] : [52, 1000])}
      flipflops={50}
      onDecline={() => {
        const next = stepDown(qRef.current);
        if (next) setQuality(next);
        else onGiveUp?.();
      }}
    />
  );
}

type PMREMPrivate = {
  _setSize(n: number): void;
  _allocateTargets(): THREE.WebGLRenderTarget;
  _ggxMaterial: THREE.ShaderMaterial | null;
};

/**
 * Link a set of materials off the main thread (KHR_parallel_shader_compile,
 * through three's compileAsync) with a render target bound — a program built
 * for the canvas is not the program a draw into a render target needs, and
 * nearly everything here draws into one. Resolves when they are linked; on a
 * driver without the extension it links synchronously and resolves at once.
 */
export function linkAsync(gl: THREE.WebGLRenderer, camera: THREE.Camera, materials: THREE.Material[], target: boolean): Promise<void> {
  const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
  const stage = new THREE.Group();
  // a geometry WITH a position attribute: whether one exists is part of the
  // program's cache key, and a program linked for a bare geometry is not the
  // one a real mesh draws with (it was linked twice, the second time on the
  // main thread — measured with design-loop/_keys.mjs)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
  for (const m of materials) stage.add(new THREE.Mesh(geo, m));
  const prev = gl.getRenderTarget();
  const tiny = target ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
  if (tiny) gl.setRenderTarget(tiny);
  const done = () => {
    gl.setRenderTarget(prev);
    tiny?.dispose();
  };
  if (!r.compileAsync) {
    try {
      gl.compile(stage, camera);
    } finally {
      done();
    }
    return Promise.resolve();
  }
  return r.compileAsync(stage, camera).then(done, done);
}

/**
 * The environment map's GGX convolution shader is the single most expensive
 * link in the world (0.8s on the main thread on a Windows/ANGLE driver,
 * measured with design-loop/program-census.mjs), and three builds it
 * synchronously the first time an environment is used. It is linked here in
 * the background first — the same program, by cache key — and only then is
 * the lightformer studio mounted, so its PMREM finds the program ready.
 * `onReady` fires once scene.environment is in place.
 */
export function WorldEnvironment({ onReady }: { onReady?: () => void }) {
  const { gl, camera } = useThree();
  const [linked, setLinked] = useState(false);
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  });

  useEffect(() => {
    let alive = true;
    let keep: THREE.ShaderMaterial | null = null;
    const pm = new THREE.PMREMGenerator(gl);
    const p = pm as unknown as PMREMPrivate;
    let rt: THREE.WebGLRenderTarget | null = null;
    try {
      p._setSize(256);
      rt = p._allocateTargets();
      keep = p._ggxMaterial;
    } catch {
      keep = null;
    }
    // the material lives on (holding the linked program in the cache); the
    // generator's render targets go at once
    p._ggxMaterial = null;
    pm.dispose();
    rt?.dispose();
    const go = () => {
      if (alive) setLinked(true);
    };
    if (keep) linkAsync(gl, camera, [keep], true).then(go, go);
    else go();
    // never hold the world behind a driver that will not answer
    const guard = window.setTimeout(go, 2500);
    return () => {
      alive = false;
      window.clearTimeout(guard);
      keep?.dispose();
    };
  }, [gl, camera]);

  return (
    <>
      <ambientLight intensity={0.05} />
      {linked ? (
        <>
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={5} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 1.2, 1]} />
            <Lightformer form="rect" intensity={3} position={[-6, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
            <Lightformer form="rect" intensity={3} position={[6, 2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
            <Lightformer form="ring" intensity={1.4} position={[0, 2, 8]} scale={3} />
          </Environment>
          <EnvArrived onReady={() => readyRef.current?.()} />
        </>
      ) : null}
    </>
  );
}

/* mounted beside the Environment, after it: its layout effect runs once the
   Environment's own has set scene.environment */
function EnvArrived({ onReady }: { onReady: () => void }) {
  useLayoutEffect(() => {
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/* ── frame driver: the world draws as the last writer of the page's frame ─
   The canvas runs frameloop="never" and is advanced from the shared frame
   loop (frameLoop.ts) once its shaders are linked: after Lenis has moved the
   page and after every DOM write of the same tick, off the same clock — the
   camera and the copy cards never disagree by a frame. On a high-refresh
   display it draws at the nearest steady division of the refresh rate at or
   above 60 (every frame at 60/90Hz, every second at 120/144Hz): one heavy
   frame per display frame on a 144Hz panel is what turned a mid-range GPU
   into a stutter. */
export function FrameDriver() {
  const advance = useThree((s) => s.advance);
  const set = useThree((s) => s.set);
  useEffect(() => {
    set({ frameloop: "never" });
    let last = -1;
    return addFrameJob({
      write: (time) => {
        if (!boot.resumed || boot.paused) return;
        const raf = frameInterval();
        if (last >= 0 && time - last < boot.minInterval - raf * 0.5) return;
        last = time;
        advance(time, true);
      },
    });
  }, [advance, set]);
  return null;
}

/* ── post: depth of field that follows the focal object, bloom, vignette ── */

// ?bl=N for the design-loop fps series; the default is postprocessing's own
const BLOOM_LEVELS =
  typeof window === "undefined" ? 8 : Number(new URLSearchParams(window.location.search).get("bl") || 8);

const BLOOM_SCALE =
  typeof window === "undefined" ? 0.5 : Number(new URLSearchParams(window.location.search).get("bs") || 0.5);

export function Post({ focusY = 1.95, dof: withDof = true }: { focusY?: number; dof?: boolean }) {
  // depth of field is off in front of a painted plate: the plate has no depth
  // buffer, so DOF would smear the whole backdrop
  const high = useContext(TierContext) === "high" && withDof;
  const dof = useRef<DepthOfFieldEffect>(null);
  // the composer itself, for the boot sequence (its shaders are pre-linked)
  const composer = useRef<ComposerImpl>(null);
  useEffect(() => {
    const c = composer.current;
    boot.composer = c;
    return () => {
      if (boot.composer === c) boot.composer = null;
    };
  });
  const focus = useMemo(() => new THREE.Vector3(0, focusY, 0), [focusY]);
  useFrame((_, dt) => {
    focus.lerp(env.focus, 1 - Math.exp(-Math.min(dt, 1) * 3));
    if (dof.current) dof.current.target = focus;
  });
  // ?dbg switches for the design-loop fps series: b no bloom, s no AA at all,
  // v no vignette, 8 byte frame buffer, m 4x MSAA in place of the AA pass
  const low = useContext(TierContext) === "low";
  const bloom = DBG.includes("b") ? null : (
    <Bloom
      mipmapBlur
      intensity={0.5}
      luminanceThreshold={0.82}
      luminanceSmoothing={0.12}
      radius={0.72}
      // the low tier: five mip levels at a third of the resolution — the glow
      // is soft by nature and loses nothing a visitor can see
      levels={low ? Math.min(5, BLOOM_LEVELS) : BLOOM_LEVELS}
      resolutionScale={low ? Math.min(0.35, BLOOM_SCALE) : BLOOM_SCALE}
    />
  );
  const vignette = DBG.includes("v") ? null : <Vignette eskil={false} offset={0.22} darkness={0.72} />;
  // FXAA, not SMAA: at 1080p on an integrated GPU SMAA's three passes were
  // 5.4ms of a 26ms frame (design-loop/tier-probe.mjs); FXAA is one pass.
  // S forces SMAA back for the A/B.
  const smaa = DBG.includes("s") || DBG.includes("m") ? null : DBG.includes("S") ? <SMAA /> : <FXAA />;
  const msaa = DBG.includes("m") ? 4 : 0;
  const fbType = DBG.includes("8") ? THREE.UnsignedByteType : undefined;
  return high ? (
    <EffectComposer ref={composer} key="hi" multisampling={msaa} frameBufferType={fbType} enableNormalPass={false}>
      <DepthOfField
        ref={dof}
        target={[0, focusY, 0]}
        worldFocusRange={9}
        bokehScale={3}
        resolutionScale={0.4}
      />
      {bloom}
      {vignette}
      {smaa}
    </EffectComposer>
  ) : (
    <EffectComposer ref={composer} key="lo" multisampling={msaa} frameBufferType={fbType} enableNormalPass={false}>
      {bloom}
      {vignette}
      {smaa}
    </EffectComposer>
  );
}

/* ── ready signal ──────────────────────────────────────────────────────── */

/** every shader the post chain will draw with, reached through its passes */
function postMaterials(composer: ComposerImpl): { target: THREE.Material[]; screen: THREE.Material[] } {
  const target: THREE.Material[] = [];
  const screen: THREE.Material[] = [];
  type Pass = { fullscreenMaterial?: THREE.Material; effects?: unknown[]; renderToScreen?: boolean };
  type Eff = {
    luminancePass?: Pass;
    mipmapBlurPass?: { downsamplingMaterial?: THREE.Material; upsamplingMaterial?: THREE.Material };
    blurPass?: Pass;
    cocPass?: Pass;
    maskPass?: Pass;
    bokehNearBasePass?: Pass;
    bokehFarBasePass?: Pass;
    bokehNearFillPass?: Pass;
    bokehFarFillPass?: Pass;
  };
  const push = (into: THREE.Material[], m?: THREE.Material) => {
    if (m && !target.includes(m) && !screen.includes(m)) into.push(m);
  };
  for (const pass of composer.passes as unknown as Pass[]) {
    push(pass.renderToScreen ? screen : target, pass.fullscreenMaterial);
    for (const e of (pass.effects ?? []) as Eff[]) {
      push(target, e.luminancePass?.fullscreenMaterial);
      push(target, e.mipmapBlurPass?.downsamplingMaterial);
      push(target, e.mipmapBlurPass?.upsamplingMaterial);
      for (const k of ["blurPass", "cocPass", "maskPass", "bokehNearBasePass", "bokehFarBasePass", "bokehNearFillPass", "bokehFarFillPass"] as const)
        push(target, e[k]?.fullscreenMaterial);
    }
  }
  return { target, screen };
}

/* The world's shaders are linked before its first frame, off the main thread
   where the driver allows it (KHR_parallel_shader_compile), with the render
   loop held until they are. Letting the first frames compile as they went was
   2.5s of the main thread on the portal alone — 27% of the entire startup —
   and the 1.5s freeze on the way into every division page. The loader and the
   warp were already covering that time; now nothing is frozen underneath them.
   `envReady`: the environment map is in place (WorldEnvironment) — a material
   linked without it is linked again the first time it is drawn with it. */
export function ReadySignal({ onReady, envReady = true }: { onReady: () => void; envReady?: boolean }) {
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  const sent = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (!envReady || started.current) return;
    started.current = true;
    let alive = true;
    boot.resumed = false;
    const resume = () => {
      if (!alive || boot.resumed) return;
      boot.resumed = true;
    };
    // never trap the visitor behind a driver that will not answer
    const guard = window.setTimeout(resume, 4500);
    // Linked with a render target bound: a program built for the canvas is
    // not the one a draw into the composer's buffer needs (no tone mapping,
    // a different output transform), so compiling for the canvas built every
    // shader twice — once here, once more, synchronously, on the first real
    // frame. Measured with program-census.mjs.
    const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    const tiny = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(tiny);
    const sceneDone = () => {
      gl.setRenderTarget(prev);
      tiny.dispose();
    };
    const post = () => {
      // then the post chain's own shaders, the same way — they are not in the
      // scene, and used to link on the first frame, on the main thread
      const c = boot.composer;
      if (!c || !alive) return Promise.resolve();
      const { target, screen } = postMaterials(c);
      return linkAsync(gl, camera, target, true).then(() => linkAsync(gl, camera, screen, false));
    };
    let chain: Promise<unknown>;
    if (r.compileAsync) chain = r.compileAsync(scene, camera).then(sceneDone, sceneDone);
    else {
      try {
        gl.compile(scene, camera);
      } finally {
        sceneDone();
      }
      chain = Promise.resolve();
    }
    chain.then(post, post).then(resume, resume);
    return () => {
      alive = false;
      window.clearTimeout(guard);
    };
  }, [gl, scene, camera, envReady]);
  useFrame(() => {
    if (sent.current || !boot.resumed) return;
    frames.current += 1;
    if (frames.current >= 2) {
      sent.current = true;
      onReady();
    }
  });
  return null;
}

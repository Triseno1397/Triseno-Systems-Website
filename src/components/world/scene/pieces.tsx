"use client";

import { useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { TierContext, WHITE, env } from "./env";
import type { FloorMaps } from "./textures";

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
      m.color.copy(env.light).multiplyScalar(0.3 * (1 - 0.35 * env.white)).addScalar(0.02 * (1 - env.white * 0.5));
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
  const [gNear, gFar] = useMemo(
    () => [dustGeometry(260, 5, depth, 1337), dustGeometry(1500, 16, depth, 90211)],
    [depth],
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

export function WorldEnvironment() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={5} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={3} position={[-6, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
        <Lightformer form="rect" intensity={3} position={[6, 2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[0, 2, 8]} scale={3} />
      </Environment>
    </>
  );
}

/* ── post: depth of field that follows the focal object, bloom, vignette ── */

export function Post({ focusY = 1.95, dof: withDof = true }: { focusY?: number; dof?: boolean }) {
  // depth of field is off in front of a painted plate: the plate has no depth
  // buffer, so DOF would smear the whole backdrop
  const high = useContext(TierContext) === "high" && withDof;
  const dof = useRef<DepthOfFieldEffect>(null);
  const focus = useMemo(() => new THREE.Vector3(0, focusY, 0), [focusY]);
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
      <DepthOfField
        ref={dof}
        target={[0, focusY, 0]}
        worldFocusRange={9}
        bokehScale={3}
        resolutionScale={0.4}
      />
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

export function ReadySignal({ onReady }: { onReady: () => void }) {
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

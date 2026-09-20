"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { LAYERS, buildLattice, latticeState, pointerTarget } from "./lattice";

/* ─────────────────────────────────────────────────────────────────────────
   AI Infrastructure world — one fixed canvas behind the page.
   A slowly breathing lattice of tetrahedral nodes and hairline edges in three
   stacked planes. Nodes near the pointer light cyan, and pulses leave lit
   nodes and travel edge to edge, lighting what they reach. With no pointer
   (first paint, idle) a virtual pointer roams so the mechanism always shows.
   Everything per-frame is buffer writes and uniforms — no React renders.
   ───────────────────────────────────────────────────────────────────────── */

const CYAN = new THREE.Color("#00b4d8");
const MAX_PULSES = 56;

const POINT_VERT = /* glsl */ `
  attribute float aIntensity;
  uniform float uSize;
  varying float vI;
  void main() {
    vI = aIntensity;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.2 + aIntensity) / -mv.z;
  }
`;
const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vI;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * a * a * vI, 1.0);
  }
`;

// The spotlight is scene light, not a DOM wash: a camera-facing quad of neutral
// grey haze that sits under the pointer, behind the lattice (design-system 2).
const SPOT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SPOT_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uStrength;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(vec3(a * a * uStrength), 1.0);
  }
`;
// The room: a wide, very soft neutral wash that sits behind the lattice so the
// world reads as a lit space rather than a wireframe floating in a void. Grey
// only — the hue stays on the nodes and edges (design-system 2).
const ROOM_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uStrength;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.45);
    float a = smoothstep(0.62, 0.0, length(p));
    gl_FragColor = vec4(vec3(pow(a, 1.35) * uStrength), 1.0);
  }
`;
const SPOT_DISTANCE = 9.5;
const ROOM_DISTANCE = 15.5;

interface Pulse {
  edge: number;
  /** travelling from edge start to end (1) or end to start (-1) */
  dir: 1 | -1;
  t: number;
  speed: number;
  hops: number;
  alive: boolean;
}

function makePointMaterial(size: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: { uSize: { value: size }, uColor: { value: CYAN.clone() } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

function LatticeObject({ onReady }: { onReady?: () => void }) {
  const lattice = useMemo(() => buildLattice(), []);
  const { count, edges, adjacency } = lattice;
  const edgeCount = edges.length / 2;

  const group = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.InstancedMesh>(null);
  const spot = useRef<THREE.Mesh>(null);
  const room = useRef<THREE.Mesh>(null);
  const side = useRef(latticeState.side);
  const { camera, size, gl } = useThree();

  const sim = useMemo(() => {
    const quats: THREE.Quaternion[] = [];
    const e = new THREE.Euler();
    for (let i = 0; i < count; i++) {
      e.set(lattice.phase[i], lattice.phase[i] * 1.7, lattice.phase[i] * 0.6);
      quats.push(new THREE.Quaternion().setFromEuler(e));
    }
    const pulses: Pulse[] = Array.from({ length: MAX_PULSES }, () => ({
      edge: 0,
      dir: 1,
      t: 0,
      speed: 1,
      hops: 0,
      alive: false,
    }));
    return {
      cur: new Float32Array(count * 3),
      intensity: new Float32Array(count),
      bump: new Float32Array(count),
      quats,
      pulses,
      hot: [] as number[],
      spawnClock: 0,
      ambientClock: 0,
      px: latticeState.px,
      py: latticeState.py,
      frames: 0,
    };
  }, [count, lattice.phase]);

  /* geometry: edges, node halos, pulses, layer frames */
  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edgeCount * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(edgeCount * 6), 3));
    return g;
  }, [edgeCount]);

  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sim.cur, 3));
    g.setAttribute("aIntensity", new THREE.BufferAttribute(sim.intensity, 1));
    return g;
  }, [sim]);

  const pulseGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PULSES * 3), 3));
    g.setAttribute("aIntensity", new THREE.BufferAttribute(new Float32Array(MAX_PULSES), 1));
    return g;
  }, []);

  const frames = useMemo(() => {
    // One hairline rectangle per plane; the middle one — the intelligence layer — is cyan.
    const out: Array<{ geo: THREE.BufferGeometry; mid: boolean }> = [];
    const hx = 4.9;
    const hz = 2.7;
    for (let l = 0; l < LAYERS; l++) {
      const y = (l - 1) * 1.55;
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array([-hx, y, -hz, hx, y, -hz, hx, y, hz, -hx, y, hz]),
          3,
        ),
      );
      out.push({ geo: g, mid: l === 1 });
    }
    return out;
  }, []);

  const haloMat = useMemo(() => makePointMaterial(300), []);
  const pulseMat = useMemo(() => makePointMaterial(190), []);
  const spotMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SPOT_VERT,
        fragmentShader: SPOT_FRAG,
        uniforms: { uStrength: { value: 0.4 } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const roomMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SPOT_VERT,
        fragmentShader: ROOM_FRAG,
        uniforms: { uStrength: { value: 0.24 } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const edgeMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      edgeGeo.dispose();
      haloGeo.dispose();
      pulseGeo.dispose();
      frames.forEach((f) => f.geo.dispose());
      haloMat.dispose();
      pulseMat.dispose();
      edgeMat.dispose();
      spotMat.dispose();
      roomMat.dispose();
    },
    [edgeGeo, haloGeo, pulseGeo, frames, haloMat, pulseMat, edgeMat, spotMat, roomMat],
  );

  const tmp = useMemo(
    () => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    const mesh = nodes.current;
    if (!g || !mesh) return;
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;
    const aspect = size.width / Math.max(1, size.height);
    const ratio = gl.getPixelRatio();
    haloMat.uniforms.uSize.value = 300 * ratio;
    pulseMat.uniforms.uSize.value = 190 * ratio;

    /* pointer: the real one, or a roaming one when idle */
    const wide = aspect > 1.25;
    const aim = pointerTarget(performance.now(), wide);
    const idle = aim.idle;
    const tx = aim.x;
    const ty = aim.y;
    const follow = 1 - Math.exp(-dt * (idle ? 1.6 : 7));
    sim.px += (tx - sim.px) * follow;
    sim.py += (ty - sim.py) * follow;

    /* the spotlight: grey scene haze under the pointer, facing the camera */
    if (spot.current) {
      tmp.v.set(sim.px, sim.py, 0.5).unproject(camera).sub(camera.position).normalize();
      spot.current.position.copy(camera.position).addScaledVector(tmp.v, SPOT_DISTANCE);
      spot.current.quaternion.copy(camera.quaternion);
    }

    /* the object slides to whichever side the current section's card is not on */
    const wantSide = wide ? latticeState.side : 0;
    side.current += (wantSide - side.current) * (1 - Math.exp(-dt * 1.5));
    const ox = side.current * (wide ? 3.1 : 0);

    /* the room wash follows the object so the frame is lit, never a flat void */
    if (room.current) {
      tmp.v.set(side.current * 0.52, wide ? 0.02 : 0.16, 0.5).unproject(camera).sub(camera.position).normalize();
      room.current.position.copy(camera.position).addScaledVector(tmp.v, ROOM_DISTANCE);
      room.current.quaternion.copy(camera.quaternion);
    }

    /* the whole object breathes and leans toward the pointer */
    g.position.set(ox, wide ? 0.05 : 0.7, 0);
    g.rotation.set(0.05 - sim.py * 0.05, -0.44 + Math.sin(t * 0.12) * 0.12 + sim.px * 0.09, 0);
    g.scale.setScalar((wide ? 1.2 : 1.0) * (1 + Math.sin(t * 0.55) * 0.014));
    g.updateMatrixWorld();

    const { cur, intensity, bump, quats, hot } = sim;
    const base = lattice.positions;
    hot.length = 0;
    let lit = 0;
    const rise = 1 - Math.exp(-dt * 9);
    const fall = 1 - Math.exp(-dt * 1.5);
    const bumpDecay = Math.exp(-dt * 2.2);

    for (let i = 0; i < count; i++) {
      const ph = lattice.phase[i];
      const x = base[i * 3] + Math.cos(t * 0.45 + ph) * 0.03;
      const y = base[i * 3 + 1] + Math.sin(t * 0.7 + ph) * 0.075;
      const z = base[i * 3 + 2] + Math.sin(t * 0.38 + ph * 1.3) * 0.03;
      cur[i * 3] = x;
      cur[i * 3 + 1] = y;
      cur[i * 3 + 2] = z;

      tmp.v.set(x, y, z).applyMatrix4(g.matrixWorld).project(camera);
      const d = Math.hypot((tmp.v.x - sim.px) * aspect, tmp.v.y - sim.py);
      const k = Math.min(1, Math.max(0, 1 - d / 0.42));
      const near = k * k * (3 - 2 * k);
      bump[i] *= bumpDecay;
      const target = Math.max(near, bump[i]);
      intensity[i] += (target - intensity[i]) * (target > intensity[i] ? rise : fall);
      const v = intensity[i];
      if (near > 0.55) hot.push(i);
      if (v > 0.5) lit++;

      tmp.p.set(x, y, z);
      tmp.s.setScalar(1 + v * 0.7);
      tmp.m.compose(tmp.p, quats[i], tmp.s);
      mesh.setMatrixAt(i, tmp.m);
      const grey = lattice.layer[i] === 1 ? 0.7 : 0.44;
      tmp.c.setRGB(grey, grey, grey).lerp(CYAN, Math.min(1, v * 1.15));
      mesh.setColorAt(i, tmp.c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    haloGeo.attributes.position.needsUpdate = true;
    haloGeo.attributes.aIntensity.needsUpdate = true;

    /* edges follow the nodes and carry the light of their brighter end */
    const ePos = edgeGeo.attributes.position.array as Float32Array;
    const eCol = edgeGeo.attributes.color.array as Float32Array;
    for (let e = 0; e < edgeCount; e++) {
      const a = edges[e * 2];
      const b = edges[e * 2 + 1];
      const o = e * 6;
      ePos[o] = cur[a * 3];
      ePos[o + 1] = cur[a * 3 + 1];
      ePos[o + 2] = cur[a * 3 + 2];
      ePos[o + 3] = cur[b * 3];
      ePos[o + 4] = cur[b * 3 + 1];
      ePos[o + 5] = cur[b * 3 + 2];
      const mid = lattice.layer[a] === 1 && lattice.layer[b] === 1;
      const g0 = mid ? 0.42 : 0.24;
      for (let s = 0; s < 2; s++) {
        const v = s === 0 ? intensity[a] : intensity[b];
        const fade = 1 - v * 0.6;
        eCol[o + s * 3] = g0 * fade + CYAN.r * v * 0.85;
        eCol[o + s * 3 + 1] = g0 * fade + CYAN.g * v * 0.85;
        eCol[o + s * 3 + 2] = g0 * fade + CYAN.b * v * 0.85;
      }
    }
    edgeGeo.attributes.position.needsUpdate = true;
    edgeGeo.attributes.color.needsUpdate = true;

    /* pulses */
    const spawn = (node: number, hops: number) => {
      const list = adjacency[node];
      if (!list.length) return;
      const slot = sim.pulses.find((p) => !p.alive);
      if (!slot) return;
      const edge = list[Math.floor(Math.random() * list.length)];
      slot.edge = edge;
      slot.dir = edges[edge * 2] === node ? 1 : -1;
      slot.t = 0;
      slot.speed = 1.5 + Math.random() * 1.1;
      slot.hops = hops;
      slot.alive = true;
    };
    sim.spawnClock += dt;
    sim.ambientClock += dt;
    if (sim.spawnClock > 0.085 && hot.length) {
      sim.spawnClock = 0;
      spawn(hot[Math.floor(Math.random() * hot.length)], 3 + Math.floor(Math.random() * 3));
    }
    if (sim.ambientClock > 0.55) {
      sim.ambientClock = 0;
      spawn(Math.floor(Math.random() * count), 6);
    }

    const pPos = pulseGeo.attributes.position.array as Float32Array;
    const pInt = pulseGeo.attributes.aIntensity.array as Float32Array;
    let active = 0;
    sim.pulses.forEach((p, i) => {
      if (!p.alive) {
        pInt[i] = 0;
        return;
      }
      p.t += dt * p.speed;
      const to = p.dir === 1 ? edges[p.edge * 2 + 1] : edges[p.edge * 2];
      if (p.t >= 1) {
        bump[to] = Math.max(bump[to], 0.85);
        const list = adjacency[to];
        if (p.hops > 0 && list.length > 1) {
          let next = p.edge;
          for (let tries = 0; tries < 4 && next === p.edge; tries++) next = list[Math.floor(Math.random() * list.length)];
          p.edge = next;
          p.dir = edges[next * 2] === to ? 1 : -1;
          p.t = 0;
          p.hops--;
        } else {
          p.alive = false;
          pInt[i] = 0;
          return;
        }
      }
      const a = p.dir === 1 ? edges[p.edge * 2] : edges[p.edge * 2 + 1];
      const b = p.dir === 1 ? edges[p.edge * 2 + 1] : edges[p.edge * 2];
      const k = p.t >= 1 ? 0 : p.t;
      // ease along the edge so pulses decelerate into each node
      const ek = 1 - Math.pow(1 - k, 2.2);
      pPos[i * 3] = cur[a * 3] + (cur[b * 3] - cur[a * 3]) * ek;
      pPos[i * 3 + 1] = cur[a * 3 + 1] + (cur[b * 3 + 1] - cur[a * 3 + 1]) * ek;
      pPos[i * 3 + 2] = cur[a * 3 + 2] + (cur[b * 3 + 2] - cur[a * 3 + 2]) * ek;
      pInt[i] = 0.9;
      active++;
    });
    pulseGeo.attributes.position.needsUpdate = true;
    pulseGeo.attributes.aIntensity.needsUpdate = true;

    latticeState.lit = lit;
    latticeState.pulses = active;

    sim.frames++;
    if (sim.frames === 3) onReady?.();
  });

  return (
    <>
      <mesh ref={room} material={roomMat} renderOrder={-2} frustumCulled={false}>
        <planeGeometry args={[42, 30]} />
      </mesh>
      <mesh ref={spot} material={spotMat} renderOrder={-1} frustumCulled={false}>
        <planeGeometry args={[7.6, 7.6]} />
      </mesh>
      <group ref={group}>
      <instancedMesh ref={nodes} args={[undefined, undefined, count]} frustumCulled={false}>
        <tetrahedronGeometry args={[0.056, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={edgeGeo} material={edgeMat} frustumCulled={false} />
      <points geometry={haloGeo} material={haloMat} frustumCulled={false} />
      <points geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
      {frames.map((f, i) => (
        <lineLoop key={i} geometry={f.geo}>
          <lineBasicMaterial
            color={f.mid ? "#00b4d8" : "#ffffff"}
            transparent
            opacity={f.mid ? 0.62 : 0.26}
            depthWrite={false}
          />
        </lineLoop>
      ))}
      </group>
    </>
  );
}

export default function LatticeScene({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 2.3, 10.4], fov: 36, near: 0.1, far: 60 }}
      onCreated={({ scene, camera }) => {
        scene.background = new THREE.Color("#000000");
        scene.fog = new THREE.Fog("#000000", 11.5, 26);
        camera.lookAt(0, 0.1, 0);
      }}
      style={{ pointerEvents: "none" }}
    >
      <LatticeObject onReady={onReady} />
    </Canvas>
  );
}

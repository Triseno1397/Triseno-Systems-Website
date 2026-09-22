"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { portalState } from "./portalState";

/* ─────────────────────────────────────────────────────────────────────────
   WHAT EACH DIVISION IS, AS A MECHANISM.

   The signature loop morphs circle → square → triangle. On its own that is a
   silhouette; each division also has a mechanism inside it, machined from the
   same chrome as the rest of the world, which fades in with its division:

     Creative   — a camera aperture: six blades that stop down and open.
     Web Design — a window rig: corner brackets, a header rule, content bars
                  that settle into place (abstract line-work, never fake UI).
     AI         — a lattice: nodes joined by filaments, a pulse running the
                  edges into the core.

   Everything here is thin line-work and small parts: a few hundred triangles
   in total, one chrome material and one emissive material shared by all three.
   ───────────────────────────────────────────────────────────────────────── */

const BLADES = 6;
const EASE = (x: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(x, 0, 1), 3);

export default function Mechanisms({ hues }: { hues: string[] }) {
  const groups = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const blades = useRef<THREE.Group[]>([]);
  const bars = useRef<THREE.Mesh[]>([]);
  const pulse = useRef<THREE.Mesh>(null);
  const weights = useRef([0, 0, 0]);

  // one chrome body, one emissive line colour: the mechanisms are part of the
  // same machined world as the loop
  const chrome = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c9ccd4", metalness: 1, roughness: 0.22, envMapIntensity: 1.6 }),
    [],
  );
  const lit = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, opacity: 0.9 }),
    [],
  );
  const litSoft = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        toneMapped: false,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  // the pane the web rig holds: dark glass that catches the hall's light
  const pane = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0d0d11", metalness: 0.9, roughness: 0.12, envMapIntensity: 1.2 }),
    [],
  );
  const hueCols = useMemo(() => hues.map((h) => new THREE.Color(h)), [hues]);

  // AI lattice: node positions inside the triangle, and the edges between them
  const lattice = useMemo(() => {
    const p = (x: number, y: number) => new THREE.Vector3(x, y, 0);
    const nodes = [p(0, 0.86), p(-0.8, -0.5), p(0.8, -0.5), p(0, -0.5), p(-0.4, 0.18), p(0.4, 0.18), p(0, -0.07)];
    const edges: Array<[number, number]> = [
      [0, 4],
      [0, 5],
      [1, 4],
      [2, 5],
      [1, 3],
      [2, 3],
      [4, 6],
      [5, 6],
      [3, 6],
    ];
    return { nodes, edges };
  }, []);

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;
    const on = portalState.hot && portalState.hero < 0.5;
    for (let i = 0; i < 3; i++) {
      const target = on && portalState.active === i ? 1 : 0;
      const w = THREE.MathUtils.lerp(weights.current[i], target, 1 - Math.exp(-step * (target ? 5 : 7)));
      weights.current[i] = w;
      const g = groups[i].current;
      if (!g) continue;
      g.visible = w > 0.01;
      g.scale.setScalar(0.88 + 0.12 * EASE(w));
      if (i === 2) g.rotation.z = Math.sin(t * 0.18) * 0.06; // the lattice breathes
    }
    lit.opacity = 0.9;
    const active = portalState.active;
    const hue = hueCols[active] ?? hueCols[0];
    lit.color.copy(hue).lerp(new THREE.Color("#ffffff"), 0.45);
    litSoft.color.copy(hue);
    litSoft.opacity = 0.42;

    // aperture: breathes between wide open and stopped down
    const stop = 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(t * 0.55));
    blades.current.forEach((b, i) => {
      if (!b) return;
      // each leaf pivots on the rim and swings across the opening, so the six
      // of them overlap into a real iris instead of reading as spokes
      const a = (i / BLADES) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, i * 0.006);
      b.rotation.z = a + Math.PI / 2 + 0.15 + stop * 0.5;
    });
    // window: the content bars settle in, then hold
    bars.current.forEach((m, i) => {
      if (!m) return;
      const k = EASE(weights.current[1] * 1.6 - i * 0.18);
      m.scale.x = Math.max(0.001, k);
      m.position.x = -0.62 + (0.62 * (1 - k)) * 0.6;
    });
    // lattice: a pulse runs an edge, then jumps to the next
    if (pulse.current) {
      const e = lattice.edges[Math.floor(t * 0.9) % lattice.edges.length];
      const k = (t * 0.9) % 1;
      pulse.current.position.lerpVectors(lattice.nodes[e[0]], lattice.nodes[e[1]], EASE(k));
      const s = 0.09 * (1 - Math.abs(k - 0.5) * 0.7);
      pulse.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* ── Creative: the aperture ─────────────────────────────────────── */}
      <group ref={groups[0]}>
        {Array.from({ length: BLADES }, (_, i) => (
          <group
            key={i}
            ref={(el) => {
              if (el) blades.current[i] = el;
            }}
          >
            <mesh material={chrome} position={[0.42, -0.18, 0]}>
              <boxGeometry args={[1.05, 0.52, 0.014]} />
            </mesh>
            {/* the lit inner edge of the leaf */}
            <mesh material={lit} position={[0.42, 0.075, 0.009]}>
              <boxGeometry args={[1.05, 0.008, 0.005]} />
            </mesh>
          </group>
        ))}
        {/* the lens element the blades sit in */}
        {/* the glass element the leaves stop down over */}
        <mesh material={litSoft}>
          <ringGeometry args={[0.12, 0.95, 64]} />
        </mesh>
      </group>

      {/* ── Web Design: the window rig ─────────────────────────────────── */}
      <group ref={groups[1]}>
        {([
          [-0.82, 0.78, 1, 1],
          [0.82, 0.78, -1, 1],
          [-0.82, -0.78, 1, -1],
          [0.82, -0.78, -1, -1],
        ] as const).map(([x, y, sx, sy], i) => (
          <group key={i} position={[x, y, 0]} scale={[sx, sy, 1]}>
            <mesh material={chrome} position={[0.16, 0, 0]}>
              <boxGeometry args={[0.34, 0.04, 0.04]} />
            </mesh>
            <mesh material={chrome} position={[0, -0.16, 0]}>
              <boxGeometry args={[0.04, 0.34, 0.04]} />
            </mesh>
          </group>
        ))}
        {/* the pane the rig holds */}
        <mesh material={pane} position={[0, 0, -0.03]}>
          <boxGeometry args={[1.62, 1.38, 0.03]} />
        </mesh>
        {/* header rule */}
        <mesh material={lit} position={[0, 0.42, 0.09]}>
          <boxGeometry args={[1.5, 0.018, 0.018]} />
        </mesh>
        {/* content bars, settling in */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) bars.current[i] = el;
            }}
            material={i === 0 ? lit : chrome}
            position={[-0.62, 0.08 - i * 0.3, 0.09]}
          >
            <boxGeometry args={[1.24 - i * 0.34, i === 0 ? 0.06 : 0.042, 0.042]} />
          </mesh>
        ))}
      </group>

      {/* ── AI Infrastructure: the lattice ─────────────────────────────── */}
      <group ref={groups[2]}>
        {lattice.nodes.map((n, i) => (
          <mesh key={i} material={i === 6 ? lit : chrome} position={n}>
            <octahedronGeometry args={[i === 6 ? 0.1 : 0.07, 0]} />
          </mesh>
        ))}
        {lattice.edges.map(([a, b], i) => {
          const A = lattice.nodes[a];
          const B = lattice.nodes[b];
          const mid = A.clone().lerp(B, 0.5);
          const len = A.distanceTo(B);
          const ang = Math.atan2(B.y - A.y, B.x - A.x);
          return (
            <mesh key={i} material={lit} position={mid} rotation={[0, 0, ang]}>
              <boxGeometry args={[len, 0.022, 0.022]} />
            </mesh>
          );
        })}
        <mesh ref={pulse} material={lit}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

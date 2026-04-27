"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ParticleSystemProps = {
  count: number;
  reactive: boolean;
};

function ParticleSystem({ count, reactive }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { viewport, mouse } = useThree();

  const cursor3D = useRef(new THREE.Vector3(9999, 9999, 9999));

  const { positions, velocities, basePositions, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    const ph = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = Math.cbrt(Math.random()) * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;

      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = 0;

      ph[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, velocities: vel, basePositions: base, phases: ph };
  }, [count]);

  // Connection-line buffer: pre-allocate worst case (we'll cap actual segments per frame)
  const MAX_LINES = Math.min(count * 4, 4000);
  const linePositions = useMemo(
    () => new Float32Array(MAX_LINES * 2 * 3),
    [MAX_LINES],
  );
  const lineColors = useMemo(
    () => new Float32Array(MAX_LINES * 2 * 3),
    [MAX_LINES],
  );

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  const linesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [linePositions, lineColors]);

  useEffect(() => {
    return () => {
      pointsGeometry.dispose();
      linesGeometry.dispose();
    };
  }, [pointsGeometry, linesGeometry]);

  // Spatial grid for connection-finding (avoids O(n^2) for n=2000)
  const cellSize = 1.2;
  const gridRef = useRef<Map<string, number[]>>(new Map());

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();
    const positionsAttr = pointsGeometry.attributes.position as THREE.BufferAttribute;

    // Project cursor into world space at z=0 plane
    if (reactive) {
      cursor3D.current.set(
        (mouse.x * viewport.width) / 2,
        (mouse.y * viewport.height) / 2,
        0,
      );
    } else {
      cursor3D.current.set(9999, 9999, 9999);
    }

    const cursorRadius = 2.6;
    const cursorRadiusSq = cursorRadius * cursorRadius;
    const driftAmp = 0.12;
    const driftSpeed = 0.35;

    const grid = gridRef.current;
    grid.clear();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phases[i];

      // Idle Perlin-ish drift (cheap sin combo)
      const driftX =
        Math.sin(t * driftSpeed + phase) * driftAmp +
        Math.sin(t * driftSpeed * 0.7 + phase * 1.3) * driftAmp * 0.5;
      const driftY =
        Math.cos(t * driftSpeed * 0.9 + phase * 0.8) * driftAmp +
        Math.sin(t * driftSpeed * 0.6 + phase) * driftAmp * 0.3;
      const driftZ = Math.sin(t * driftSpeed * 0.5 + phase * 1.7) * driftAmp * 0.4;

      const targetX = basePositions[i3] + driftX;
      const targetY = basePositions[i3 + 1] + driftY;
      const targetZ = basePositions[i3 + 2] + driftZ;

      // Cursor pull
      let pullX = 0;
      let pullY = 0;
      let pullZ = 0;
      if (reactive) {
        const dx = cursor3D.current.x - positions[i3];
        const dy = cursor3D.current.y - positions[i3 + 1];
        const dz = cursor3D.current.z - positions[i3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < cursorRadiusSq) {
          const falloff = 1 - distSq / cursorRadiusSq;
          const strength = falloff * falloff * 1.8;
          pullX = dx * strength;
          pullY = dy * strength;
          pullZ = dz * strength;
        }
      }

      // Spring back toward drift target + cursor pull
      const springK = 1.6;
      const damping = 0.86;
      velocities[i3] = (velocities[i3] + (targetX - positions[i3]) * springK * dt + pullX * dt) * damping;
      velocities[i3 + 1] = (velocities[i3 + 1] + (targetY - positions[i3 + 1]) * springK * dt + pullY * dt) * damping;
      velocities[i3 + 2] = (velocities[i3 + 2] + (targetZ - positions[i3 + 2]) * springK * dt + pullZ * dt) * damping;

      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];

      // Bin into grid
      const cx = Math.floor(positions[i3] / cellSize);
      const cy = Math.floor(positions[i3 + 1] / cellSize);
      const cz = Math.floor(positions[i3 + 2] / cellSize);
      const key = `${cx},${cy},${cz}`;
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }
    positionsAttr.needsUpdate = true;

    // Build connection lines via grid neighborhood
    const linkDist = 0.95;
    const linkDistSq = linkDist * linkDist;
    let lineCount = 0;
    const lp = linePositions;
    const lc = lineColors;

    grid.forEach((bucket, key) => {
      const [cx, cy, cz] = key.split(",").map(Number);
      // Check this cell + neighbors (only forward-direction to avoid double-counting)
      for (let ox = 0; ox <= 1; ox++) {
        for (let oy = ox === 0 ? 0 : -1; oy <= 1; oy++) {
          for (let oz = ox === 0 && oy === 0 ? 0 : -1; oz <= 1; oz++) {
            const neighbor = grid.get(`${cx + ox},${cy + oy},${cz + oz}`);
            if (!neighbor) continue;
            for (let a = 0; a < bucket.length; a++) {
              const i = bucket[a];
              const startB = ox === 0 && oy === 0 && oz === 0 ? a + 1 : 0;
              for (let b = startB; b < neighbor.length; b++) {
                const j = neighbor[b];
                if (i === j) continue;
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < linkDistSq && lineCount < MAX_LINES) {
                  const alpha = 1 - d2 / linkDistSq;

                  // Brighten if either endpoint is near cursor
                  let brightness = 0.35 * alpha;
                  if (reactive) {
                    const ci = cursor3D.current;
                    const di =
                      (positions[i * 3] - ci.x) ** 2 +
                      (positions[i * 3 + 1] - ci.y) ** 2;
                    const dj =
                      (positions[j * 3] - ci.x) ** 2 +
                      (positions[j * 3 + 1] - ci.y) ** 2;
                    const cd = Math.min(di, dj);
                    if (cd < cursorRadiusSq) {
                      brightness += (1 - cd / cursorRadiusSq) * 0.9;
                    }
                  }

                  const li = lineCount * 6;
                  lp[li] = positions[i * 3];
                  lp[li + 1] = positions[i * 3 + 1];
                  lp[li + 2] = positions[i * 3 + 2];
                  lp[li + 3] = positions[j * 3];
                  lp[li + 4] = positions[j * 3 + 1];
                  lp[li + 5] = positions[j * 3 + 2];

                  // Electric blue tint
                  const r = 0.0 * brightness;
                  const g = 0.9 * brightness;
                  const bl = 1.0 * brightness;
                  lc[li] = r;
                  lc[li + 1] = g;
                  lc[li + 2] = bl;
                  lc[li + 3] = r;
                  lc[li + 4] = g;
                  lc[li + 5] = bl;

                  lineCount++;
                }
              }
            }
          }
        }
      }
    });

    linesGeometry.setDrawRange(0, lineCount * 2);
    (linesGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (linesGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    if (pointsRef.current) {
      pointsRef.current.rotation.y += dt * 0.02;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = pointsRef.current?.rotation.y ?? 0;
    }
  });

  return (
    <group>
      <points ref={pointsRef} geometry={pointsGeometry} frustumCulled={false}>
        <pointsMaterial
          size={0.04}
          color="#9ad8ff"
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={linesRef} geometry={linesGeometry} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

export default function HeroParticleNetwork({
  fadeOpacity = 1,
}: {
  fadeOpacity?: number;
}) {
  const [count, setCount] = useState(1800);
  const [reactive, setReactive] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth <= 768;

    if (reduced) {
      setCount(800);
      setReactive(false);
    } else if (mobile) {
      setCount(600);
      setReactive(false); // touch-driven could be added later; keep idle drift
    }

    setEnabled(true);
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="absolute inset-0"
      role="img"
      aria-label="Interactive 3D particle network responding to cursor movement"
      style={{ opacity: fadeOpacity, transition: "opacity 400ms ease" }}
    >
      <Canvas
        dpr={[1, 1.6]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 9], fov: 55 }}
      >
        <ParticleSystem count={count} reactive={reactive} />
      </Canvas>
    </div>
  );
}

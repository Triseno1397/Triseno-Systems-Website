"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type MorphTarget = "cloud" | "send" | "tag";

function buildCloud(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.cbrt(Math.random()) * 2.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    arr[i * 3 + 2] = r * Math.cos(phi) * 0.6;
  }
  return arr;
}

// Build a paper-plane / arrow-head silhouette by sampling outline + interior
function buildSendIcon(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  // Triangle vertices for paper plane: tip right, tail left, with notch
  const tip = new THREE.Vector2(2.4, 0);
  const topBack = new THREE.Vector2(-1.8, 1.4);
  const notch = new THREE.Vector2(-0.6, 0);
  const bottomBack = new THREE.Vector2(-1.8, -1.4);

  // Three sub-triangles: (tip, topBack, notch), (tip, notch, bottomBack), and a fold line
  const tris: [THREE.Vector2, THREE.Vector2, THREE.Vector2][] = [
    [tip, topBack, notch],
    [tip, notch, bottomBack],
  ];

  for (let i = 0; i < count; i++) {
    const tri = tris[i % tris.length];
    // Random barycentric
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    const x = tri[0].x * u + tri[1].x * v + tri[2].x * w;
    const y = tri[0].y * u + tri[1].y * v + tri[2].y * w;
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }
  return arr;
}

// Build a price-tag silhouette (rectangle + triangle point + hole)
function buildTagIcon(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  // Tag body: rectangle from x=-1.6 to x=1.0, y=-1.0 to y=1.0
  // Point: triangle from x=1.0 to x=2.2, tapering to y=0
  // Hole: small circle at x=-1.0, y=0
  const bodyArea = 2.6 * 2.0;
  const pointArea = 0.5 * 1.2 * 2;
  const total = bodyArea + pointArea;
  const bodyShare = Math.floor((bodyArea / total) * count);

  for (let i = 0; i < count; i++) {
    let x: number, y: number;

    if (i < bodyShare) {
      // Rectangle body, but skip the hole region
      let attempts = 0;
      do {
        x = -1.6 + Math.random() * 2.6;
        y = -1.0 + Math.random() * 2.0;
        const hd = Math.hypot(x - (-1.0), y - 0);
        if (hd > 0.28) break;
        attempts++;
      } while (attempts < 5);
    } else {
      // Triangle point on the right
      const t = Math.random();
      x = 1.0 + t * 1.2;
      const halfH = 1.0 * (1 - t);
      y = (Math.random() * 2 - 1) * halfH;
    }

    arr[i * 3] = x!;
    arr[i * 3 + 1] = y!;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }
  return arr;
}

function ParticleCloud({
  count,
  target,
  reduced,
}: {
  count: number;
  target: MorphTarget;
  reduced: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const cloudPos = useMemo(() => buildCloud(count), [count]);
  const sendPos = useMemo(() => buildSendIcon(count), [count]);
  const tagPos = useMemo(() => buildTagIcon(count), [count]);

  const positions = useMemo(() => new Float32Array(cloudPos), [cloudPos]);
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  // Per-frame morph progress: each particle interpolates from current pos toward target
  const progressRef = useRef(0);
  const lastTargetRef = useRef<MorphTarget>("cloud");
  const fromPosRef = useRef<Float32Array>(new Float32Array(positions));

  useEffect(() => {
    if (lastTargetRef.current !== target) {
      // Snapshot current pos as "from" and reset progress
      fromPosRef.current.set(positions);
      progressRef.current = 0;
      lastTargetRef.current = target;
    }
  }, [target, positions]);

  useFrame((state, dt) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    const positionsAttr = geometry.attributes.position as THREE.BufferAttribute;

    const targetArr =
      target === "send" ? sendPos : target === "tag" ? tagPos : cloudPos;

    // Different ease durations for in vs out
    const duration = target === "cloud" ? 0.9 : 0.7;
    progressRef.current = Math.min(1, progressRef.current + dt / duration);

    // Easing: power3.out for "in", power2.inOut for "out"
    const p = progressRef.current;
    const eased =
      target === "cloud"
        ? p < 0.5
          ? 2 * p * p
          : 1 - Math.pow(-2 * p + 2, 2) / 2
        : 1 - Math.pow(1 - p, 3);

    const jitterAmp = reduced ? 0 : target === "cloud" ? 0.08 : 0.04;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phases[i];

      const tx = targetArr[i3];
      const ty = targetArr[i3 + 1];
      const tz = targetArr[i3 + 2];

      const fx = fromPosRef.current[i3];
      const fy = fromPosRef.current[i3 + 1];
      const fz = fromPosRef.current[i3 + 2];

      const jitterX = Math.sin(t * 0.8 + phase) * jitterAmp;
      const jitterY = Math.cos(t * 0.7 + phase * 1.2) * jitterAmp;
      const jitterZ = Math.sin(t * 0.5 + phase * 1.7) * jitterAmp * 0.5;

      positions[i3] = fx + (tx - fx) * eased + jitterX;
      positions[i3 + 1] = fy + (ty - fy) * eased + jitterY;
      positions[i3 + 2] = fz + (tz - fz) * eased + jitterZ;
    }
    positionsAttr.needsUpdate = true;

    pointsRef.current.rotation.y = Math.sin(t * 0.15) * 0.08;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.05}
        color="#9ad8ff"
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function ClosingParticleMorph({
  target,
}: {
  target: MorphTarget;
}) {
  const [count, setCount] = useState(1500);
  const [reduced, setReduced] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth <= 768;
    setReduced(isReduced);
    if (mobile) setCount(700);

    if (!wrapperRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShouldMount(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200% 0px" },
    );
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  const effectiveTarget: MorphTarget = reduced ? "cloud" : target;

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      role="img"
      aria-label="Interactive particle cloud that morphs to indicate the hovered call to action"
    >
      {shouldMount && (
        <Canvas
          dpr={[1, 1.6]}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 6], fov: 50 }}
        >
          <ParticleCloud count={count} target={effectiveTarget} reduced={reduced} />
        </Canvas>
      )}
    </div>
  );
}

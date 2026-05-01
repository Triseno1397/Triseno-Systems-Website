"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RibbonProps {
  segments?: number;
  radius?: number;
  tubeRadius?: number;
  amplitude?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  spin?: number;
  curvePoints?: THREE.Vector3[];
}

const DEFAULT_POINTS: [number, number, number][] = [
  [-8, 1.6, -2],
  [-5, -1.2, 1],
  [-2, 1.8, -1],
  [1, -1.6, 2],
  [4, 1.4, -1.5],
  [7, -1, 1],
  [10, 1.8, -2],
];

export default function Ribbon({
  segments = 360,
  tubeRadius = 0.18,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  spin = 0.05,
  curvePoints,
}: RibbonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const pts =
      curvePoints ?? DEFAULT_POINTS.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    return new THREE.TubeGeometry(curve, segments, tubeRadius, 16, false);
  }, [curvePoints, segments, tubeRadius]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color("#00e5ff") },
        uColorB: { value: new THREE.Color("#0077ff") },
        uColorC: { value: new THREE.Color("#9d5cff") },
        uOpacity: { value: 0.95 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vec4 viewPos = viewMatrix * worldPos;
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-viewPos.xyz);
          gl_Position = projectionMatrix * viewPos;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform float uOpacity;

        void main() {
          float t = vUv.x + uTime * 0.05;
          float w = sin(t * 6.2831) * 0.5 + 0.5;
          vec3 ab = mix(uColorA, uColorB, smoothstep(0.0, 0.5, w));
          vec3 col = mix(ab, uColorC, smoothstep(0.5, 1.0, w));

          float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
          col += uColorA * fres * 0.6;

          gl_FragColor = vec4(col, uOpacity);
        }
      `,
    });
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += spin * delta;
    if (matRef.current) {
      const u = matRef.current.uniforms.uTime;
      if (u) u.value += delta;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry}>
        <primitive object={material} ref={matRef} attach="material" />
      </mesh>
      {/* Soft additive glow halo */}
      <mesh geometry={geometry} scale={1.04}>
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

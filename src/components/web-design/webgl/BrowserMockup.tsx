"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";

interface Props {
  width?: number;
  height?: number;
  position?: [number, number, number];
}

const ACCENT = "#00e5ff";

export default function BrowserMockup({
  width = 6.4,
  height = 4,
  position = [0, 0, 0],
}: Props) {
  const chromeHeight = 0.45;
  const screenHeight = height - chromeHeight;
  const chromeY = height / 2 - chromeHeight / 2;
  const screenY = -chromeHeight / 2;
  const screenZ = 0.075; // sits on top of the chassis face

  // Hairline grid texture for the screen content.
  const gridTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#070b18";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  }, []);

  return (
    <group position={position}>
      {/* Chassis — beveled rounded slab. PBR so HDR env reflects across it. */}
      <RoundedBox
        args={[width + 0.18, height + 0.18, 0.16]}
        radius={0.06}
        smoothness={6}
        position={[0, 0, 0]}
      >
        <meshPhysicalMaterial
          color="#0a1020"
          metalness={0.6}
          roughness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.18}
          envMapIntensity={1.1}
        />
      </RoundedBox>

      {/* Screen — slightly recessed glassy plate, low roughness so the
          environment glances across it. */}
      <mesh position={[0, 0, screenZ]}>
        <planeGeometry args={[width, height]} />
        <meshPhysicalMaterial
          color="#04060d"
          metalness={0.4}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Chrome bar — sits proud of the screen surface. */}
      <RoundedBox
        args={[width - 0.05, chromeHeight, 0.012]}
        radius={0.012}
        smoothness={4}
        position={[0, chromeY, screenZ + 0.008]}
      >
        <meshStandardMaterial color="#0c1326" metalness={0.3} roughness={0.6} />
      </RoundedBox>

      {/* Chrome bottom hairline accent */}
      <mesh position={[0, chromeY - chromeHeight / 2 + 0.005, screenZ + 0.015]}>
        <planeGeometry args={[width - 0.08, 0.005]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Traffic-light dots — small spheres so they catch light. */}
      {[
        { color: "#ff5f57", x: -width / 2 + 0.22 },
        { color: "#febc2e", x: -width / 2 + 0.4 },
        { color: "#28c840", x: -width / 2 + 0.58 },
      ].map((d, i) => (
        <mesh key={i} position={[d.x, chromeY, screenZ + 0.022]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color={d.color}
            emissive={d.color}
            emissiveIntensity={0.45}
            metalness={0.1}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Address bar */}
      <RoundedBox
        args={[width * 0.55, chromeHeight * 0.55, 0.01]}
        radius={chromeHeight * 0.18}
        smoothness={4}
        position={[0.5, chromeY, screenZ + 0.022]}
      >
        <meshStandardMaterial color="#040813" metalness={0.4} roughness={0.5} />
      </RoundedBox>

      {/* Content area — hairline grid */}
      <mesh position={[0, screenY, screenZ + 0.011]}>
        <planeGeometry args={[width - 0.06, screenHeight - 0.06]} />
        <meshStandardMaterial
          map={gridTexture}
          transparent
          opacity={0.85}
          metalness={0.2}
          roughness={0.55}
        />
      </mesh>

      {/* Hero image block — emissive panel with subtle inner glow */}
      <mesh position={[0, screenY + screenHeight * 0.25, screenZ + 0.018]}>
        <planeGeometry args={[width * 0.7, screenHeight * 0.32]} />
        <meshStandardMaterial
          color="#0a1428"
          emissive={ACCENT}
          emissiveIntensity={0.18}
          metalness={0.15}
          roughness={0.5}
        />
      </mesh>

      {/* Headline placeholder bars */}
      <mesh
        position={[
          -width * 0.18,
          screenY + screenHeight * 0.05,
          screenZ + 0.024,
        ]}
      >
        <planeGeometry args={[width * 0.45, 0.07]} />
        <meshStandardMaterial color="#1f2c4a" metalness={0.3} roughness={0.55} />
      </mesh>
      <mesh
        position={[
          -width * 0.23,
          screenY - screenHeight * 0.05,
          screenZ + 0.024,
        ]}
      >
        <planeGeometry args={[width * 0.32, 0.05]} />
        <meshStandardMaterial color="#162035" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* CTA — strongly emissive so Bloom picks it up. */}
      <RoundedBox
        args={[width * 0.18, 0.22, 0.02]}
        radius={0.05}
        smoothness={4}
        position={[
          -width * 0.32,
          screenY - screenHeight * 0.18,
          screenZ + 0.028,
        ]}
      >
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={2.4}
          metalness={0.2}
          roughness={0.35}
          toneMapped={false}
        />
      </RoundedBox>
    </group>
  );
}

"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  width?: number;
  height?: number;
  position?: [number, number, number];
}

export default function BrowserMockup({
  width = 6.4,
  height = 4,
  position = [0, 0, 0],
}: Props) {
  const chromeHeight = 0.45;
  const chromeY = height / 2 - chromeHeight / 2;
  const contentY = -chromeHeight / 2;
  const contentHeight = height - chromeHeight;

  const innerEdges = useMemo(() => {
    const plane = new THREE.PlaneGeometry(width - 0.02, height - 0.02);
    const edges = new THREE.EdgesGeometry(plane);
    plane.dispose();
    return edges;
  }, [width, height]);

  // Hairline grid texture for content area
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
      {/* Outer frame */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[width + 0.18, height + 0.18]} />
        <meshBasicMaterial color="#11151f" transparent opacity={0.9} />
      </mesh>

      {/* Window body */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#0a0e1a" />
      </mesh>

      {/* Chrome bar */}
      <mesh position={[0, chromeY, 0.001]}>
        <planeGeometry args={[width, chromeHeight]} />
        <meshBasicMaterial color="#10141f" />
      </mesh>

      {/* Chrome bottom hairline */}
      <mesh position={[0, chromeY - chromeHeight / 2, 0.002]}>
        <planeGeometry args={[width, 0.005]} />
        <meshBasicMaterial color="#1a2030" />
      </mesh>

      {/* Traffic light dots */}
      {[
        { color: "#ff5f57", x: -width / 2 + 0.18 },
        { color: "#febc2e", x: -width / 2 + 0.34 },
        { color: "#28c840", x: -width / 2 + 0.5 },
      ].map((d, i) => (
        <mesh key={i} position={[d.x, chromeY, 0.003]}>
          <circleGeometry args={[0.06, 24]} />
          <meshBasicMaterial color={d.color} />
        </mesh>
      ))}

      {/* Address bar */}
      <mesh position={[0.5, chromeY, 0.003]}>
        <planeGeometry args={[width * 0.55, chromeHeight * 0.55]} />
        <meshBasicMaterial color="#070b15" />
      </mesh>

      {/* Content area: hairline grid */}
      <mesh position={[0, contentY, 0.001]}>
        <planeGeometry args={[width - 0.04, contentHeight - 0.04]} />
        <meshBasicMaterial map={gridTexture} transparent opacity={0.9} />
      </mesh>

      {/* Hero block placeholder */}
      <mesh position={[0, contentY + contentHeight * 0.25, 0.004]}>
        <planeGeometry args={[width * 0.7, contentHeight * 0.32]} />
        <meshBasicMaterial color="#0d1428" transparent opacity={0.85} />
      </mesh>

      {/* Headline placeholder bars */}
      <mesh position={[-width * 0.2, contentY + contentHeight * 0.05, 0.005]}>
        <planeGeometry args={[width * 0.45, 0.06]} />
        <meshBasicMaterial color="#1c2640" />
      </mesh>
      <mesh position={[-width * 0.25, contentY - contentHeight * 0.05, 0.005]}>
        <planeGeometry args={[width * 0.32, 0.04]} />
        <meshBasicMaterial color="#162035" />
      </mesh>

      {/* CTA button */}
      <mesh position={[-width * 0.3, contentY - contentHeight * 0.18, 0.005]}>
        <planeGeometry args={[width * 0.16, 0.18]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.85} />
      </mesh>

      {/* Inner hairline border */}
      <lineSegments geometry={innerEdges} position={[0, 0, 0.006]}>
        <lineBasicMaterial color="#1c2640" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}

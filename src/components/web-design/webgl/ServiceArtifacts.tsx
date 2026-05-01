"use client";

import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";

/* Shared "floating + slow rotate" wrapper. */
function Floater({
  children,
  spin = 0.15,
  bob = 0.1,
}: {
  children: React.ReactNode;
  spin?: number;
  bob?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      ref.current.rotation.y = Math.sin(t.current * 0.4) * spin;
      ref.current.position.y = Math.sin(t.current * 0.7) * bob;
    }
  });
  return <group ref={ref}>{children}</group>;
}

const RIM = "#00e5ff";
const PANEL = "#0d1428";
const HAIRLINE = "#1c2640";

function EdgeRect({
  width,
  height,
  color,
  opacity,
  position,
}: {
  width: number;
  height: number;
  color: string;
  opacity: number;
  position?: [number, number, number];
}) {
  const geom = useMemo(() => {
    const plane = new THREE.PlaneGeometry(width, height);
    const edges = new THREE.EdgesGeometry(plane);
    plane.dispose();
    return edges;
  }, [width, height]);
  return (
    <lineSegments geometry={geom} position={position}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

export function CustomSiteArtifact({ position }: { position: [number, number, number] }) {
  return (
    <Floater>
      <group position={position} scale={0.85}>
        {/* Card */}
        <mesh>
          <planeGeometry args={[3.4, 4.2]} />
          <meshStandardMaterial color={PANEL} emissive={RIM} emissiveIntensity={0.1} metalness={0.2} roughness={0.6} />
        </mesh>
        {/* Nav bar */}
        <mesh position={[0, 1.85, 0.01]}>
          <planeGeometry args={[3.4, 0.3]} />
          <meshBasicMaterial color="#10182c" />
        </mesh>
        {/* Hero image block */}
        <mesh position={[0, 0.6, 0.02]}>
          <planeGeometry args={[2.8, 1.6]} />
          <meshStandardMaterial color="#152040" emissive={RIM} emissiveIntensity={0.18} />
        </mesh>
        {/* Headline bar */}
        <mesh position={[-0.5, -0.6, 0.02]}>
          <planeGeometry args={[2.0, 0.18]} />
          <meshBasicMaterial color="#22304d" />
        </mesh>
        <mesh position={[-0.7, -0.9, 0.02]}>
          <planeGeometry args={[1.6, 0.12]} />
          <meshBasicMaterial color="#1a2540" />
        </mesh>
        {/* CTA */}
        <mesh position={[-0.95, -1.4, 0.02]}>
          <planeGeometry args={[0.9, 0.28]} />
          <meshStandardMaterial color={RIM} emissive={RIM} emissiveIntensity={0.6} />
        </mesh>
        {/* Edge highlight */}
        <EdgeRect width={3.4} height={4.2} color={RIM} opacity={0.4} position={[0, 0, 0.03]} />
      </group>
    </Floater>
  );
}

export function WebAppArtifact({ position }: { position: [number, number, number] }) {
  return (
    <Floater>
      <group position={position} scale={0.85}>
        {/* Sidebar */}
        <mesh position={[-1.6, 0, 0]}>
          <planeGeometry args={[0.8, 4]} />
          <meshStandardMaterial color="#0a1224" emissive={RIM} emissiveIntensity={0.05} />
        </mesh>
        {/* Main panel */}
        <mesh position={[0.4, 0, 0]}>
          <planeGeometry args={[3.2, 4]} />
          <meshStandardMaterial color={PANEL} emissive={RIM} emissiveIntensity={0.1} />
        </mesh>
        {/* Top bar */}
        <mesh position={[0.4, 1.75, 0.01]}>
          <planeGeometry args={[3.2, 0.32]} />
          <meshBasicMaterial color="#10182c" />
        </mesh>
        {/* Chart panel */}
        <mesh position={[-0.3, 0.4, 0.01]}>
          <planeGeometry args={[1.8, 1.4]} />
          <meshStandardMaterial color="#0e1830" />
        </mesh>
        {/* Chart line */}
        {[
          [-1.0, 0.0],
          [-0.6, 0.4],
          [-0.2, 0.1],
          [0.2, 0.6],
          [0.6, 0.3],
        ].map((p, i, arr) => {
          if (i === 0) return null;
          const prev = arr[i - 1];
          const dx = p[0] - prev[0];
          const dy = p[1] - prev[1];
          const len = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const cx = (p[0] + prev[0]) / 2;
          const cy = (p[1] + prev[1]) / 2;
          return (
            <mesh key={i} position={[cx, cy, 0.02]} rotation={[0, 0, ang]}>
              <planeGeometry args={[len, 0.02]} />
              <meshBasicMaterial color={RIM} />
            </mesh>
          );
        })}
        {/* Right cards */}
        <mesh position={[1.3, 0.6, 0.01]}>
          <planeGeometry args={[1.0, 0.7]} />
          <meshStandardMaterial color="#0e1830" />
        </mesh>
        <mesh position={[1.3, -0.4, 0.01]}>
          <planeGeometry args={[1.0, 0.9]} />
          <meshStandardMaterial color="#0e1830" />
        </mesh>
        <EdgeRect width={3.2} height={4} color={HAIRLINE} opacity={0.7} position={[0.4, 0, 0.03]} />
      </group>
    </Floater>
  );
}

export function EcommerceArtifact({ position }: { position: [number, number, number] }) {
  return (
    <Floater>
      <group position={position} scale={0.85}>
        {/* Product card */}
        <mesh>
          <planeGeometry args={[2.4, 3.2]} />
          <meshStandardMaterial color={PANEL} emissive={RIM} emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[0, 0.6, 0.01]}>
          <planeGeometry args={[2.0, 1.6]} />
          <meshStandardMaterial color="#152040" emissive={RIM} emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[-0.3, -0.5, 0.01]}>
          <planeGeometry args={[1.4, 0.16]} />
          <meshBasicMaterial color="#22304d" />
        </mesh>
        <mesh position={[-0.5, -0.78, 0.01]}>
          <planeGeometry args={[1.0, 0.12]} />
          <meshBasicMaterial color="#1a2540" />
        </mesh>
        {/* Price */}
        <mesh position={[-0.7, -1.1, 0.01]}>
          <planeGeometry args={[0.6, 0.16]} />
          <meshBasicMaterial color={RIM} />
        </mesh>
        {/* Add to cart */}
        <mesh position={[0, -1.45, 0.01]}>
          <planeGeometry args={[2.0, 0.3]} />
          <meshStandardMaterial color={RIM} emissive={RIM} emissiveIntensity={0.6} />
        </mesh>
        {/* Thumbnails behind */}
        {[-1.2, 0, 1.2].map((x, i) => (
          <mesh key={i} position={[x, -1.95, -0.05]}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshStandardMaterial color="#0d1428" emissive={RIM} emissiveIntensity={0.05} />
          </mesh>
        ))}
        <EdgeRect width={2.4} height={3.2} color={RIM} opacity={0.4} position={[0, 0, 0.03]} />
      </group>
    </Floater>
  );
}

export function LandingPageArtifact({ position }: { position: [number, number, number] }) {
  return (
    <Floater>
      <group position={position} scale={0.8}>
        <mesh>
          <planeGeometry args={[2.0, 5.4]} />
          <meshStandardMaterial color={PANEL} emissive={RIM} emissiveIntensity={0.08} />
        </mesh>
        {/* Sections */}
        {[
          { y: 2.0, h: 1.0, c: "#152040" },
          { y: 0.7, h: 0.4, c: "#0e1830" },
          { y: 0.0, h: 0.6, c: "#0e1830" },
          { y: -0.9, h: 0.6, c: "#0e1830" },
          { y: -1.8, h: 0.5, c: "#152040" },
          { y: -2.45, h: 0.3, c: RIM },
        ].map((s, i) => (
          <mesh key={i} position={[0, s.y, 0.01]}>
            <planeGeometry args={[1.7, s.h]} />
            <meshStandardMaterial
              color={s.c}
              emissive={s.c === RIM ? RIM : "#000"}
              emissiveIntensity={s.c === RIM ? 0.7 : 0}
            />
          </mesh>
        ))}
        <EdgeRect width={2.0} height={5.4} color={RIM} opacity={0.35} position={[0, 0, 0.03]} />
      </group>
    </Floater>
  );
}

export function HairlineFloor() {
  // Simple grid floor receding to vanishing point
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(80, 60, "#0e1c33", "#0e1c33");
    (g.material as THREE.LineBasicMaterial).transparent = true;
    (g.material as THREE.LineBasicMaterial).opacity = 0.45;
    return g;
  }, []);
  return <primitive object={grid} position={[0, -3.6, -10]} />;
}

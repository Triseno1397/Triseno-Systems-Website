"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useEffect, useMemo } from "react";
import Operator, { type OperatorState } from "./Operator";

const damp = (c: number, t: number, l: number, dt: number) => THREE.MathUtils.lerp(c, t, 1 - Math.exp(-l * dt));

export type { OperatorState };

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.localClippingEnabled = true;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** The robot shares the page with the portal's own 3D world. At rest he only
 *  breathes and tracks the pointer, so he is rendered on demand at ~32fps and
 *  at full rate while a move is playing. */
function Pacer({ busy, running }: { busy: { current: boolean }; running: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const step = busy.current ? 0 : 1000 / 32;
      if (t - last >= step) {
        last = t;
        invalidate();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [busy, running, invalidate]);
  return null;
}

function Floor() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(0,0,0,0.75)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.499, 0]}>
      <planeGeometry args={[0.9, 0.5]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

function DivisionLight({ hue }: { hue: string | null }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const col = useMemo(() => new THREE.Color("#ffffff"), []);
  const target = useMemo(() => new THREE.Color("#ffffff"), []);
  useFrame((_, dt) => {
    if (!light.current) return;
    target.set(hue ?? "#e8ecff");
    col.lerp(target, Math.min(1, dt * 3));
    light.current.color.copy(col);
    light.current.intensity = damp(light.current.intensity, hue ? 4.2 : 3, 3, Math.min(dt, 0.1));
  });
  return <directionalLight ref={light} position={[-2, 1.5, -2]} intensity={3} color="#e8ecff" />;
}

export default function RobotScene({
  state,
  running,
  hue,
  onHue,
  onReady,
}: {
  state: OperatorState;
  running: boolean;
  hue?: string | null;
  onHue?: (hex: string) => void;
  onReady?: () => void;
}) {
  const small = typeof window !== "undefined" && window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const busy = useRef(false);
  return (
    <Canvas
      frameloop="demand"
      dpr={small ? 1 : [1, 1.5]}
      gl={{ antialias: !small, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 26, near: 0.05, far: 20, position: [0, 0.06, 2.85] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.localClippingEnabled = true;
        onReady?.();
      }}
    >
      <Pacer busy={busy} running={running} />
      <Environment />
      {/* white key from above-front, cold rims from behind: the chrome reads */}
      <directionalLight position={[1.5, 2.5, 2]} intensity={2.2} />
      {/* the rim takes the hovered division's hue: he belongs to the portal */}
      <DivisionLight hue={hue ?? null} />
      <directionalLight position={[2, 0.5, -2]} intensity={2} color="#ffffff" />
      <Operator state={state} onHue={onHue} busy={busy} />
      <Floor />
    </Canvas>
  );
}

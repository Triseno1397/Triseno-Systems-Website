"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";
import { TierContext, env, type Tier } from "./scene/env";
import { GlassLoop, N, useLoopSet, useNear, updateLoopSet } from "./scene/loop";
import {
  Dust,
  FrameDriver,
  Governor,
  Haze,
  Horizon,
  KeyLight,
  Monoliths,
  Post,
  ReadySignal,
  WetFloor,
  WorldEnvironment,
  initialQuality,
  qualityDpr,
  type Quality,
} from "./scene/pieces";
import { disposeFloorMaps, makeFloorMaps, makeGlowTexture, makeHazeTexture } from "./scene/textures";
import { worldState } from "./scene/worldState";
import { PlateBackdrop } from "./scene/plate";
import { plate, type PlateWorld } from "./plates";

/* ─────────────────────────────────────────────────────────────────────────
   One continuous lit world behind a whole division page.

   It is the same place the portal is built from — wet reflective ground, a
   horizon glow, layered haze, a corridor of silhouetted monoliths, floating
   dust — lit in exactly one hue (design-system D2) and marked out by four
   copies of the division's glyph standing down the corridor at the scale of
   architecture.

   The camera never cuts. One monotonic dolly runs from the top of the page to
   the bottom, so any two consecutive scroll positions are two frames of the
   same camera move rather than two stacked blocks.
   ───────────────────────────────────────────────────────────────────────── */

/** where the glyph markers stand, and which side of the frame each one takes */
const MARKERS = [
  { z: -6, x: 5.2, scale: 2.6 },
  { z: -26, x: -6.4, scale: 3.4 },
  { z: -46, x: 5.8, scale: 3.0 },
  { z: -66, x: -4.6, scale: 3.8 },
];

const CAM_START_Z = 13;
const CAM_END_Z = -72;
const CAM_Y = 2.55;
const PLATE_CAM_Y = 1.4;

export interface DivisionWorldSceneProps {
  hue: string;
  glyph: GlyphKind;
  /** changes the monolith layout so two divisions are not the same place */
  seed: number;
  /**
   * Stand the world in a generated plate: the plate becomes the deep
   * background (sky, far forms, floor are not duplicated in 3D), the camera
   * looks level with its horizon lens-shifted onto the plate's, and only the
   * glyph markers, dust, haze and light remain as real-time foreground.
   */
  plate?: PlateWorld;
  /** how strongly the division hue grades the plate (0 for a plate painted in its hue) */
  grade?: number;
  onReady: () => void;
  /** this machine cannot draw the world smoothly: the page goes 2D */
  onTooSlow?: () => void;
}

/* ── the world is lit in one hue, start to finish ──────────────────────── */

function EnvDirector({ hue }: { hue: string }) {
  const { scene } = useThree();
  const target = useMemo(() => new THREE.Color(hue), [hue]);
  const fogColor = useMemo(() => new THREE.Color(), []);
  const level = useRef(0);

  useFrame((_, dt) => {
    // rises once on arrival, then holds — a division page never changes hue
    level.current = Math.min(1, level.current + Math.min(dt, 1) / 0.9);
    const e = level.current * level.current * (3 - 2 * level.current);
    env.light.copy(target).multiplyScalar(0.35 + 0.65 * e);
    env.level = e;
    env.white = hue.toLowerCase() === "#ffffff" ? 1 : 0;
    fogColor.copy(env.light).multiplyScalar(0.085).addScalar(0.012);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogColor);
  });
  return null;
}

/* ── a glyph standing in the world, at the scale of architecture ───────── */

function GlyphMarker({
  glyph,
  hue,
  index,
}: {
  glyph: GlyphKind;
  hue: string;
  index: number;
}) {
  const marker = MARKERS[index];
  const group = useRef<THREE.Group>(null);
  const loops = useLoopSet();
  const near = useNear((z) => z - marker.z < 9 && z - marker.z > -2, false);
  const coreMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(hue), toneMapped: false }),
    [hue],
  );
  const points = useMemo(() => glyphPoints(glyph, N), [glyph]);

  // the loop sits on the ground: lift it by its own lowest point
  const y = useMemo(() => {
    let minY = Infinity;
    for (let i = 0; i < N; i++) minY = Math.min(minY, points[i * 2 + 1]);
    return -minY * marker.scale + 0.12;
  }, [points, marker.scale]);

  useEffect(() => {
    updateLoopSet(loops, points);
    return () => coreMat.dispose();
  }, [loops, points, coreMat]);

  useFrame((state) => {
    const camZ = state.camera.position.z;
    const d = camZ - marker.z;
    const t = worldState.still ? 0 : state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = index * 0.8 + t * 0.045 + worldState.px * 0.06;
      group.current.position.y = y + Math.sin(t * 0.55 + index) * 0.05;
    }
    // whichever marker is next ahead is what the world focuses and lights on
    const prev = index === 0 ? Infinity : camZ - MARKERS[index - 1].z;
    if (d > 1 && prev <= 1) env.focus.set(marker.x, y, marker.z);
  });

  return (
    <group ref={group} position={[marker.x, y, marker.z]} scale={marker.scale}>
      <GlassLoop set={loops} coreMat={coreMat} near={near} />
    </group>
  );
}

/* ── camera: one continuous dolly down the corridor ────────────────────── */

function CameraRig({ horizon }: { horizon?: number }) {
  const { camera, size } = useThree();
  const lens = useRef("");
  const pos = useMemo(() => new THREE.Vector3(0, CAM_Y, CAM_START_Z), []);
  const look = useMemo(() => new THREE.Vector3(0, 2.1, 0), []);
  const cur = useRef(new THREE.Vector3(0, 2.1, 0));
  const first = useRef(true);

  useFrame((state, dt) => {
    const p = worldState.progress;
    const t = worldState.still ? 0 : state.clock.elapsedTime;
    const z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * p;
    // a slow lateral weave so the corridor is read from changing angles and the
    // markers pass to alternating sides of the copy column
    const drift = Math.sin(p * Math.PI * 1.7) * 1.9;
    pos.set(
      drift + worldState.px * 0.3 + Math.sin(t * 0.13) * 0.12,
      CAM_Y - 0.55 * p + Math.sin(t * 0.21) * 0.05 + worldState.py * 0.1,
      z,
    );
    if (horizon === undefined) look.set(drift * 0.25, 2.0 - 0.35 * p, z - 12);
    else {
      // level gaze over the plate: sideways moves only, so the vanishing point
      // stays where the plate paints it
      pos.setY(PLATE_CAM_Y + Math.sin(t * 0.21) * 0.05 + worldState.py * 0.1);
      look.set(pos.x, pos.y, z - 12);
    }

    const k = first.current ? 1 : 1 - Math.exp(-Math.min(dt, 1) * 5);
    first.current = false;
    camera.position.lerp(pos, k);
    cur.current.lerp(look, k);
    camera.lookAt(cur.current);

    if (horizon !== undefined) {
      const key = `${size.width}x${size.height}`;
      if (lens.current !== key) {
        lens.current = key;
        (camera as THREE.PerspectiveCamera).setViewOffset(
          size.width,
          size.height,
          0,
          -Math.round((horizon - 0.5) * size.height),
          size.width,
          size.height,
        );
      }
    }
  });
  return null;
}

export default function DivisionWorldScene({
  hue,
  glyph,
  seed,
  onReady,
  plate: plateWorld,
  grade = 0,
  onTooSlow,
}: DivisionWorldSceneProps) {
  const horizon = plateWorld ? plate(plateWorld).horizon.desktop : undefined;
  const glow = useMemo(() => makeGlowTexture(), []);
  const haze = useMemo(() => makeHazeTexture(), []);
  const floor = useMemo(() => makeFloorMaps(), []);
  // starts where this machine is smooth, steps down from there (Governor)
  const [quality, setQuality] = useState<Quality>(() => initialQuality());
  const tier: Tier = quality.tier;
  const dpr = qualityDpr(quality);
  const [armed, setArmed] = useState(false);
  // the environment map is in place: the shaders may be linked against it
  const [envReady, setEnvReady] = useState(false);

  useEffect(
    () => () => {
      glow.dispose();
      haze.dispose();
      disposeFloorMaps(floor);
    },
    [glow, haze, floor],
  );

  return (
    <Canvas
      flat // no tone mapping: the division hue must reach the screen as that hue
      // drawn from the page's own frame loop (FrameDriver), never on its own clock
      frameloop="never"
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: false }}
      camera={{ fov: 38, near: 0.1, far: 260, position: [0, CAM_Y, CAM_START_Z] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#000000", 1);
        scene.fog = new THREE.Fog("#0a0a0a", 8, 72);
      }}
    >
      <Governor quality={quality} setQuality={setQuality} armed={armed} onGiveUp={onTooSlow} />
      <TierContext.Provider value={tier}>
        <FrameDriver />
        <WorldEnvironment onReady={() => setEnvReady(true)} />
        <EnvDirector hue={hue} />
        <CameraRig horizon={horizon} />
        <KeyLight />
        {plateWorld ? (
          <PlateBackdrop world={plateWorld} grade={grade} pointer={() => [worldState.px, worldState.py]} />
        ) : (
          <>
            <Horizon />
            <Monoliths seed={seed} corridor={132} start={10} />
          </>
        )}
        <Haze texture={haze} />
        {MARKERS.map((_, i) => (
          <GlyphMarker key={i} index={i} glyph={glyph} hue={hue} />
        ))}
        <Dust sprite={glow} depth={120} />
        {plateWorld ? null : <WetFloor maps={floor} z={-52} />}
        <Post focusY={2.1} dof={!plateWorld} />
        <ReadySignal
          envReady={envReady}
          onReady={() => {
            onReady?.();
            // judge frames only once the compile and the arrival are behind us
            window.setTimeout(() => setArmed(true), 1500);
          }}
        />
      </TierContext.Provider>
    </Canvas>
  );
}

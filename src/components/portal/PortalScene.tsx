"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";
import {
  DBG,
  HueDip,
  TierContext,
  WHITE,
  ease,
  env,
  smooth,
  type Tier,
} from "@/components/world/scene/env";
import {
  GlassLoop,
  N,
  useLoopSet,
  useNear,
  updateLoopSet,
} from "@/components/world/scene/loop";
import {
  Dust,
  Haze,
  KeyLight,
  Post,
  ReadySignal,
  WorldEnvironment,
} from "@/components/world/scene/pieces";
import { makeGlowTexture, makeHazeTexture } from "@/components/world/scene/textures";
import { WARP_EVENT } from "@/components/world/WarpProvider";
import { plate } from "@/components/world/plates";
import { PlateBackdrop } from "@/components/world/scene/plate";
import { DOOR_ITEMS, DOOR_Z, MENU_ITEMS, dollyZ, doorLit, framing, portalState } from "./portalState";

/* ─────────────────────────────────────────────────────────────────────────
   The portal world — a place, not a void. One fixed canvas behind the page.
   The ground, haze, horizon, monoliths, dust, key light and post stack are the
   shared world pieces in `components/world/scene/`; what is portal-specific is
   here: the signature object that carries the hovered division's glyph, the
   three doors the camera flies through, the gate, and the camera rig that a
   scroll drives.
   At rest everything is white light and neutral grey haze. A hovered division
   (or the door ahead) floods the environment with its hue.
   ───────────────────────────────────────────────────────────────────────── */

const RING_Y = 1.95;
const RING_SCALE = 1.42;
// Camera heights are set against the plate: at rest the object floats in the
// light shaft centred on screen, and every door stands on the plate's floor.
const CAM_Y = 0.95;
const DOOR_CAM_Y = 1.55;
const REST_YAW = -0.42; // the object rests turned toward the type column so its depth reads
const GATE_POS = new THREE.Vector3(0, 2.45, -64);
const GATE_SCALE = 2.1;

/* ── environment director: decides what colour the world is lit in ─────── */

function EnvDirector() {
  const dip = useMemo(() => new HueDip(), []);
  const { scene } = useThree();
  const fogColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const step = Math.min(dt, 1); // wall-clock time, even at a frame a second
    const { hero, doors, gate, hot, active, warpAt } = portalState;
    const camZ = state.camera.position.z;

    let target = WHITE;
    if (doors <= 0) {
      if ((hot && hero < 0.5) || warpAt) target = MENU_ITEMS[active].hue;
    } else if (gate < 0.42) {
      for (let i = 0; i < DOOR_Z.length; i++) if (doorLit(i, camZ) > 0.02) target = DOOR_ITEMS[i].hue;
    }
    env.light.copy(dip.update(step, target));
    env.level = dip.level;
    // white light is lit harder, never greyer (see env.white)
    env.white += ((dip.hex === WHITE ? 1 : 0) - env.white) * (1 - Math.exp(-step * 5));

    // Haze never goes black: at the bottom of a dip it is dim neutral grey.
    // Under white light the fog is deeper so the blacks stay black.
    fogColor.copy(env.light).multiplyScalar(0.085 * (1 - 0.45 * env.white)).addScalar(0.012);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogColor);
  });
  return null;
}

/* ── the signature object ──────────────────────────────────────────────── */

function SignatureObject({ glow }: { glow: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const loops = useLoopSet();
  const dip = useMemo(() => new HueDip(), []);
  const near = useNear((z) => z > -4, true);

  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glow,
        color: WHITE,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [glow],
  );

  const morph = useRef({
    from: new Float32Array(glyphPoints(MENU_ITEMS[0].glyph, N)),
    to: glyphPoints(MENU_ITEMS[0].glyph, N),
    cur: new Float32Array(glyphPoints(MENU_ITEMS[0].glyph, N)),
    t: 1,
    index: 0,
    spin: 0,
    spinFrom: 0,
    spinTo: 0,
  });

  useEffect(() => {
    updateLoopSet(loops, morph.current.cur);
    return () => {
      coreMat.dispose();
      haloMat.dispose();
    };
  }, [loops, coreMat, haloMat]);

  useFrame((state, dt) => {
    const m = morph.current;
    const step = Math.min(dt, 1); // wall-clock time, even at a frame a second

    if (portalState.active !== m.index) {
      m.index = portalState.active;
      m.from.set(m.cur);
      m.to = glyphPoints(MENU_ITEMS[m.index].glyph as GlyphKind, N);
      m.t = 0;
      m.spinFrom = m.spin;
      m.spinTo = m.spinTo + Math.PI; // half-turn per swap; the loop is symmetric front/back
    }
    if (m.t < 1) {
      m.t = Math.min(1, m.t + step / 0.95);
      const e = 1 - Math.pow(1 - m.t, 4);
      for (let i = 0; i < N * 2; i++) m.cur[i] = m.from[i] + (m.to[i] - m.from[i]) * e;
      m.spin = m.spinFrom + (m.spinTo - m.spinFrom) * e;
      updateLoopSet(loops, m.cur);
    }

    const lit = (portalState.hot && portalState.hero < 0.5) || portalState.warpAt > 0;
    coreMat.color.copy(dip.update(step, lit ? MENU_ITEMS[m.index].hue : WHITE));
    haloMat.color.copy(coreMat.color);

    const t = state.clock.elapsedTime;
    const still = portalState.capture ? 0 : 1;
    // the resting yaw unwinds so the camera flies through a square-on gate
    const away = 1 - Math.min(1, Math.max(0, portalState.hero / 0.6));
    const warp = portalState.warpAt ? smooth(0, 700, performance.now() - portalState.warpAt) : 0;
    if (group.current) {
      group.current.position.y = RING_Y + Math.sin(t * 0.9) * 0.05 * still;
      group.current.rotation.y =
        m.spin + (REST_YAW * away + Math.sin(t * 0.35) * 0.2 * still + portalState.px * 0.18) * (1 - warp);
      group.current.rotation.x = (Math.sin(t * 0.27) * 0.05 * still - portalState.py * 0.08) * (1 - warp);
    }
    // the glow is a billboard — it has to be gone before the camera reaches it
    haloMat.opacity = 0.08 * (1 - Math.min(1, Math.max(0, portalState.hero / 0.45))) * (1 - warp);
    halo.current?.lookAt(state.camera.position);

    if (portalState.doors <= 0) env.focus.set(0, RING_Y, 0);
  });

  return (
    <>
      <group ref={group} position={[0, RING_Y, 0]} scale={RING_SCALE}>
        <GlassLoop set={loops} coreMat={coreMat} near={near} />
      </group>
      <mesh ref={halo} position={[0, RING_Y, -0.8]} material={haloMat} renderOrder={20}>
        <planeGeometry args={[7, 7]} />
      </mesh>
    </>
  );
}

/* ── doors ─────────────────────────────────────────────────────────────── */

const DOOR_SCALE = 2.05;

function Door({ index, onEnter }: { index: number; onEnter: (route: string) => void }) {
  const division = DOOR_ITEMS[index];
  const loops = useLoopSet();
  // Only one door at a time runs real refraction: the window is tight enough
  // that the next door has not opened it before this one has closed.
  const near = useNear((z) => z - DOOR_Z[index] < 9 && z - DOOR_Z[index] > -1.5, false);
  const hue = useMemo(() => new THREE.Color(division.hue), [division.hue]);
  const white = useMemo(() => new THREE.Color(WHITE), []);

  const { points, y, shape } = useMemo(() => {
    const pts = glyphPoints(division.glyph, N);
    let minY = Infinity;
    for (let i = 0; i < N; i++) minY = Math.min(minY, pts[i * 2 + 1]);
    const s = new THREE.Shape();
    for (let i = 0; i < N; i++) {
      if (i === 0) s.moveTo(pts[0], pts[1]);
      else s.lineTo(pts[i * 2], pts[i * 2 + 1]);
    }
    s.closePath();
    return { points: pts, y: -minY * DOOR_SCALE + 0.22, shape: s };
  }, [division.glyph]);

  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }), []);
  // The door's surface: a veil of light in the division hue, brightest at the sill.
  const veilMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color(WHITE) }, uLit: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uLit;
          uniform float uTime;
          varying vec2 vP;
          void main() {
            float h = clamp((vP.y + 1.2) / 2.4, 0.0, 1.0);
            float sill = pow(1.0 - h, 2.2);
            float bands = 0.5 + 0.5 * sin(vP.y * 9.0 - uTime * 0.8 + sin(vP.x * 3.0 + uTime * 0.3));
            float a = (0.05 + 0.34 * sill + 0.05 * bands) * uLit;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [],
  );

  useEffect(() => {
    updateLoopSet(loops, points);
    return () => {
      coreMat.dispose();
      veilMat.dispose();
    };
  }, [loops, points, coreMat, veilMat]);

  const outer = useRef<THREE.Group>(null);

  useFrame((state) => {
    const camZ = state.camera.position.z;
    const lit = doorLit(index, camZ);
    const d = camZ - DOOR_Z[index];
    // One focal glyph at a time: a door only exists while it is the door
    // ahead (it rises into place as the camera approaches) — never as a small
    // stack of glyphs visible down the corridor behind the signature object
    // or behind the door in front of it.
    const appear = portalState.doors > 0 && d > -1.5 ? smooth(15, 11.5, d) : 0;
    if (outer.current) {
      outer.current.visible = appear > 0.01;
      outer.current.scale.setScalar(0.82 + 0.18 * appear);
    }
    // white -> dark -> hue: the door ignites, it never shows a pale tint of its hue
    if (lit < 0.5) coreMat.color.copy(white).multiplyScalar(1 - lit * 2);
    else coreMat.color.copy(hue).multiplyScalar(lit * 2 - 1);
    veilMat.uniforms.uColor.value.copy(coreMat.color);
    // the veil thins out as the camera passes through it
    veilMat.uniforms.uLit.value = (0.55 + (portalState.hoverDoor === index ? 0.35 : 0)) * smooth(0.2, 3.5, d);
    veilMat.uniforms.uTime.value = state.clock.elapsedTime;

    // this door is the world's focal object while it is the next one ahead
    const prev = index === 0 ? Infinity : camZ - DOOR_Z[index - 1];
    if (portalState.doors > 0 && d > 0.4 && prev <= 0.4 && portalState.gate < 0.3) {
      env.focus.set(0, y, DOOR_Z[index]);
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    portalState.hoverDoor = index;
    document.documentElement.setAttribute("data-cursor-hot", "");
  };
  const out = () => {
    if (portalState.hoverDoor === index) portalState.hoverDoor = -1;
    document.documentElement.removeAttribute("data-cursor-hot");
  };

  return (
    <group ref={outer} position={[0, y, DOOR_Z[index]]}>
      <group scale={DOOR_SCALE}>
        <GlassLoop set={loops} coreMat={coreMat} near={near} />
        <mesh
          material={veilMat}
          onPointerOver={over}
          onPointerOut={out}
          onClick={(e) => {
            e.stopPropagation();
            out();
            onEnter(division.route);
          }}
        >
          <shapeGeometry args={[shape]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── the gate object: last door's glyph morphs into Contact's hexagon, cyan -> white ── */

function GateObject() {
  const group = useRef<THREE.Group>(null);
  const loops = useLoopSet();
  const near = useNear((z) => z < DOOR_Z[2] + 1, false);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }), []);
  const from = useMemo(() => glyphPoints("triangle", N), []);
  const to = useMemo(() => glyphPoints("hexagon", N), []);
  const cur = useMemo(() => new Float32Array(N * 2), []);
  const last = useRef(-1);
  const hue = useMemo(() => new THREE.Color(DOOR_ITEMS[2].hue), []);
  const white = useMemo(() => new THREE.Color(WHITE), []);

  useEffect(() => () => coreMat.dispose(), [coreMat]);

  useFrame((state) => {
    const g = portalState.gate;
    // the morph is quick and decisive: the gate reads as a clean triangle or a
    // clean hexagon, never as a long in-between lump
    const e = smooth(0.3, 0.55, g);
    if (Math.abs(e - last.current) > 0.002) {
      last.current = e;
      for (let i = 0; i < N * 2; i++) cur[i] = from[i] + (to[i] - from[i]) * e;
      updateLoopSet(loops, cur);
    }
    // cyan -> dark -> white, in step with the environment
    const c = smooth(0.2, 0.7, g);
    if (c < 0.5) coreMat.color.copy(hue).multiplyScalar(1 - c * 2);
    else coreMat.color.copy(white).multiplyScalar(c * 2 - 1);

    const t = state.clock.elapsedTime;
    if (group.current) {
      // the gate only exists once the last door is passed (one focal glyph)
      group.current.visible = portalState.doors > 0 && (state.camera.position.z < DOOR_Z[2] + 1 || g > 0);
      group.current.rotation.y = -0.35 + e * Math.PI + Math.sin(t * 0.3) * 0.12;
      group.current.position.y = GATE_POS.y + Math.sin(t * 0.8) * 0.06;
    }
    if (state.camera.position.z < DOOR_Z[2] + 0.4 || g >= 0.3) env.focus.copy(GATE_POS);
  });

  return (
    <group ref={group} position={GATE_POS} scale={GATE_SCALE}>
      <GlassLoop set={loops} coreMat={coreMat} near={near} />
    </group>
  );
}

/* ── camera rig: scroll moves the camera, not a document ───────────────── */

/**
 * The camera always looks level, down the corridor, and its lens is shifted
 * so the 3D horizon sits exactly on the plate's horizon (world-plates.md): the
 * painted gallery and the real-time foreground share one vanishing point, so
 * the glass object and the doors stand on the plate's wet floor.
 * Framing (pushing the focal object off-centre so copy never sits on it) is a
 * sideways camera move, never a lens shift — a level camera moved sideways
 * keeps the vanishing point where the plate has it.
 */
const PLATE_HORIZON = plate("portal").horizon.desktop;

function CameraRig() {
  const { camera, size } = useThree();
  const pos = useMemo(() => new THREE.Vector3(0, CAM_Y, 7.6), []);
  const look = useMemo(() => new THREE.Vector3(0, CAM_Y, 0), []);
  const curLook = useRef(new THREE.Vector3(0, CAM_Y, 0));
  const lens = useRef("");
  const curFrame = useRef(1);
  const first = useRef(true);
  const probe = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const { hero, doors, gate, px, py, warpAt, capture } = portalState;
    const h = ease(Math.min(1, hero));
    let z = 7.6 - 9.6 * h;
    const k = first.current ? 1 : 1 - Math.exp(-Math.min(dt, 1) * 6);

    // Framing, as a sideways camera offset in world units.
    const wide = capture ? 0 : size.width >= 1024 ? 1 : size.width >= 768 ? 0.8 : 0;
    let f = framing(hero, doors, gate, z);
    if (warpAt) f *= 1 - smooth(0, 650, performance.now() - warpAt);
    curFrame.current += (f - curFrame.current) * k;
    // doors stand further off than the hero object and are larger, so they
    // are pushed further aside to keep their copy card clear of them
    const frameX = -(doors > 0 ? 2.9 : 1.6) * wide * curFrame.current;

    if (hero < 1 || doors <= 0) {
      // Hero: dolly straight through the signature object. A warp out of the
      // portal pushes the camera at the object while the tunnel closes in.
      const w = warpAt ? smooth(0, 1900, performance.now() - warpAt) : 0;
      z -= w * 5.2;
      const kk = 1 - h;
      pos.set(frameX + px * 0.35 * kk * (1 - w), CAM_Y + (RING_Y - CAM_Y) * Math.max(h, w) + py * 0.12 * kk * (1 - w), z);
    }
    if (doors > 0) {
      z = dollyZ(doors) - gate * 4.5;
      pos.set(frameX + px * 0.2, DOOR_CAM_Y + py * 0.08 + gate * 0.35, z);
    }
    // level gaze, straight down the corridor
    look.set(pos.x, pos.y, pos.z - 9);

    // even at a few frames per second the camera must arrive on wall-clock time
    first.current = false;
    camera.position.lerp(pos, k);
    curLook.current.lerp(look, k);
    camera.lookAt(curLook.current);

    // lens shift: horizon on the plate's horizon
    const key = `${size.width}x${size.height}`;
    if (lens.current !== key) {
      lens.current = key;
      const cam = camera as THREE.PerspectiveCamera;
      cam.setViewOffset(size.width, size.height, 0, -Math.round((PLATE_HORIZON - 0.5) * size.height), size.width, size.height);
    }

    // where the floor under the gate object lands on screen — the beams fall to it
    probe.set(GATE_POS.x, 0, GATE_POS.z).project(camera);
    portalState.gateFloorY = Math.min(0.94, Math.max(0.55, (1 - probe.y) / 2));
  });

  return null;
}

/* ── scene ─────────────────────────────────────────────────────────────── */

interface PortalSceneProps {
  onReady: () => void;
  onEnter: (route: string) => void;
}

export default function PortalScene({ onReady, onEnter }: PortalSceneProps) {
  const glow = useMemo(() => makeGlowTexture(), []);
  const haze = useMemo(() => makeHazeTexture(), []);
  // never render above the device's own pixel ratio; cap at 1.5 and fall to 1 if frames drop
  const [maxDpr, setMaxDpr] = useState(1.5);
  // "H" pins the high tier so headless/software-GPU captures show what a real
  // GPU renders; without it PerformanceMonitor degrades to "low" within a second.
  const pinHigh = DBG.includes("H");
  const [tier, setTier] = useState<Tier>(DBG.includes("l") ? "low" : "high");
  const dpr = DBG.includes("r")
    ? 0.5
    : Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, maxDpr);
  useEffect(
    () => () => {
      glow.dispose();
      haze.dispose();
    },
    [glow, haze],
  );

  // Once the warp tunnel fully covers the screen the portal is invisible, so
  // it stops rendering: every frame of GPU goes to the tunnel and to the
  // destination world booting underneath it, and the travel plays at its full
  // length instead of stuttering through a heavy scene nobody can see.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let t = 0;
    const onWarp = () => {
      window.clearTimeout(t);
      // the tunnel cover is ~full within 360ms; every frame after that goes to
      // the tunnel and the destination
      t = window.setTimeout(() => setPaused(true), 380);
    };
    window.addEventListener(WARP_EVENT, onWarp);
    return () => {
      window.removeEventListener(WARP_EVENT, onWarp);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <Canvas
      flat // no tone mapping: a division hue must reach the screen as that hue
      frameloop={paused ? "never" : "always"}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: false }}
      camera={{ fov: 36, near: 0.1, far: 260, position: [0, CAM_Y, 7.6] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#000000", 1);
        // light fog: far doors recede into the plate's haze, never into murk
        scene.fog = new THREE.Fog("#0a0a0a", 16, 120);
      }}
    >
      {pinHigh ? null : (
        <PerformanceMonitor
          ms={200}
          iterations={6}
          threshold={0.8}
          // smoothness first: below ~45fps step down — resolution first (the
          // look is unchanged, only sharpness), then the heavy effects
          bounds={() => [45, 58]}
          flipflops={2}
          onDecline={() => {
            if (maxDpr > 1) setMaxDpr(1);
            else setTier("low");
          }}
          onFallback={() => setTier("low")}
        />
      )}
      <TierContext.Provider value={tier}>
        <WorldEnvironment />

        <EnvDirector />
        <CameraRig />
        <KeyLight />
        {/* the painted gallery is the deep background; the monoliths, sky and
            floor it paints are not duplicated in 3D */}
        <PlateBackdrop world="portal" pointer={() => [portalState.px, portalState.py]} />
        {DBG.includes("h") ? null : <Haze texture={haze} />}
        <SignatureObject glow={glow} />
        {DOOR_ITEMS.map((_, i) => (
          <Door key={i} index={i} onEnter={onEnter} />
        ))}
        <GateObject />
        {DBG.includes("d") ? null : <Dust sprite={glow} />}
        {DBG.includes("p") ? null : <Post focusY={RING_Y} dof={false} />}
        <ReadySignal onReady={onReady} />
      </TierContext.Provider>
    </Canvas>
  );
}

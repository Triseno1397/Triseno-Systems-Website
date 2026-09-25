"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
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
  FrameDriver,
  Governor,
  Haze,
  KeyLight,
  Post,
  ReadySignal,
  WorldEnvironment,
  boot,
  initialQuality,
  qualityDpr,
  type Quality,
} from "@/components/world/scene/pieces";
import { makeGlowTexture, makeHazeTexture } from "@/components/world/scene/textures";
import { WARP_EVENT } from "@/components/world/WarpProvider";
import Operator, { INSPECT, type Limbs, type OperatorState } from "./Operator";
import { STATUE_SCALE, TUBE_D, groundY, makePose, resolvePose, statue, type Pose, type PoseKey } from "./statue";
import Mechanisms from "./Mechanisms";
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
const RING_SCALE = STATUE_SCALE;
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

/* ── the signature object: a statue standing on the hall's floor ─────────
   It rests on its lowest rail and holds still — no float, no sway, no turn
   toward the pointer — because the Operator sits in it, leans on it and
   stands on it (statue.ts). A morph re-seats it: every glyph's bottom rail
   lands on the floor. ─────────────────────────────────────────────────── */

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
    /** the glyph asked for, and how long it has waited: the statue holds its
     *  shape until he has pushed off it */
    want: 0,
    y: groundY(glyphPoints(MENU_ITEMS[0].glyph, N)),
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

    if (portalState.active !== m.want) m.want = portalState.active;
    // a hovered word changes it at once; the resting rotation waits (PortalPage)
    // while he leans on it or hangs from it
    if (m.want !== m.index) {
      m.index = m.want;
      m.from.set(m.cur);
      m.to = glyphPoints(MENU_ITEMS[m.index].glyph as GlyphKind, N);
      m.t = 0;
    }
    if (m.t < 1) {
      m.t = Math.min(1, m.t + step / 0.8);
      const e = 1 - Math.pow(1 - m.t, 3);
      for (let i = 0; i < N * 2; i++) m.cur[i] = m.from[i] + (m.to[i] - m.from[i]) * e;
      m.y = groundY(m.cur);
      updateLoopSet(loops, m.cur);
    }

    const lit = (portalState.hot && portalState.hero < 0.5) || portalState.warpAt > 0;
    coreMat.color.copy(dip.update(step, lit ? MENU_ITEMS[m.index].hue : WHITE));
    haloMat.color.copy(coreMat.color);

    // the resting yaw unwinds so the camera flies through a square-on gate
    const away = 1 - Math.min(1, Math.max(0, portalState.hero / 0.6));
    const warp = portalState.warpAt ? smooth(0, 700, performance.now() - portalState.warpAt) : 0;
    statue.y = m.y;
    statue.yaw = REST_YAW * away * (1 - warp);
    statue.points = m.cur;
    statue.morphing = m.t < 1;
    if (group.current) {
      group.current.position.y = m.y;
      group.current.rotation.y = statue.yaw;
    }
    if (halo.current) halo.current.position.y = m.y;
    // the glow is a billboard — it has to be gone before the camera reaches it
    haloMat.opacity = 0.08 * (1 - Math.min(1, Math.max(0, portalState.hero / 0.45))) * (1 - warp);
    halo.current?.lookAt(state.camera.position);

    if (portalState.doors <= 0) env.focus.set(0, m.y, 0);
  });

  return (
    <>
      <group ref={group} position={[0, RING_Y, 0]} scale={RING_SCALE}>
        <GlassLoop set={loops} coreMat={coreMat} near={near} />
        {/* what each division is, machined inside its own shape */}
        <Mechanisms hues={MENU_ITEMS.slice(0, 3).map((m) => m.hue)} />
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
const PHONE_FOV = 50;
const PHONE_LIFT = 0.12;
const PLATE_HORIZON = plate("portal").horizon.desktop;

/* The Operator stands in the portal's own hall, inside this scene: one WebGL
   context, the world's own light and reflections on his chrome. He is only up
   while the hero is (the camera leaves him behind on the way to the doors).

   He keeps himself busy on the statue (statue.ts), one thing for about a
   minute, picked at random: leaning back on its rail with his arms folded,
   sitting inside it, looking his blade over in front of it, doing sets of
   pull-ups off its top. Between two of them nothing jumps: he eases out of
   the one, stands, walks over on his own two feet, and settles into the next.
   Tapped, he hops down to the floor in front of the statue to perform.

   Everything he does runs on its own clock, not on the scroll: a page left
   half-scrolled can never leave him frozen half-way through a move. */

/** the things he does, and for how long (seconds, picked in the range) */
const ACTS = ["lean", "sit", "blade", "pull"] as const;
type Act = (typeof ACTS)[number];
const ACT_TIME: [number, number] = [55, 70];
/** easing out of a pose to stand, and into the next from standing, seconds */
const EASE_OUT = 1.6;
const EASE_IN = 1.9;
/** walking: pace (world units a second) and one step's length */
const WALK_SPEED = 0.62;
const STEP = 0.4;
/** a pull-up rep: up, hold at the top, down, hang; sets with a rest between */
const REP = { up: 0.7, top: 0.25, down: 0.85, hang: 0.3 };
const REP_T = REP.up + REP.top + REP.down + REP.hang;
const SET = { reps: 5, rest: 4.5 };
/** the blade: first look soon after he arrives, then again every so often */
const BLADE_FIRST = 2.5;
const BLADE_EVERY = 19;
/** the tap: a quick hop down to the floor in front of the statue */
const HOP_PUSH = 0.2;
const HOP_AIR = 0.62;
const HOP_LAND = 0.24;

/* Leaving, as the page scrolls: an Iron Man take-off. He comes up off
   whatever he is on, plants his feet, lifts his eyes; the jets under his boots
   light, he rises off the floor slowly with his arms straight down at his
   sides, then the thrust opens up and he is gone out of the top of the frame,
   a shockwave rolling out across the wet floor. Scroll back to the top and he
   comes down the same way and lands. Time-driven once it is triggered. */
const LAUNCH_AT = 0.04; // hero progress that sends him
const RETURN_AT = 0.015; // and brings him back
const LIFT = { release: 0.55, ignite: 0.55, hover: 0.7, gone: 1.7 };
const LAND_T = 2.2;
const SETTLE_T = 0.5;

const mix = THREE.MathUtils.lerp;
const turnTo = (a: number, b: number, k: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

type Mode = "on" | "off" | "walk" | "in" | "hop" | "stage";
type Flight = "here" | "launch" | "gone" | "land";

function OperatorInWorld({ state }: { state: OperatorState }) {
  const group = useRef<THREE.Group>(null);
  const wave = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  // a phone held upright: there is no room beside the statue to lean there
  const tall = size.width < 768 && size.height > size.width;
  const busy = useRef(false);
  // His forge light, here from the first frame at zero brightness. His files
  // arrive seconds after the world has compiled, and a light that came with
  // them changed the light count — three built every lit shader in the world
  // again (~2s on the main thread, the transmission glass alone 1.1s), right
  // as the loader left. Measured with design-loop/program-census.mjs.
  const forge = useMemo(() => new THREE.PointLight("#ffffff", 0, 1.5, 1.6), []);
  // the stage: the floor in front of the statue, for the blade and his moves
  const stand = useMemo(() => {
    const u = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
    const n = (k: string, d: number) => Number(u?.get(k) ?? d);
    const scale = n("ops", 2.6);
    return {
      position: [n("opx", tall ? 0.35 : 0.25), n("opy", 0.5 * scale), n("opz", tall ? 0.9 : 1.9)] as [number, number, number],
      scale,
      yaw: n("opyaw", tall ? -0.2 : -0.35),
    };
  }, [tall]);
  // on touch he looks around on his own, and at a finger while one is down
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);
  // ?act=pull holds one thing (and ?actt=seconds one moment of it) for a look;
  // ?opfly=1.2 holds the take-off at that second; ?dbg=o puts the portal's
  // state on window so a capture can set the scroll
  const dbg = useMemo(() => {
    if (typeof window === "undefined") return { act: null as Act | null, t: -1, fly: -1, speed: 1, dur: 0 };
    if (DBG.includes("o")) (window as unknown as { __portal: typeof portalState }).__portal = portalState;
    const u = new URLSearchParams(window.location.search);
    const a = u.get("act");
    return {
      act: a && (ACTS as readonly string[]).includes(a) ? (a as Act) : null,
      t: u.has("actt") ? Number(u.get("actt")) : -1,
      fly: u.has("opfly") ? Number(u.get("opfly")) : -1,
      // ?actspeed=10 runs his clock faster, to watch the changes
      speed: u.has("actspeed") ? Number(u.get("actspeed")) : 1,
      // ?actdur=8 — each thing lasts this many seconds instead of a minute
      dur: u.has("actdur") ? Number(u.get("actdur")) : 0,
    };
  }, []);

  const P = useMemo(() => {
    const v = () => new THREE.Vector3();
    const limbs: Limbs = { feet: [v(), v()], footW: [0, 0], hands: [v(), v()], handW: [0, 0], knee: [false, false], lean: 0, kneesUp: 0, kneesOut: 0, hang: 0 };
    return {
      stage: v(),
      pose: makePose(),
      standPose: makePose(),
      act: null as Act | null,
      next: null as Act | null,
      actT: 0,
      actDur: 60,
      mode: "on" as Mode,
      /** seconds into the current mode */
      t: 0,
      /** how far into its pose he is, 0 standing .. 1 in it */
      e: 0,
      walkFrom: v(),
      walkTo: v(),
      walkYaw0: 0,
      walkYaw1: 0,
      hopFrom: v(),
      hopYaw: 0,
      flight: "here" as Flight,
      ft: 0,
      /** where he takes off from, and how high he is when a landing starts */
      pad: v(),
      padYaw: 0,
      landFrom: 0,
      e0: 0,
      limbs,
      root: v(),
      yaw: 0,
      gaze: v(),
      tmp: v(),
      tmp2: v(),
    };
  }, []);

  const pick = (not: Act | null) => {
    const all = ACTS.filter((a) => a !== not && !(tall && a === "lean"));
    return all[Math.floor(Math.random() * all.length)];
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20) * dbg.speed;
    state.px = portalState.px;
    state.py = portalState.py;
    state.fine = !coarse;
    state.touchAt = portalState.touchAt;
    portalState.performing = busy.current;
    state.hidden = !(portalState.hero < 0.55 && portalState.warpAt === 0);
    const g = group.current;
    const build = state.build;
    if (!g) return;
    P.stage.set(...stand.position);
    if (!build) {
      g.position.copy(P.stage);
      return;
    }
    const L = P.limbs;

    /* ── what he is doing ── */
    if (P.act === null) {
      P.act = dbg.act ?? pick(null);
      P.actDur = dbg.act ? Infinity : (dbg.dur || mix(ACT_TIME[0], ACT_TIME[1], Math.random()));
      P.actT = dbg.t >= 0 ? dbg.t : 0;
      // he starts in it, not walking to it
      P.mode = "on";
      P.e = 1;
    }
    const hold = dbg.act !== null && dbg.t >= 0;
    const flying = P.flight !== "here";
    // a hovered word changed the glyph under a lean or a hang: he gets off it
    if (!flying && P.mode === "on" && (P.act === "lean" || P.act === "pull") && statue.morphing && !dbg.act) P.actT = P.actDur;

    /* ── the tap: hop down to the floor in front and perform; walk back after ── */
    if (!flying && busy.current && P.mode !== "hop" && P.mode !== "stage") {
      P.hopFrom.copy(P.root);
      P.hopYaw = P.yaw;
      P.mode = "hop";
      P.t = 0;
    }

    // his pose on the statue for what he is doing (a pull-up's lift included)
    let lift = 0;
    if (P.act === "pull" && P.mode === "on") {
      const r = P.actT % (SET.reps * REP_T + SET.rest);
      if (r < SET.reps * REP_T) {
        const k = r % REP_T;
        lift = k < REP.up ? ease(k / REP.up) : k < REP.up + REP.top ? 1 : k < REP.up + REP.top + REP.down ? 1 - ease((k - REP.up - REP.top) / REP.down) : 0;
      }
    }
    resolvePose(P.pose, P.act as PoseKey, statue.points, statue.y, statue.yaw, build, P.stage, stand.yaw, lift);
    const pose = P.pose;

    if (!flying && !hold) P.t += dt;
    let dip = 0;
    let tuck = 0;
    // stood on the floor at `spot`, facing `yaw`, feet under him
    const under = (out: THREE.Vector3, x: number, z: number, yaw: number, side: number) =>
      out.set(x + Math.cos(yaw) * build.hipW * 1.15 * side, build.ankleY, z - Math.sin(yaw) * build.hipW * 1.15 * side);
    /** the body `e` of the way from standing on the pose's spot into the pose */
    const blend = (e: number, sx: number, sz: number, syaw: number) => {
      P.root.set(mix(sx, pose.root.x, e), mix(stand.position[1], pose.root.y, e), mix(sz, pose.root.z, e));
      P.yaw = turnTo(syaw, pose.yaw, e);
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? 1 : -1;
        under(P.tmp2, sx, sz, syaw, side);
        const f = pose.feet[i];
        if (f) {
          // a foot that has somewhere to go is lifted there, not slid
          const moved = P.tmp2.distanceTo(f);
          L.feet[i]!.lerpVectors(P.tmp2, f, e);
          if (moved > 0.12) L.feet[i]!.y += Math.sin(Math.PI * e) * 0.1;
          L.footW[i] = 1;
        } else {
          L.feet[i]!.copy(P.tmp2);
          L.footW[i] = 1 - e;
        }
        const h = pose.hands[i];
        L.knee[i] = pose.knee[i];
        L.handW[i] = h || pose.knee[i] ? e : 0;
        if (h) L.hands[i]!.copy(h);
      }
      L.lean = pose.lean * e;
      L.kneesUp = pose.kneesUp;
      L.kneesOut = 0;
      L.hang = pose.hang * e;
      g.rotation.set(-pose.back * e * Math.cos(P.yaw), 0, pose.tilt * e + pose.back * e * Math.sin(P.yaw), "ZXY");
    };
    /** standing free (no pose at all), at a spot */
    const standAt = (x: number, z: number, yaw: number) => {
      P.root.set(x, stand.position[1], z);
      P.yaw = yaw;
      for (let i = 0; i < 2; i++) {
        under(L.feet[i]!, x, z, yaw, i === 0 ? 1 : -1);
        L.footW[i] = 1;
        L.handW[i] = 0;
        L.knee[i] = false;
      }
      L.lean = 0;
      L.hang = 0;
      L.kneesUp = 0;
      g.rotation.set(0, 0, 0);
    };

    if (!flying) {
      switch (P.mode) {
        case "on": {
          P.e = 1;
          blend(1, pose.spot.x, pose.spot.z, pose.spotYaw);
          if (!hold) P.actT += dt;
          if (P.actT >= P.actDur) {
            P.next = pick(P.act);
            P.mode = "off";
            P.t = 0;
          }
          break;
        }
        case "off": {
          // out of the pose, onto his feet
          P.e = 1 - ease(Math.min(1, P.t / EASE_OUT));
          blend(P.e, pose.spot.x, pose.spot.z, pose.spotYaw);
          if (P.t >= EASE_OUT) {
            P.walkFrom.copy(pose.spot);
            P.walkYaw0 = pose.spotYaw;
            P.act = P.next ?? pick(P.act);
            P.actT = 0;
            P.actDur = (dbg.dur || mix(ACT_TIME[0], ACT_TIME[1], Math.random()));
            resolvePose(P.pose, P.act as PoseKey, statue.points, statue.y, statue.yaw, build, P.stage, stand.yaw, 0);
            P.walkTo.copy(P.pose.spot);
            P.walkYaw1 = P.pose.spotYaw;
            P.mode = "walk";
            P.t = 0;
            standAt(P.walkFrom.x, P.walkFrom.z, P.walkYaw0);
          }
          break;
        }
        case "walk": {
          const D = P.walkFrom.distanceTo(P.walkTo);
          const T = D / WALK_SPEED + 1.2;
          const k = Math.min(1, P.t / T);
          // the path, eased in and out; he turns to it, then to where he stops
          const s = D * ease(k);
          const dx = P.walkTo.x - P.walkFrom.x;
          const dz = P.walkTo.z - P.walkFrom.z;
          const head = D > 0.01 ? Math.atan2(dx, dz) : P.walkYaw1;
          const turnIn = smooth(0, 0.6, P.t);
          const turnOut = smooth(T - 0.8, T, P.t);
          const yaw = turnTo(turnTo(P.walkYaw0, head, D > 0.15 ? turnIn : 0), P.walkYaw1, turnOut);
          const ux = D > 0.01 ? dx / D : 0;
          const uz = D > 0.01 ? dz / D : 0;
          const x = P.walkFrom.x + ux * s;
          const z = P.walkFrom.z + uz * s;
          standAt(x, z, yaw);
          if (D > 0.15) {
            // the gait: each foot planted, then carried a stride ahead of the
            // body with a lift, the other always down — faded in and out over
            // the first and last step so he starts and stops on both feet
            const gait = smooth(0, 0.5, P.t) * (1 - smooth(T - 0.9, T - 0.2, P.t));
            const rx = Math.cos(head);
            const rz = -Math.sin(head);
            for (let i = 0; i < 2; i++) {
              const c = (s + i * STEP) / (2 * STEP);
              const n = Math.floor(c);
              const f = c - n;
              let along = 2 * STEP * n - i * STEP + STEP * 0.5;
              let up = 0;
              if (f >= 0.5) {
                const w = ease((f - 0.5) / 0.5);
                along += 2 * STEP * w;
                up = Math.sin(Math.PI * ((f - 0.5) / 0.5)) * 0.11;
              }
              const side = i === 0 ? 1 : -1;
              P.tmp.set(P.walkFrom.x + ux * along + rx * build.hipW * 1.1 * side, build.ankleY + up, P.walkFrom.z + uz * along + rz * build.hipW * 1.1 * side);
              L.feet[i]!.lerp(P.tmp, gait);
            }
            // a little bob with each step
            P.root.y -= (0.02 + 0.02 * Math.cos((s / STEP) * Math.PI * 2)) * gait;
          }
          if (k >= 1) {
            P.mode = "in";
            P.t = 0;
            P.e = 0;
          }
          break;
        }
        case "hop": {
          // a tap: down to the stage in a quick hop, the forge already starting
          const t = P.t;
          const T = HOP_PUSH + HOP_AIR + HOP_LAND;
          const k = smooth(HOP_PUSH, HOP_PUSH + HOP_AIR, t);
          P.root.lerpVectors(P.hopFrom, P.stage, k);
          P.root.y += Math.sin(Math.PI * k) * 0.3;
          P.yaw = turnTo(P.hopYaw, stand.yaw, k);
          for (let i = 0; i < 2; i++) {
            L.footW[i] = t > HOP_PUSH + HOP_AIR ? Math.sin(Math.PI * Math.min(1, (t - HOP_PUSH - HOP_AIR) / HOP_LAND)) : 0;
            under(L.feet[i]!, P.stage.x, P.stage.z, stand.yaw, i === 0 ? 1 : -1);
            L.handW[i] = 0;
          }
          L.lean = 0;
          L.hang = 0;
          L.kneesUp = 0;
          tuck = Math.sin(Math.PI * k) * 0.5;
          g.rotation.set(0, 0, 0);
          if (t >= T) {
            P.mode = "stage";
            P.t = 0;
          }
          break;
        }
        case "stage": {
          // performing; nothing placed on him (the move owns his body)
          P.root.copy(P.stage);
          P.yaw = stand.yaw;
          L.footW[0] = L.footW[1] = L.handW[0] = L.handW[1] = 0;
          L.lean = 0;
          L.hang = 0;
          g.rotation.set(0, 0, 0);
          if (!busy.current) {
            // done: walk back to what he was doing
            P.walkFrom.copy(P.stage).setY(0);
            P.walkYaw0 = stand.yaw;
            P.walkTo.copy(pose.spot);
            P.walkYaw1 = pose.spotYaw;
            P.mode = "walk";
            P.t = 0;
          }
          break;
        }
        default: {
          // "in": from standing on the spot into the pose
          P.e = ease(Math.min(1, P.t / EASE_IN));
          blend(P.e, pose.spot.x, pose.spot.z, pose.spotYaw);
          // a pull-up bar is jumped to: a dip, then up to the grip
          if (P.act === "pull") dip = Math.sin(Math.PI * Math.min(1, P.e * 2)) * 0.16 * (P.e < 0.5 ? 1 : 0);
          if (P.t >= EASE_IN) {
            P.mode = "on";
            P.t = 0;
          }
        }
      }
    }

    /* ── the Iron Man take-off, and the landing ── */
    const hero = portalState.hero;
    if (dbg.fly >= 0) {
      if (P.flight === "here") {
        P.flight = "launch";
        P.pad.set(pose.spot.x, 0, pose.spot.z);
        P.padYaw = pose.spotYaw;
        P.e0 = P.e;
      }
      P.ft = dbg.fly;
    } else if (P.flight === "here" && hero > LAUNCH_AT && !busy.current && portalState.warpAt === 0) {
      P.flight = "launch";
      P.ft = 0;
      // he takes off from the floor where he stands to get off what he is on
      const onFloor = P.mode === "walk" || P.mode === "stage" || P.mode === "hop";
      P.pad.set(onFloor ? P.root.x : pose.spot.x, 0, onFloor ? P.root.z : pose.spot.z);
      P.padYaw = onFloor ? P.yaw : pose.spotYaw;
      P.e0 = onFloor ? 0 : P.e;
    } else if ((P.flight === "launch" || P.flight === "gone") && hero < RETURN_AT) {
      P.landFrom = P.flight === "gone" ? 7 : Math.max(0, P.root.y - stand.position[1]);
      P.flight = "land";
      P.ft = 0;
    } else if (P.flight === "land" && hero > LAUNCH_AT) {
      P.flight = "launch";
      P.ft = LIFT.release + LIFT.ignite + LIFT.hover * 0.5;
    }
    let thrust = 0;
    let waveK = 0;
    let gaze: THREE.Vector3 | null = null;
    if (P.flight !== "here") {
      if (dbg.fly < 0) P.ft += dt;
      const t = P.ft;
      const face = -0.12;
      // arms straight down at his sides, a hand's width out, palms down
      const arms = (w: number) => {
        const fs = Math.sin(P.yaw);
        const fc = Math.cos(P.yaw);
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? 1 : -1;
          L.hands[i]!.set(
            P.root.x + fc * side * (build.shoulderW + 0.1) - fs * 0.06,
            P.root.y + build.shoulderY - build.armLen * 0.99,
            P.root.z - fs * side * (build.shoulderW + 0.1) - fc * 0.06,
          );
          L.knee[i] = false;
          L.handW[i] = Math.max(L.handW[i] * (1 - w), w);
        }
      };
      if (P.flight === "launch" || P.flight === "gone") {
        const r1 = LIFT.release;
        const r2 = r1 + LIFT.ignite;
        const r3 = r2 + LIFT.hover;
        if (t < r1) {
          // off what he is on and onto his feet at the pad
          const k = ease(t / r1);
          resolvePose(P.pose, P.act as PoseKey, statue.points, statue.y, statue.yaw, build, P.stage, stand.yaw, 0);
          blend(P.e0 * (1 - k), P.pad.x, P.pad.z, P.padYaw);
          P.yaw = turnTo(P.yaw, face, k);
        } else {
          standAt(P.pad.x, P.pad.z, face);
        }
        const up = smooth(r1 * 0.5, r2, t); // his eyes go up first
        gaze = P.gaze.set(P.root.x + Math.sin(face) * 0.6, P.root.y + 8, P.root.z + Math.cos(face) * 0.6);
        if (up < 0.3) gaze = null;
        arms(smooth(r1 * 0.6, r2, t));
        // the jets catch, flutter, then open up
        thrust = 0.3 * smooth(r1, r2, t) + 0.7 * smooth(r2 + 0.2, r3, t);
        // he sinks onto his heels as they light, then leaves the floor
        dip = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - r1) / LIFT.ignite))) * 0.1;
        const u = Math.max(0, t - r2);
        const rise = 0.35 * u + 5.5 * Math.max(0, u - LIFT.hover * 0.6) ** 2;
        P.root.y += rise;
        for (let i = 0; i < 2; i++) L.footW[i] *= 1 - smooth(r2, r2 + 0.25, t);
        L.lean = -0.1 * up;
        waveK = t > r2 ? smooth(r2, r2 + 1.6, t) : 0;
        if (t > r3 + LIFT.gone) P.flight = "gone";
      } else {
        // the landing: down from above, braking on the jets, knees taking it
        standAt(P.pad.x, P.pad.z, face);
        const k = Math.min(1, t / LAND_T);
        const h = P.landFrom * Math.pow(1 - k, 2.2);
        P.root.y += h;
        thrust = k < 1 ? 0.55 + 0.35 * smooth(0.6, 0.95, k) : 0;
        arms(1 - smooth(LAND_T, LAND_T + SETTLE_T, t));
        for (let i = 0; i < 2; i++) L.footW[i] = smooth(0.85, 1, k);
        gaze = k < 0.7 ? P.gaze.set(P.root.x, 0, P.root.z + 1.2) : null;
        const s2 = Math.max(0, t - LAND_T);
        dip = Math.sin(Math.PI * Math.min(1, s2 / SETTLE_T)) * 0.14;
        waveK = k > 0.9 && k < 1 ? 0.25 : 0;
        if (t >= LAND_T + SETTLE_T) {
          // back to what he was doing: settle into it from the pad
          P.flight = "here";
          P.walkFrom.copy(P.pad);
          P.walkYaw0 = face;
          P.walkTo.copy(pose.spot);
          P.walkYaw1 = pose.spotYaw;
          P.mode = "walk";
          P.t = 0;
        }
      }
    }

    // looking his blade over, now and then, once he is there
    let inspect = -1;
    if (P.act === "blade" && P.mode === "on" && !flying) {
      const k = P.actT - BLADE_FIRST;
      if (k >= 0) {
        const c = k % BLADE_EVERY;
        if (c < INSPECT) inspect = c;
      }
    }
    // hanging from the bar he looks at it
    if (!gaze && P.act === "pull" && P.mode === "on" && !flying) {
      gaze = P.gaze.copy(L.hands[0]!).add(L.hands[1]!).multiplyScalar(0.5);
      gaze.y += 0.25;
    }
    // the statue holds its shape while he leans on it or hangs from it
    statue.hold = !flying && (P.act === "lean" || P.act === "pull") && P.mode !== "walk" && P.mode !== "stage";

    state.tuck = tuck;
    state.yaw = P.yaw;
    state.limbs = L;
    state.gaze = gaze;
    state.inspect = busy.current ? -1 : inspect;
    state.thrust = thrust;
    g.position.set(P.root.x, P.root.y - dip, P.root.z);
    if (P.flight !== "here") g.rotation.set(0, 0, 0);

    // the shockwave off the floor where he left it, and the jets' glow on it
    const w = wave.current;
    if (w) {
      const m = w.material as THREE.MeshBasicMaterial;
      m.opacity = waveK > 0 ? 0.45 * (1 - waveK) * smooth(0, 0.08, waveK) : 0;
      w.position.set(P.pad.x, 0.02, P.pad.z);
      w.scale.setScalar(0.6 + waveK * 5.5);
    }
    const gl = glowRef.current;
    if (gl) {
      const height = Math.max(0, P.root.y - stand.position[1]);
      (gl.material as THREE.MeshBasicMaterial).opacity = thrust * 0.5 * Math.max(0, 1 - height / 2.5);
      gl.position.set(P.root.x, 0.015, P.root.z);
      gl.scale.setScalar(1.1 + thrust * 0.8 + height * 0.3);
    }
  });
  return (
    <>
      <group
        ref={group}
        position={stand.position}
        onClick={(e) => {
          e.stopPropagation();
          // not in the air
          if (P.flight === "here") state.strike += 1;
        }}
        onPointerOver={() => document.documentElement.setAttribute("data-cursor-hot", "")}
        onPointerOut={() => document.documentElement.removeAttribute("data-cursor-hot")}
      >
        <primitive object={forge} />
        <Operator state={state} busy={busy} stand={{ position: [0, 0, 0], scale: stand.scale, yaw: stand.yaw }} light={forge} />
      </group>
      {/* drawn from the start at zero opacity: nothing new to compile at take-off */}
      <mesh ref={wave} rotation-x={-Math.PI / 2} renderOrder={15} raycast={() => null}>
        <ringGeometry args={[0.42, 0.5, 64]} />
        <meshBasicMaterial color="#dff0ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={glowRef} rotation-x={-Math.PI / 2} renderOrder={14} raycast={() => null}>
        <circleGeometry args={[0.5, 48]} />
        <meshBasicMaterial map={jetGlow} color="#a9d4ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

/** a soft round falloff for the jets' light on the floor */
const jetGlow = typeof document === "undefined" ? null : makeGlowTexture();

function CameraRig() {
  const { camera, size } = useThree();
  // inspection (?opc=hand|lhand): the Operator holds the camera on one fist, so
  // the rig stands down for that one frozen shot
  const inspect = useMemo(() => {
    if (typeof window === "undefined") return false;
    const c = new URLSearchParams(window.location.search).get("opc");
    return !!c && c !== "body";
  }, []);
  const pos = useMemo(() => new THREE.Vector3(0, CAM_Y, 7.6), []);
  const look = useMemo(() => new THREE.Vector3(0, CAM_Y, 0), []);
  const curLook = useRef(new THREE.Vector3(0, CAM_Y, 0));
  const lens = useRef("");
  const curFrame = useRef(1);
  const first = useRef(true);
  const probe = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (inspect) return;
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
      // through the middle of the statue, wherever its glyph stands it
      pos.set(frameX + px * 0.35 * kk * (1 - w), CAM_Y + (statue.y - CAM_Y) * Math.max(h, w) + py * 0.12 * kk * (1 - w), z);
    }
    if (doors > 0) {
      // on an upright phone it stops further off, so the gate sits above its
      // copy instead of behind it
      const tall = size.width < 768 && size.height > size.width;
      z = dollyZ(doors) - gate * (tall ? 1.5 : 4.5);
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
      // A phone held upright is a third as wide as a laptop: at the desktop's
      // lens every door and the gate filled it edge to edge, with the copy on
      // top of them. A wider lens there keeps each object in the space the
      // copy leaves it.
      const tall = size.width < 768 && size.height > size.width;
      cam.fov = tall ? PHONE_FOV : 36;
      // and the hall sits higher in the frame, so what stands on its floor is
      // up between the headline and the menu rather than under the menu
      cam.setViewOffset(size.width, size.height, 0, -Math.round((PLATE_HORIZON - 0.5 - (tall ? PHONE_LIFT : 0)) * size.height), size.width, size.height);
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
  /** this machine cannot draw the world smoothly: the page goes 2D */
  onTooSlow?: () => void;
}

export default function PortalScene({ onReady, onEnter, onTooSlow }: PortalSceneProps) {
  const glow = useMemo(() => makeGlowTexture(), []);
  const haze = useMemo(() => makeHazeTexture(), []);
  // Quality starts where this machine is smooth (lib/device.ts) and only
  // ever steps down from there: resolution, then passes, then 30fps, then
  // the 2D world (Governor, scene/pieces.tsx). "?dbg=H" pins the top.
  const [quality, setQuality] = useState<Quality>(() => initialQuality());
  const [armed, setArmed] = useState(false);
  const tier: Tier = quality.tier;
  const dpr = qualityDpr(quality);
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
  // what the page is really running at, for the design-loop tools
  useEffect(() => {
    document.documentElement.dataset.portalTier = tier;
    document.documentElement.dataset.portalDpr = String(dpr);
  }, [tier, dpr]);
  const operatorState = useMemo<OperatorState>(() => ({ px: 0, py: 0, fine: true, strike: 0 }), []);
  // the environment map is in place: the shaders may be linked against it
  const [envReady, setEnvReady] = useState(false);
  useEffect(() => {
    let t = 0;
    const onWarp = () => {
      window.clearTimeout(t);
      // the tunnel cover is ~full within 360ms; every frame after that goes to
      // the tunnel and the destination
      t = window.setTimeout(() => (boot.paused = true), 380);
    };
    window.addEventListener(WARP_EVENT, onWarp);
    return () => {
      window.removeEventListener(WARP_EVENT, onWarp);
      window.clearTimeout(t);
      boot.paused = false;
    };
  }, []);

  return (
    <Canvas
      flat // no tone mapping: a division hue must reach the screen as that hue
      // drawn from the page's own frame loop (FrameDriver), never on its own clock
      frameloop="never"
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: false }}
      camera={{ fov: 36, near: 0.1, far: 260, position: [0, CAM_Y, 7.6] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#000000", 1);
        // his swords are cut by clip planes: the blade runs out of the guard,
        // the hilt is fabricated up a scan line. Without this three ignores
        // those planes and the whole blade showed through his fist.
        gl.localClippingEnabled = true;
        // ?dbg=g: the renderer on window, for the design-loop draw-call probe
        if (DBG.includes("g")) (window as unknown as { __gl: THREE.WebGLRenderer }).__gl = gl;
        // On the way out — the visitor has clicked a division and the warp is
        // covering the screen — fiber tears this context down by forcing it lost,
        // and the driver blocks the main thread for ~850ms destroying everything
        // the world built. That was the freeze on the way into every division
        // page (13% of the whole hop). An abandoned context is reclaimed by the
        // browser off the main thread once its canvas is collected, so on a
        // desktop it is simply let go. A phone keeps the explicit loss — there,
        // GPU memory left hanging is what kills the tab — but takes it in idle
        // time, after the destination has drawn, instead of mid-transition.
        const lose = gl.forceContextLoss.bind(gl);
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        gl.forceContextLoss = () => {
          if (!coarse) return;
          const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 2500));
          idle(() => lose(), { timeout: 6000 });
        };
        // light fog: far doors recede into the plate's haze, never into murk
        scene.fog = new THREE.Fog("#0a0a0a", 16, 120);
      }}
    >
      <Governor quality={quality} setQuality={setQuality} armed={armed} onGiveUp={onTooSlow} />
      <TierContext.Provider value={tier}>
        <FrameDriver />
        <WorldEnvironment onReady={() => setEnvReady(true)} />

        <EnvDirector />
        <CameraRig />
        <KeyLight />
        {/* the painted gallery is the deep background; the monoliths, sky and
            floor it paints are not duplicated in 3D */}
        <PlateBackdrop world="portal" pointer={() => [-portalState.px * 0.6, -portalState.py * 0.6]} />
        {DBG.includes("h") ? null : <Haze texture={haze} />}
        <SignatureObject glow={glow} />
        {/* his files (1.6MB of GLB) load behind the world, not in front of it:
            the scene draws its first frames — and the loader leaves — without him */}
        <Suspense fallback={null}>
          <OperatorInWorld state={operatorState} />
        </Suspense>
        {DOOR_ITEMS.map((_, i) => (
          <Door key={i} index={i} onEnter={onEnter} />
        ))}
        <GateObject />
        {DBG.includes("d") ? null : <Dust sprite={glow} />}
        {DBG.includes("p") ? null : <Post focusY={RING_Y} dof={false} />}
        <ReadySignal
          envReady={envReady}
          onReady={() => {
            onReady?.();
            // the monitor only judges frames once the loader has left and the
            // compile is behind us — startup frames would step it down for nothing
            window.setTimeout(() => setArmed(true), 1500);
          }}
        />
      </TierContext.Provider>
    </Canvas>
  );
}

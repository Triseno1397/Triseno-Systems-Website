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

   He keeps himself busy on the statue (statue.ts), one thing at a time, for a
   while each, picked at random: leaning on its side with his arms folded,
   sitting inside it, looking his blade over in front of it, doing pull-ups off
   its top. Between them he pushes off, crosses in the air and lands in the
   next. Tapped, he hops down to the floor in front of it to perform. */

/** seconds of a hop between two things: the push-off, the air, the landing */
const HOP_PUSH = 0.2;
const HOP_AIR = 0.62;
const HOP_LAND = 0.24;

/** the things he does, and for how long (seconds, picked in the range) */
const ACTS: Record<"lean" | "sit" | "blade" | "pull", [number, number]> = {
  lean: [7, 11],
  sit: [8, 12],
  blade: [INSPECT + 1, INSPECT + 2.5],
  pull: [0, 0], // set by how many reps he does
};
type Act = keyof typeof ACTS;
/** a pull-up: settle, up, hold at the top, down, hang */
const REP = { up: 0.6, top: 0.22, down: 0.72, hang: 0.26 };
const REP_T = REP.up + REP.top + REP.down + REP.hang;
const PULL_SETTLE = 0.7;

/* The exit, as the hero scrolls: a Superman take-off. He sinks into a deep
   crouch with his fists low, then blasts straight up — right fist punched
   overhead, left fist tight at his hip — and accelerates out of the top of
   the frame, leaving a shockwave rolling out across the wet floor. Scroll-
   driven: it plays at the visitor's speed and runs back on the way up. */
const EXIT_FROM = 0.02;
const EXIT_TO = 0.46;
const CROUCH = 0.55;
/** clearance in front of the statue's face for the take-off */
const LAUNCH_CLEAR = 0.6;

const mix = THREE.MathUtils.lerp;

function OperatorInWorld({ state }: { state: OperatorState }) {
  const group = useRef<THREE.Group>(null);
  const wave = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  // a phone held upright: there is no room beside the statue, so he does not
  // lean on its side there
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
  // ?opexit=0.3 holds him mid-take-off; ?act=pull holds one thing (and a
  // moment of it with ?actt=seconds) for a look; ?dbg=o puts the portal's
  // state on window so a capture can set the scroll
  const dbg = useMemo(() => {
    if (typeof window === "undefined") return { exit: -1, act: null as Act | null, t: -1 };
    if (DBG.includes("o")) (window as unknown as { __portal: typeof portalState }).__portal = portalState;
    const u = new URLSearchParams(window.location.search);
    const a = u.get("act");
    return {
      exit: u.has("opexit") ? Number(u.get("opexit")) : -1,
      act: a && a in ACTS ? (a as Act) : null,
      t: u.has("actt") ? Number(u.get("actt")) : -1,
    };
  }, []);

  const P = useMemo(() => {
    const v = () => new THREE.Vector3();
    const limbs: Limbs = { feet: [v(), v()], footW: [0, 0], hands: [v(), v()], handW: [0, 0], knee: [false, false], lean: 0, kneesUp: 0, kneesOut: 0, hang: 0 };
    return {
      stage: v(),
      to: makePose(),
      from: makePose(),
      /** what he is doing, since when, and until when */
      act: null as Act | null,
      actT: 0,
      actDur: 0,
      reps: 0,
      key: null as PoseKey | null,
      glyph: 0,
      /** seconds into a hop, -1 when settled */
      hop: -1,
      limbs,
      root: v(),
      yaw: 0,
      tilt: 0,
      back: 0,
      launch: v(),
      gaze: v(),
      tmp: v(),
      tmp2: v(),
    };
  }, []);

  const pick = (not: Act | null): Act => {
    const all = (Object.keys(ACTS) as Act[]).filter((a) => a !== not && !(tall && a === "lean"));
    const a = all[Math.floor(Math.random() * all.length)];
    P.act = a;
    P.actT = 0;
    if (a === "pull") {
      P.reps = 3 + Math.floor(Math.random() * 3);
      P.actDur = PULL_SETTLE + P.reps * REP_T + 0.5;
    } else {
      const [lo, hi] = ACTS[a];
      P.actDur = lo + Math.random() * (hi - lo);
    }
    return a;
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    state.px = portalState.px;
    state.py = portalState.py;
    state.fine = !coarse;
    state.touchAt = portalState.touchAt;
    portalState.performing = busy.current;
    // not group.visible: see OperatorState.hidden
    state.hidden = !(portalState.hero < 0.55 && portalState.warpAt === 0);
    const g = group.current;
    const build = state.build;
    if (!g) return;
    P.stage.set(...stand.position);
    if (!build) {
      // his rig is not read yet
      g.position.copy(P.stage);
      return;
    }

    const exit = dbg.exit >= 0 ? dbg.exit : smooth(EXIT_FROM, EXIT_TO, portalState.hero);
    state.exit = exit;

    /* ── what he is doing: taken in turns, each for a while ── */
    if (P.act === null) {
      if (dbg.act) {
        P.act = dbg.act;
        P.actDur = Infinity;
        P.reps = 1e6;
        P.actT = Math.max(0, dbg.t);
      } else pick(null);
    }
    // the timer only runs while he is up and nobody is scrolling him away
    const settled = P.hop < 0;
    if (exit <= 0 && !state.hidden && !busy.current && !(dbg.act && dbg.t >= 0)) {
      if (settled) P.actT += dt;
      if (P.actT >= P.actDur) pick(P.act);
    }
    // a glyph changed under a lean or a hang (the menu is hovered): he gets off it
    const glyphIndex = portalState.active;
    if (glyphIndex !== P.glyph && (P.act === "lean" || P.act === "pull") && !dbg.act) pick(P.act);

    /* ── the pose, and the hop between two of them ── */
    const key: PoseKey = busy.current ? "stage" : (P.act as PoseKey);
    const L = P.limbs;
    if (P.key === null) {
      P.key = key;
    } else if (key !== P.key) {
      // leave from wherever he is right now (even mid-hop)
      P.from.root.copy(P.root);
      P.from.yaw = P.yaw;
      P.from.tilt = P.tilt;
      P.from.back = P.back;
      for (let i = 0; i < 2; i++) {
        P.from.feet[i] = L.footW[i] > 0.01 ? (P.from.feet[i] ?? new THREE.Vector3()).copy(L.feet[i]!) : null;
        P.from.hands[i] = L.handW[i] > 0.01 && !L.knee[i] ? (P.from.hands[i] ?? new THREE.Vector3()).copy(L.hands[i]!) : null;
        P.from.knee[i] = L.knee[i] && L.handW[i] > 0.01;
      }
      P.from.lean = L.lean;
      P.from.kneesUp = L.kneesUp;
      P.from.hang = L.hang;
      P.key = key;
      P.hop = 0;
    }
    P.glyph = glyphIndex;
    // a pull-up: how far up the bar he is
    let lift = 0;
    if (key === "pull" && settled) {
      const r = P.actT - PULL_SETTLE;
      if (r > 0 && r < P.reps * REP_T) {
        const k = r % REP_T;
        lift =
          k < REP.up ? ease(k / REP.up) : k < REP.up + REP.top ? 1 : k < REP.up + REP.top + REP.down ? 1 - ease((k - REP.up - REP.top) / REP.down) : 0;
      }
    }
    resolvePose(P.to, key, statue.points, statue.y, statue.yaw, build, P.stage, stand.yaw, lift);
    // the statue holds its shape while he leans on it or hangs from it
    statue.hold = key === "lean" || key === "pull" || (P.hop >= 0 && P.from.hang > 0);

    // feet squarely under him, for the push-off and the landing
    const under = (out: THREE.Vector3, root: THREE.Vector3, yaw: number, side: number) =>
      out.set(root.x + Math.cos(yaw) * build.hipW * 1.15 * side, build.ankleY, root.z - Math.sin(yaw) * build.hipW * 1.15 * side);
    const setLimbs = (pose: Pose, w: number) => {
      for (let i = 0; i < 2; i++) {
        const f = pose.feet[i];
        L.footW[i] = f ? w : 0;
        if (f) L.feet[i]!.copy(f);
        const h = pose.hands[i];
        L.knee[i] = pose.knee[i];
        L.handW[i] = h || pose.knee[i] ? w : 0;
        if (h) L.hands[i]!.copy(h);
      }
      L.lean = pose.lean * w;
      L.kneesUp = pose.kneesUp;
      L.kneesOut = 0;
      L.hang = pose.hang * w;
    };
    // stood on the floor, a pose without planted feet still plants them to
    // push off or land (a hang has nothing under it: he just lets go)
    const brace = (pose: Pose, w: number) => {
      if (pose.hang > 0) return;
      for (let i = 0; i < 2; i++) {
        if (pose.feet[i]) continue;
        L.footW[i] = w;
        under(L.feet[i]!, pose.root, pose.yaw, i === 0 ? 1 : -1);
      }
    };

    let dip = 0;
    let tuck = 0;
    if (P.hop >= 0) {
      P.hop += dt;
      const t = P.hop;
      if (t < HOP_PUSH) {
        // push-off: he sinks into what he is holding, then lets go
        const k = t / HOP_PUSH;
        setLimbs(P.from, 1 - smooth(0.55, 1, k));
        brace(P.from, Math.sin(k * Math.PI));
        P.root.copy(P.from.root);
        P.yaw = P.from.yaw;
        P.tilt = P.from.tilt;
        P.back = P.from.back;
        dip = P.from.hang > 0 ? 0 : Math.sin(k * Math.PI) * 0.16;
      } else if (t < HOP_PUSH + HOP_AIR) {
        // the air: an arc from the old spot to the new, knees drawn up; up to
        // a bar it is a jump to grab it
        const k = (t - HOP_PUSH) / HOP_AIR;
        const e = ease(k);
        setLimbs(P.to, 0);
        P.root.lerpVectors(P.from.root, P.to.root, e);
        const up = P.to.hang > 0 ? 0.42 : 0.1;
        P.root.y += Math.sin(k * Math.PI) * (up + Math.abs(P.to.root.y - P.from.root.y) * 0.3);
        P.yaw = mix(P.from.yaw, P.to.yaw, e);
        P.tilt = mix(P.from.tilt, P.to.tilt, e);
        P.back = mix(P.from.back, P.to.back, e);
        tuck = Math.sin(k * Math.PI) * 0.6;
      } else {
        // the landing: the new contacts take his weight and he settles into them
        const k = Math.min(1, (t - HOP_PUSH - HOP_AIR) / HOP_LAND);
        setLimbs(P.to, smooth(0, 0.6, k));
        brace(P.to, Math.sin(k * Math.PI));
        P.root.copy(P.to.root);
        P.yaw = P.to.yaw;
        P.tilt = P.to.tilt;
        P.back = P.to.back;
        // a hang catches his weight in the arms: a small drop, not a squat
        dip = Math.sin(k * Math.PI) * (P.to.hang > 0 ? 0.06 : 0.12);
        if (k >= 1) P.hop = -1;
      }
    } else {
      setLimbs(P.to, 1);
      P.root.copy(P.to.root);
      P.yaw = P.to.yaw;
      P.tilt = P.to.tilt;
      P.back = P.to.back;
    }

    // where he looks: his blade, the bar he is pulling up to, or the visitor
    let gaze: THREE.Vector3 | null = null;
    let inspect = -1;
    if (P.key === "blade" && P.hop < 0) {
      inspect = P.actT;
      if (inspect < INSPECT) {
        gaze = P.gaze.set(
          P.root.x + Math.sin(P.yaw) * 0.5,
          P.root.y + build.shoulderY + 0.3,
          P.root.z + Math.cos(P.yaw) * 0.5,
        );
      } else inspect = -1;
    } else if (P.key === "pull" && P.hop < 0) {
      gaze = P.gaze.copy(L.hands[0]!).add(L.hands[1]!).multiplyScalar(0.5);
      gaze.y += 0.25;
    }

    /* ── the exit: a Superman take-off, straight up and out of the top ── */
    let x = P.root.x;
    let y = P.root.y - dip;
    let z = P.root.z;
    let yaw = P.yaw;
    let tilt = P.tilt;
    let back = P.back;
    let waveK = 0;
    if (exit > 0) {
      // he takes off from the floor, clear in front of the statue's face
      const fx = Math.sin(statue.yaw);
      const fz = Math.cos(statue.yaw);
      const both = L.footW[0] > 0.5 && L.footW[1] > 0.5;
      const lf = both ? P.tmp.addVectors(L.feet[0]!, L.feet[1]!).multiplyScalar(0.5) : P.tmp.copy(P.root);
      const d = lf.x * fx + lf.z * fz;
      const need = TUBE_D * STATUE_SCALE + LAUNCH_CLEAR;
      if (d < need) lf.set(lf.x + fx * (need - d), 0, lf.z + fz * (need - d));
      P.launch.set(lf.x, stand.position[1], lf.z);
      const load = smooth(0, 0.14, exit); // down into the crouch, fists low
      const blast = smooth(0.13, 0.2, exit); // the legs fire, the right fist goes up
      const u = Math.max(0, exit - 0.15);
      const rise = 2 * u + 14 * u * u;
      const face = mix(yaw, -0.12, load);
      const fs = Math.sin(face);
      const fc = Math.cos(face);
      // his left, in the world
      const lx = fc;
      const lz = -fs;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? 1 : -1;
        under(P.tmp2, P.launch, face, side);
        if (L.footW[i] > 0.01) L.feet[i]!.lerp(P.tmp2, load);
        else L.feet[i]!.copy(P.tmp2);
        L.footW[i] = mix(L.footW[i], 1, load) * (1 - smooth(0.15, 0.19, exit));
        L.knee[i] = false;
      }
      const cy = mix(y, P.launch.y, load) - CROUCH * load * (1 - blast) + rise;
      // fists: low at his sides in the crouch; then the right one overhead and
      // the left one tight at his hip
      const hx = mix(x, P.launch.x, load);
      const hz = mix(z, P.launch.z, load);
      L.hands[0]!.set(hx + lx * 0.34 + fs * 0.05, cy + mix(-0.25, -0.1, blast), hz + lz * 0.34 + fc * 0.05);
      L.hands[1]!.set(
        // straight up over his right shoulder, the arm locked
        hx - lx * mix(0.36, build.shoulderW * 0.9, blast) + fs * 0.06,
        cy + mix(-0.25, build.shoulderY + build.armLen * 1.05, blast),
        hz - lz * mix(0.36, build.shoulderW * 0.9, blast) + fc * 0.06,
      );
      L.handW[0] = Math.max(L.handW[0] * (1 - load), load * 0.85);
      L.handW[1] = Math.max(L.handW[1] * (1 - load), load * 0.85, blast);
      L.lean = mix(L.lean, 0.42, load) * (1 - blast) - 0.1 * blast;
      L.kneesUp = mix(L.kneesUp, 0, load);
      L.hang = mix(L.hang, 0, load) * (1 - blast) + 0.28 * blast;
      tuck = tuck * (1 - load);
      x = hx;
      z = hz;
      y = cy;
      yaw = face;
      tilt = tilt * (1 - load);
      back = back * (1 - load);
      // eyes up once he goes
      gaze = blast > 0.3 ? P.gaze.set(x + fs * 0.4, y + 6, z + fc * 0.4) : gaze;
      if (inspect >= 0) inspect = Math.max(inspect, INSPECT - 1.6 + load * 1.6);
      waveK = exit > 0.14 ? smooth(0.14, 0.42, exit) : 0;
    }
    state.tuck = tuck;
    state.yaw = yaw;
    state.limbs = L;
    state.gaze = gaze;
    state.inspect = busy.current ? -1 : inspect;
    g.position.set(x, y, z);
    // tipped back about his own shoulders' line, and leaned about the screen's axis
    g.rotation.set(-back * Math.cos(yaw), 0, tilt + back * Math.sin(yaw), "ZXY");

    // the shockwave off the floor where he left it
    const w = wave.current;
    if (w) {
      const m = w.material as THREE.MeshBasicMaterial;
      m.opacity = waveK > 0 ? 0.5 * (1 - waveK) * smooth(0, 0.08, waveK) : 0;
      w.position.set(P.launch.x, 0.02, P.launch.z);
      w.scale.setScalar(0.6 + waveK * 5.5);
    }
  });
  return (
    <>
      <group
        ref={group}
        position={stand.position}
        onClick={(e) => {
          e.stopPropagation();
          state.strike += 1;
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
        <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

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

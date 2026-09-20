"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";
import {
  DOOR_ITEMS,
  DOOR_Z,
  MENU_ITEMS,
  dollyZ,
  doorLit,
  portalState,
} from "./portalState";

/* ─────────────────────────────────────────────────────────────────────────
   The portal world. One fixed canvas behind the whole page:
   · signature object — a loop of dark metal with a light inlay that morphs
     between glyphs (circle / square / triangle / diamond / plus) and takes
     the hue of the lit menu word;
   · a wet reflective floor in a black void;
   · three door frames the camera dollies past as the page scrolls;
   · a white end gate behind the final CTA.
   Scroll never moves a document here — it moves the camera.
   ───────────────────────────────────────────────────────────────────────── */

const N = 192; // samples per loop — divisible by 3, 4 and 8 so corners land on samples
const RING_Y = 1.95;
const RING_SCALE = 1.42;
const END_GATE_Z = -66;
const REST_YAW = -0.42; // the object rests turned toward the type column so its depth reads

/* ── Loop geometry: a square-section tube swept along a glyph outline ──── */

interface LoopSpec {
  halfW: number; // half width in the glyph plane
  halfD: number; // half depth along z
  offN?: number; // shift along the in-plane normal (negative = toward the hole)
  offZ?: number; // shift along z
}

class LoopGeometry extends THREE.BufferGeometry {
  private spec: Required<LoopSpec>;
  private pos: Float32Array;

  constructor(spec: LoopSpec) {
    super();
    this.spec = { offN: 0, offZ: 0, ...spec };
    // 4 faces, each a strip of (N + 1) * 2 vertices — unshared so faces stay crisp.
    this.pos = new Float32Array(4 * (N + 1) * 2 * 3);
    const index: number[] = [];
    for (let f = 0; f < 4; f++) {
      const base = f * (N + 1) * 2;
      for (let i = 0; i < N; i++) {
        const a = base + i * 2;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    this.setIndex(index);
    this.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
  }

  /** points: flat [x,y,...] of N samples, clockwise from the top. */
  update(points: Float32Array) {
    const { halfW, halfD, offN, offZ } = this.spec;
    const pos = this.pos;
    // corner order around the profile: outer-front, outer-back, inner-back, inner-front
    const cn = [1, 1, -1, -1];
    const cz = [1, -1, -1, 1];
    for (let i = 0; i <= N; i++) {
      const k = i % N;
      const kp = (k + N - 1) % N;
      const kn = (k + 1) % N;
      const x = points[k * 2];
      const y = points[k * 2 + 1];
      let ax = x - points[kp * 2];
      let ay = y - points[kp * 2 + 1];
      let bx = points[kn * 2] - x;
      let by = points[kn * 2 + 1] - y;
      const al = Math.hypot(ax, ay) || 1;
      const bl = Math.hypot(bx, by) || 1;
      ax /= al;
      ay /= al;
      bx /= bl;
      by /= bl;
      // outward normal of a clockwise path = tangent rotated +90deg
      const n1x = -ay;
      const n1y = ax;
      let mx = n1x - by;
      let my = n1y + bx;
      const ml = Math.hypot(mx, my) || 1;
      mx /= ml;
      my /= ml;
      const mitre = 1 / Math.max(0.5, mx * n1x + my * n1y);

      for (let f = 0; f < 4; f++) {
        const c0 = f;
        const c1 = (f + 1) % 4;
        const o = (f * (N + 1) * 2 + i * 2) * 3;
        for (let v = 0; v < 2; v++) {
          const c = v === 0 ? c0 : c1;
          const d = (offN + cn[c] * halfW) * mitre;
          pos[o + v * 3] = x + mx * d;
          pos[o + v * 3 + 1] = y + my * d;
          pos[o + v * 3 + 2] = offZ + cz[c] * halfD;
        }
      }
    }
    this.attributes.position.needsUpdate = true;
    this.computeVertexNormals();
    this.computeBoundingSphere();
  }
}

const BODY: LoopSpec = { halfW: 0.095, halfD: 0.15 };
const INLAY_FRONT: LoopSpec = { halfW: 0.014, halfD: 0.004, offZ: 0.152 };
const INLAY_BACK: LoopSpec = { halfW: 0.014, halfD: 0.004, offZ: -0.152 };
const INLAY_RIM: LoopSpec = { halfW: 0.004, halfD: 0.06, offN: -0.098 };

function useLoopSet() {
  const set = useMemo(
    () => ({
      body: new LoopGeometry(BODY),
      front: new LoopGeometry(INLAY_FRONT),
      back: new LoopGeometry(INLAY_BACK),
      rim: new LoopGeometry(INLAY_RIM),
    }),
    [],
  );
  useEffect(
    () => () => {
      set.body.dispose();
      set.front.dispose();
      set.back.dispose();
      set.rim.dispose();
    },
    [set],
  );
  return set;
}

function updateLoopSet(set: ReturnType<typeof useLoopSet>, pts: Float32Array) {
  set.body.update(pts);
  set.front.update(pts);
  set.back.update(pts);
  set.rim.update(pts);
}

/* ── shared textures ───────────────────────────────────────────────────── */

function makeGlowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.18, "rgba(255,255,255,0.38)");
  g.addColorStop(0.45, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tiling value noise — drives the reflector's distortion so the floor reads as wet. */
function makeRippleTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cells = 8;
  const grid: number[] = Array.from({ length: cells * cells }, () => Math.random());
  const at = (x: number, y: number) => grid[((y + cells) % cells) * cells + ((x + cells) % cells)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 0.6;
      let freq = 1;
      for (let o = 0; o < 3; o++) {
        const fx = ((x / size) * cells * freq) % cells;
        const fy = ((y / size) * cells * freq) % cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        v += (a + (b - a) * sy) * amp;
        amp *= 0.5;
        freq *= 2;
      }
      const g = Math.min(255, Math.max(0, v * 255));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 12);
  return t;
}

/* ── the signature object ──────────────────────────────────────────────── */

function SignatureObject({ glow }: { glow: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const halo = useRef<THREE.Mesh>(null);
  const loops = useLoopSet();

  const inlayMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff8a3d", toneMapped: false }), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glow,
        color: "#ff8a3d",
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
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
  const target = useMemo(() => new THREE.Color(), []);
  const fromHue = useMemo(() => new THREE.Color(MENU_ITEMS[0].hue), []);

  useEffect(() => {
    updateLoopSet(loops, morph.current.cur);
    return () => {
      inlayMat.dispose();
      haloMat.dispose();
    };
  }, [loops, inlayMat, haloMat]);

  useFrame((state, dt) => {
    const m = morph.current;
    const step = Math.min(dt, 0.25); // wall-clock time, even at low frame rates

    if (portalState.active !== m.index) {
      m.index = portalState.active;
      m.from.set(m.cur);
      m.to = glyphPoints(MENU_ITEMS[m.index].glyph as GlyphKind, N);
      m.t = 0;
      m.spinFrom = m.spin;
      m.spinTo = m.spinTo + Math.PI; // half-turn per swap; the loop is symmetric front/back
      fromHue.copy(inlayMat.color);
    }
    if (m.t < 1) {
      m.t = Math.min(1, m.t + step / 0.95);
      const e = 1 - Math.pow(1 - m.t, 4); // quart-out: one deceleration family
      for (let i = 0; i < N * 2; i++) m.cur[i] = m.from[i] + (m.to[i] - m.from[i]) * e;
      m.spin = m.spinFrom + (m.spinTo - m.spinFrom) * e;
      updateLoopSet(loops, m.cur);
    }

    // hue: inlay, halo and the light that stains the floor all move together.
    // The swap runs old hue -> white -> new hue so no third hue ever appears.
    target.set(MENU_ITEMS[m.index].hue);
    if (m.t < 0.45) inlayMat.color.copy(fromHue).lerp(WHITE_C, m.t / 0.45);
    else inlayMat.color.copy(WHITE_C).lerp(target, Math.min(1, (m.t - 0.45) / 0.55));
    haloMat.color.copy(inlayMat.color);
    if (light.current) light.current.color.copy(inlayMat.color);

    const t = state.clock.elapsedTime;
    // once the camera is through the loop, let the glow fall away behind it;
    // the resting yaw also unwinds so the camera flies through a square-on gate
    const away = 1 - Math.min(1, Math.max(0, portalState.hero / 0.6));
    if (group.current) {
      group.current.position.y = RING_Y + Math.sin(t * 0.9) * 0.05;
      group.current.rotation.y = m.spin + REST_YAW * away + Math.sin(t * 0.35) * 0.2 + portalState.px * 0.18;
      group.current.rotation.x = Math.sin(t * 0.27) * 0.05 - portalState.py * 0.08;
    }
    // the glow is a billboard — it has to be gone before the camera reaches it
    haloMat.opacity = 0.55 * (1 - Math.min(1, Math.max(0, portalState.hero / 0.45)));
    if (halo.current) halo.current.lookAt(state.camera.position);
  });

  return (
    <>
      <group ref={group} position={[0, RING_Y, 0]} scale={RING_SCALE}>
        <mesh geometry={loops.body}>
          <meshStandardMaterial color="#2a2a2d" metalness={1} roughness={0.28} envMapIntensity={2.2} />
        </mesh>
        <mesh geometry={loops.front} material={inlayMat} />
        <mesh geometry={loops.back} material={inlayMat} />
        <mesh geometry={loops.rim} material={inlayMat} />
      </group>
      <mesh ref={halo} position={[0, RING_Y, -0.6]} material={haloMat} layers={HALO_LAYER} renderOrder={10}>
        <planeGeometry args={[9, 9]} />
      </mesh>
      <pointLight ref={light} position={[0, RING_Y - 0.4, 0.6]} intensity={26} distance={11} decay={2} />
    </>
  );
}

/* ── doors ─────────────────────────────────────────────────────────────── */

const DOOR_SCALE = 2.05;
const UNLIT = new THREE.Color("#7d7d7d");
const WHITE_C = new THREE.Color("#ffffff");
// Halos live on their own layer: the main camera sees them, the floor's mirror camera does not.
const HALO_LAYER = 1;

function Door({
  index,
  glow,
  onEnter,
}: {
  index: number;
  glow: THREE.Texture;
  onEnter: (route: string) => void;
}) {
  const division = DOOR_ITEMS[index];
  const side = index % 2 === 0 ? -1 : 1;
  const loops = useLoopSet();
  const light = useRef<THREE.PointLight>(null);
  const hue = useMemo(() => new THREE.Color(division.hue), [division.hue]);

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
    return { points: pts, y: -minY * DOOR_SCALE + 0.1, shape: s };
  }, [division.glyph]);

  const inlayMat = useMemo(() => new THREE.MeshBasicMaterial({ color: UNLIT, toneMapped: false }), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glow,
        color: hue,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [glow, hue],
  );
  // The door's surface: a veil of light in the division hue, brightest at the sill.
  const veilMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: { uColor: { value: hue.clone() }, uLit: { value: 0 }, uTime: { value: 0 } },
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
            float a = (0.10 + 0.55 * sill + 0.07 * bands) * uLit;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
      }),
    [hue],
  );

  useEffect(() => {
    updateLoopSet(loops, points);
    return () => {
      inlayMat.dispose();
      haloMat.dispose();
      veilMat.dispose();
    };
  }, [loops, points, inlayMat, haloMat, veilMat]);

  useFrame((state) => {
    const lit = doorLit(index, state.camera.position.z);
    const hover = portalState.hoverDoor === index ? 1 : 0;
    inlayMat.color.copy(UNLIT).lerp(hue, lit);
    haloMat.opacity = lit * (0.4 + hover * 0.2);
    veilMat.uniforms.uLit.value = lit * (0.85 + hover * 0.4);
    veilMat.uniforms.uTime.value = state.clock.elapsedTime;
    if (light.current) light.current.intensity = lit * 60;
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
    <group position={[side * 2.7, y, DOOR_Z[index]]} rotation={[0, -side * 0.5, 0]}>
      <group scale={DOOR_SCALE}>
        <mesh geometry={loops.body}>
          <meshStandardMaterial color="#2a2a2d" metalness={1} roughness={0.3} envMapIntensity={2} />
        </mesh>
        <mesh geometry={loops.front} material={inlayMat} />
        <mesh geometry={loops.back} material={inlayMat} />
        <mesh geometry={loops.rim} material={inlayMat} />
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
      <mesh position={[0, 0, -0.5]} material={haloMat} layers={HALO_LAYER} renderOrder={10}>
        <planeGeometry args={[13, 13]} />
      </mesh>
      <pointLight ref={light} position={[0, -y + 1.1, 1.4]} color={division.hue} intensity={0} distance={16} decay={2} />
    </group>
  );
}

/* ── the white gate behind the final CTA ───────────────────────────────── */

function EndGate({ glow }: { glow: THREE.Texture }) {
  const loops = useLoopSet();
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glow,
        color: "#ffffff",
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [glow],
  );
  useEffect(() => {
    updateLoopSet(loops, glyphPoints("circle", N));
    return () => haloMat.dispose();
  }, [loops, haloMat]);

  return (
    <group position={[0, 4.7, END_GATE_Z]}>
      <group scale={4.5}>
        <mesh geometry={loops.body}>
          <meshStandardMaterial color="#2a2a2d" metalness={1} roughness={0.3} envMapIntensity={2} />
        </mesh>
        <mesh geometry={loops.front}>
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh geometry={loops.rim}>
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0, -0.6]} material={haloMat} layers={HALO_LAYER} renderOrder={10}>
        <planeGeometry args={[22, 22]} />
      </mesh>
      <pointLight position={[0, -2, 2]} color="#ffffff" intensity={40} distance={18} decay={2} />
    </group>
  );
}

/* ── dust ──────────────────────────────────────────────────────────────── */

function Dust({ sprite }: { sprite: THREE.Texture }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 9;
      pos[i * 3 + 1] = Math.random() * 6 + 0.1;
      pos[i * 3 + 2] = 8 - Math.random() * 80;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.25;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        map={sprite}
        size={0.07}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── floor ─────────────────────────────────────────────────────────────── */

function WetFloor({ ripple }: { ripple: THREE.Texture }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -32]}>
      <planeGeometry args={[80, 130]} />
      <MeshReflectorMaterial
        resolution={1024}
        blur={[220, 60]}
        mixBlur={0.55}
        mixStrength={95}
        mixContrast={1}
        roughness={0.8}
        depthScale={1.15}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#070707"
        metalness={0.6}
        mirror={0.85}
        distortion={0.2}
        distortionMap={ripple}
      />
    </mesh>
  );
}

/* ── camera rig: scroll moves the camera, not a document ───────────────── */

const ease = (t: number) => t * t * (3 - 2 * t);
const CAM_Y = 2.35; // above the object's centre, so the wet floor and its reflection own the lower third

function CameraRig() {
  const { camera, size } = useThree();
  const pos = useMemo(() => new THREE.Vector3(0, CAM_Y, 7.6), []);
  const look = useMemo(() => new THREE.Vector3(0, RING_Y, 0), []);
  const curLook = useRef(new THREE.Vector3(0, RING_Y, 0));
  const lastShift = useRef(-1);
  const first = useRef(true);

  useFrame((_, dt) => {
    const { hero, doors, gate, px, py } = portalState;
    const h = ease(Math.min(1, hero));

    if (hero < 1 || doors <= 0) {
      // Hero: dolly straight through the signature object.
      pos.set(px * 0.35 * (1 - h), CAM_Y + (RING_Y - CAM_Y) * h + py * 0.12 * (1 - h), 7.6 - 9.6 * h);
      look.set(0, RING_Y - 0.55 * (1 - h), pos.z - 8);
    }
    if (doors > 0) {
      const z = dollyZ(doors) - gate * 5;
      // Drift away from the door that is coming up so it slides to its side of the frame
      // and the copy card owns the other side.
      let sway = 0;
      let lookX = 0;
      for (let i = 0; i < DOOR_Z.length; i++) {
        const lit = doorLit(i, z);
        const side = i % 2 === 0 ? -1 : 1;
        sway += -side * 0.55 * lit;
        lookX += side * 1.15 * lit;
      }
      pos.set(sway + px * 0.2, 1.75 + py * 0.08, z);
      look.set(lookX * (1 - gate), 1.9 + gate * 1.1, z - 9);
    }

    const k = first.current ? 1 : 1 - Math.exp(-Math.min(dt, 0.25) * 6);
    first.current = false;
    camera.position.lerp(pos, k);
    curLook.current.lerp(look, k);
    camera.lookAt(curLook.current);

    // Hero framing: push the object to the right of centre so the type column
    // owns the left. The shift unwinds as the camera flies through.
    const wide = size.width >= 1024 ? 0.2 : size.width >= 768 ? 0.16 : 0;
    const shift = Math.round(wide * (1 - ease(Math.min(1, hero * 1.5))) * size.width);
    if (shift !== lastShift.current) {
      lastShift.current = shift;
      const cam = camera as THREE.PerspectiveCamera;
      if (shift === 0) cam.clearViewOffset();
      else cam.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height);
    }
  });

  useEffect(() => {
    lastShift.current = -1;
  }, [size.width, size.height]);

  return null;
}

/* ── ready signal ──────────────────────────────────────────────────────── */

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const sent = useRef(false);
  useFrame(() => {
    if (sent.current) return;
    frames.current += 1;
    if (frames.current >= 4) {
      sent.current = true;
      onReady();
    }
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
  const ripple = useMemo(() => makeRippleTexture(), []);
  useEffect(
    () => () => {
      glow.dispose();
      ripple.dispose();
    },
    [glow, ripple],
  );

  return (
    <Canvas
      flat // no tone mapping: the floor must mirror the division hue exactly, not a shifted one
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ fov: 36, near: 0.1, far: 120, position: [0, CAM_Y, 7.6] }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor("#000000", 1);
        camera.layers.enable(HALO_LAYER);
        // Fog ends before the first door, so the hero frame holds one object only.
        scene.fog = new THREE.Fog("#000000", 9, 23);
      }}
    >
      <ambientLight intensity={0.12} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={5} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={3} position={[-6, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
        <Lightformer form="rect" intensity={3} position={[6, 2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 0.6, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 2, 8]} scale={3} />
      </Environment>

      <CameraRig />
      <SignatureObject glow={glow} />
      {DOOR_ITEMS.map((_, i) => (
        <Door key={i} index={i} glow={glow} onEnter={onEnter} />
      ))}
      <EndGate glow={glow} />
      <Dust sprite={glow} />
      <WetFloor ripple={ripple} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}

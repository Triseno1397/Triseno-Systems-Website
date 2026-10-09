"use client";

import { useEffect, useId, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { deviceClass } from "@/lib/device";
import { LAND_DOTS } from "./landDots";
import { buildNucleus, chromeMaterial, type Nucleus } from "./nucleus";
import { session } from "./session";
import { cleanDark } from "./cleanDark";
import { DIVE } from "./hero-dive.content";
import "@/app/ai-dive.css";

/**
 * The AI hero's object: the intelligence layer as one thing you can touch.
 *
 *   core    a sphere of liquid chrome at the centre, its surface always
 *           slowly moving, rising toward the pointer like mercury to a magnet;
 *   globe   the world around it as a dotted shell (land only), turning
 *           slowly and leaning toward the pointer, with cyan routes arcing
 *           between cities, each drawn by a travelling pulse;
 *   swarm   a flock of small agents orbiting the globe: they keep formation
 *           on their own and scatter from the pointer, then regroup.
 *
 * And the push-in. Press and hold the core: a hairline ring fills under the
 * fingertip, the copy trembles, the grain thickens, the mercury swells toward
 * the lens and the camera starts in. Through the skin you begin to see a dark
 * ruled room (a render target of the nucleus sampled through the chrome);
 * the globe thins, the swarm parts, the core fills the frame and the camera
 * crosses the surface. The whole viewport falls to ink (a fixed layer under
 * the sections), the chrome flips to white (cleanDark) and you stand inside
 * the nucleus: the TS cast in the same chrome, two routes orbiting it. The
 * caption prints the request this visit minted, stamped with the visitor's
 * own clock. Let go and the shot runs backwards, faster; a tap gives a
 * half-second peek. Everything is a pure function of one scalar, dive.v.
 *
 * Plain three.js on one canvas. It draws only while on screen and the tab is
 * visible; reduced motion gets one still frame per state. Phones and weak
 * machines get fewer agents and a lower pixel ratio; "low" devices never
 * dive (the hold only swells the mercury). No WebGL: the figure stays empty
 * and the copy carries the hero.
 */

const INK = new THREE.Color("#0b0e0f");
const SIGNAL = new THREE.Color("#00b4d8");
const R_GLOBE = 1.55;
const R_CORE = 0.66;
/** the camera's resting height; its distance is zHome, from the figure's shape */
const CAM_Y = 0.25;

// hubs the routes run between (lat, lon)
const HUBS: [number, number][] = [
  [40.7, -74.0], [34.05, -118.25], [51.5, -0.12], [48.86, 2.35], [35.68, 139.69],
  [1.35, 103.82], [-33.87, 151.21], [19.43, -99.13], [-23.55, -46.63], [25.2, 55.27],
  [52.52, 13.4], [37.77, -122.42], [28.61, 77.21], [-26.2, 28.05], [43.65, -79.38],
];

const toVec = (lat: number, lon: number, r: number) => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
};

/* ── the dotted globe: round dots, the far side faded ─────────────────── */
const DOT_VERT = `
uniform float uSize;
uniform float uPix;
varying float vFace;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vFace = n.z;
  gl_PointSize = uSize * uPix * (5.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DOT_FRAG = `
uniform vec3 uColor;
uniform float uFade;
varying float vFace;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.36, d) * mix(0.14, 0.82, smoothstep(-0.35, 0.45, vFace));
  gl_FragColor = vec4(uColor, a * uFade);
}`;

/* ── routes: a line drawn by its own travelling head ───────────────────── */
const ARC_VERT = `
attribute float u;
varying float vU;
void main() { vU = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ARC_FRAG = `
uniform vec3 uColor;
uniform float uHead;
uniform float uTail;
uniform float uFade;
varying float vU;
void main() {
  float behind = uHead - vU;
  if (behind < 0.0 || behind > uTail) discard;
  float a = 1.0 - behind / uTail;
  gl_FragColor = vec4(uColor, a * a * 0.95 * uFade);
}`;

/* ── small maths ── */
const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInCubic = (x: number) => x * x * x;
/** a fresh number in [-1, 1] for a frame index: the copy's tremble */
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/** held shorter than this is a tap: a half-second peek */
const TAP_MS = 220;
/** how far a tap's peek goes: far enough that the room glints through the skin */
const PEEK = 0.34;
/** a touch must stay put this long before it arms (a scroll start never becomes a press) */
const TOUCH_ARM_MS = 230;
/** and move less than this */
const TOUCH_SLOP = 8;
/** the dive releases once less than this much of the figure is on screen */
const IO_RELEASE = 0.6;
/**
 * The cut is taken on the core's smallest silhouette, not its largest: the
 * noise can sink the skin to ~0.87 R, and the room must already cover every
 * corner of the frame through the skin when the screen switches to it.
 */
const R_CUT = R_CORE * 0.86;

export default function IntelligenceCore({ className, label }: { className?: string; label: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const descId = useId();

  useEffect(() => {
    const root = rootRef.current;
    const host = hostRef.current;
    const ring = ringRef.current;
    const circle = circleRef.current;
    if (!root || !host || !ring || !circle) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const dc = deviceClass();
    const weak = dc !== "high";
    const low = dc === "low";
    const hero = host.closest<HTMLElement>(".ai-hero");
    const html = document.documentElement;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      // no WebGL: the figure stays empty, and there is nothing to hold
      host.setAttribute("role", "img");
      host.setAttribute("aria-label", label);
      host.removeAttribute("aria-pressed");
      host.removeAttribute("aria-describedby");
      host.tabIndex = -1;
      root.setAttribute("data-fallback", "");
      hero?.setAttribute("data-fallback", "");
      return () => {
        root.removeAttribute("data-fallback");
        hero?.removeAttribute("data-fallback");
      };
    }
    const pix = Math.min(window.devicePixelRatio || 1, weak ? 1.25 : 2);
    renderer.setPixelRatio(pix);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
    host.appendChild(renderer.domElement);

    // the dark: the fixed layer AiPage mounts under the sections. If the page
    // has not mounted one, the figure makes its own and removes it on unmount.
    let dark = document.querySelector<HTMLElement>(".ai-dive__dark");
    let ownDark = false;
    const main = host.closest("main");
    if (!dark && main) {
      dark = document.createElement("span");
      dark.className = "ai-dive__dark";
      dark.setAttribute("aria-hidden", "true");
      dark.setAttribute("data-world-layer", "");
      main.appendChild(dark);
      ownDark = true;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, CAM_Y, 7.2);
    camera.lookAt(0, 0, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    // a cyan panel in the room so the chrome carries the division's light
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color("#00b4d8").multiplyScalar(6) }));
    panel.position.set(-4.5, 1.5, 2.5);
    panel.lookAt(0, 0, 0);
    room.add(panel);
    const env = pmrem.fromScene(room, 0.03).texture;

    const world = new THREE.Group();
    world.rotation.x = 0.32;
    scene.add(world);

    // globe dots
    const n = LAND_DOTS.length / 2;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = toVec(LAND_DOTS[i * 2] / 10, LAND_DOTS[i * 2 + 1] / 10, R_GLOBE);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dotGeo.setAttribute("normal", new THREE.BufferAttribute(pos.slice().map((x) => x / R_GLOBE), 3));
    const dotMat = new THREE.ShaderMaterial({
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      uniforms: { uSize: { value: 4.2 }, uPix: { value: pix }, uColor: { value: INK }, uFade: { value: 1 } },
      transparent: true,
      depthWrite: false,
    });
    const globe = new THREE.Group();
    globe.add(new THREE.Points(dotGeo, dotMat));
    world.add(globe);

    // the equator and one meridian as hairlines: the globe reads as a sphere
    const ringMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.16 });
    const ringPts = Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * R_GLOBE, 0, Math.sin(a) * R_GLOBE);
    });
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), ringMat));
    const merid = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), ringMat);
    merid.rotation.x = Math.PI / 2;
    globe.add(merid);

    // routes
    type Route = { mat: THREE.ShaderMaterial; head: THREE.Mesh; headMat: THREE.MeshBasicMaterial; curve: THREE.Vector3[]; t: number; dur: number; wait: number };
    const headGeo = new THREE.SphereGeometry(0.028, 12, 12);
    const routes: Route[] = [];
    const makeRoute = (): Route => {
      const a = HUBS[Math.floor(Math.random() * HUBS.length)];
      let b = a;
      while (b === a) b = HUBS[Math.floor(Math.random() * HUBS.length)];
      const va = toVec(a[0], a[1], 1);
      const vb = toVec(b[0], b[1], 1);
      const ang = va.angleTo(vb);
      const pts: THREE.Vector3[] = [];
      const us: number[] = [];
      for (let i = 0; i <= 64; i++) {
        const t = i / 64;
        const p = va.clone().lerp(vb, t).normalize();
        p.multiplyScalar(R_GLOBE * (1 + Math.sin(t * Math.PI) * (0.12 + ang * 0.14)));
        pts.push(p);
        us.push(t);
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      geo.setAttribute("u", new THREE.Float32BufferAttribute(us, 1));
      const mat = new THREE.ShaderMaterial({
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
        uniforms: { uColor: { value: SIGNAL }, uHead: { value: 0 }, uTail: { value: 0.55 }, uFade: { value: 1 } },
        transparent: true,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      const headMat = new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true });
      const head = new THREE.Mesh(headGeo, headMat);
      globe.add(line, head);
      return { mat, head, headMat, curve: pts, t: 0, dur: 1.6 + ang * 0.9, wait: Math.random() * 2.5 };
    };
    for (let i = 0; i < (phone ? 5 : 8); i++) routes.push(makeRoute());

    // chrome core (with the portal: the nucleus seen through its skin)
    const { mat: chrome, uniforms: coreU } = chromeMaterial(env, { shape: "sphere", radius: R_CORE, portal: !low });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, weak ? 32 : 56), chrome);
    world.add(core);

    // swarm
    const COUNT = reduced ? 0 : phone || weak ? 130 : 200;
    const agentGeo = new THREE.ConeGeometry(0.009, 0.045, 4);
    agentGeo.rotateX(Math.PI / 2);
    const agentMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    const agents = new THREE.InstancedMesh(agentGeo, agentMat, Math.max(COUNT, 1));
    agents.count = COUNT;
    const P = new Float32Array(COUNT * 3);
    const V = new Float32Array(COUNT * 3);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      tmp.randomDirection().multiplyScalar(2.05 + Math.random() * 0.35);
      P.set([tmp.x, tmp.y, tmp.z], i * 3);
      const tan = new THREE.Vector3(0, 1, 0).cross(tmp).normalize().multiplyScalar(0.5);
      V.set([tan.x, tan.y, tan.z], i * 3);
      agents.setColorAt(i, Math.random() < 0.22 ? SIGNAL : INK);
    }
    world.add(agents);

    // pointer: a ray into the scene, and the direction it points from the centre
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(0, 0);
    let over = false;
    let pullK = 0;
    const tiltT = new THREE.Vector2();
    const tilt = new THREE.Vector2();
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      tiltT.set(ndc.x, ndc.y);
      over = true;
      // pointer devices: over the core, the ring waits under the cursor as an
      // empty hairline (this is the thing you hold)
      if (e.pointerType !== "touch" && !pressing) hover(hitCore(e, r));
    };
    const onLeave = () => {
      over = false;
      tiltT.set(0, 0);
      if (!pressing) hover(null);
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    /* ── the dive: one scalar, everything below is a function of it ── */
    const dive = { v: 0 };
    /** low devices: the hold only swells the mercury */
    const swell = { v: 0 };
    let pressing = false;
    let armed = false;
    let crossed = false;
    let lowHold = false;
    let wasInside = false;
    let wobble = 0;
    let pointerId: number | null = null;
    let pressType: "mouse" | "pen" | "touch" | "key" = "mouse";
    let pressedAt = 0;
    let downX = 0;
    let downY = 0;
    let moved = 0;
    let armTimer = 0;
    let seenTimer = 0;
    let nucleus: Nucleus | null = null;
    let rt: THREE.WebGLRenderTarget | null = null;
    const rtScale = dc === "high" ? 0.5 : 0.35;
    const halfOk = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
    const res = new THREE.Vector2();
    let seen = false;
    try {
      seen = window.sessionStorage.getItem("ai:dive-seen") === "1";
    } catch {
      // storage blocked: the hint simply stays
    }
    if (seen) hero?.setAttribute("data-dive-seen", "instant");

    let raf = 0;
    let pending = false;
    /** reduced motion: one frame per state change (draw is defined below; it only ever runs asynchronously) */
    function requestFrame() {
      if (!reduced || pending) return;
      pending = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame((now) => {
        pending = false;
        draw(now);
      });
    }

    let zHome = 7.2;
    let aspect = 1;
    /** the frame's half-diagonal angle: the core has filled the frame once its angular radius exceeds it */
    let hAngle = 0;
    let dCut = 1.5;
    let zEnd = 1.15;
    const size = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      aspect = w / h;
      camera.aspect = aspect;
      // keep the whole swarm in frame on tall (phone) figures
      zHome = aspect < 1 ? 7.2 / aspect ** 0.85 : 7.2;
      camera.position.z = zHome;
      camera.updateProjectionMatrix();
      hAngle = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * Math.sqrt(1 + aspect * aspect));
      // the distance at which the core's smallest silhouette covers the frame's
      // corners, and where the push ends: always past the cut, whatever the
      // figure's shape (1.15 on the 5:4 and 4:5 figures the plan was tuned on)
      dCut = R_CUT / Math.sin(hAngle);
      zEnd = Math.sqrt(Math.max(0.0025, Math.min(1.15, dCut * 0.9) ** 2 - CAM_Y * CAM_Y));
      renderer.getDrawingBufferSize(res);
      coreU.uRes.value.copy(res);
      nucleus?.resize(aspect);
      if (reduced) requestFrame();
    };

    const ensureNucleus = () => {
      if (nucleus || low) return;
      nucleus = buildNucleus(renderer, pmrem, {
        weak,
        aspect,
        exposure: renderer.toneMappingExposure,
        aces: renderer.toneMapping === THREE.ACESFilmicToneMapping,
      });
    };
    /**
     * Build the room and compile its programs while the visitor reads the
     * headline, so the first press never waits on a shader link. Once, in an
     * idle slice after the hero has been on screen a moment; never on "low".
     */
    let idleId = 0;
    let warmed = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const warm = () => {
      idleId = 0;
      if (warmed || low || !visible) return;
      warmed = true;
      ensureNucleus();
      ensureRT();
      nucleus?.warm(rt);
    };
    const scheduleWarm = () => {
      if (warmed || low || idleId) return;
      idleId = w.requestIdleCallback ? w.requestIdleCallback(warm, { timeout: 2500 }) : window.setTimeout(warm, 1200);
    };
    const cancelIdle = () => {
      if (!idleId) return;
      if (w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      idleId = 0;
    };

    const ensureRT = () => {
      renderer.getDrawingBufferSize(res);
      const w = Math.max(1, Math.round(res.x * rtScale));
      const h = Math.max(1, Math.round(res.y * rtScale));
      if (!rt) {
        rt = new THREE.WebGLRenderTarget(w, h, {
          type: halfOk ? THREE.HalfFloatType : THREE.UnsignedByteType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: true,
          stencilBuffer: false,
          generateMipmaps: false,
        });
      } else if (rt.width !== w || rt.height !== h) {
        rt.setSize(w, h);
      }
    };

    // the three tweens (none under reduced motion: a press toggles the state)
    const toV = (target: number, duration: number, ease: string) =>
      gsap.to(dive, { v: target, duration, ease, overwrite: true });
    const press = () => {
      if (reduced) {
        dive.v = dive.v > 0.5 ? 0 : 1;
        requestFrame();
        return;
      }
      toV(1, Math.max(0.25, 1.0 * (1 - dive.v)), "none");
    };
    const release = () => {
      if (reduced) return;
      toV(0, Math.max(0.25, 0.75 * dive.v), "power2.out");
    };
    const tap = () => {
      // under reduced motion the press already toggled the state
      if (reduced) return;
      // a half-second peek: the mercury bulges, the room glints through the
      // skin, and it settles back to rest (always to 0, wherever it started)
      gsap.to(dive, {
        keyframes: [
          { v: Math.max(PEEK, dive.v), duration: 0.34, ease: "power2.out" },
          { v: 0, duration: 0.46, ease: "power2.inOut" },
        ],
        overwrite: true,
      });
    };
    const lowPress = () => {
      lowHold = true;
      if (capRef.current) capRef.current.textContent = DIVE.captionLow;
      gsap.to(swell, { v: 1, duration: 0.6, ease: "power2.out", overwrite: true, onUpdate: reduced ? requestFrame : undefined });
    };
    const lowRelease = () => {
      lowHold = false;
      capForce = true;
      gsap.to(swell, { v: 0, duration: 0.5, ease: "power2.out", overwrite: true, onUpdate: reduced ? requestFrame : undefined });
    };

    let ringOn = false;
    let hovering = false;
    const placeRing = (x: number, y: number) => {
      ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    const showRing = (x: number, y: number) => {
      ringOn = true;
      placeRing(x, y);
      ring.setAttribute("data-on", "");
    };
    const hideRing = () => {
      ringOn = false;
      ring.removeAttribute("data-on");
    };
    const hover = (hit: { x: number; y: number } | null) => {
      if (hit && dive.v < 0.001 && !crossed) {
        placeRing(hit.x, hit.y);
        if (!hovering) {
          hovering = true;
          ring.setAttribute("data-hover", "");
          host.setAttribute("data-hot", "");
        }
      } else if (hovering) {
        hovering = false;
        ring.removeAttribute("data-hover");
        host.removeAttribute("data-hot");
      }
    };

    /** is this press on the core? Its projected disc, 1.25x for a forgiving thumb */
    const hitCore = (e: PointerEvent, rect?: DOMRect) => {
      const r = rect ?? host.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      tmp.set(0, 0, 0).project(camera);
      const cx = (tmp.x * 0.5 + 0.5) * r.width;
      const cy = (-tmp.y * 0.5 + 0.5) * r.height;
      const d = camera.position.length();
      const radPx = ((R_CORE * 1.12) / d / Math.tan((camera.fov * Math.PI) / 360)) * (r.height / 2);
      return Math.hypot(px - cx, py - cy) < radPx * 1.25 ? { x: px, y: py } : null;
    };

    let ringX = 0;
    let ringY = 0;
    const arm = () => {
      if (armed || !pressing) return;
      armed = true;
      if (pressType === "touch") host.style.touchAction = "none";
      showRing(ringX, ringY);
      if (low) lowPress();
      else {
        ensureNucleus();
        press();
      }
    };
    const endPress = () => {
      if (armTimer) {
        window.clearTimeout(armTimer);
        armTimer = 0;
      }
      if (pointerId !== null) {
        try {
          host.releasePointerCapture(pointerId);
        } catch {
          // already released
        }
        pointerId = null;
      }
      if (!pressing) return;
      pressing = false;
      const dur = performance.now() - pressedAt;
      if (pressType === "touch") onLeave();
      if (armed) {
        armed = false;
        host.style.touchAction = "";
        if (low) lowRelease();
        else if (dur < TAP_MS) tap();
        else release();
      } else if (!low && dur < TAP_MS && moved < TOUCH_SLOP) {
        // a touch that let go before it armed is still a tap: a peek
        // (a toggle under reduced motion, where there is no peek)
        ensureNucleus();
        if (reduced) press();
        else tap();
      }
      hideRing();
    };
    const onDown = (e: PointerEvent) => {
      if (pressing) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const hit = hitCore(e);
      if (!hit) return;
      onMove(e);
      pressing = true;
      pressType = e.pointerType === "touch" ? "touch" : e.pointerType === "pen" ? "pen" : "mouse";
      pointerId = e.pointerId;
      pressedAt = performance.now();
      downX = e.clientX;
      downY = e.clientY;
      moved = 0;
      ringX = hit.x;
      ringY = hit.y;
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        // capture unavailable: the window listeners still release
      }
      if (pressType === "touch") armTimer = window.setTimeout(arm, TOUCH_ARM_MS);
      else arm();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      // a touch that travels before it arms is a scroll, not a press
      if (!armed && pressType === "touch" && moved > TOUCH_SLOP) endPress();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      endPress();
    };
    const onLost = () => {
      if (pointerId !== null) endPress();
    };
    const onContext = (e: Event) => {
      if (pressing) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (e.repeat || pressing) return;
      pressing = true;
      pressType = "key";
      pressedAt = performance.now();
      moved = 0;
      ringX = host.clientWidth / 2;
      ringY = host.clientHeight / 2;
      arm();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && pressing && pressType === "key") endPress();
    };
    const onBlur = () => {
      if (pressing) endPress();
    };
    // once a touch has armed, the finger owns the core: small drifts of the
    // thumb must not start a scroll (the touch-action change only applies to
    // the next gesture, so the live one is held here)
    const onTouchMove = (e: TouchEvent) => {
      if (armed && pressType === "touch" && e.cancelable) e.preventDefault();
    };
    host.addEventListener("touchmove", onTouchMove, { passive: false });
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("lostpointercapture", onLost);
    host.addEventListener("contextmenu", onContext);
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);

    // the swarm's step: flocking on a shell round the globe, fleeing the pointer
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const invQ = new THREE.Quaternion();
    const fwd = new THREE.Vector3(0, 0, 1);
    const dir = new THREE.Vector3();
    const local = new THREE.Ray();
    const inv = new THREE.Matrix4();
    const near = new THREE.Vector3();
    const stepSwarm = (dt: number, flee: number, shell: number) => {
      // the pointer's ray in the world group's own space
      inv.copy(world.matrixWorld).invert();
      local.copy(ray.ray).applyMatrix4(inv);
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        const px = P[ix], py = P[ix + 1], pz = P[ix + 2];
        let ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0, k = 0;
        for (let j = 0; j < COUNT; j++) {
          if (j === i) continue;
          const jx = j * 3;
          const dx = P[jx] - px, dy = P[jx + 1] - py, dz = P[jx + 2] - pz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 0.25) continue;
          k++;
          cx += dx; cy += dy; cz += dz;
          vx += V[jx]; vy += V[jx + 1]; vz += V[jx + 2];
          if (d2 < 0.006) { const s = 0.006 / (d2 + 1e-4); ax -= dx * s; ay -= dy * s; az -= dz * s; }
        }
        if (k) {
          ax += (cx / k) * 1.1 + (vx / k - V[ix]) * 2.2;
          ay += (cy / k) * 1.1 + (vy / k - V[ix + 1]) * 2.2;
          az += (cz / k) * 1.1 + (vz / k - V[ix + 2]) * 2.2;
        }
        // hold the shell (it widens as the camera comes in: the swarm parts like a curtain)
        const r = Math.hypot(px, py, pz);
        const pull = (shell - r) * 5.0;
        ax += (px / r) * pull; ay += (py / r) * pull; az += (pz / r) * pull;
        // flee the pointer's ray
        if (over) {
          tmp.set(px, py, pz);
          local.closestPointToPoint(tmp, near);
          const dx = px - near.x, dy = py - near.y, dz = pz - near.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 0.36) { const s = (0.36 - d2) * 26 * flee; const d = Math.sqrt(d2) + 1e-3; ax += (dx / d) * s; ay += (dy / d) * s; az += (dz / d) * s; }
        }
        let nvx = V[ix] + ax * dt, nvy = V[ix + 1] + ay * dt, nvz = V[ix + 2] + az * dt;
        const sp = Math.hypot(nvx, nvy, nvz);
        const want = Math.min(Math.max(sp, 0.5), 1.4);
        nvx *= want / sp; nvy *= want / sp; nvz *= want / sp;
        V[ix] = nvx; V[ix + 1] = nvy; V[ix + 2] = nvz;
        P[ix] = px + nvx * dt; P[ix + 1] = py + nvy * dt; P[ix + 2] = pz + nvz * dt;
        tmp.set(P[ix], P[ix + 1], P[ix + 2]);
        dir.set(nvx, nvy, nvz).normalize();
        q.setFromUnitVectors(fwd, dir);
        m4.compose(tmp, q, near.set(1, 1, 1));
        agents.setMatrixAt(i, m4);
      }
      agents.instanceMatrix.needsUpdate = true;
    };

    let last = performance.now();
    let t = 0;
    let visible = true;
    let capT = 0;
    /** print the live caption on the next frame regardless of the once-a-second clock */
    let capForce = true;
    let frameIx = 0;
    // last written values, so the DOM is touched only on change
    let heroDiving = false;
    let lastTremble = -1;
    let lastDark = "";
    let lastCharge = false;
    let lastOffset = "";
    let clearInk = false;
    const setClear = (ink: boolean) => {
      if (ink === clearInk) return;
      clearInk = ink;
      if (ink) renderer.setClearColor(INK, 1);
      else renderer.setClearColor(0x000000, 0);
    };

    const draw = (now: number) => {
      // a rAF timestamp can precede the performance.now() taken just before it
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      t += dt;
      frameIx++;
      const v = low ? 0 : dive.v;

      /* ── the camera, in on the core as the hold deepens ── */
      const u = easeInCubic(sat(v / 0.7));
      camera.position.set(0, CAM_Y, lerp(zHome, zEnd, u));
      camera.lookAt(0, 0, 0);

      tilt.lerp(tiltT, 1 - Math.exp(-dt * 3));
      world.rotation.y = tilt.x * 0.45;
      world.rotation.x = 0.32 - tilt.y * 0.3;
      globe.rotation.y += dt * 0.08;
      world.updateMatrixWorld();

      /* ── the core: rising toward the pointer, or toward the lens while held ── */
      ray.setFromCamera(ndc, camera);
      pullK += ((over ? 1 : 0) - pullK) * (1 - Math.exp(-dt * 4));
      wobble *= Math.exp(-dt * 5);
      invQ.copy(world.quaternion).invert();
      if (v > 0.001) dir.copy(camera.position).applyQuaternion(invQ).normalize();
      else dir.copy(ray.ray.direction).negate().applyQuaternion(invQ).normalize();
      coreU.uPull.value.lerp(dir, 1 - Math.exp(-dt * 6)).normalize();
      // the mercury swells toward the lens, then relaxes flat before the crossing
      coreU.uPullK.value = Math.max(pullK + wobble, 1.6 * Math.sin(Math.PI * sat(v / 0.7)), low ? 1.2 * swell.v : 0);
      coreU.uTime.value = t;

      /* ── the globe thins and the swarm parts ── */
      const fade = 1 - smooth(0.25, 0.55, v);
      dotMat.uniforms.uFade.value = fade;
      ringMat.opacity = 0.16 * fade;
      globe.visible = fade > 0.002;
      for (const r of routes) {
        r.mat.uniforms.uFade.value = fade;
        r.headMat.opacity = fade;
        if (r.wait > 0) {
          r.wait -= dt;
          r.mat.uniforms.uHead.value = -1;
          r.head.visible = false;
          continue;
        }
        r.t += dt / r.dur;
        const h = r.t * 1.55; // the head runs to the end, then the tail follows it in
        r.mat.uniforms.uHead.value = h;
        r.head.visible = h <= 1;
        if (h <= 1) r.head.position.copy(r.curve[Math.min(64, Math.round(h * 64))]);
        if (h > 1 + 0.55) {
          r.t = 0;
          r.wait = 0.4 + Math.random() * 2.2;
        }
      }
      const swarmA = 1 - smooth(0.3, 0.6, v);
      agentMat.opacity = swarmA;
      agents.visible = swarmA > 0.002;

      /* ── the cut: once the core's disc covers the frame, the room is drawn straight to the screen ── */
      const d = camera.position.length();
      const a = Math.asin(Math.min(1, R_CUT / d));
      const crossedNow = !low && a > hAngle;
      // the last stretch before the cut: the skin stops bending the room
      coreU.uSeal.value = smooth(dCut * 1.45, dCut, d);
      if (crossedNow !== crossed) {
        crossed = crossedNow;
        root.toggleAttribute("data-crossed", crossed);
        host.setAttribute("aria-pressed", crossed ? "true" : "false");
        if (crossed) {
          ensureNucleus();
          wasInside = true;
          session.bump("dives");
          const req = session.mint();
          if (capRef.current) capRef.current.textContent = DIVE.captionInside(req.id, req.local, req.tz);
          if (!seen) {
            seen = true;
            try {
              window.sessionStorage.setItem("ai:dive-seen", "1");
            } catch {
              // storage blocked: the hint goes for this page load anyway
            }
            seenTimer = window.setTimeout(() => hero?.setAttribute("data-dive-seen", ""), 600);
          }
        } else {
          capForce = true; // the live count prints again this frame
        }
      }
      // the surface closes behind you: the mercury wobbles once
      if (wasInside && !crossed && v < 0.001 && !pressing) {
        wasInside = false;
        wobble += 0.6;
      }

      /* ── the page: tremble, the dark, the grain, the chrome ── */
      const diving = v > 0.0005;
      const dk = smooth(0.5, 0.72, v);
      const dkS = dk.toFixed(3);
      if (hero) {
        if (diving !== heroDiving) {
          heroDiving = diving;
          hero.toggleAttribute("data-diving", diving);
          if (!diving) {
            hero.style.setProperty("--tremble", "0px");
            hero.style.setProperty("--dive-dark", "0");
            lastTremble = -1;
          }
        }
        if (diving) {
          const tr = reduced || v <= 0.05 || v >= 0.62 ? 0 : 1.2 * sat((v - 0.05) / 0.25);
          if (tr !== lastTremble) {
            lastTremble = tr;
            hero.style.setProperty("--tremble", tr.toFixed(2) + "px");
          }
          if (tr > 0) {
            hero.style.setProperty("--tx", hash(frameIx).toFixed(2));
            hero.style.setProperty("--ty", hash(frameIx + 7919).toFixed(2));
          }
          if (dkS !== lastDark) hero.style.setProperty("--dive-dark", dkS);
        }
      }
      if (dkS !== lastDark) {
        lastDark = dkS;
        if (dark) dark.style.opacity = dkS;
      }
      const charge = v > 0.05;
      if (charge !== lastCharge) {
        lastCharge = charge;
        html.toggleAttribute("data-dive-charge", charge);
      }
      cleanDark("dive", v > 0.66);
      if (ringOn) {
        const fill = low ? 0.4 * swell.v : sat(v / 0.62);
        const off = (1 - fill).toFixed(3);
        if (off !== lastOffset) {
          lastOffset = off;
          circle.style.strokeDashoffset = off;
        }
      }

      /* ── render ── */
      if (COUNT && agents.visible) stepSwarm(dt, 1 + 6 * v, 2.2 + 1.4 * smooth(0, 0.5, v));
      const inner = crossed || v > 0.12 ? nucleus : null;
      if (inner) inner.update(t, v, tilt.x, tilt.y);
      if (crossed && inner) {
        setClear(true);
        renderer.render(inner.scene, inner.camera);
      } else {
        if (inner) {
          // the room through the skin: rendered small, sampled by the chrome
          ensureRT();
          setClear(true);
          renderer.setRenderTarget(rt);
          renderer.render(inner.scene, inner.camera);
          renderer.setRenderTarget(null);
          coreU.uPortal.value = rt ? rt.texture : null;
          coreU.uInside.value = smooth(0.2, 0.62, v);
        } else {
          coreU.uInside.value = 0;
        }
        setClear(false);
        renderer.render(scene, camera);
      }

      // the caption counts live routes once a second
      if (capRef.current && !crossed && !lowHold && (capForce || t - capT > 1)) {
        capT = t;
        capForce = false;
        const live = routes.filter((r) => r.wait <= 0).length;
        capRef.current.textContent = `${live} tools running · live`;
      }
      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      pending = false;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting && !document.hidden;
        if (visible) {
          start();
          scheduleWarm();
        }
        // scrolling away always lets go
        if (pressing && e.intersectionRatio < IO_RELEASE) endPress();
      },
      { threshold: [0, IO_RELEASE] },
    );
    io.observe(host);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) start();
      else if (pressing) endPress();
    };
    document.addEventListener("visibilitychange", onVis);
    if (reduced) {
      // one settled frame: routes resting mid-flight
      for (const r of routes) { r.wait = 0; r.t = 0.35; }
    }
    start();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(armTimer);
      window.clearTimeout(seenTimer);
      gsap.killTweensOf(dive);
      gsap.killTweensOf(swell);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("lostpointercapture", onLost);
      host.removeEventListener("contextmenu", onContext);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("keyup", onKeyUp);
      host.removeEventListener("touchmove", onTouchMove);
      cancelIdle();
      cleanDark.leave("dive");
      html.removeAttribute("data-dive-charge");
      if (hero) {
        hero.removeAttribute("data-diving");
        hero.style.removeProperty("--tremble");
        hero.style.removeProperty("--tx");
        hero.style.removeProperty("--ty");
        hero.style.removeProperty("--dive-dark");
      }
      if (dark) {
        if (ownDark) dark.remove();
        else dark.style.opacity = "0";
      }
      root.removeAttribute("data-crossed");
      host.style.touchAction = "";
      renderer.setRenderTarget(null);
      nucleus?.dispose();
      rt?.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((x) => x.dispose());
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [label]);

  return (
    <div ref={rootRef} className={`ai-core ${className ?? ""}`}>
      <div
        ref={hostRef}
        className="ai-core__stage"
        role="button"
        tabIndex={0}
        aria-label={DIVE.aria}
        aria-pressed={false}
        aria-describedby={descId}
      />
      <svg ref={ringRef} className="ai-dive__ring" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <circle className="ai-dive__track" cx="36" cy="36" r="34" />
        <circle ref={circleRef} className="ai-dive__fill" cx="36" cy="36" r="34" pathLength={1} />
      </svg>
      <span aria-hidden="true" className="ai-core__tick ai-core__tick--tl" />
      <span aria-hidden="true" className="ai-core__tick ai-core__tick--br" />
      <span className="ai-core__cap font-mono" aria-hidden="true">
        <i className="ai-core__live" />
        <span ref={capRef}>tools running · live</span>
      </span>
      <p id={descId} className="sr-only">
        {label} {DIVE.inside}
      </p>
    </div>
  );
}

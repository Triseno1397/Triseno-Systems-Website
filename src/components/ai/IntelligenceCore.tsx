"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { deviceClass } from "@/lib/device";
import { LAND_DOTS } from "./landDots";

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
 * Plain three.js on one canvas. It draws only while on screen and the tab is
 * visible; reduced motion gets one still frame. Phones and weak machines get
 * fewer agents and a lower pixel ratio. No WebGL: the figure stays empty and
 * the copy carries the hero.
 */

const INK = new THREE.Color("#0b0e0f");
const SIGNAL = new THREE.Color("#00b4d8");
const R_GLOBE = 1.55;
const R_CORE = 0.66;

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
varying float vFace;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.36, d) * mix(0.14, 0.82, smoothstep(-0.35, 0.45, vFace));
  gl_FragColor = vec4(uColor, a);
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
varying float vU;
void main() {
  float behind = uHead - vU;
  if (behind < 0.0 || behind > uTail) discard;
  float a = 1.0 - behind / uTail;
  gl_FragColor = vec4(uColor, a * a * 0.95);
}`;

/* ── the chrome core: displaced in the vertex shader, normals rebuilt ──── */
function chromeMaterial(env: THREE.Texture) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dfe7ea"),
    metalness: 1,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMap: env,
    envMapIntensity: 1.25,
  });
  const uniforms = { uTime: { value: 0 }, uPull: { value: new THREE.Vector3(0, 0, 1) }, uPullK: { value: 0 } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform vec3 uPull;
uniform float uPullK;
vec3 h3(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
float gn(vec3 p) { vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dot(h3(i), f), dot(h3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                 mix(dot(h3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(h3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
             mix(mix(dot(h3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(h3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                 mix(dot(h3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(h3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z); }
// how far the surface stands out along a direction on the unit sphere
float lift(vec3 n) {
  float slow = gn(n * 1.1 + vec3(0.0, uTime * 0.16, uTime * 0.1)) * 0.075
             + gn(n * 2.2 - vec3(uTime * 0.2, 0.0, 0.0)) * 0.018;
  float toward = pow(max(dot(n, uPull), 0.0), 5.0) * 0.17 * uPullK;
  return slow + toward;
}`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `vec3 n0 = normalize(position);
vec3 tA = normalize(cross(n0, abs(n0.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
vec3 tB = cross(n0, tA);
float e = 0.035;
vec3 pC = n0 * (${R_CORE.toFixed(3)} + lift(n0));
vec3 nA = normalize(n0 + tA * e); vec3 pA = nA * (${R_CORE.toFixed(3)} + lift(nA));
vec3 nB = normalize(n0 + tB * e); vec3 pB = nB * (${R_CORE.toFixed(3)} + lift(nB));
vec3 objectNormal = normalize(cross(pA - pC, pB - pC));
if (dot(objectNormal, n0) < 0.0) objectNormal = -objectNormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`,
      )
      .replace("#include <begin_vertex>", "vec3 transformed = pC;");
  };
  return { mat, uniforms };
}

export default function IntelligenceCore({ className, label }: { className?: string; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const weak = deviceClass() !== "high";

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const pix = Math.min(window.devicePixelRatio || 1, weak ? 1.25 : 2);
    renderer.setPixelRatio(pix);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.25, 7.2);
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
      uniforms: { uSize: { value: 4.2 }, uPix: { value: pix }, uColor: { value: INK } },
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
    type Route = { mat: THREE.ShaderMaterial; head: THREE.Mesh; curve: THREE.Vector3[]; t: number; dur: number; wait: number };
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
        uniforms: { uColor: { value: SIGNAL }, uHead: { value: 0 }, uTail: { value: 0.55 } },
        transparent: true,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true }));
      globe.add(line, head);
      return { mat, head, curve: pts, t: 0, dur: 1.6 + ang * 0.9, wait: Math.random() * 2.5 };
    };
    for (let i = 0; i < (phone ? 5 : 8); i++) routes.push(makeRoute());

    // chrome core
    const { mat: chrome, uniforms: coreU } = chromeMaterial(env);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, weak ? 32 : 56), chrome);
    world.add(core);

    // swarm
    const COUNT = reduced ? 0 : phone || weak ? 130 : 200;
    const agentGeo = new THREE.ConeGeometry(0.009, 0.045, 4);
    agentGeo.rotateX(Math.PI / 2);
    const agentMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
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
    };
    const onLeave = () => {
      over = false;
      tiltT.set(0, 0);
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    const size = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the whole swarm in frame on tall (phone) figures
      camera.position.z = w / h < 1 ? 7.2 / (w / h) ** 0.85 : 7.2;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);

    // the swarm's step: flocking on a shell round the globe, fleeing the pointer
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const fwd = new THREE.Vector3(0, 0, 1);
    const dir = new THREE.Vector3();
    const local = new THREE.Ray();
    const inv = new THREE.Matrix4();
    const near = new THREE.Vector3();
    const stepSwarm = (dt: number) => {
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
        // hold the shell
        const r = Math.hypot(px, py, pz);
        const pull = (2.2 - r) * 5.0;
        ax += (px / r) * pull; ay += (py / r) * pull; az += (pz / r) * pull;
        // flee the pointer's ray
        if (over) {
          tmp.set(px, py, pz);
          local.closestPointToPoint(tmp, near);
          const dx = px - near.x, dy = py - near.y, dz = pz - near.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 0.36) { const s = (0.36 - d2) * 26; const d = Math.sqrt(d2) + 1e-3; ax += (dx / d) * s; ay += (dy / d) * s; az += (dz / d) * s; }
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

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let visible = true;
    let capT = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      tilt.lerp(tiltT, 1 - Math.exp(-dt * 3));
      world.rotation.y = tilt.x * 0.45;
      world.rotation.x = 0.32 - tilt.y * 0.3;
      globe.rotation.y += dt * 0.08;
      world.updateMatrixWorld();

      ray.setFromCamera(ndc, camera);
      pullK += ((over ? 1 : 0) - pullK) * (1 - Math.exp(-dt * 4));
      // the core rises toward where the pointer is, in the core's own space
      dir.copy(ray.ray.direction).negate().applyQuaternion(world.quaternion.clone().invert()).normalize();
      coreU.uPull.value.lerp(dir, 1 - Math.exp(-dt * 6)).normalize();
      coreU.uPullK.value = pullK;
      coreU.uTime.value = t;

      for (const r of routes) {
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

      if (COUNT) stepSwarm(dt);
      renderer.render(scene, camera);

      // the caption counts live routes once a second
      if (capRef.current && t - capT > 1) {
        capT = t;
        const live = routes.filter((r) => r.wait <= 0).length;
        capRef.current.textContent = `${COUNT || 200} agents · ${live} routes live`;
      }
      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start();
    });
    io.observe(host);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) start();
    };
    document.addEventListener("visibilitychange", onVis);
    if (reduced) {
      // one settled frame: routes resting mid-flight
      for (const r of routes) { r.wait = 0; r.t = 0.35; }
    }
    start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
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
  }, []);

  return (
    <div className={`ai-core ${className ?? ""}`}>
      <div ref={hostRef} className="ai-core__stage" role="img" aria-label={label} />
      <span aria-hidden="true" className="ai-core__tick ai-core__tick--tl" />
      <span aria-hidden="true" className="ai-core__tick ai-core__tick--br" />
      <span className="ai-core__cap font-mono" aria-hidden="true">
        <i className="ai-core__live" />
        <span ref={capRef}>200 agents · routes live</span>
      </span>
    </div>
  );
}

import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MARK_OUTLINE } from "@/components/portal/markOutline";

/* ─────────────────────────────────────────────────────────────────────────
   THE NUCLEUS — the room inside the hero's chrome core.

   Hold the core and the camera pushes through its skin into a near-black
   dome ruled with a faint drafting grid, facing the Triseno TS cast in the
   same liquid chrome you just fell through, the size of the frame, turning
   slowly, two cyan routes orbiting it. This module owns two things:

   · chromeMaterial(env, opts) — the ONE chrome recipe on the page. The hero
     core is a unit icosahedron the vertex shader displaces onto a sphere of
     R_CORE + lift (noise + a rise toward the pointer) with normals rebuilt by
     finite differences; the emblem is an extruded mesh that the same lift
     ripples along its own normals, its normals tilted by the lift's gradient
     so the reflections swim while the bevels stay crisp (uLiftK 0.25). The
     core's instance also carries the portal: a render target of this room
     sampled through the skin, so the cut from outside to inside is
     continuous.
   · buildNucleus(renderer, pmrem, opts) — the room: dome, floor, emblem,
     routes, one point light, its own PMREM environment and camera. Built
     lazily on the first press, cached, disposed with the hero.

   The emblem is MARK_OUTLINE itself (the traced logo, y-up), extruded and
   bevelled: never a redrawn approximation. The dome's ink is solved so that
   after the renderer's ACES tone mapping it lands on the page's --ink, so the
   figure's frame edge vanishes into the fixed dark layer under it.
   ───────────────────────────────────────────────────────────────────────── */

export const INK_HEX = "#0b0e0f";
export const PAPER_HEX = "#e6e9e8";
export const SIGNAL_HEX = "#00b4d8";

/** where the emblem stands on the inner camera's axis */
export const EMBLEM_Z = -2.4;
/** the inner camera's field of view (vertical, degrees) */
export const NUCLEUS_FOV = 46;

/* ── the chrome ──────────────────────────────────────────────────────── */

export type ChromeShape = "sphere" | "mesh";

export interface ChromeOptions {
  /** "sphere": a unit sphere displaced onto `radius` + lift (the core); "mesh": any geometry, lifted along its normals (the emblem) */
  shape?: ChromeShape;
  /** the sphere's resting radius */
  radius?: number;
  /** multiplies the lift: 1 for the core, 0.25 for the emblem so its bevels stay crisp */
  liftK?: number;
  /** sample a render target through the skin (the core only) */
  portal?: boolean;
}

export interface ChromeUniforms {
  uTime: { value: number };
  uPull: { value: THREE.Vector3 };
  uPullK: { value: number };
  uLiftK: { value: number };
  uPortal: { value: THREE.Texture | null };
  uInside: { value: number };
  /** 0..1: as the camera reaches the cut, the skin stops bending the room and the last chrome goes, so the cut has nothing to jump */
  uSeal: { value: number };
  uRes: { value: THREE.Vector2 };
}

/** the noise and the lift, shared by both shapes */
const LIFT_GLSL = /* glsl */ `
uniform float uTime;
uniform vec3 uPull;
uniform float uPullK;
uniform float uLiftK;
vec3 h3(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
float gn(vec3 p) { vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dot(h3(i), f), dot(h3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                 mix(dot(h3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(h3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
             mix(mix(dot(h3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(h3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                 mix(dot(h3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(h3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z); }
// how far the surface stands out: a slow swell sampled over p, and a rise toward uPull along n
float lift(vec3 p, vec3 n) {
  float slow = gn(p * 1.1 + vec3(0.0, uTime * 0.16, uTime * 0.1)) * 0.075
             + gn(p * 2.2 - vec3(uTime * 0.2, 0.0, 0.0)) * 0.018;
  float toward = pow(max(dot(n, uPull), 0.0), 5.0) * 0.17 * uPullK;
  return (slow + toward) * uLiftK;
}`;

/**
 * Liquid chrome: a clearcoated metal whose surface never stops moving. One
 * recipe for the hero core and the emblem inside it.
 */
export function chromeMaterial(env: THREE.Texture, opts: ChromeOptions = {}): { mat: THREE.MeshPhysicalMaterial; uniforms: ChromeUniforms } {
  const shape: ChromeShape = opts.shape ?? "sphere";
  const radius = opts.radius ?? 0.66;
  const portal = !!opts.portal;
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#dfe7ea"),
    metalness: 1,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMap: env,
    envMapIntensity: 1.25,
  });
  const uniforms: ChromeUniforms = {
    uTime: { value: 0 },
    uPull: { value: new THREE.Vector3(0, 0, 1) },
    uPullK: { value: 0 },
    uLiftK: { value: opts.liftK ?? 1 },
    uPortal: { value: null },
    uInside: { value: 0 },
    uSeal: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  };
  const R = radius.toFixed(3);
  // the sphere: project the unit icosahedron onto R + lift, rebuild the normal
  // from two neighbours on the surface (the original hero recipe, unchanged)
  const SPHERE_NORMAL = /* glsl */ `vec3 n0 = normalize(position);
vec3 tA = normalize(cross(n0, abs(n0.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
vec3 tB = cross(n0, tA);
float e = 0.035;
vec3 pC = n0 * (${R} + lift(n0, n0));
vec3 nA = normalize(n0 + tA * e); vec3 pA = nA * (${R} + lift(nA, nA));
vec3 nB = normalize(n0 + tB * e); vec3 pB = nB * (${R} + lift(nB, nB));
vec3 objectNormal = normalize(cross(pA - pC, pB - pC));
if (dot(objectNormal, n0) < 0.0) objectNormal = -objectNormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`;
  // the mesh: lift along the geometry's own normal, sampled over its position
  // (a flat face has one normal, so the swell must live in position space),
  // and tilt the normal by the lift's tangential gradient: the reflections
  // swim across the faces while the extrusion keeps its edges
  const MESH_NORMAL = /* glsl */ `vec3 n0 = normalize(normal);
vec3 tA = normalize(cross(n0, abs(n0.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
vec3 tB = cross(n0, tA);
float e = 0.06;
float lC = lift(position * 0.8, n0);
float lA = lift((position + tA * e) * 0.8, n0);
float lB = lift((position + tB * e) * 0.8, n0);
vec3 objectNormal = normalize(n0 - (tA * (lA - lC) + tB * (lB - lC)) * (3.0 / e));
vec3 pC = position + n0 * lC;
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${LIFT_GLSL}`)
      .replace("#include <beginnormal_vertex>", shape === "sphere" ? SPHERE_NORMAL : MESH_NORMAL)
      .replace("#include <begin_vertex>", "vec3 transformed = pC;");
    if (portal) {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform sampler2D uPortal;
uniform float uInside;
uniform float uSeal;
uniform vec2 uRes;`,
        )
        .replace(
          "#include <opaque_fragment>",
          `#include <opaque_fragment>
{
  // the room inside, seen through the skin: the render target at this
  // pixel, bent a little by the surface; 8% of chrome stays so it reads as
  // glass. Both go to zero as the camera reaches the cut (uSeal), so the
  // last frame through the skin is the first frame inside.
  vec2 suv = gl_FragCoord.xy / uRes;
  vec2 bend = normalize(vNormal).xy * 0.06 * uInside * (1.0 - uSeal);
  vec3 inner = texture2D(uPortal, clamp(suv + bend, 0.0, 1.0)).rgb;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, inner, uInside * mix(0.92, 1.0, uSeal));
}`,
        );
    }
  };
  // the two shapes compile different programs from the same closure
  mat.customProgramCacheKey = () => `triseno-chrome:${shape}:${portal ? 1 : 0}:${R}`;
  return { mat, uniforms };
}

/* ── colours that survive the tone mapper ────────────────────────────── */

/** ACES filmic as three applies it (exposure folded in, the 1/0.6 pre-scale), one grey channel */
function acesGrey(x: number, exposure: number): number {
  const v = (x * exposure) / 0.6;
  const a = (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  return Math.min(1, Math.max(0, a));
}

/**
 * The linear colour that tone-maps to `hex` under ACES at `exposure` (or
 * `hex` itself when the renderer does not tone-map). The dome is drawn in
 * this so the ink on the canvas matches the page's --ink to the pixel.
 */
export function preToneMap(hex: string, exposure: number, aces: boolean): THREE.Color {
  const c = new THREE.Color(hex);
  if (!aces) return c;
  const solve = (want: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (acesGrey(mid, exposure) < want) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  return new THREE.Color(solve(c.r), solve(c.g), solve(c.b));
}

/** mix two sRGB hex colours in sRGB (what CSS rgba() over a background does) */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return "#" + [ch(16), ch(8), ch(0)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

/* ── the dome and the floor ──────────────────────────────────────────── */

/** a 1px hairline wherever x crosses an integer, antialiased, fading out once the cells are under two pixels */
const HAIR_GLSL = /* glsl */ `
float hair(float x) {
  float w = fwidth(x);
  float d = abs(fract(x + 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.0, max(w, 1e-4), d);
  return line * (1.0 - smoothstep(0.3, 0.6, w));
}`;

/**
 * The canvas is only the hero's figure; outside it the viewport is the flat
 * ink of the fixed dark layer. Every ruled or lit thing in the room fades out
 * toward the frame's edges (screen space, from the clip position), so the
 * figure's rectangle never shows and the room reads as the whole screen.
 */
const EDGE_GLSL = /* glsl */ `
float frameEdge(vec4 clip) {
  vec2 q = abs(clip.xy / clip.w);
  return (1.0 - smoothstep(0.58, 0.97, q.x)) * (1.0 - smoothstep(0.58, 0.97, q.y));
}`;

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
varying vec4 vClip;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vClip = gl_Position; }`;

const DOME_FRAG = /* glsl */ `
#include <common>
uniform vec3 uInk;
uniform vec3 uLine;
uniform vec3 uSignal;
uniform float uGlow;
varying vec3 vDir;
varying vec4 vClip;
${HAIR_GLSL}
${EDGE_GLSL}
void main() {
  vec3 d = normalize(vDir);
  float edge = frameEdge(vClip);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float lon = atan(d.z, d.x);
  float k = 18.0 / PI;
  float lines = max(hair(lat * k), hair(lon * k));
  // the rules are strongest at the horizon and thin out toward both poles
  float fade = (1.0 - smoothstep(0.0, 0.85, d.y)) * (1.0 - smoothstep(0.55, 0.98, -d.y));
  float glow = pow(max(dot(d, vec3(0.0, 0.0, -1.0)), 0.0), 9.0) * uGlow;
  vec3 col = mix(uInk, uLine, lines * fade * edge) + uSignal * glow * edge * edge;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const FLOOR_VERT = /* glsl */ `
varying vec2 vXZ;
varying vec4 vClip;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vXZ = w.xz; gl_Position = projectionMatrix * viewMatrix * w; vClip = gl_Position; }`;

const FLOOR_FRAG = /* glsl */ `
uniform vec3 uLine;
uniform float uAlpha;
varying vec2 vXZ;
varying vec4 vClip;
${HAIR_GLSL}
${EDGE_GLSL}
void main() {
  vec2 g = vXZ / 0.25;
  float lines = max(hair(g.x), hair(g.y));
  float fall = max(0.0, 1.0 - dot(vXZ, vXZ) / 36.0);
  float a = lines * fall * uAlpha * frameEdge(vClip);
  if (a < 0.002) discard;
  gl_FragColor = vec4(uLine, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ── the two orbits: a ring drawn by its own travelling head ───────────
   The hero's route recipe (a head, a tail that fades behind it) on a closed
   circle, so the tail wraps; faded toward the frame's edges like the rules. */
const ORBIT_VERT = /* glsl */ `
attribute float u;
varying float vU;
varying vec4 vClip;
void main() { vU = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vClip = gl_Position; }`;

const ORBIT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uHead;
uniform float uTail;
uniform float uFade;
varying float vU;
varying vec4 vClip;
${EDGE_GLSL}
void main() {
  float behind = fract(uHead - vU);
  if (behind > uTail) discard;
  float a = 1.0 - behind / uTail;
  gl_FragColor = vec4(uColor, a * a * 0.95 * uFade * frameEdge(vClip));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ── the room ────────────────────────────────────────────────────────── */

export interface NucleusOptions {
  /** fewer segments and a lighter dome on weak machines */
  weak: boolean;
  /** the hero canvas's aspect at build time */
  aspect: number;
  /** renderer.toneMappingExposure, and whether the renderer tone-maps with ACES */
  exposure: number;
  aces: boolean;
}

export interface Nucleus {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** the emblem */
  group: THREE.Group;
  light: THREE.PointLight;
  envDark: THREE.Texture;
  /** the camera's resting distance from the emblem for the current aspect */
  restDistance: number;
  /** the hero canvas changed shape: re-fit the emblem and the camera */
  resize(aspect: number): void;
  /** t seconds; v the dive scalar 0..1; tilt the hero pointer, -1..1 */
  update(t: number, v: number, tiltX: number, tiltY: number): void;
  /**
   * Compile every program the room needs before the first press: once for the
   * render target (no tone mapping there) and once for the screen, so neither
   * the first glimpse through the skin nor the cut waits on a shader link.
   */
  warm(target: THREE.WebGLRenderTarget | null): void;
  dispose(): void;
}

/** the mark's outline box (y-up, 0.92 across the longer side) */
function markBox(): { cx: number; cy: number; w: number; h: number } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const loop of MARK_OUTLINE) {
    for (const [x, y] of loop) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export function buildNucleus(renderer: THREE.WebGLRenderer, pmrem: THREE.PMREMGenerator, opts: NucleusOptions): Nucleus {
  const { weak } = opts;
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(NUCLEUS_FOV, opts.aspect, 0.05, 40);

  // (iv) the environment the emblem reflects: a black room with one sheet of
  // paper-white light overhead, a cyan panel to the left and a faint grey
  // floor so the form never disappears into pure black
  const envScene = new THREE.Scene();
  const black = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAPER_HEX) }));
  sheet.position.set(0, 3, 0);
  sheet.lookAt(0, 0, 0);
  const cyan = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(SIGNAL_HEX).multiplyScalar(3) }));
  cyan.position.set(-3, 0.2, 0);
  cyan.lookAt(0, 0, 0);
  const floorLight = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x222729) }));
  floorLight.position.set(0, -3.2, 0);
  floorLight.lookAt(0, 0, 0);
  const backLight = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9aa3a6) }));
  backLight.position.set(2.8, 1.2, -2.2);
  backLight.lookAt(0, 0, 0);
  // behind the viewer: a wide softbox over a dark horizon and one thin strip
  // under it. The emblem's faces look straight back at the camera, so this is
  // what they mirror: a bright upper field, a dark band, a line of light; as
  // the mark turns, the band slides across the faces like mercury
  const front = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAPER_HEX).multiplyScalar(0.9) }));
  front.position.set(0.6, 1.9, 4.2);
  front.lookAt(0, 0, 0);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAPER_HEX).multiplyScalar(1.4) }));
  strip.position.set(0, -0.55, 4.4);
  strip.lookAt(0, 0, 0);
  const frontCyan = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(SIGNAL_HEX).multiplyScalar(1.3) }));
  frontCyan.position.set(-3.6, 0.2, 3.0);
  frontCyan.lookAt(0, 0, 0);
  const envMeshes = [black, sheet, cyan, floorLight, backLight, front, strip, frontCyan];
  envScene.add(...envMeshes);
  const envDark = keep(pmrem.fromScene(envScene, 0.04).texture);
  for (const m of envMeshes) {
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  }

  // the inks, solved against the tone mapper so the canvas matches the CSS
  const ink = preToneMap(INK_HEX, opts.exposure, opts.aces);
  const domeLine = preToneMap(mixHex(INK_HEX, PAPER_HEX, 0.08), opts.exposure, opts.aces);
  const paper = preToneMap(PAPER_HEX, opts.exposure, opts.aces);
  const signal = new THREE.Color(SIGNAL_HEX);

  // (i) the dome: near-black, ruled every 10 degrees, a cyan glow behind the emblem
  const domeMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      uniforms: { uInk: { value: ink }, uLine: { value: domeLine }, uSignal: { value: signal }, uGlow: { value: 0.11 } },
      side: THREE.BackSide,
      depthWrite: true,
    }),
  );
  const dome = new THREE.Mesh(keep(new THREE.SphereGeometry(6, weak ? 32 : 48, weak ? 16 : 32)), domeMat);
  scene.add(dome);

  // (ii) the floor: the paper's 32px grid continuing into the dark
  const floorMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      uniforms: { uLine: { value: paper }, uAlpha: { value: 0.14 } },
      transparent: true,
      depthWrite: false,
    }),
  );
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(12, 12)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.6;
  scene.add(floor);

  // (iii) the emblem: the traced mark, extruded and bevelled, in the chrome
  const shapes = MARK_OUTLINE.map((pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  const raw = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: weak ? 8 : 12,
  });
  // smooth the bevel's steps into one rounded lip; the outline's own corners stay sharp
  const markGeo = keep(toCreasedNormals(raw, 0.8));
  if (markGeo !== raw) raw.dispose();
  markGeo.center();
  const box = markBox();
  const { mat: markMat, uniforms: markU } = chromeMaterial(envDark, { shape: "mesh", liftK: 0.25 });
  keep(markMat);
  const mark = new THREE.Mesh(markGeo, markMat);
  const group = new THREE.Group();
  group.add(mark);
  group.position.set(0, 0, EMBLEM_Z);
  scene.add(group);

  // (v) two routes orbiting the emblem, each drawn by its own travelling head
  // (the hero's route recipe; the tail wraps so the circle never breaks)
  const orbits: THREE.ShaderMaterial[] = [];
  const makeOrbit = (tiltX: number, tiltZ: number) => {
    const pts: THREE.Vector3[] = [];
    const us: number[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0));
      us.push(i / 128);
    }
    const geo = keep(new THREE.BufferGeometry().setFromPoints(pts));
    geo.setAttribute("u", new THREE.Float32BufferAttribute(us, 1));
    const m = keep(
      new THREE.ShaderMaterial({
        vertexShader: ORBIT_VERT,
        fragmentShader: ORBIT_FRAG,
        uniforms: { uColor: { value: signal }, uHead: { value: 0 }, uTail: { value: 0.55 }, uFade: { value: 1 } },
        transparent: true,
        depthWrite: false,
      }),
    );
    const line = new THREE.Line(geo, m);
    line.rotation.set(tiltX, 0, tiltZ);
    line.position.set(0, 0, EMBLEM_Z);
    scene.add(line);
    orbits.push(m);
  };
  makeOrbit((35 * Math.PI) / 180, 0.35);
  makeOrbit((-20 * Math.PI) / 180, -0.9);

  // (vi) one cyan light between the camera and the emblem, off until the crossing
  const light = new THREE.PointLight(signal, 0, 6, 2);
  light.position.set(0, 0.4, -0.4);
  scene.add(light);

  // fit: the whole mark in frame with air round it, whatever the canvas shape
  const FIT = 0.72;
  let restDistance = 4;
  let baseScale = 1;
  const resize = (aspect: number) => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const width = aspect < 1 ? 2.4 : 3.2;
    baseScale = width / box.w;
    const height = box.h * baseScale;
    const t = Math.tan((NUCLEUS_FOV * Math.PI) / 360);
    restDistance = Math.max(height / FIT / (2 * t), width / FIT / (2 * t * aspect));
  };
  resize(opts.aspect);

  const update = (t: number, v: number, tiltX: number, tiltY: number) => {
    const k = easeOutCubic(sat((v - 0.62) / 0.38));
    camera.position.set(0, 0.3, EMBLEM_Z + restDistance + 1.6 * (1 - k));
    camera.lookAt(0, 0, EMBLEM_Z);
    group.rotation.y = 0.25 * Math.sin(t * 0.35) + tiltX * 0.2;
    group.rotation.x = 0.08 * Math.sin(t * 0.27) - tiltY * 0.06;
    const s = baseScale * (0.85 + 0.15 * smooth(0.62, 1, v));
    group.scale.setScalar(s);
    light.intensity = 5 * smooth(0.62, 0.8, v);
    markU.uTime.value = t;
    orbits[0].uniforms.uHead.value = (t * 0.18) % 1;
    orbits[1].uniforms.uHead.value = (t * 0.18 + 0.5) % 1;
  };

  const warm = (target: THREE.WebGLRenderTarget | null) => {
    const prev = renderer.getRenderTarget();
    update(0, 1, 0, 0);
    try {
      if (target) {
        renderer.setRenderTarget(target);
        renderer.compile(scene, camera);
      }
      renderer.setRenderTarget(null);
      renderer.compile(scene, camera);
    } finally {
      renderer.setRenderTarget(prev);
    }
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
    scene.clear();
  };

  return {
    scene,
    camera,
    group,
    light,
    envDark,
    get restDistance() {
      return restDistance;
    },
    resize,
    update,
    warm,
    dispose,
  };
}

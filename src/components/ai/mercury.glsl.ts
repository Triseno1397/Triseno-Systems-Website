/* ─────────────────────────────────────────────────────────────────────────
   INK MERCURY — one raymarched fragment shader, WebGL1.

   Nineteen spheres in a smooth-min union, seen straight down. Rays run along
   -z from z = uZ0 in stage pixels, so plane z = 0 maps 1:1 onto the stage:
   the DOM trail, floors, bus and tags are registered with no projection.
   Each body rests on the sheet (its centre at z = r). The union's radius uK
   is what makes two bodies reach for each other and neck: 10 px while they
   lie apart, 46 while they merge, 18 once they have settled.

   The material is deliberately not the hero's chrome. It is ink-black metal
   whose only environment is the sheet it rests on: the paper reflects below
   the horizon (the rim), the room above it is dark (the cap), the drafting
   grid bends across the reflection, one paper-white highlight rakes it, and
   a Fresnel term brightens the grazing edge. Cyan appears only where an
   agent wets the paper, as a 1.5 px meniscus hugging the silhouette.

   Pixels that miss the union land on the sheet and get the matte contact
   under every body (a rendered shadow, not a UI one). Output is premultiplied
   with alpha 0 elsewhere, so paper, grid and grain show through.

   uBalls[i] = (x, y, r, w): stage px, radius px (0 = absent), meniscus weight.
   Slots: 0-11 the step beads, 12-16 the agent bodies, 17 the drag ghost,
   18 the pointer's drop.
   ───────────────────────────────────────────────────────────────────────── */

export const BALLS = 19;
export const BEAD_N = 12;
export const AGENT_0 = 12;
export const AGENT_N = 5;
export const GHOST = 17;
export const POINTER = 18;

export const MERCURY_VERT = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/**
 * The fragment shader, with the march length baked in (40 / 32 / 24 by
 * device class). `derivatives` enables OES_standard_derivatives for the
 * reflected grid's anti-aliasing; without it the lines take a fixed width.
 */
export function mercuryFrag(steps: number, derivatives: boolean): string {
  return `${derivatives ? "#extension GL_OES_standard_derivatives : enable" : ""}
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define N ${BALLS}
#define STEPS ${Math.max(8, Math.round(steps))}
${derivatives ? "#define FW(g) max(fwidth(g), vec2(1e-4))" : "#define FW(g) vec2(0.06)"}

uniform vec4 uBalls[N];
uniform float uK;
uniform float uZ0;
uniform vec2 uRes;
uniform float uInvDpr;
uniform float uSettle;

const vec3 PAPER = vec3(0.902, 0.914, 0.910);
const vec3 INK = vec3(0.043, 0.055, 0.059);
const vec3 INK2 = vec3(0.102, 0.129, 0.141);
const vec3 CYAN = vec3(0.0, 0.706, 0.847);

float smin(float a, float b) {
  float h = max(uK - abs(a - b), 0.0) / uK;
  return min(a, b) - h * h * uK * 0.25;
}

float scene(vec3 p) {
  float d = 1e5;
  for (int i = 0; i < N; i++) {
    vec4 b = uBalls[i];
    if (b.z <= 0.0) continue;
    d = smin(d, length(p - vec3(b.xy, b.z)) - b.z);
  }
  return d;
}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(0.5, -0.5);
  return normalize(
    e.xyy * scene(p + e.xyy) + e.yyx * scene(p + e.yyx) + e.yxy * scene(p + e.yxy) + e.xxx * scene(p + e.xxx));
}

// the meniscus weight of whichever body owns this pixel's silhouette
float meniscusAt(vec2 sp) {
  float best = 1e5;
  float w = 0.0;
  for (int i = 0; i < N; i++) {
    vec4 b = uBalls[i];
    if (b.z <= 0.0) continue;
    float di = length(sp - b.xy) - b.z;
    if (di < best) { best = di; w = b.w; }
  }
  return w;
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * uInvDpr;
  vec3 ro = vec3(sp, uZ0);
  float t = 0.0;
  float minD = 1e5;
  float minT = 0.0;
  float lim = -(uK * 0.25 + 1.0);
  bool hit = false;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + vec3(0.0, 0.0, -t);
    float d = scene(p);
    if (d < minD) { minD = d; minT = t; }
    if (d < 0.5) { hit = true; break; }
    if (p.z < lim) break;
    t += d;
  }

  // the sheet: a matte contact under every body
  float dark = 0.0;
  for (int i = 0; i < N; i++) {
    vec4 b = uBalls[i];
    if (b.z <= 0.0) continue;
    float c = clamp(1.0 - length(sp - b.xy) / (b.z * 1.15), 0.0, 1.0);
    dark += 0.18 * c * c;
  }
  dark = min(dark, 0.42);

  // coverage: a 1px ramp over the last pixel outside the surface
  float cov = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.2, minD);
  // the cyan line where an agent wets the paper, just outside its silhouette
  float band = 1.5 + 0.6 * uSettle;
  float wm = meniscusAt(sp) * mix(0.55, 1.0, uSettle);
  float halo = wm * (1.0 - smoothstep(0.3, 0.3 + band, minD));
  vec3 pc = CYAN * halo;
  float pa = halo + dark * (1.0 - halo);

  vec3 col = vec3(0.0);
  if (cov > 0.0) {
    vec3 p = ro + vec3(0.0, 0.0, -(hit ? t : minT));
    vec3 n = normalAt(p);
    vec3 l = normalize(vec3(-0.35, -0.6, 0.72));
    // ink, a shade lighter toward the light
    vec3 base = mix(INK, INK2, 0.5 - 0.5 * n.y);
    float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 64.0) * 0.9;
    // the environment: what the bead reflects is the sheet below the horizon
    vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
    float below = 1.0 - smoothstep(-0.5, 0.2, r.z);
    float tt = min(p.z / max(-r.z, 0.06), 160.0);
    vec2 g = (p.xy + r.xy * tt) / 32.0;
    vec2 fw = FW(g);
    vec2 a = abs(fract(g - 0.5) - 0.5) / fw;
    float line = 1.0 - min(min(a.x, a.y), 1.0);
    vec3 env = PAPER * (1.0 - 0.28 * line) * below;
    float fres = pow(1.0 - max(n.z, 0.0), 4.0);
    col = base + env * mix(0.10, 0.55, fres) + spec;
    col = clamp(col, 0.0, 1.0);
  }

  gl_FragColor = vec4(col * cov + pc * (1.0 - cov), cov + pa * (1.0 - cov));
}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   INK MERCURY — one raymarched fragment shader, WebGL1.

   Nineteen spheres in a smooth-min union, seen straight down. Rays run along
   -z from z = uZ0 in stage pixels, so plane z = 0 maps 1:1 onto the stage:
   the DOM trail, floors, bus and tags are registered with no projection.
   Each body rests on the sheet (its centre at z = r). The union's radius uK
   is what makes two bodies reach for each other and neck: 10 px while they
   lie apart, 46 while they merge, 18 once they have settled.

   The material is deliberately not the hero's chrome (no PMREM, no studio).
   It is ink-black metal, a mirror (F0 0.78, Schlick) that reads as ink because its room is dark, and the only
   things it can reflect are the sheet it rests on and the drafting room
   above it:
     · below the horizon (the rim), the paper, with its 32 / 160 px grid
       traced by a real ray-plane intersection, so the lines bend and crowd
       toward the silhouette and run continuously through every neck;
       the paper is in the body's own shade close to the contact;
     · above it, a dark room with one rectangular softbox up and to the left,
       mapped stereographically, so each bead carries a small window that
       stretches into a bar along a neck (the read that says "liquid");
     · one hard glint inside the window.
   Cyan appears only where an agent wets the paper: a meniscus line just
   outside its silhouette and the same line caught in its rim reflection,
   both scaled by how much of the agent has arrived.

   Pixels that miss the union land on the sheet and get the matte contact
   (a tight occlusion ring plus a soft fall cast away from the light: a
   rendered shadow, not a UI one). A 2D pass decides first whether a pixel
   can reach the union at all, so empty paper never marches. Output is
   premultiplied with alpha 0 elsewhere, so paper, grid and grain show
   through the canvas.

   While a body is dragged, a capsule (uNeck = ghost xy, body xy; uNeckR its
   radius) joins the union: the neck thins with distance and is gone past
   about six bead radii, which reads as the thread snapping.

   uBalls[i] = (x, y, r, w): stage px, radius px (0 = absent), meniscus weight.
   Slots: 0-11 the step beads, 12-16 the agent bodies, 17 the drag ghost,
   18 the pointer's drop (centred at height uPtrZ, the flank of the body that
   reaches for the cursor, so it reads as that surface bulging toward it).
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
${derivatives ? "#define FW(g) max(fwidth(g), vec2(1e-4))" : "#define FW(g) vec2(0.08)"}

uniform vec4 uBalls[N];
uniform float uK;
uniform float uZ0;
uniform vec2 uRes;
uniform float uInvDpr;
uniform float uSettle;
uniform vec4 uNeck;
uniform float uNeckR;
uniform float uPtrZ;

const vec3 PAPER = vec3(0.902, 0.914, 0.910);
const vec3 INK = vec3(0.043, 0.055, 0.059);
const vec3 ROOM = vec3(0.035, 0.042, 0.046);
const vec3 CYAN = vec3(0.0, 0.706, 0.847);
// the softbox: up and to the left of the sheet (stage y runs down)
const vec3 LIGHT = vec3(-0.3487, -0.5978, 0.7224);

float smin(float a, float b) {
  float h = max(uK - abs(a - b), 0.0) / uK;
  return min(a, b) - h * h * uK * 0.25;
}

// the drag neck: a capsule lying on the sheet from the ghost to the picked body
float neck(vec3 p) {
  vec3 a = vec3(uNeck.xy, uNeckR);
  vec3 ba = vec3(uNeck.zw, uNeckR) - a;
  vec3 pa = p - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-3), 0.0, 1.0);
  return length(pa - ba * h) - uNeckR;
}

float scene(vec3 p) {
  float d = 1e5;
  for (int i = 0; i < N; i++) {
    vec4 b = uBalls[i];
    if (b.z <= 0.0) continue;
    // every body rests on the sheet; the pointer's drop rides at the reaching body's flank
    float cz = i == ${POINTER} ? uPtrZ : b.z;
    d = smin(d, length(p - vec3(b.xy, cz)) - b.z);
  }
  if (uNeckR > 0.0) d = smin(d, neck(p));
  return d;
}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(0.5, -0.5);
  return normalize(
    e.xyy * scene(p + e.xyy) + e.yyx * scene(p + e.yyx) + e.yxy * scene(p + e.yxy) + e.xxx * scene(p + e.xxx));
}

float gridLine(vec2 q, float cell) {
  vec2 g = q / cell;
  vec2 w = FW(g);
  vec2 a = abs(fract(g - 0.5) - 0.5) / w;
  // where the reflection crowds the lines below a pixel apart they fade out instead of turning to grey noise
  return (1.0 - min(min(a.x, a.y), 1.0)) * (1.0 - smoothstep(0.12, 0.4, max(w.x, w.y)));
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// what a reflected ray from surface point p sees: the sheet below, the room above
vec3 envAt(vec3 p, vec3 r, float wm) {
  float tt = min(p.z / max(-r.z, 0.03), 180.0);
  vec2 q = p.xy + r.xy * tt;
  vec3 sheet = PAPER * (1.0 - 0.34 * gridLine(q, 32.0)) * (1.0 - 0.22 * gridLine(q, 160.0));
  // close to the contact the sheet lies in the body's own shade, and an agent's meniscus is there
  float nearC = 1.0 - smoothstep(0.0, 5.0, tt);
  sheet *= 1.0 - 0.6 * nearC;
  sheet = mix(sheet, CYAN, wm * (1.0 - smoothstep(0.0, 7.0, tt)) * 0.85);

  vec2 s = r.xy / (1.0 + max(r.z, 0.0));
  vec2 lc = LIGHT.xy / (1.0 + LIGHT.z);
  float box = 1.0 - smoothstep(-0.015, 0.02, roundBox(s - lc, vec2(0.3, 0.15), 0.07));
  // the room brightens toward the horizon, where the paper's bounce reaches it
  vec3 room = mix(ROOM, PAPER * 0.34, smoothstep(0.85, 0.05, r.z)) + vec3(0.98) * box;
  return mix(sheet, room, smoothstep(-0.08, 0.08, r.z));
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * uInvDpr;

  // one pass in 2D first: the nearest silhouette, whose meniscus it is, and
  // the matte contact every body leaves on the sheet
  float d2 = 1e5;
  float wm = 0.0;
  float dark = 0.0;
  for (int i = 0; i < N; i++) {
    vec4 b = uBalls[i];
    if (b.z <= 0.0) continue;
    vec2 q = sp - b.xy;
    float di = length(q) - b.z;
    if (di < d2) { d2 = di; wm = b.w; }
    float ring = exp(-max(di, 0.0) / (b.z * 0.08 + 0.6));
    float fall = clamp(1.0 - length(q - vec2(0.2, 0.32) * b.z) / (b.z * 1.42), 0.0, 1.0);
    dark += 0.16 * ring + 0.2 * fall * fall;
  }
  if (uNeckR > 0.0) {
    float dn = neck(vec3(sp, uNeckR));
    d2 = min(d2, dn);
    dark += 0.2 * exp(-max(dn, 0.0) / (uNeckR * 0.5 + 0.6));
  }
  dark = min(dark, 0.46);

  // nothing within reach of the union: the sheet only, and no march at all.
  // Each smooth-min can pull the surface out by uK/4; two stacked blends are
  // the most this field ever has at one pixel.
  if (d2 > uK * 0.5 + 2.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, dark);
    return;
  }

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

  // coverage: a ramp over the last pixel outside the surface
  float aa = 1.2 * uInvDpr;
  float cov = hit ? 1.0 : 1.0 - smoothstep(0.0, aa, minD);
  // the cyan line where an agent wets the paper, just outside its silhouette
  float wk = wm * mix(0.6, 1.0, uSettle);
  float band = 1.5 + 0.75 * uSettle;
  float halo = wk * (1.0 - smoothstep(0.25, 0.25 + band, minD)) * step(0.0, minD);
  vec3 pc = CYAN * halo;
  float pa = halo + dark * (1.0 - halo);

  vec3 col = vec3(0.0);
  if (cov > 0.0) {
    vec3 p = ro + vec3(0.0, 0.0, -(hit ? t : minT));
    vec3 n = normalAt(p);
    vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
    // a mirror whose room is dark: the cap holds the dark, the rim holds the sheet
    float f = 0.78 + 0.22 * pow(1.0 - clamp(n.z, 0.0, 1.0), 5.0);
    vec3 env = envAt(p, r, wk);
    float glint = pow(max(dot(r, LIGHT), 0.0), 900.0) * 0.6;
    col = clamp(INK * (1.0 - f) + env * f + glint, 0.0, 1.0);
  }

  gl_FragColor = vec4(col * cov + pc * (1.0 - cov), cov + pa * (1.0 - cov));
}`;
}

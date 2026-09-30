/* ─────────────────────────────────────────────────────────────────────────
   THE CREATIVE DIVE: the warp into Triseno Studio, after Tristen's reference
   (a painted storm-cloud wormhole):

     open     a hole opens at the centre and eats outward over the page you
              are leaving, pulling it in;
     dive     you fall down a narrow pipe that twists and winds, its walls a
              4K painted storm (navy and white cloud, orange light breaking
              through, handwritten equations and orbits drifting past), toward
              a dark eye at the far end;
     swallow  on arrival the eye grows until it has swallowed the screen,
              holds a beat of dark, and the studio fades up out of it.

   One full-screen WebGL2 fragment shader. Shared by the worker that draws it
   off the main thread (vortex.worker.ts) and, where a browser cannot hand a
   WebGL canvas to a worker, by WarpProvider itself. The dive holds until the
   page underneath is ready; the swallow then takes VORTEX_OUT.
   ───────────────────────────────────────────────────────────────────────── */

type GL = WebGL2RenderingContext;

/** how long the hole takes to open over the page */
export const VORTEX_IN = 800;
/** swallow + dark beat + fade up, once the page underneath is ready */
export const VORTEX_OUT = 1900;
/** the storm painting (4K, GPT Image 2.5: navy cloud, orange light, handwritten
 *  maths), at the size the screen can use */
export const vortexTexture = (screenW: number) =>
  `/worlds/creative-storm-${screenW * Math.min(2, globalThis.devicePixelRatio || 1) > 1700 ? 3072 : 1600}.webp`;

export interface Vortex {
  /** advance by `step` ms of warp time and draw; `outAt` is the warp time the
   *  swallow began (0 = not yet). Returns true once the fade up is over. */
  frame(step: number, outAt: number): boolean;
  time(): number;
  /** restart the clock for a new warp */
  reset(): void;
  /** the painting (may arrive late: until then the walls are storm haze) */
  setTexture(img: TexImageSource): void;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;    // seconds
uniform float uDepth;   // distance fallen down the pipe
uniform float uFront;   // how far the opening has eaten outward (screen radii)
uniform float uEye;     // radius of the dark eye (grows to swallow the screen)
uniform float uFade;    // 1 = drawn, 0 = gone
uniform float uTexOn;   // 0..1 while the painting fades in
uniform vec2 uVP;       // where the pipe runs deepest on screen (found on the CPU)
uniform sampler2D uTex;
out vec4 frag;

const float PI = 3.14159265;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
                 mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                 mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  return 0.5 * noise(p) + 0.25 * noise(p * 2.03 + 1.7) + 0.125 * noise(p * 4.11 + 9.2);
}

// the centre line of the pipe: two slow incommensurate curves per axis
vec2 bendAt(float s) {
  return vec2(sin(s * 0.42) * 3.3 + sin(s * 0.17 + 2.0) * 2.4,
              sin(s * 0.33 + 1.3) * 2.5 + cos(s * 0.15) * 2.0);
}

// until the painting arrives, and under it while it fades in: storm haze
vec3 haze(float v) {
  return mix(vec3(0.03, 0.07, 0.18), vec3(0.45, 0.6, 0.85), v);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(p);
  vec3 ink = vec3(0.006, 0.012, 0.035);

  // the pipe winds: its centre line C(s) curves, so each depth slice sits
  // off-centre on screen by f * (C(s + z) - C(s)) / z; the far end wanders as
  // the pipe turns and the slices stack into offset crescents. Depth comes
  // from a relaxed fixed-point solve (z = f / distance to that slice's centre).
  float f = 0.2;
  // the camera rolls as it banks through the turns
  float roll = uTime * 0.45 + 0.6 * sin(uDepth * 0.13);
  vec2 pr = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * p;
  vec2 base = bendAt(uDepth);
  float z = f / max(r, 0.004);
  vec2 q = pr;
  for (int i = 0; i < 6; i++) {
    // the bend is read no further than 6 units ahead: beyond that the far
    // pipe converges smoothly on its vanishing point and the solve settles
    vec2 off = f * (bendAt(uDepth + min(z, 6.0)) - base) / max(z, 0.4);
    q = pr - off;
    z = mix(z, min(f / max(length(q), 0.004), 40.0), 0.7);
  }
  float rq = length(q);
  // where the solve has not settled (a false second centre on a hard bend)
  // the wall there is unreliable: it sinks into the dark below
  float unsettled = smoothstep(0.15, 0.6, abs(z - min(f / max(rq, 0.004), 40.0)) / max(z, 0.5));
  float wz = uDepth + z; // how far along the pipe this piece of wall is
  // the walls spiral along the pipe, tighter toward the eye
  float ang = atan(q.y, q.x) + wz * 0.2 + 0.22 / (rq + 0.08);
  float w = fbm(vec3(cos(ang) * 1.6, sin(ang) * 1.6, wz * 0.35 + uTime * 0.25));
  // far down the pipe the walls compress into a few pixels: their detail
  // fades out with distance instead of aliasing
  float near = smoothstep(4.5, 1.5, z);
  w = mix(0.5, w, near);
  // the painting is packed densely along the pipe so the near walls, which
  // perspective stretches hardest, still show billows (mirrored repeat has
  // period 2 = one turn at 2 * ang / PI)
  vec2 tuv = vec2(2.0 * ang / PI + (w - 0.5) * 0.08, wz * 1.7 + (w - 0.5) * 0.05);
  // atan jumps by 2*PI on one ray; mip selection must not see that jump, so
  // the gradients come from whichever of two branch cuts is smooth here
  float angB = atan(-q.y, -q.x) + PI + wz * 0.2 + 0.22 / (rq + 0.08);
  float dux = dFdx(2.0 * ang / PI), duxB = dFdx(2.0 * angB / PI);
  float duy = dFdy(2.0 * ang / PI), duyB = dFdy(2.0 * angB / PI);
  vec2 gx = vec2(abs(dux) < abs(duxB) ? dux : duxB, dFdx(tuv.y));
  vec2 gy = vec2(abs(duy) < abs(duyB) ? duy : duyB, dFdy(tuv.y));
  vec3 wall = mix(haze(w), textureGrad(uTex, tuv, gx, gy).rgb, uTexOn);
  // rings of cloud: billowed slices stacked into the distance
  float ring = 0.5 + 0.5 * sin((wz * 1.1 + w * 0.9) * 2.0 * PI);
  wall *= mix(1.0, mix(0.6, 1.12, smoothstep(0.1, 0.9, ring)), near);

  // the eye sits where the pipe runs deepest on screen (uVP, found each frame
  // by running this same solve on a coarse grid): one clean shape, exactly at
  // the far end, even where the per-pixel solve wobbles
  float dv = length(p - uVP);
  // the walls darken as they recede into the eye
  wall *= mix(1.0, 0.25, smoothstep(1.3, 4.2, z) * smoothstep(0.45, 0.12, dv));
  vec3 col = mix(wall, ink, smoothstep(3.2, 6.0, z) * smoothstep(0.3, 0.1, dv));
  col = mix(col, ink, unsettled * 0.85);
  // the eye itself: black, soft-lipped; on arrival it grows over everything
  col = mix(col, ink, smoothstep(uEye + 0.07, uEye, dv));

  // the hole eats outward over the page being left
  float edge = smoothstep(uFront, uFront - 0.3, r);
  float alpha = edge * uFade;
  frag = vec4(col * alpha, alpha);
}`;

function compile(gl: GL, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "vortex shader");
  return s;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// the shader's pipe, on the CPU: the same centre line, roll and solve
const bendAt = (s: number): [number, number] => [
  Math.sin(s * 0.42) * 3.3 + Math.sin(s * 0.17 + 2.0) * 2.4,
  Math.sin(s * 0.33 + 1.3) * 2.5 + Math.cos(s * 0.15) * 2.0,
];
/** where on screen (the shader's p units) the pipe runs deepest */
function deepest(depth: number, time: number, aspect: number): [number, number] {
  const f = 0.2;
  const roll = time * 0.45 + 0.6 * Math.sin(depth * 0.13);
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  const base = bendAt(depth);
  const zs: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let j = -9; j <= 9; j++) {
    for (let i = -14; i <= 14; i++) {
      const px = (i / 14) * 0.5 * aspect * 0.9;
      const py = (j / 9) * 0.45;
      // pr = M p, M = [[c, s], [-s, c]] as the shader's mat2(c, -s, s, c)
      const rx = c * px + s * py;
      const ry = -s * px + c * py;
      let z = f / Math.max(Math.hypot(px, py), 0.004);
      for (let k = 0; k < 6; k++) {
        const b = bendAt(depth + Math.min(z, 6));
        const d = Math.max(z, 0.4);
        const qx = rx - (f * (b[0] - base[0])) / d;
        const qy = ry - (f * (b[1] - base[1])) / d;
        z += (Math.min(f / Math.max(Math.hypot(qx, qy), 0.004), 40) - z) * 0.7;
      }
      zs.push(z);
      xs.push(px);
      ys.push(py);
    }
  }
  // the deep end is often several grid points at the depth cap: take the
  // depth-weighted centre of everything within 85% of the deepest
  const top = Math.max(...zs) * 0.85;
  let sw = 0;
  let bx = 0;
  let by = 0;
  zs.forEach((z, i) => {
    if (z < top) return;
    sw += z;
    bx += xs[i] * z;
    by += ys[i] * z;
  });
  return [bx / sw, by / sw];
}
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createVortex(gl: GL, size: () => { w: number; h: number }): Vortex {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "vortex link");
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = u("uRes");
  const uTime = u("uTime");
  const uDepth = u("uDepth");
  const uFront = u("uFront");
  const uEye = u("uEye");
  const uFade = u("uFade");
  const uTexOn = u("uTexOn");
  const uVP = u("uVP");

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([30, 60, 120, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(u("uTex"), 0);
  let texReady = false;
  let texOn = 0;

  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let t = 0;
  let depth = 0;
  let vx = 0;
  let vy = 0;
  return {
    time: () => t,
    reset() {
      t = 0;
      depth = 0;
    },
    setTexture(img) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      // mipmaps: the pipe's far walls read from them
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      texReady = true;
    },
    frame(step, outAt) {
      t += step;
      const { w, h } = size();
      const inK = clamp01(t / VORTEX_IN);
      const outK = outAt ? clamp01((t - outAt) / VORTEX_OUT) : 0;
      // out: the eye swallows the screen over the first half, a beat of dark,
      // then the studio fades up out of it
      const eye = 0.075 + 0.015 * Math.sin(t / 420) + Math.pow(clamp01(outK / 0.5), 2.2) * 2.6;
      const fade = 1 - easeInOutCubic(clamp01((outK - 0.62) / 0.38));
      // world units of pipe per second: the fall gathers, and keeps pushing
      // into the eye as it swallows
      const speed = 1.5 + 5.5 * easeInOutCubic(inK);
      depth += (speed * step) / 1000;
      if (texReady) texOn = Math.min(1, texOn + step / 350);

      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t / 1000);
      gl.uniform1f(uDepth, depth);
      gl.uniform1f(uFront, 0.04 + (1 - Math.pow(1 - inK, 3)) * 1.45);
      gl.uniform1f(uEye, eye);
      gl.uniform1f(uFade, fade);
      gl.uniform1f(uTexOn, texOn);
      // the eye follows the pipe's deepest point, eased so it glides
      const [dx, dy] = deepest(depth, t / 1000, w / h);
      const k = t < 50 ? 1 : 1 - Math.exp(-step / 90);
      vx += (dx - vx) * k;
      vy += (dy - vy) * k;
      gl.uniform2f(uVP, vx, vy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return !!outAt && outK >= 1;
    },
  };
}

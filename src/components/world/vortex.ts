/* ─────────────────────────────────────────────────────────────────────────
   THE CREATIVE ASCENT: the warp into Triseno Studio, a flight through heaven.
   Where every other division is entered down a tunnel of streaks, Creative
   is entered through a painting:

     open    a spiral opens at the centre and eats outward over the page you
             are leaving, pulling it into the clouds;
     rise    you fly down a tunnel whose walls are a 4K painted heaven of
             cloud (the painting wrapped round the tube and gently warped, so
             it moves like brushwork), toward a soft light at the far end;
     break   the walls blow outward past the edges of the screen and you come
             out into open sky, the same painting, flat and calm, drifting
             toward you;
     reveal  the clouds part and burn away from the centre outward, each gap
             edged in warm light, and the studio shows through them.

   One full-screen WebGL2 fragment shader. Shared by the worker that draws it
   off the main thread (vortex.worker.ts) and, where a browser cannot hand a
   WebGL canvas to a worker, by WarpProvider itself. The rise holds until the
   page underneath is ready; the break and reveal then take VORTEX_OUT.
   ───────────────────────────────────────────────────────────────────────── */

type GL = WebGL2RenderingContext;

/** how long the rise takes to open over the page */
export const VORTEX_IN = 800;
/** break + reveal, once the page underneath is ready */
export const VORTEX_OUT = 2700;
/** the painting (a 4K dawn heaven, GPT Image 2.5), at the size the screen can use */
export const vortexTexture = (screenW: number) =>
  `/worlds/creative-heaven-${screenW * Math.min(2, globalThis.devicePixelRatio || 1) > 1700 ? 3072 : 1600}.webp`;

export interface Vortex {
  /** advance by `step` ms of warp time and draw; `outAt` is the warp time the
   *  break began (0 = not yet). Returns true once the settle is over. */
  frame(step: number, outAt: number): boolean;
  time(): number;
  /** restart the clock for a new warp */
  reset(): void;
  /** the painting (may arrive late: until then the walls are warm haze) */
  setTexture(img: TexImageSource): void;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;    // seconds
uniform float uDepth;   // distance flown up the tube
uniform float uFront;   // how far the opening has eaten outward (screen radii)
uniform float uOpen;    // 0..1 the walls blowing outward into open sky
uniform float uReveal;  // 0..1 the clouds burning away onto the studio
uniform float uZoom;    // the open sky drifting toward the viewer
uniform float uFade;    // 1 = drawn, 0 = gone
uniform float uTexOn;   // 0..1 while the painting fades in
uniform float uImgAspect;
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

// the centre line of the cloud pipe: two slow incommensurate curves per axis
vec2 bendAt(float s) {
  return vec2(sin(s * 0.42) * 4.2 + sin(s * 0.17 + 2.0) * 2.4,
              sin(s * 0.33 + 1.3) * 3.2 + cos(s * 0.15) * 2.0);
}

// until the painting arrives, and under it while it fades in: warm haze
vec3 haze(float v) {
  return mix(vec3(0.55, 0.3, 0.12), vec3(1.0, 0.9, 0.72), v);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  vec3 light = vec3(1.0, 0.95, 0.85);

  // the tube: a narrow pipe of cloud that winds through the sky. Its centre
  // line C(s) curves, so each depth slice sits off-centre on screen by
  // f * (C(s + z) - C(s)) / z; the far end wanders as the pipe turns, and the
  // slices stack into offset crescents. Depth is found by fixed-point
  // iteration (z = f * R / distance to that slice's centre). As it opens, the
  // pipe straightens and its walls rush outward past the frame.
  float o2 = uOpen * uOpen;
  float calm = 1.0 - uOpen;
  float f = 0.2 * (1.0 + o2 * 10.0);
  // the camera rolls as it banks through the turns
  float roll = (uTime * 0.35 + 0.5 * sin(uDepth * 0.13)) * calm;
  vec2 pr = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * p;
  vec2 base = bendAt(uDepth);
  float z = f / max(r, 0.004);
  vec2 q = pr;
  for (int i = 0; i < 5; i++) {
    // the bend is read no further than 6 units ahead: beyond that the far
    // pipe converges smoothly on its vanishing point and the iteration settles
    vec2 off = f * (bendAt(uDepth + min(z, 6.0)) - base) / max(z, 0.4) * calm;
    q = pr - off;
    // relaxed step: the plain fixed point oscillates where the pipe bends hard
    z = mix(z, min(f / max(length(q), 0.004), 40.0), 0.7);
  }
  float rq = length(q);
  float wz = uDepth + z; // how far along the pipe this piece of wall is
  // the walls spiral gently along the pipe
  float ang = atan(q.y, q.x) + wz * 0.18;
  // brushwork: the painting drifts on a slow warp field
  float w = fbm(vec3(cos(ang) * 1.6, sin(ang) * 1.6, wz * 0.35 + uTime * 0.25));
  // far down the pipe the walls compress into a few pixels: their brushwork
  // and ring folds fade out with distance (as haze would) instead of aliasing
  float near = smoothstep(4.5, 1.5, z);
  w = mix(0.5, w, near);
  // the painting is packed densely along the pipe (1.7 heights per unit), so
  // the near walls, which perspective stretches hardest, still show billows
  // (mirrored repeat has period 2 = one turn at 2 * ang / PI)
  vec2 tuv = vec2(2.0 * ang / PI + (w - 0.5) * 0.08, wz * 1.7 + (w - 0.5) * 0.05);
  // atan jumps by 2*PI on one ray; mip selection must not see that jump, so
  // the gradients come from whichever of two branch cuts is smooth here
  float angB = atan(-q.y, -q.x) + PI + wz * 0.18;
  float dux = dFdx(2.0 * ang / PI), duxB = dFdx(2.0 * angB / PI);
  float duy = dFdy(2.0 * ang / PI), duyB = dFdy(2.0 * angB / PI);
  vec2 gx = vec2(abs(dux) < abs(duxB) ? dux : duxB, dFdx(tuv.y));
  vec2 gy = vec2(abs(duy) < abs(duyB) ? duy : duyB, dFdy(tuv.y));
  vec3 wall = mix(haze(w), textureGrad(uTex, tuv, gx, gy).rgb, uTexOn);
  // rings of cloud: the pipe reads as billowed slices stacked into the
  // distance, each with a shaded fold before the next
  float ring = 0.5 + 0.5 * sin((wz * 1.1 + w * 0.9) * 2.0 * PI);
  wall *= mix(1.0, mix(0.72, 1.06, smoothstep(0.1, 0.9, ring)), near);
  // the walls shade as they recede, then the far end is light (heaven, not a
  // void): the pipe hazes into it
  wall *= mix(1.0, 0.78, smoothstep(1.2, 4.0, z));
  wall = mix(wall, light, smoothstep(2.9, 5.5, z) * 0.98);
  wall += light * exp(-rq * rq * 140.0) * 0.3;
  float rt = rq;


  // the open sky: the painting flat, covering the screen, drifting nearer,
  // softening out of focus as it settles
  float scr = uRes.x / uRes.y;
  vec2 cover = scr > uImgAspect ? vec2(1.0, uImgAspect / scr) : vec2(scr / uImgAspect, 1.0);
  vec2 suv = 0.5 + vec2(p.x / scr, -p.y) * cover / uZoom;
  // as the clouds clear they also part, drifting out from the centre
  vec2 dir = p / max(r, 0.001);
  suv += vec2(dir.x / scr, -dir.y) * uReveal * uReveal * (0.08 + 0.2 * r);
  vec3 sky = mix(haze(0.7), texture(uTex, suv, uReveal * 1.2).rgb, uTexOn);
  // it is revealed from the centre outward as the walls blow past
  float openR = uOpen * 1.9;
  float skyMask = smoothstep(openR, openR - 0.45, r);
  vec3 col = mix(wall, sky, skyMask);

  // a soft bloom as you break through
  col += light * 0.12 * sin(uOpen * PI);

  // the reveal: the clouds burn away onto the studio, the centre first, then
  // their thin shadowed hollows, the bright billows last, each gap edged in
  // warm light, so the page shows through the clouds before they are gone
  float lum = dot(sky, vec3(0.3, 0.59, 0.11));
  float grain = fbm(vec3(p * 4.5, uTime * 0.4)) + 0.5 * fbm(vec3(p * 11.0, 7.0));
  float field = 0.32 * (1.0 - smoothstep(0.0, 1.1, r)) + 0.34 * (1.0 - lum) + 0.42 * grain;
  // the field spans ~0.15..0.9, so the threshold sweeps 0.08..0.86: every
  // part of the sky clears at its own moment across the whole reveal
  float th = mix(0.08, 0.86, uReveal);
  float keep = 1.0 - smoothstep(1.0 - field - 0.035, 1.0 - field + 0.01, th);
  float rim = smoothstep(0.0, 0.5, keep) * smoothstep(1.0, 0.5, keep);
  vec3 glow = vec3(1.0, 0.86, 0.62) * rim * 0.8 * step(0.001, uReveal);

  // the opening eats outward over the page being left
  float edge = smoothstep(uFront, uFront - 0.3, r);
  float alpha = edge * uFade * mix(1.0, keep, step(0.001, uReveal));
  // the burning edges are a layer of light over clouds and page alike,
  // composited 'over' in premultiplied form so the result stays valid
  vec3 g = glow * edge * uFade;
  float gA = clamp(max(g.r, max(g.g, g.b)), 0.0, 1.0);
  frag = vec4(g + (1.0 - gA) * min(col, vec3(1.0)) * alpha, gA + (1.0 - gA) * alpha);
}`;

function compile(gl: GL, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "vortex shader");
  return s;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
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
  const uOpen = u("uOpen");
  const uReveal = u("uReveal");
  const uZoom = u("uZoom");
  const uFade = u("uFade");
  const uTexOn = u("uTexOn");
  const uImgAspect = u("uImgAspect");

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 150, 90, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(u("uTex"), 0);
  gl.uniform1f(uImgAspect, 16 / 9);
  let texReady = false;
  let texOn = 0;

  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let t = 0;
  let depth = 0;
  return {
    time: () => t,
    reset() {
      t = 0;
      depth = 0;
    },
    setTexture(img) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      // mipmaps: the tube's far end and the settle's defocus read from them
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const iw = (img as { width?: number }).width;
      const ih = (img as { height?: number }).height;
      if (iw && ih) gl.uniform1f(uImgAspect, iw / ih);
      texReady = true;
    },
    frame(step, outAt) {
      t += step;
      const { w, h } = size();
      const inK = clamp01(t / VORTEX_IN);
      const outK = outAt ? clamp01((t - outAt) / VORTEX_OUT) : 0;
      // break out over the first 40%, a breath of open sky, then the clouds
      // part onto the studio
      const open = easeInOutCubic(clamp01(outK / 0.34));
      const reveal = clamp01((outK - 0.42) / 0.58);
      // flight: gathers as it opens, eases off as you come out into the sky
      // world units of pipe per second
      const speed = (1.5 + 5.5 * easeInOutCubic(inK)) * (1 - open * 0.85);
      depth += (speed * step) / 1000;
      if (texReady) texOn = Math.min(1, texOn + step / 350);

      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t / 1000);
      gl.uniform1f(uDepth, depth);
      gl.uniform1f(uFront, 0.04 + (1 - Math.pow(1 - inK, 3)) * 1.45);
      gl.uniform1f(uOpen, open);
      gl.uniform1f(uReveal, reveal);
      gl.uniform1f(uZoom, 1.06 + outK * 0.1);
      gl.uniform1f(uFade, 1);
      gl.uniform1f(uTexOn, texOn);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return !!outAt && outK >= 1;
    },
  };
}

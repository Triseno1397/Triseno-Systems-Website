/* ─────────────────────────────────────────────────────────────────────────
   THE CREATIVE VORTEX: the warp into Triseno Studio. Where every other
   division is entered down a tunnel of streaks, Creative is a dive into a
   spiral: the swirl opens at the centre and eats outward over the page you
   are leaving, you fall down a wormhole made of the studio's own stage light
   (its world plate, twisted into the walls) and painted smoke, and a dark eye
   at the far end grows until it swallows the screen, then opens onto the
   studio.

   One full-screen WebGL2 fragment shader on a low-resolution canvas (it is
   soft by nature, so a fraction of the pixels reads the same). Shared by the
   worker that draws it off the main thread (vortex.worker.ts) and, where a
   browser cannot hand a WebGL canvas to a worker, by WarpProvider itself.
   Same clock contract as the streak tunnel (warpTunnel.ts).
   ───────────────────────────────────────────────────────────────────────── */

import { T_IN, T_OUT } from "./warpTunnel";

type GL = WebGL2RenderingContext;

export interface Vortex {
  /** advance by `step` ms of warp time and draw; `outAt` is the warp time the
   *  dissolve began (0 = not yet). Returns true once the dissolve is over. */
  frame(step: number, outAt: number): boolean;
  time(): number;
  /** restart the clock for a new warp */
  reset(): void;
  /** the studio plate the walls are painted with (may arrive late) */
  setTexture(img: TexImageSource): void;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;   // seconds
uniform float uDepth;  // distance travelled down the tube
uniform float uFront;  // how far the swirl has eaten outward (screen radii)
uniform float uEye;    // radius of the dark eye at the far end
uniform float uFade;   // 1 = drawn, 0 = gone
uniform float uTexOn;  // 0..1 while the plate fades in
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
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.07 + vec3(1.7, 9.2, 4.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(p);
  float a = atan(p.y, p.x);

  // the tube: depth grows toward the centre, and the walls twist harder the
  // deeper they are, so everything spirals into the eye
  float depth = 0.5 / max(r, 0.02) + uDepth;
  float swirl = a + 1.7 / (r + 0.2) + uTime * 1.25;

  // painted cloud, sampled on a circle (cos, sin) so the angle has no seam,
  // stretched along the spiral and domain-warped so it reads as brushwork
  vec3 q = vec3(cos(swirl) * 2.1, sin(swirl) * 2.1, depth * 1.25);
  float warp = fbm(q * 0.8 + vec3(0.0, 0.0, uTime * 0.3));
  float cloud = fbm(q * 1.7 + warp * 2.6);
  // billow rims: where the cloud crosses its middle it catches the light
  float rim = pow(1.0 - abs(cloud * 2.0 - 1.0), 7.0);

  // the studio plate wrapped round the walls; mirrored repeat has period 2,
  // which is exactly one turn of swirl / PI, so the walls close seamlessly
  vec3 plate = texture(uTex, vec2(swirl / PI, depth * 0.14)).rgb;

  // colour: mostly ink, with ember and amber bodies and warm-white rims
  vec3 ink = vec3(0.02, 0.016, 0.02);
  vec3 ember = vec3(0.3, 0.085, 0.02);
  vec3 amber = vec3(1.0, 0.52, 0.2);
  vec3 cream = vec3(1.0, 0.93, 0.8);
  float s = smoothstep(0.42, 0.8, cloud);
  vec3 col = mix(ink, ember, smoothstep(0.0, 0.5, s));
  col = mix(col, amber, smoothstep(0.45, 0.95, s));
  col += cream * rim * (0.35 + 0.65 * s);
  // the plate's light, taken as brightness and re-lit in amber, so its
  // yellow stage lamps never tint the walls off-palette
  float lum = dot(plate, vec3(0.3, 0.59, 0.11));
  col += mix(amber, cream, 0.35) * lum * lum * 2.2 * uTexOn;

  // a band of hot light sweeping one side of the spiral, like the clip's
  // orange flank against its blue
  float flank = smoothstep(-0.2, 1.0, sin(swirl - 0.6));
  col *= mix(0.45, 1.25, flank);

  // fine filaments riding the spiral, broken along their length
  float lines = pow(abs(sin(swirl * 9.0 + depth * 2.1 + warp * 6.0)), 140.0);
  lines *= smoothstep(0.55, 0.85, noise(vec3(swirl * 4.0, depth * 3.0, 3.0)));
  col += cream * lines * 0.7 * smoothstep(0.1, 0.45, r);

  col = min(col, vec3(1.0, 0.95, 0.88));

  // the walls darken as they recede, and the eye at the end is black
  col *= mix(0.12, 1.0, smoothstep(0.02, 0.6, r));
  float eye = smoothstep(uEye, uEye + 0.1 + uEye * 0.35, r);
  col *= eye;

  // the swirl eats outward from the centre over the page being left
  float cover = smoothstep(uFront, uFront - 0.28, r) * uFade;
  frag = vec4(col * cover, cover);
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
const easeInCubic = (t: number) => t * t * t;

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

  // a 1px ink texture until the plate arrives
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 5, 8, 255]));
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
  return {
    time: () => t,
    reset() {
      t = 0;
      depth = 0;
    },
    setTexture(img) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texReady = true;
    },
    frame(step, outAt) {
      t += step;
      const { w, h } = size();
      const inK = clamp01(t / (T_IN * 1.25));
      const outK = outAt ? clamp01((t - outAt) / T_OUT) : 0;
      // the dive speeds up as the swirl opens and keeps pushing while the eye
      // swallows the screen
      const speed = 0.4 + 2.6 * easeInOutCubic(inK);
      depth += (speed * step) / 1000;
      if (texReady) texOn = Math.min(1, texOn + step / 400);
      // out: the eye grows over the first 60% of the dissolve, then the black
      // it leaves fades to show the arriving page
      const eye = 0.05 + 0.03 * Math.sin(t / 380) + easeInCubic(clamp01(outK / 0.6)) * 2.2;
      const fade = 1 - easeInOutCubic(clamp01((outK - 0.55) / 0.45));

      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t / 1000);
      gl.uniform1f(uDepth, depth);
      gl.uniform1f(uFront, 0.05 + (1 - Math.pow(1 - inK, 3)) * 1.35);
      gl.uniform1f(uEye, eye);
      gl.uniform1f(uFade, fade);
      gl.uniform1f(uTexOn, texOn);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return !!outAt && outK >= 1;
    },
  };
}

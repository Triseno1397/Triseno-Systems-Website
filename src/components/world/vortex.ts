/* ─────────────────────────────────────────────────────────────────────────
   THE AI DIVE: the warp into AI Infrastructure, beat for beat after
   Tristen's reference (a painted storm wormhole, ~5s):

     0.00s  still     the painting fades in over the page: the tunnel seen
                      from its mouth, a still corridor of cloud;
     0.40s  dark      its centre darkens;
     0.65s  born      a spiral is born in the dark centre...
     0.75s  opens     ...and opens outward over the whole corridor as the
                      fall begins;
     1.15s  dive      down the tunnel: painted storm walls (navy and white
                      cloud, cyan light, handwritten equations streaking
                      past), a dark eye at the far end drifting across the
                      frame as the tunnel turns, a cyan flank sweeping past
                      every couple of seconds; slow and smooth throughout;
     out    swallow   the eye grows until it fills the screen,
            dark      a beat of dark navy with a soft cyan glow at the top,
            fade      and the page fades up out of it, its figure first and
                      its headline after (html[data-ascent] in world.css).

   One full-screen WebGL2 fragment shader. Shared by the worker that draws it
   off the main thread (vortex.worker.ts) and, where a browser cannot hand a
   WebGL canvas to a worker, by WarpProvider itself. The dive holds until the
   page underneath is ready; swallow, dark and fade then take VORTEX_OUT.
   ───────────────────────────────────────────────────────────────────────── */

type GL = WebGL2RenderingContext;

/** still + dark + born + opens: the dive is under way by here */
export const VORTEX_IN = 1150;
/** swallow + dark beat + fade up, once the page underneath is ready */
export const VORTEX_OUT = 1800;
/** the storm painting (4K, GPT Image 2.5: navy cloud, orange light, handwritten
 *  maths), at the size the screen can use */
export const vortexTexture = (screenW: number) =>
  `/worlds/ai-storm-${screenW * Math.min(2, globalThis.devicePixelRatio || 1) > 1700 ? 3072 : 1600}.webp`;

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
uniform float uDepth;   // distance fallen down the tunnel
uniform float uWander;  // 0 = straight corridor, 1 = the tunnel turns
uniform float uSpin;    // the walls' slow turn (radians)
uniform float uSweep;   // angle of the amber flank sweeping round
uniform float uTwist;   // 0..1 the spiral's strength
uniform float uFrontR;  // how far out the spiral has opened (screen radii)
uniform float uDark;    // 0..1 the centre darkening before the spiral
uniform float uEye;     // radius of the dark eye (grows to swallow the screen)
uniform float uGlow;    // 0..1 the dark beat after the swallow
uniform float uAlpha;   // overall: fade in, then fade up onto the studio
uniform float uTexOn;   // 0..1 while the painting fades in
uniform vec2 uVP;       // where the tunnel runs deepest on screen (found on the CPU)
uniform sampler2D uTex;
out vec4 frag;

const float PI = 3.14159265;

// the tunnel's centre line: slow incommensurate curves, so the far end drifts
vec2 bendAt(float s) {
  return vec2(sin(s * 0.42) * 1.7 + sin(s * 0.17 + 2.0) * 1.2,
              sin(s * 0.33 + 1.3) * 1.3 + cos(s * 0.15) * 1.0);
}

// the painting re-coloured in AI's palette from its brightness alone: navy
// shadows, blue body, white rims, and cyan wherever it held warm light
vec3 toCyan(vec3 c) {
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  float warmth = smoothstep(0.02, 0.28, (c.r - c.b) / (l + 0.08));
  vec3 blue = mix(vec3(0.008, 0.02, 0.06), vec3(0.08, 0.2, 0.45), smoothstep(0.0, 0.35, l));
  blue = mix(blue, vec3(0.45, 0.62, 0.9), smoothstep(0.35, 0.7, l));
  blue = mix(blue, vec3(0.93, 0.96, 1.0), smoothstep(0.7, 0.95, l));
  vec3 cyan = mix(vec3(0.0, 0.12, 0.2), vec3(0.62, 0.95, 1.0), smoothstep(0.1, 0.8, l));
  return mix(blue, cyan, warmth);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(p);
  vec3 ink = vec3(0.01, 0.014, 0.03);

  // the tunnel: each depth slice sits off-centre on screen by
  // f * (C(s + z) - C(s)) / z as the centre line turns; depth comes from a
  // relaxed fixed-point solve (z = f / distance to that slice's centre)
  float f = 0.2;
  vec2 base = bendAt(uDepth);
  float z = f / max(r, 0.004);
  vec2 q = p;
  for (int i = 0; i < 6; i++) {
    vec2 off = f * (bendAt(uDepth + min(z, 6.0)) - base) / max(z, 0.4) * uWander;
    q = p - off;
    z = mix(z, min(f / max(length(q), 0.004), 40.0), 0.7);
  }
  float rq = length(q);
  float wz = uDepth + z;
  // where the solve has not settled the wall is unreliable: it sinks into dark
  float unsettled = smoothstep(0.15, 0.6, abs(z - min(f / max(rq, 0.004), 40.0)) / max(z, 0.5));

  // the spiral: strongest toward the eye (the white crescent curls), and only
  // inside the front it has opened out to
  float inside = smoothstep(uFrontR, uFrontR - 0.35, r);
  float twist = uTwist * 0.42 / (rq + 0.1) * inside;
  float ang = atan(q.y, q.x) + uSpin + twist;
  // the painting wrapped once round the walls. Its two edges would meet in a
  // seam, so a second copy offset half a turn is blended in toward it: each
  // copy fades out where its own seam is, and the wrap closes invisibly
  float u = ang / (2.0 * PI);
  vec2 tuvA = vec2(fract(u), wz * 0.8);
  vec2 tuvB = vec2(fract(u + 0.5), wz * 0.8 + 0.37);
  float seamW = abs(fract(u) - 0.5) * 2.0; // 1 at copy A's seam, 0 at copy B's
  // atan jumps by 2*PI on one ray; mip selection must not see that jump, so
  // the gradients come from whichever of two branch cuts is smooth here
  float angB = atan(-q.y, -q.x) + PI + uSpin + twist;
  float dux = dFdx(ang), duxB = dFdx(angB);
  float duy = dFdy(ang), duyB = dFdy(angB);
  vec2 gx = vec2((abs(dux) < abs(duxB) ? dux : duxB) / (2.0 * PI), dFdx(tuvA.y));
  vec2 gy = vec2((abs(duy) < abs(duyB) ? duy : duyB) / (2.0 * PI), dFdy(tuvA.y));
  vec3 paint = mix(textureGrad(uTex, tuvA, gx, gy).rgb, textureGrad(uTex, tuvB, gx, gy).rgb, smoothstep(0.35, 0.8, seamW));
  vec3 wall = mix(vec3(0.05, 0.1, 0.22), paint, uTexOn);

  // colour: the reference's storm in AI's one hue: navy a touch deeper, and
  // the painting's orange light re-lit as cyan (#00b4d8)
  wall = toCyan(wall);

  // the cyan flank sweeping round, about once a second
  float near = smoothstep(4.5, 1.2, z);
  float flank = smoothstep(0.35, 1.0, cos(atan(q.y, q.x) - uSweep)) * near * uWander;
  wall = mix(wall, wall * vec3(0.7, 1.15, 1.35) + vec3(0.0, 0.1, 0.16), flank * 0.6);

  // the walls shade as they recede toward the eye
  wall *= mix(1.0, 0.3, smoothstep(1.3, 4.5, z));
  float dv = length(p - uVP);
  vec3 col = mix(wall, ink, smoothstep(3.2, 6.0, z) * smoothstep(0.3, 0.1, dv));
  col = mix(col, ink, unsettled * 0.85);
  // before the spiral: the painting itself, flat and still, filling the
  // screen as the page did in the reference, easing forward a touch; the
  // spiral opens the tunnel out of its centre
  float scr = uRes.x / uRes.y;
  float imgA = 16.0 / 9.0;
  vec2 fuv = scr > imgA ? vec2(p.x / scr, -p.y * imgA / scr) : vec2(p.x / imgA, -p.y);
  fuv = 0.5 + fuv / (1.0 + 0.05 * uDark);
  vec3 still = mix(vec3(0.05, 0.1, 0.22), texture(uTex, fuv).rgb, uTexOn);
  still = toCyan(still);
  col = mix(still, col, inside);
  // the centre darkens before the spiral is born
  col *= 1.0 - uDark * 0.7 * smoothstep(0.38, 0.04, dv);
  // the eye: soft-lipped black; at the end it grows over everything
  col = mix(col, ink, smoothstep(uEye + 0.05, uEye, dv));

  // the dark beat: navy, with the page's light glowing softly at the top
  vec3 navy = vec3(0.05, 0.065, 0.1);
  vec2 g = p - vec2(0.0, 0.33);
  navy += vec3(0.0, 0.26, 0.34) * exp(-(g.x * g.x * 7.0 + g.y * g.y * 16.0)) * 0.8;
  col = mix(col, navy, uGlow);

  frag = vec4(col * uAlpha, uAlpha);
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
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// the shader's tunnel, on the CPU: the same centre line and solve
const bendAt = (s: number): [number, number] => [
  Math.sin(s * 0.42) * 1.7 + Math.sin(s * 0.17 + 2.0) * 1.2,
  Math.sin(s * 0.33 + 1.3) * 1.3 + Math.cos(s * 0.15) * 1.0,
];
/** where on screen (the shader's p units) the tunnel runs deepest */
function deepest(depth: number, wander: number, aspect: number): [number, number] {
  if (wander < 0.001) return [0, 0];
  const f = 0.2;
  const base = bendAt(depth);
  const zs: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let j = -9; j <= 9; j++) {
    for (let i = -14; i <= 14; i++) {
      const px = (i / 14) * 0.5 * aspect * 0.9;
      const py = (j / 9) * 0.45;
      let z = f / Math.max(Math.hypot(px, py), 0.004);
      for (let k = 0; k < 6; k++) {
        const b = bendAt(depth + Math.min(z, 6));
        const d = Math.max(z, 0.4);
        const qx = px - ((f * (b[0] - base[0])) / d) * wander;
        const qy = py - ((f * (b[1] - base[1])) / d) * wander;
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
  const U = {
    res: u("uRes"),
    depth: u("uDepth"),
    wander: u("uWander"),
    spin: u("uSpin"),
    sweep: u("uSweep"),
    twist: u("uTwist"),
    frontR: u("uFrontR"),
    dark: u("uDark"),
    eye: u("uEye"),
    glow: u("uGlow"),
    alpha: u("uAlpha"),
    texOn: u("uTexOn"),
    vp: u("uVP"),
  };

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
  let spin = 0;
  let vx = 0;
  let vy = 0;
  return {
    time: () => t,
    reset() {
      t = 0;
      depth = 0;
      spin = 0;
      vx = 0;
      vy = 0;
    },
    setTexture(img) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      // mipmaps: the tunnel's far walls read from them
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      texReady = true;
    },
    frame(step, outAt) {
      t += step;
      const { w, h } = size();
      const outK = outAt ? clamp01((t - outAt) / VORTEX_OUT) : 0;

      // the beats in (see the header)
      const alphaIn = easeOutCubic(clamp01(t / 350));
      const dark = easeInOutCubic(clamp01((t - 400) / 250));
      const twist = easeOutCubic(clamp01((t - 650) / 500));
      const frontR = 0.04 + easeInOutCubic(clamp01((t - 650) / 500)) * 2.2;
      const go = easeInOutCubic(clamp01((t - 750) / 1200));
      const wander = easeInOutCubic(clamp01((t - 850) / 1800));
      // the fall, and the walls' slow turn
      depth += (1.7 * go * step) / 1000;
      spin += (0.28 * go * step) / 1000;
      if (texReady) texOn = Math.min(1, texOn + step / 250);

      // the beats out: swallow (0-27%), dark (27-60%), fade up (60-100%)
      const swallow = Math.pow(clamp01(outK / 0.27), 2);
      const eye = 0.068 * dark + 0.006 * Math.sin(t / 700) * go + swallow * 2.6;
      const glow = easeInOutCubic(clamp01((outK - 0.18) / 0.14));
      const alpha = alphaIn * (1 - easeInOutCubic(clamp01((outK - 0.6) / 0.4)));

      // the eye follows the tunnel's deepest point, eased so it glides
      const [dx, dy] = deepest(depth, wander, w / h);
      const k = t < 50 ? 1 : 1 - Math.exp(-step / 260);
      vx += (dx - vx) * k;
      vy += (dy - vy) * k;

      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.depth, depth);
      gl.uniform1f(U.wander, wander);
      gl.uniform1f(U.spin, spin);
      gl.uniform1f(U.sweep, (t / 1000) * Math.PI * 1.1);
      gl.uniform1f(U.twist, twist);
      gl.uniform1f(U.frontR, frontR);
      gl.uniform1f(U.dark, dark);
      gl.uniform1f(U.eye, eye);
      gl.uniform1f(U.glow, glow);
      gl.uniform1f(U.alpha, alpha);
      gl.uniform1f(U.texOn, texOn);
      gl.uniform2f(U.vp, vx, vy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return !!outAt && outK >= 1;
    },
  };
}

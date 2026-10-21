/* ─────────────────────────────────────────────────────────────────────────
   crystalTunnel — a hall of crystal you fly through, drawn live.

   One fragment shader, raymarched: an endless tunnel whose walls are rows
   of faceted crystals, folded eight ways around the axis (a kaleidoscope you
   are standing inside) and slowly twisting as you go. The camera flies
   forward on its own clock; the pointer turns your head. Facets catch the
   light like cut glass (each colour refracted its own amount, so bright
   rails split into spectra), edges flare white, and a single beam runs
   low along the floor of the tunnel and fans out into seven coloured
   threads ahead of you — one per deliverable.

   select(i) brightens thread i, tints the hall toward its colour and rolls
   a ring of light down the tunnel. Nothing is scroll-driven.

   Cost control: the scene draws into a small canvas (a fraction of the
   CSS pixels, scaled up by the browser) and the fraction adapts — if frames
   run long it steps down, if there is headroom it steps back up. It only
   draws while on screen and the tab is visible.
   ───────────────────────────────────────────────────────────────────────── */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uZ;
uniform vec2 uLook;
uniform float uActive;
uniform vec3 uHue;
uniform float uPulse;
uniform float uSteps;

#define PI 3.14159265
#define CELL 1.7

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash(float n) { return fract(sin(n) * 43758.5453); }

vec3 spectrum(float t) {
  t = fract(t);
  return clamp(vec3(1.5 - abs(t * 4.0 - 0.5), 1.5 - abs(t * 4.0 - 2.0), 1.5 - abs(t * 4.0 - 3.5)), 0.0, 1.0);
}

/* the seven threads, red to violet */
vec3 band(int i) {
  if (i == 0) return vec3(1.0, 0.29, 0.29);
  if (i == 1) return vec3(1.0, 0.6, 0.19);
  if (i == 2) return vec3(1.0, 0.85, 0.29);
  if (i == 3) return vec3(0.3, 0.94, 0.55);
  if (i == 4) return vec3(0.18, 0.91, 1.0);
  if (i == 5) return vec3(0.3, 0.5, 1.0);
  return vec3(0.62, 0.36, 1.0);
}

float sdOct(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

/* the hall: crystals in rows along the wall, folded 8 ways, twisting */
float map(vec3 p, out float id) {
  float a = atan(p.y, p.x) + p.z * 0.045;
  float r = length(p.xy);
  float sector = 2.0 * PI / 8.0;
  float k = floor(a / sector);
  a = abs(mod(a, sector) - sector * 0.5);
  vec2 q = vec2(cos(a), sin(a)) * r;
  float zc = floor(p.z / CELL);
  float z = mod(p.z, CELL) - CELL * 0.5;
  id = zc * 8.0 + k;
  float h = hash(zc * 3.1 + k * 1.7);
  vec3 c = vec3(q.x - (2.35 + h * 0.25), q.y, z);
  c.xz *= rot(0.7 + h * 1.4);
  c.xy *= rot(0.5 + h);
  float crystal = sdOct(c, 0.95 + h * 0.35);
  float wall = 2.9 - r;
  return min(crystal, wall);
}

vec3 env(vec3 d) {
  float a = atan(d.y, d.x);
  float rails = pow(max(0.0, cos(a * 4.0 + 0.4)), 60.0) * (0.35 + 0.65 * smoothstep(0.0, 0.7, d.z));
  vec3 c = vec3(0.006, 0.008, 0.016) + rails * vec3(0.95, 0.97, 1.0) * 1.6;
  c += uHue * pow(max(d.z, 0.0), 10.0) * 1.1;
  c += vec3(1.0) * pow(max(d.z, 0.0), 90.0) * 2.0;
  return c;
}

vec3 normal(vec3 p, float eps) {
  float id;
  vec2 e = vec2(eps, 0.0);
  return normalize(vec3(
    map(p + e.xyy, id) - map(p - e.xyy, id),
    map(p + e.yxy, id) - map(p - e.yxy, id),
    map(p + e.yyx, id) - map(p - e.yyx, id)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  vec3 ro = vec3(0.0, 0.0, uZ);
  vec3 rd = normalize(vec3(uv, 1.25));
  rd.yz *= rot(uLook.y * 0.32);
  rd.xz *= rot(-uLook.x * 0.42);
  rd.xy *= rot(sin(uTime * 0.13) * 0.12 + uLook.x * 0.1);

  float t = 0.0;
  float id = 0.0;
  vec3 glow = vec3(0.0);
  float hit = 0.0;
  for (int i = 0; i < 90; i++) {
    if (float(i) >= uSteps) break;
    vec3 p = ro + rd * t;
    float d = map(p, id);

    // the beam: low on the axis, splitting into seven threads ahead of you
    float ahead = p.z - uZ;
    float split = smoothstep(1.0, 16.0, ahead);
    for (int b = 0; b < 7; b++) {
      float fb = float(b);
      vec2 c = vec2((fb - 3.0) * 0.17 * split, -1.05 + abs(fb - 3.0) * 0.02 * split);
      float dd = length(p.xy - c);
      float on = fb == uActive ? 2.6 : 1.0;
      glow += band(b) * on * (0.002 / (dd * dd + 0.002)) * 0.11 * split;
    }
    float core = length(p.xy - vec2(0.0, -1.05));
    glow += vec3(1.0) * (0.003 / (core * core + 0.003)) * 0.16 * (1.0 - split);

    if (d < 0.0015 * t) { hit = 1.0; break; }
    t += d * 0.8;
    if (t > 28.0) break;
  }

  vec3 col = vec3(0.0);
  if (hit > 0.5) {
    vec3 p = ro + rd * t;
    vec3 n = normal(p, 0.002);
    // the facet edges: where a wide-sampled normal disagrees with a tight one
    float edge = smoothstep(0.08, 0.5, length(n - normal(p, 0.045)));
    float fres = 0.06 + 0.94 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    vec3 refl = env(reflect(rd, n));
    // glass: the hall seen through the crystal, each colour bent its own
    // amount, so every bright rail splits into a spectrum
    vec3 tr = vec3(
      env(refract(rd, n, 1.0 / 1.42)).r,
      env(refract(rd, n, 1.0 / 1.47)).g,
      env(refract(rd, n, 1.0 / 1.53)).b);
    col = mix(tr * 0.85, refl, fres);
    // a spectral glint where the light catches a facet
    vec3 rf = reflect(rd, n);
    float spec = pow(max(dot(rf, normalize(vec3(0.25, 0.55, 1.0))), 0.0), 70.0);
    col += spectrum(dot(n, vec3(0.6, 0.3, 0.75)) * 2.0 + id * 0.11 + uTime * 0.04) * spec * 2.2;
    // the cut edges flare white, tinted toward the deliverable in view
    col += mix(vec3(1.0), uHue, 0.35) * edge * 0.85;
    // the ring rolling down the tunnel
    float ring = exp(-pow((p.z - uZ) - uPulse * 26.0, 2.0) * 0.35) * (1.0 - uPulse);
    col += uHue * ring * 1.6;
    col *= exp(-t * 0.075);
  }
  col += glow;

  // a little bloom on the far light, a vignette and grain
  col += uHue * 0.05 * exp(-length(uv) * 2.5);
  col *= 1.0 - dot(uv, uv) * 0.55;
  col = col / (1.0 + col * 0.35);
  col = pow(col, vec3(0.92));
  col += (hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}`;

export interface CrystalTunnel {
  select(index: number, hex: string): void;
  setActive(on: boolean): void;
  resize(): void;
  /** draw one frame and hold (reduced motion) */
  still(): void;
  dispose(): void;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createCrystalTunnel(
  canvas: HTMLCanvasElement,
  opts: { phone: boolean },
  onReady?: () => void,
): CrystalTunnel | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance" });
  if (!gl) return null;

  const compile = (type: number, code: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, code);
    gl.compileShader(sh);
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.linkProgram(prog);
  // the raymarcher is a big program: where the driver can link it in the
  // background (KHR_parallel_shader_compile), nothing draws until it is ready,
  // and asking for its status never blocks the page
  const par = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
  let linked = !par;
  if (linked && !gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;


  let uRes: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uZ: WebGLUniformLocation | null = null;
  let uLook: WebGLUniformLocation | null = null;
  let uActive: WebGLUniformLocation | null = null;
  let uHue: WebGLUniformLocation | null = null;
  let uPulse: WebGLUniformLocation | null = null;
  let uSteps: WebGLUniformLocation | null = null;
  let ready = false;
  /** true once the program is linked and its uniforms found */
  const prepare = () => {
    if (ready) return true;
    if (!linked) {
      if (!gl.getProgramParameter(prog, par!.COMPLETION_STATUS_KHR)) return false;
      linked = true;
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    }
    gl.useProgram(prog);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    uRes = u("uRes");
    uTime = u("uTime");
    uZ = u("uZ");
    uLook = u("uLook");
    uActive = u("uActive");
    uHue = u("uHue");
    uPulse = u("uPulse");
    uSteps = u("uSteps");
    ready = true;
    onReady?.();
    return true;
  };

  // internal resolution: a fraction of the CSS pixels, adapted to the frame time
  let scale = opts.phone ? 0.4 : 0.55;
  const MIN = opts.phone ? 0.28 : 0.34;
  const MAX = opts.phone ? 0.55 : 0.8;
  const steps = opts.phone ? 52 : 66;
  let active = false;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let z = 0;
  let speed = 1.25;
  let speedT = 1.25;
  let bandIx = -1;
  const hue = [0.62, 0.36, 1.0];
  const hueT: [number, number, number] = [0.62, 0.36, 1.0];
  let pulseAt = -1e9;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let slowRun = 0;
  let fastRun = 0;

  const onMove = (e: PointerEvent) => {
    look.tx = (e.clientX / window.innerWidth) * 2 - 1;
    look.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width * scale));
    const h = Math.max(2, Math.round(r.height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, w, h);
  }

  function render(now: number) {
    if (!prepare()) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    // adapt the internal resolution to the frame time (after the first second)
    if (last && clock > 1) {
      const ms = now - last;
      if (ms > 19) { slowRun++; fastRun = 0; } else if (ms < 15) { fastRun++; slowRun = 0; } else { slowRun = 0; fastRun = 0; }
      if (slowRun > 12 && scale > MIN) { scale = Math.max(MIN, scale - 0.08); slowRun = 0; resize(); }
      if (fastRun > 120 && scale < MAX) { scale = Math.min(MAX, scale + 0.05); fastRun = 0; resize(); }
    }
    last = now;
    clock += dt;
    speed += (speedT - speed) * (1 - Math.exp(-dt * 2));
    z += dt * speed;
    look.x += (look.tx - look.x) * (1 - Math.exp(-dt * 2.5));
    look.y += (look.ty - look.y) * (1 - Math.exp(-dt * 2.5));
    for (let i = 0; i < 3; i++) hue[i] += (hueT[i] - hue[i]) * (1 - Math.exp(-dt * 2.2));
    const pulse = Math.min(1, (now - pulseAt) / 1800);
    if (pulse >= 1) speedT = 1.25;

    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uTime, clock);
    gl!.uniform1f(uZ, z);
    gl!.uniform2f(uLook, look.x, look.y);
    gl!.uniform1f(uActive, bandIx);
    gl!.uniform3f(uHue, hue[0], hue[1], hue[2]);
    gl!.uniform1f(uPulse, pulse);
    gl!.uniform1f(uSteps, steps);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now: number) {
    raf = 0;
    if (disposed || !active) return;
    render(now);
    raf = requestAnimationFrame(frame);
  }

  resize();

  return {
    select(index, hex) {
      bandIx = index;
      const c = hexRgb(hex);
      hueT[0] = c[0];
      hueT[1] = c[1];
      hueT[2] = c[2];
      pulseAt = performance.now();
      // a surge forward with each new deliverable, easing back to the cruise
      speedT = 3.2;
    },
    setActive(on) {
      active = on && !disposed;
      if (active && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    resize,
    still() {
      z = 6;
      clock = 2;
      // drawn once the program is ready
      const tryDraw = () => {
        if (disposed) return;
        if (prepare()) render(performance.now());
        else requestAnimationFrame(tryDraw);
      };
      tryDraw();
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

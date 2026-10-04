"use client";

import { useEffect, useRef } from "react";
import { MARK_OUTLINE } from "@/components/portal/markOutline";
import TrisenoMark from "@/components/world/TrisenoMark";
import { deviceClass } from "@/lib/device";

/**
 * The TS mark cast in liquid metal — one fragment shader on one quad.
 *
 * The four traced outlines are rasterised once into a canvas, then blurred at
 * two radii; the three channels (sharp mask, tight bevel, wide dome) become a
 * height field the shader reads its normals from. The chrome itself is an
 * environment that never stops moving: a horizon of light and dark bands bent
 * by domain-warped noise, a faint cyan sheen riding the turns, a highlight
 * that rakes the bevel, and a pointer that presses into the paint like a
 * fingertip (a soft bulge with a slight twist).
 *
 * Raw WebGL1, no three.js: it is a single draw call. It draws only while on
 * screen and the tab is visible, holds one settled frame under reduced
 * motion, and gives every GL object back on unmount. Until the GL frame is up
 * — or forever, if there is no WebGL — the SVG mark stands in, in ink.
 */

const N = 512; // mask resolution
const FILL = 0.78; // share of the texture the mark spans

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uPtr;
uniform float uPtrK;
uniform float uTexel;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float height(vec2 uv) { vec4 t = texture2D(uTex, uv); return t.g * 0.55 + t.b * 0.45; }

void main() {
  float t = uTime;
  vec2 uv = vUv;

  // the fingertip: a soft bulge with a slight twist around the pointer
  vec2 d = uv - uPtr;
  float fall = exp(-dot(d, d) * 26.0) * uPtrK;
  float a = fall * 0.75;
  vec2 dr = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
  uv = uPtr + dr * (1.0 - fall * 0.16);
  // the paint is never quite still
  uv += (vec2(noise(uv * 5.0 + t * 0.35), noise(uv * 5.0 - t * 0.3 + 7.1)) - 0.5) * 0.006;

  vec4 tx = texture2D(uTex, uv);
  float m = tx.r;
  if (m < 0.004) { gl_FragColor = vec4(0.0); return; }

  float e = uTexel * 1.5;
  float hx = height(uv + vec2(e, 0.0)) - height(uv - vec2(e, 0.0));
  float hy = height(uv + vec2(0.0, e)) - height(uv - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx * 8.0, -hy * 8.0, 1.0));
  float slope = length(vec2(hx, hy));

  // flowing environment, bent by domain-warped noise
  vec2 p = uv * 2.3;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.09)), fbm(p + vec2(5.2, -t * 0.07)));
  float flow = fbm(p + q * 1.7 + vec2(t * 0.045, -t * 0.035));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float env = r.y * 1.1 + r.x * 0.45 + (flow - 0.5) * 1.6 + (uv.y - 0.5) * 0.8;

  float bands = sin(env * 6.4 - t * 0.5) * 0.5 + 0.5;
  float c = smoothstep(0.18, 0.82, bands);
  c = c * c * (3.0 - 2.0 * c);
  vec3 col = mix(vec3(0.10, 0.12, 0.13), vec3(0.95, 0.97, 0.98), c);
  // brushed silver through the middle of each turn
  col = mix(col, vec3(0.64, 0.68, 0.70), 0.28 * (1.0 - abs(c * 2.0 - 1.0)));
  // a sharp horizon glint, like a window line on chrome
  float hz = abs(fract(env * 0.9 - t * 0.04) - 0.5);
  col += smoothstep(0.035, 0.0, hz) * 0.35;
  // the faint cyan sheen on the turns toward dark
  float sheen = smoothstep(0.55, 1.0, sin(env * 3.4 + 1.3 - t * 0.35) * 0.5 + 0.5) * (1.0 - c * 0.85);
  col += vec3(0.0, 0.706, 0.847) * sheen * 0.26;

  // a raking highlight on the bevel that drifts, and leans to the pointer
  vec3 L = normalize(vec3((uPtr.x - 0.5) * uPtrK * 1.4 + 0.45 * sin(t * 0.27), (uPtr.y - 0.5) * uPtrK * 1.4 + 0.5, 0.85));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
  col += spec * 0.55;
  // edge: a bright lip on the bevel, then an ink line where the paint meets the paper
  col += smoothstep(0.03, 0.15, slope) * 0.12;
  col *= mix(0.42, 1.0, smoothstep(0.42, 0.62, tx.g));

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col * m, m);
}`;

/** separable box blur, run three times: a cheap gaussian */
function blur(src: Float32Array, r: number): Float32Array {
  const a = src.slice();
  const b = new Float32Array(N * N);
  const w = 2 * r + 1;
  for (let it = 0; it < 3; it++) {
    for (let y = 0; y < N; y++) {
      const row = y * N;
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[row + Math.min(N - 1, Math.max(0, k))];
      for (let x = 0; x < N; x++) {
        b[row + x] = s / w;
        s += a[row + Math.min(N - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[Math.min(N - 1, Math.max(0, k)) * N + x];
      for (let y = 0; y < N; y++) {
        a[y * N + x] = s / w;
        s += b[Math.min(N - 1, y + r + 1) * N + x] - b[Math.max(0, y - r) * N + x];
      }
    }
  }
  return a;
}

/** rasterise the mark: R = sharp mask, G = tight bevel, B = wide dome */
function buildMask(): Uint8Array | null {
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const pts = MARK_OUTLINE.flat();
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const k = (N * FILL) / span;
  ctx.fillStyle = "#fff";
  for (const poly of MARK_OUTLINE) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      const px = N / 2 + (x - cx) * k;
      const py = N / 2 - (y - cy) * k; // canvas is y-down; the texture is flipped on upload
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }
  const img = ctx.getImageData(0, 0, N, N).data;
  const mask = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) mask[i] = img[i * 4 + 3] / 255;
  const tight = blur(mask, 4);
  const wide = blur(mask, 16);
  const out = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    out[i * 4] = Math.round(mask[i] * 255);
    out[i * 4 + 1] = Math.round(tight[i] * 255);
    out[i * 4 + 2] = Math.round(wide[i] * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function MetallicMark({ className, label }: { className?: string; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const weak = deviceClass() !== "high";

    const canvas = document.createElement("canvas");
    canvas.className = "wf-metal__gl";
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }) as WebGLRenderingContext | null;
    if (!gl) return;
    const data = buildMask();
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!data || !vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // one oversized triangle covers the viewport
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uPtr = gl.getUniformLocation(prog, "uPtr");
    const uPtrK = gl.getUniformLocation(prog, "uPtrK");
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
    gl.uniform1f(gl.getUniformLocation(prog, "uTexel"), 1 / N);
    gl.clearColor(0, 0, 0, 0);

    host.appendChild(canvas);

    const pix = Math.min(window.devicePixelRatio || 1, weak ? 1.25 : 2);
    const size = () => {
      const w = Math.max(1, Math.round(host.clientWidth * pix));
      const h = Math.max(1, Math.round(host.clientHeight * pix));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    size();

    // pointer, eased: where it is, and how much it presses
    const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, k: 0, tk: 0 };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ptr.tx = (e.clientX - r.left) / r.width;
      ptr.ty = 1 - (e.clientY - r.top) / r.height;
      ptr.tk = 1;
      if (reduced) frame(performance.now());
    };
    const onLeave = () => {
      ptr.tk = 0;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onLeave);

    let raf = 0;
    let last = performance.now();
    let t = reduced ? 6.0 : 2.0;
    let visible = true;
    let ready = false;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) t += dt;
      const ease = reduced ? 1 : 1 - Math.exp(-dt * 7);
      ptr.x += (ptr.tx - ptr.x) * ease;
      ptr.y += (ptr.ty - ptr.y) * ease;
      ptr.k += (ptr.tk - ptr.k) * (reduced ? 1 : 1 - Math.exp(-dt * 3.5));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uPtr, ptr.x, ptr.y);
      gl.uniform1f(uPtrK, ptr.k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!ready) {
        ready = true;
        host.dataset.gl = "1"; // the SVG stand-in fades out
      }
    };
    const loop = (now: number) => {
      frame(now);
      if (!reduced && visible) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(() => {
      size();
      if (reduced || !visible) frame(performance.now());
    });
    ro.observe(host);
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
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      visible = false;
      delete host.dataset.gl;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      delete host.dataset.gl;
    };
  }, []);

  return (
    <div ref={hostRef} className={`wf-metal ${className ?? ""}`} role="img" aria-label={label}>
      <TrisenoMark className="wf-metal__svg" color="var(--ink)" />
    </div>
  );
}

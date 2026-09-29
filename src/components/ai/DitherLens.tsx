"use client";

import { useEffect, useRef } from "react";

/**
 * A photograph shown as a 1-bit print on the page's paper, with a lens that
 * develops the real frame wherever it rests.
 *
 * The plate is dark (a nave of black pillars strung with cyan light), so the
 * print is its negative: dark reads as paper, light as ink, and the saturated
 * filaments print in the signal cyan. Inside the lens the true frame shows,
 * slightly magnified, ringed by a hairline. On arrival the print runs down the
 * frame like a plotter pass; when nobody is pointing, the lens drifts on its
 * own so the frame is never still.
 *
 * One small WebGL1 program. It draws only while it is on screen and something
 * is moving (the lens, the print pass); otherwise it sits on its last frame.
 * No WebGL: the plain photograph, under a paper-coloured duotone (CSS).
 */

interface Props {
  src: string;
  /** a narrower crop for phones (optional) */
  srcMobile?: string;
  className?: string;
  /** lens radius as a fraction of the frame's shorter side */
  lens?: number;
  /** a readout element the lens writes its position into (optional) */
  readout?: React.RefObject<HTMLElement | null>;
  label: string;
}

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D img;
uniform vec2 res;      // canvas px
uniform vec2 imgAsp;   // cover scale
uniform vec2 lens;     // lens centre, 0..1 of the canvas (y up)
uniform float radius;  // lens radius, px
uniform float cell;    // dither cell, px
uniform float print;   // 0..1 the plotter pass
uniform float lensOn;  // 0..1
uniform vec3 paper;
uniform vec3 ink;
uniform vec3 signal;

float bayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  // 4x4 ordered dither matrix, unrolled
  float m = 0.0;
  if (i < 0.5) m = 0.0; else if (i < 1.5) m = 8.0; else if (i < 2.5) m = 2.0; else if (i < 3.5) m = 10.0;
  else if (i < 4.5) m = 12.0; else if (i < 5.5) m = 4.0; else if (i < 6.5) m = 14.0; else if (i < 7.5) m = 6.0;
  else if (i < 8.5) m = 3.0; else if (i < 9.5) m = 11.0; else if (i < 10.5) m = 1.0; else if (i < 11.5) m = 9.0;
  else if (i < 12.5) m = 15.0; else if (i < 13.5) m = 7.0; else if (i < 14.5) m = 13.0; else m = 5.0;
  return (m + 0.5) / 16.0;
}

vec2 cover(vec2 t) { return (t - 0.5) * imgAsp + 0.5; }

void main() {
  vec2 px = uv * res;
  vec2 lc = lens * res;
  float d = distance(px, lc);

  // the print: sampled per dither cell so every dot is one solid block
  vec2 cellPx = (floor(px / cell) + 0.5) * cell;
  vec3 c = texture2D(img, cover(vec2(cellPx.x / res.x, 1.0 - cellPx.y / res.y))).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  // lift the plate's deep shadows so the nave's structure prints, not just its lights
  float tone = pow(clamp(lum * 1.55, 0.0, 1.0), 0.72);
  float on = step(bayer4(px / cell), tone);
  // only the lit filaments print in the signal colour: saturated AND bright
  vec3 dot = mix(ink, signal, smoothstep(0.22, 0.42, sat) * smoothstep(0.28, 0.55, lum));
  vec3 printed = mix(paper, dot, on);
  // the plotter pass: rows below the head are still blank paper, the head
  // itself a thin signal line
  float head = 1.0 - print;
  float fy = 1.0 - uv.y;
  float done = step(fy, 1.0 - head + 0.0001);
  printed = mix(paper, printed, done);
  float line = (1.0 - smoothstep(0.0, 2.0, abs(fy * res.y - (1.0 - head) * res.y))) * step(0.001, print) * step(print, 0.999);
  printed = mix(printed, signal, line);

  // the lens: the true frame, magnified a touch about its centre
  vec2 m = lc + (px - lc) * 0.86;
  vec3 real = texture2D(img, cover(vec2(m.x / res.x, 1.0 - m.y / res.y))).rgb;
  real = pow(real, vec3(0.92)) * 1.08;
  float r = radius * lensOn;
  float inside = 1.0 - smoothstep(r - 1.0, r + 0.5, d);
  vec3 col = mix(printed, real, inside * done);
  // hairline ring, and a second faint one outside it
  float ring = (1.0 - smoothstep(0.0, 1.2, abs(d - r))) * lensOn * done;
  float ring2 = (1.0 - smoothstep(0.0, 0.9, abs(d - r - 7.0))) * lensOn * 0.45 * done;
  col = mix(col, signal, max(ring, ring2));
  gl_FragColor = vec4(col, 1.0);
}`;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function DitherLens({ src, srcMobile, className = "", lens = 0.2, readout, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      wrap.setAttribute("data-fallback", "");
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const sh = (type: number, code: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, code);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      wrap.setAttribute("data-fallback", "");
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u("res"),
      imgAsp: u("imgAsp"),
      lens: u("lens"),
      radius: u("radius"),
      cell: u("cell"),
      print: u("print"),
      lensOn: u("lensOn"),
      paper: u("paper"),
      ink: u("ink"),
      signal: u("signal"),
    };
    const cs = getComputedStyle(wrap);
    gl.uniform3fv(U.paper, hex(cs.getPropertyValue("--paper").trim() || "#e6e9e8"));
    gl.uniform3fv(U.ink, hex(cs.getPropertyValue("--ink").trim() || "#0b0e0f"));
    gl.uniform3fv(U.signal, hex(cs.getPropertyValue("--signal").trim() || "#00b4d8"));

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let imgW = 16;
    let imgH = 9;
    let ready = false;

    const st = {
      w: 1,
      h: 1,
      dpr: 1,
      // lens position (0..1, y down) and its target
      x: 0.62,
      y: 0.46,
      tx: 0.62,
      ty: 0.46,
      on: 0,
      onT: 1,
      print: reduced ? 1 : 0,
      printing: false,
      pointer: false,
      lastMove: 0,
      visible: false,
      raf: 0,
      dirty: true,
    };

    const size = () => {
      const r = wrap.getBoundingClientRect();
      st.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      st.w = Math.max(1, Math.round(r.width * st.dpr));
      st.h = Math.max(1, Math.round(r.height * st.dpr));
      canvas.width = st.w;
      canvas.height = st.h;
      gl.viewport(0, 0, st.w, st.h);
      st.dirty = true;
    };

    const draw = () => {
      if (!ready) return;
      const ca = st.w / st.h;
      const ia = imgW / imgH;
      // cover: shrink the sampled span along the image's longer overhang
      const sx = ca > ia ? 1 : ca / ia;
      const sy = ca > ia ? ia / ca : 1;
      gl.uniform2f(U.res, st.w, st.h);
      gl.uniform2f(U.imgAsp, sx, sy);
      gl.uniform2f(U.lens, st.x, 1 - st.y);
      gl.uniform1f(U.radius, Math.min(st.w, st.h) * lens);
      gl.uniform1f(U.cell, Math.max(2, Math.round(2.2 * st.dpr)));
      gl.uniform1f(U.print, st.print);
      gl.uniform1f(U.lensOn, st.on);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let t0 = performance.now();
    const loop = (now: number) => {
      st.raf = 0;
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      let moving = st.dirty;
      st.dirty = false;
      if (st.printing) {
        st.print = Math.min(1, st.print + dt / 1.7);
        if (st.print >= 1) st.printing = false;
        moving = true;
      }
      // with no pointer on it for a while, the lens drifts on a slow figure
      if (!reduced && (!fine || now - st.lastMove > 2600)) {
        const s = now / 1000;
        st.tx = 0.5 + 0.26 * Math.sin(s * 0.23) + 0.08 * Math.sin(s * 0.61 + 1.3);
        st.ty = 0.5 + 0.2 * Math.sin(s * 0.31 + 0.7);
      }
      const k = 1 - Math.pow(0.0009, dt);
      const nx = st.x + (st.tx - st.x) * k;
      const ny = st.y + (st.ty - st.y) * k;
      const no = st.on + (st.onT - st.on) * Math.min(1, dt * 5);
      if (Math.abs(nx - st.x) + Math.abs(ny - st.y) + Math.abs(no - st.on) > 0.00005) moving = true;
      st.x = nx;
      st.y = ny;
      st.on = no;
      if (moving) {
        draw();
        const out = readout?.current;
        if (out) out.textContent = `X ${st.x.toFixed(3)}  Y ${st.y.toFixed(3)}`;
      }
      const drifting = !reduced && (!fine || now - st.lastMove > 2600);
      if (st.visible && (moving || drifting)) st.raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!st.raf && st.visible) {
        t0 = performance.now();
        st.raf = requestAnimationFrame(loop);
      }
    };

    const img = new Image();
    img.decoding = "async";
    img.src = srcMobile && window.matchMedia("(max-width: 767px)").matches ? srcMobile : src;
    img.onload = () => {
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ready = true;
      wrap.setAttribute("data-ready", "");
      st.dirty = true;
      if (st.visible && !reduced && st.print < 1) st.printing = true;
      kick();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = wrap.getBoundingClientRect();
      st.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      st.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      st.lastMove = performance.now();
      st.onT = 1;
      kick();
    };
    const onLeave = () => {
      st.lastMove = 0;
      kick();
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    const io = new IntersectionObserver(
      ([e]) => {
        st.visible = e.isIntersecting;
        if (st.visible) {
          if (ready && !reduced && st.print === 0) st.printing = true;
          st.dirty = true;
          kick();
        } else if (st.raf) {
          cancelAnimationFrame(st.raf);
          st.raf = 0;
        }
      },
      { threshold: 0.15 },
    );
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      size();
      kick();
    });
    ro.observe(wrap);
    size();

    return () => {
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      if (st.raf) cancelAnimationFrame(st.raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src, srcMobile, lens, readout]);

  return (
    <div ref={wrapRef} className={`ai-lens ${className}`} role="img" aria-label={label}>
      {/* the fallback (no WebGL): the photograph under a paper duotone */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ai-lens__fallback" src={src} alt="" aria-hidden="true" decoding="async" loading="lazy" />
      <canvas ref={canvasRef} className="ai-lens__canvas" aria-hidden="true" />
    </div>
  );
}

"use client";

import "@/app/ai-interlude.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { deviceClass } from "@/lib/device";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fig. 02, the interlude: one plate that opens from a figure on the sheet to
 * the whole page, and develops as it opens.
 *
 * Pinned and scrubbed by scroll, three things share one progress value:
 *   · the window: a card in the centre of the paper that grows to full bleed
 *     (a clip-path, so nothing reflows), its crop marks riding its corners;
 *   · the headline: "Designed / to scale." sits on the card, and as it opens
 *     the two lines part to opposite corners. The type is set twice, ink on
 *     paper and paper on the plate, the second clipped by the same window, so
 *     every letter changes colour exactly where it crosses the edge;
 *   · the print: one WebGL program resolves the photograph in three stages,
 *     1-bit ordered dither (ink on paper) -> a 45-degree halftone screen whose
 *     cell eases open and shut while the dots swell -> the full-colour frame.
 *     Stage boundaries are not cuts: a slow noise field and a left-to-right
 *     bias make the resolve sweep across the frame, and cells dissolve in
 *     Bayer order. A soft radius around the pointer runs one stage ahead.
 *
 * Draws only while on screen and something is changing. Reduced motion: no
 * pin, the open plate in full colour. No WebGL: the plain photograph.
 */

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D img;
uniform vec2 res;      // canvas px
uniform vec2 imgAsp;   // cover scale
uniform float zoom;    // >1 = pushed in
uniform float prog;    // 0..1 the resolve
uniform float cellD;   // dither cell, px
uniform float cellH;   // halftone cell, px
uniform vec2 ptr;      // pointer, px (y up)
uniform float ptrR;    // pointer radius, px
uniform float ptrK;    // 0..1 pointer presence
uniform float time;
uniform float dpr;
uniform vec3 paper;
uniform vec3 ink;
uniform vec3 signal;

// recursive ordered-dither matrix: 2x2 -> 4x4 -> 8x8
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec3 samp(vec2 px) {
  vec2 q = vec2(px.x / res.x, 1.0 - px.y / res.y);
  q = (q - 0.5) / zoom + 0.5;
  q = (q - 0.5) * imgAsp + 0.5;
  return texture2D(img, q).rgb;
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float satur(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }

void main() {
  vec2 px = uv * res;

  // ── where this pixel is in the resolve: 0 dither · 1 halftone · 2 colour
  float env = smoothstep(0.0, 0.08, prog) * (1.0 - smoothstep(0.9, 1.0, prog));
  float n = vnoise(px / res.y * 2.6 + vec2(time * 0.05, -time * 0.035)) * 0.65
          + vnoise(px / res.y * 7.0 - vec2(time * 0.08, 0.0)) * 0.35;
  float L = prog * 2.3 - 0.15;
  L += (n - 0.5) * 0.7 * env;
  L += (0.5 - uv.x) * 0.45 * env;
  float d = distance(px, ptr);
  float near = exp(-pow(d / ptrR, 2.0) * 2.2);
  L += near * ptrK * 0.95;
  float a = smoothstep(0.12, 0.88, L);
  float b = smoothstep(1.12, 1.92, L);

  // ── stage 1: 1-bit ordered dither, light printed out of the ink
  vec2 cd = (floor(px / cellD) + 0.5) * cellD;
  vec3 c1 = samp(cd);
  float t1 = pow(clamp((luma(c1) - 0.035) * 2.7, 0.0, 1.0), 1.1);
  float lit = step(bayer8(px / cellD), t1);
  // only the lit filaments print in signal: saturated AND bright; the rest is paper
  vec3 litCol = mix(paper, signal, smoothstep(0.2, 0.45, satur(c1)) * smoothstep(0.35, 0.7, t1) * (1.0 - smoothstep(0.85, 1.0, t1) * 0.6));
  vec3 dither = mix(ink, litCol, lit);

  // ── stage 2: a 45-degree halftone screen, dots sized by light
  const float R = 0.70710678;
  vec2 cpx = px - res * 0.5;
  vec2 rp = vec2(R * cpx.x - R * cpx.y, R * cpx.x + R * cpx.y);
  vec2 g = rp / cellH;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec2 rc = (id + 0.5) * cellH;
  vec2 cc = vec2(R * rc.x + R * rc.y, -R * rc.x + R * rc.y) + res * 0.5;
  vec3 c2 = samp(cc);
  float t2 = pow(clamp((luma(c2) - 0.03) * 2.5, 0.0, 1.0), 0.95);
  float rad = sqrt(t2) * 0.6 * mix(1.0, 1.75, b);
  float aa = 1.1 / cellH;
  float dotM = 1.0 - smoothstep(rad - aa, rad + aa, length(f));
  vec3 photo = pow(samp(px), vec3(0.95)) * 1.06;
  vec3 dotCol = mix(mix(paper, signal, smoothstep(0.2, 0.42, satur(c2)) * smoothstep(0.3, 0.65, t2)), photo, b);
  vec3 ground = mix(ink, photo, b);
  vec3 tone = mix(ground, dotCol, dotM);

  // dither -> halftone: cells change over in Bayer order, not all at once
  float swap = step(bayer8(px / cellD + vec2(3.0, 5.0)) + 0.001, a);
  vec3 col = mix(dither, tone, swap);

  // the pointer's lens: one faint hairline, only while a pointer is there
  float ring = (1.0 - smoothstep(0.0, 1.1 * dpr, abs(d - ptrR * 0.72))) * ptrK * 0.55 * (1.0 - b * 0.6);
  col = mix(col, signal, ring);
  gl_FragColor = vec4(col, 1.0);
}`;

const SRC = "/worlds/ai-desktop.webp";
const SRC_MOBILE = "/worlds/ai-mobile.webp";
const STAGES = ["1-bit", "Halftone", "Colour"] as const;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** The type over the plate. Rendered twice: ink, and paper inside the window. */
function Overlay({ copy }: { copy: boolean }) {
  const Title = copy ? "div" : "h2";
  return (
    <>
      <Title id={copy ? undefined : "ai-xp-title"} className="ai-xp__title font-display">
        <span className="ai-xp__half" data-half="a">
          Designed
        </span>
        <span className="ai-xp__half" data-half="b">
          to scale.
        </span>
      </Title>
      <div className="ai-xp__foot">
        <p className="ai-xp__cap">
          <b>Fig. 02</b> <span>The operational layer</span>
        </p>
        <p className="ai-xp__read" aria-hidden="true">
          {STAGES.map((s, i) => (
            <span key={s} className="ai-xp__step" data-i={i}>
              {String(i + 1).padStart(2, "0")} {s}
            </span>
          ))}
          <span className="ai-xp__pct">000%</span>
        </p>
      </div>
    </>
  );
}

export default function ExpandInterlude() {
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    if (!stage || !media || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cls = deviceClass();

    const paperLayer = stage.querySelector<HTMLElement>(".ai-xp__layer--paper")!;
    const halvesA = Array.from(stage.querySelectorAll<HTMLElement>('.ai-xp__half[data-half="a"]'));
    const halvesB = Array.from(stage.querySelectorAll<HTMLElement>('.ai-xp__half[data-half="b"]'));
    const crops = Array.from(stage.querySelectorAll<HTMLElement>(".ai-xp__crop"));
    const stageEls = Array.from(stage.querySelectorAll<HTMLElement>(".ai-xp__step"));
    const pctEls = Array.from(stage.querySelectorAll<HTMLElement>(".ai-xp__pct"));

    /* ── geometry, measured with everything at rest ── */
    const geo = { W: 1, H: 1, w0: 1, h0: 1, ax: 0, ay: 0, bx: 0, by: 0 };
    const measure = () => {
      const r = stage.getBoundingClientRect();
      geo.W = r.width;
      geo.H = r.height;
      geo.w0 = phone ? r.width * 0.72 : Math.min(r.width * 0.38, 720);
      geo.h0 = phone ? r.height * 0.44 : r.height * 0.52;
      // the type's lanes come from the ink layer's padding (gutter, top lane)
      // and from the foot row, which line two must clear
      const lay = stage.querySelector<HTMLElement>(".ai-xp__layer--ink")!;
      const lcs = getComputedStyle(lay);
      const gutter = parseFloat(lcs.paddingLeft) || 24;
      const top = parseFloat(lcs.paddingTop) || 120;
      const foot = lay.querySelector<HTMLElement>(".ai-xp__foot");
      const footTop = foot ? foot.getBoundingClientRect().top - r.top : r.height - 140;
      const bottom = r.height - footTop + (phone ? 18 : 28);
      const a = halvesA[0];
      const b = halvesB[0];
      a.style.transform = "none";
      b.style.transform = "none";
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      // line one parts to the top-left, line two to the bottom-right
      geo.ax = gutter - (ra.left - r.left);
      geo.ay = top - (ra.top - r.top);
      geo.bx = r.width - gutter - (rb.right - r.left);
      geo.by = r.height - bottom - (rb.bottom - r.top);
    };

    /* ── the shader ── */
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
    let draw: () => void = () => {};
    let disposeGl = () => {};
    const st = {
      p: reduced ? 1 : 0,
      w: 1,
      h: 1,
      dpr: 1,
      // pointer, 0..1 of the stage (y down), smoothed toward its target
      x: 0.5,
      y: 0.5,
      tx: 0.5,
      ty: 0.5,
      k: 0,
      kT: 0,
      visible: false,
      raf: 0,
      dirty: true,
      t0: performance.now(),
    };
    let ready = false;

    if (gl) {
      const sh = (type: number, code: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, code);
        gl.compileShader(s);
        return s;
      };
      const vs = sh(gl.VERTEX_SHADER, VERT);
      const fs = sh(gl.FRAGMENT_SHADER, FRAG);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        media.setAttribute("data-fallback", "");
      } else {
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const u = (name: string) => gl.getUniformLocation(prog, name);
        const U = {
          res: u("res"),
          imgAsp: u("imgAsp"),
          zoom: u("zoom"),
          prog: u("prog"),
          cellD: u("cellD"),
          cellH: u("cellH"),
          ptr: u("ptr"),
          ptrR: u("ptrR"),
          ptrK: u("ptrK"),
          time: u("time"),
          dpr: u("dpr"),
          paper: u("paper"),
          ink: u("ink"),
          signal: u("signal"),
        };
        const cs = getComputedStyle(stage);
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

        draw = () => {
          if (!ready) return;
          const p = st.p;
          const e = inOut(clamp01(p / 0.62));
          const res = clamp01((p - 0.06) / 0.86);
          const ca = st.w / st.h;
          const ia = imgW / imgH;
          gl.uniform2f(U.res, st.w, st.h);
          gl.uniform2f(U.imgAsp, ca > ia ? 1 : ca / ia, ca > ia ? ia / ca : 1);
          gl.uniform1f(U.zoom, 1.2 - 0.2 * e);
          gl.uniform1f(U.prog, res);
          gl.uniform1f(U.cellD, Math.max(2, Math.round(2 * st.dpr)));
          // the screen opens (4 -> 13 px) through the halftone stage, then
          // tightens again (-> 7 px) as the dots swell into the photograph
          const s1 = expoOut(clamp01((res - 0.12) / 0.45));
          const s2 = inOut(clamp01((res - 0.6) / 0.36));
          gl.uniform1f(U.cellH, (4 + 9 * s1 - 6 * s2) * st.dpr);
          gl.uniform2f(U.ptr, st.x * st.w, (1 - st.y) * st.h);
          gl.uniform1f(U.ptrR, Math.min(st.w, st.h) * (phone ? 0.3 : 0.2));
          gl.uniform1f(U.ptrK, st.k);
          gl.uniform1f(U.time, reduced ? 0 : (performance.now() - st.t0) / 1000);
          gl.uniform1f(U.dpr, st.dpr);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };

        const img = new Image();
        img.decoding = "async";
        img.src = phone ? SRC_MOBILE : SRC;
        img.onload = () => {
          imgW = img.naturalWidth;
          imgH = img.naturalHeight;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          ready = true;
          media.setAttribute("data-ready", "");
          st.dirty = true;
          kick();
        };

        disposeGl = () => {
          img.onload = null;
          gl.deleteTexture(tex);
          gl.deleteBuffer(buf);
          gl.deleteProgram(prog);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
      }
    } else {
      media.setAttribute("data-fallback", "");
    }

    const size = () => {
      const r = media.getBoundingClientRect();
      const cap = cls === "high" ? 1.5 : 1;
      st.dpr = Math.min(window.devicePixelRatio || 1, cap);
      st.w = Math.max(1, Math.round(r.width * st.dpr));
      st.h = Math.max(1, Math.round(r.height * st.dpr));
      canvas.width = st.w;
      canvas.height = st.h;
      gl?.viewport(0, 0, st.w, st.h);
      st.dirty = true;
    };

    /* ── one progress value drives the window, the type and the print ── */
    let lastStage = -1;
    const apply = () => {
      const p = st.p;
      const e = inOut(clamp01(p / 0.62));
      const s = inOut(clamp01((p - 0.04) / 0.6));
      const ix = ((geo.W - geo.w0) / 2) * (1 - e);
      const iy = ((geo.H - geo.h0) / 2) * (1 - e);
      const clip = `inset(${iy.toFixed(2)}px ${ix.toFixed(2)}px ${iy.toFixed(2)}px ${ix.toFixed(2)}px)`;
      media.style.clipPath = clip;
      paperLayer.style.clipPath = clip;
      const ta = `translate3d(${(geo.ax * s).toFixed(2)}px, ${(geo.ay * s).toFixed(2)}px, 0)`;
      const tb = `translate3d(${(geo.bx * s).toFixed(2)}px, ${(geo.by * s).toFixed(2)}px, 0)`;
      for (const el of halvesA) el.style.transform = ta;
      for (const el of halvesB) el.style.transform = tb;
      const fade = String(1 - Math.pow(e, 3));
      crops.forEach((el) => {
        const c = el.dataset.c!;
        const sx = c.includes("l") ? ix : -ix;
        const sy = c.includes("t") ? iy : -iy;
        el.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0)`;
        el.style.opacity = fade;
      });
      const res = clamp01((p - 0.06) / 0.86);
      const stageI = res < 0.3 ? 0 : res < 0.72 ? 1 : 2;
      if (stageI !== lastStage) {
        lastStage = stageI;
        for (const el of stageEls) el.toggleAttribute("data-on", Number(el.dataset.i) === stageI);
      }
      const pct = `${String(Math.round(res * 100)).padStart(3, "0")}%`;
      for (const el of pctEls) el.textContent = pct;
      st.dirty = true;
      kick();
    };

    /* ── the draw loop: only while visible and something is changing ── */
    let tPrev = performance.now();
    const loop = (now: number) => {
      st.raf = 0;
      const dt = Math.min(0.05, (now - tPrev) / 1000);
      tPrev = now;
      let moving = st.dirty;
      st.dirty = false;
      const k = 1 - Math.pow(0.002, dt);
      const nx = st.x + (st.tx - st.x) * k;
      const ny = st.y + (st.ty - st.y) * k;
      const nk = st.k + (st.kT - st.k) * Math.min(1, dt * 4);
      if (Math.abs(nx - st.x) + Math.abs(ny - st.y) + Math.abs(nk - st.k) > 0.00005) moving = true;
      st.x = nx;
      st.y = ny;
      st.k = nk;
      // mid-resolve, the noise field keeps boiling slowly
      const boiling = !reduced && st.p > 0.02 && st.p < 0.98;
      if (moving || boiling) draw();
      if (st.visible && (moving || boiling || st.k > 0.001)) st.raf = requestAnimationFrame(loop);
    };
    function kick() {
      if (!st.raf && st.visible) {
        tPrev = performance.now();
        st.raf = requestAnimationFrame(loop);
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = stage.getBoundingClientRect();
      st.tx = clamp01((e.clientX - r.left) / r.width);
      st.ty = clamp01((e.clientY - r.top) / r.height);
      if (st.kT === 0) {
        st.x = st.tx;
        st.y = st.ty;
      }
      st.kT = 1;
      kick();
    };
    const onLeave = () => {
      st.kT = 0;
      kick();
    };
    if (fine && !reduced) {
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);
    }

    const io = new IntersectionObserver(
      ([en]) => {
        st.visible = en.isIntersecting;
        if (st.visible) {
          st.dirty = true;
          kick();
        } else if (st.raf) {
          cancelAnimationFrame(st.raf);
          st.raf = 0;
        }
      },
      { threshold: 0 },
    );
    io.observe(stage);

    measure();
    size();
    apply();
    const ro = new ResizeObserver(() => {
      measure();
      size();
      apply();
    });
    ro.observe(stage);

    let tween: gsap.core.Tween | null = null;
    if (!reduced) {
      tween = gsap.to(st, {
        p: 1,
        ease: "none",
        onUpdate: apply,
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          // phones: the pin stays well under two viewport heights (M5)
          end: phone ? "+=130%" : "+=200%",
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            apply();
          },
        },
      });
    }

    return () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();
      io.disconnect();
      ro.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      if (st.raf) cancelAnimationFrame(st.raf);
      disposeGl();
    };
  }, []);

  return (
    <section aria-labelledby="ai-xp-title" className="ai-xp relative z-10">
      <div ref={stageRef} className="ai-xp__stage">
        <div
          ref={mediaRef}
          className="ai-xp__media"
          role="img"
          aria-label="A dark nave of pillars strung with cyan light filaments, developing from a one-bit print through a halftone screen into the full-colour photograph"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ai-xp__fallback" src={SRC} alt="" aria-hidden="true" decoding="async" loading="lazy" />
          <canvas ref={canvasRef} className="ai-xp__canvas" aria-hidden="true" />
        </div>
        <span aria-hidden="true" className="ai-xp__crop" data-c="tl" />
        <span aria-hidden="true" className="ai-xp__crop" data-c="tr" />
        <span aria-hidden="true" className="ai-xp__crop" data-c="bl" />
        <span aria-hidden="true" className="ai-xp__crop" data-c="br" />
        <div className="ai-xp__layer ai-xp__layer--ink">
          <Overlay copy={false} />
        </div>
        <div className="ai-xp__layer ai-xp__layer--paper" aria-hidden="true">
          <Overlay copy />
        </div>
      </div>
    </section>
  );
}

"use client";

import "@/app/ai-mercury.css";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowCounterClockwise, ArrowsInLineHorizontal } from "@phosphor-icons/react";
import { COMPRESSION } from "./content";
import { MERCURY } from "./mercury-compression.content";
import { computeLayout, mercuryFrame, type Pt } from "./compressionLayout";
import { AGENT_0, AGENT_N, BALLS, BEAD_N, GHOST, MERCURY_VERT, POINTER, mercuryFrag } from "./mercury.glsl";
import { session } from "./session";
import { deviceClass, gpuClass, gpuName } from "@/lib/device";

gsap.registerPlugin(ScrollTrigger);

/**
 * 04. Compression — twelve beads of ink mercury press into five agents.
 *
 * The twelve manual steps lie on the paper as beads of dark metal along the
 * serpentine trail, each with its name set in mono beside it. They are not
 * chrome: what they reflect is the sheet they rest on, the drafting grid
 * bending across every bead. Scroll in (or press Compress) and they roll to
 * their agents. As two approach, their surfaces reach for each other, a neck
 * forms and snaps, and the larger bead grows by exactly the volume it took:
 * the five bodies that remain are visibly made of what arrived (the
 * orchestrator four steps, each worker two). A thin cyan meniscus marks
 * where an agent wets the paper, its name prints beside it, the two floors
 * draw, the bus clips down, the extruded headline flattens. Reset runs the
 * film backwards and the necks thin and part.
 *
 * Put a pointer on any bead and pull: it stretches, a thread runs back to a
 * ghost where it was (thinning as it is pulled and gone past ~6.5 bead
 * radii), and it either springs back or, dropped on another body, merges
 * early into that body's agent (the counts under the agents stay honest).
 * On a mouse the nearest body's flank bulges toward the cursor; a tap sends
 * the page's square hairline out and a radius pulse through the nearest
 * body. A finger arms a drag after a 140 ms hold or 6 px of mostly sideways
 * travel; a vertical swipe still scrolls the page. Once the visitor presses
 * Compress / Reset, a refreshed ScrollTrigger never overrides that choice.
 *
 * The mercury is one raymarched WebGL1 fragment shader (mercury.glsl.ts) on
 * a stage-sized canvas, registered 1:1 with the DOM trail, floors, bus and
 * tags (compressionLayout.ts). Volume is conserved by construction: an
 * agent's volume is its group's count minus what its beads still hold, so
 * drags, early merges and resets can never leak a step. It draws only while
 * something moves and the section is on screen; no WebGL (or a lost
 * context) hands the same arrays to flat ink discs under an SVG goo filter.
 * Reduced motion: the compressed state is drawn once and the control
 * switches states with a single redraw; no drag, no pointer drop.
 */

const STEPS = COMPRESSION.steps;
const COLLAPSE = COMPRESSION.collapseTo;
const AGENTS = COMPRESSION.agents;
const DEPTH_LAYERS = 14;
/** the drag ghost's radius as a share of the picked body's; the body keeps the rest of the volume */
const GHOST_R = 0.62;
const GHOST_V = GHOST_R ** 3;
/** the scripted run's last slide ends here (0.28 + 11 x 0.055 + 0.95) */
const END = 1.835;

interface Body {
  /** displayed centre, stage px */
  x: number;
  y: number;
  /** displayed radius, px (0 = absent) */
  r: number;
  /** 1 while picked or at its drop point, tweened to 0 as it returns */
  dragK: number;
  /** where the pointer holds it */
  dx: number;
  dy: number;
  /** a radius pulse, 0 -> 1 */
  pulse: number;
}

interface Bead extends Body {
  /** slide progress along the quadratic path to its scripted agent */
  u: number;
  /** scripted arrival weight: volume handed to the agent */
  w: number;
  lift: number;
  /** early-merge weight: volume handed to intoBead / intoAgent */
  em: number;
  intoBead: number;
  intoAgent: number;
  /** the agent whose material this bead is (COLLAPSE[i] until an early merge moves it) */
  group: number;
  /** displayed volume in bead units */
  vol: number;
  /** resting (undragged) centre this frame */
  ox: number;
  oy: number;
}

interface Agent extends Body {
  vol: number;
  count: number;
}

type Pick = { kind: "bead" | "agent"; i: number };

interface GlApi {
  /** "weak" integrated / older mobile GPUs draw one notch smaller */
  weak: boolean;
  /** neck = [ghost x, ghost y, body x, body y, radius] (radius 0 = no neck); ptrZ = the drop's centre height */
  draw: (balls: Float32Array, neck: Float32Array, ptrZ: number, k: number, z0: number, settle: number, w: number, h: number, stageW: number) => void;
  dispose: () => void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
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

/** the one program, or null when WebGL is missing or the link fails (the goo fallback takes over) */
function buildGl(canvas: HTMLCanvasElement, steps: number): GlApi | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    }) as WebGLRenderingContext | null;
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const ctx = gl;
  // a raymarch drawn by the CPU is never smooth: no GPU hands over to the goo fallback
  const gpu = gpuClass(gpuName(ctx));
  if (gpu === "software") {
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  const deriv = !!ctx.getExtension("OES_standard_derivatives");
  const vs = compile(ctx, ctx.VERTEX_SHADER, MERCURY_VERT);
  const fs = compile(ctx, ctx.FRAGMENT_SHADER, mercuryFrag(steps, deriv));
  const prog = ctx.createProgram();
  if (!vs || !fs || !prog) {
    if (vs) ctx.deleteShader(vs);
    if (fs) ctx.deleteShader(fs);
    if (prog) ctx.deleteProgram(prog);
    return null;
  }
  ctx.attachShader(prog, vs);
  ctx.attachShader(prog, fs);
  ctx.linkProgram(prog);
  if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
    ctx.deleteProgram(prog);
    ctx.deleteShader(vs);
    ctx.deleteShader(fs);
    return null;
  }
  ctx.useProgram(prog);
  // one oversized triangle covers the stage
  const buf = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
  const aPos = ctx.getAttribLocation(prog, "aPos");
  ctx.enableVertexAttribArray(aPos);
  ctx.vertexAttribPointer(aPos, 2, ctx.FLOAT, false, 0, 0);
  const u = {
    balls: ctx.getUniformLocation(prog, "uBalls"),
    k: ctx.getUniformLocation(prog, "uK"),
    z0: ctx.getUniformLocation(prog, "uZ0"),
    res: ctx.getUniformLocation(prog, "uRes"),
    inv: ctx.getUniformLocation(prog, "uInvDpr"),
    settle: ctx.getUniformLocation(prog, "uSettle"),
    neck: ctx.getUniformLocation(prog, "uNeck"),
    neckR: ctx.getUniformLocation(prog, "uNeckR"),
    ptrZ: ctx.getUniformLocation(prog, "uPtrZ"),
  };
  ctx.clearColor(0, 0, 0, 0);
  let cw = -1;
  let ch = -1;
  let sw = -1;
  return {
    weak: gpu === "weak",
    draw(balls, neck, ptrZ, k, z0, settle, w, h, stageW) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (cw !== w || ch !== h || sw !== stageW) {
        cw = w;
        ch = h;
        sw = stageW;
        ctx.viewport(0, 0, w, h);
        ctx.uniform2f(u.res, w, h);
        ctx.uniform1f(u.inv, stageW / w);
      }
      ctx.uniform4fv(u.balls, balls);
      ctx.uniform1f(u.k, k);
      ctx.uniform1f(u.z0, z0);
      ctx.uniform1f(u.settle, settle);
      ctx.uniform4f(u.neck, neck[0], neck[1], neck[2], neck[3]);
      ctx.uniform1f(u.neckR, neck[4]);
      ctx.uniform1f(u.ptrZ, ptrZ);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    },
    dispose() {
      ctx.deleteBuffer(buf);
      ctx.deleteProgram(prog);
      ctx.deleteShader(vs);
      ctx.deleteShader(fs);
      ctx.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

/** the headline is "Not Automation. Compression." — the last word gets the depth */
function splitTitle(title: string): [string, string] {
  const cut = title.lastIndexOf(". ", title.length - 2);
  if (cut < 0) return ["", title];
  return [title.slice(0, cut + 1), title.slice(cut + 2)];
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function MercuryCompression() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const afterRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const fieldRef = useRef<{ prepare: (to: boolean) => void; dirty: () => void } | null>(null);
  const glRef = useRef<GlApi | null>(null);
  /** shared between the mount effect (visibility) and the layout effect (the loop) */
  const ctlRef = useRef({ inView: false, visible: false, fallback: false, wake: () => {} });
  const compressedRef = useRef(false);
  const reducedRef = useRef(false);
  const loggedRef = useRef(false);
  /** the scroll-in auto-run is armed until it fires or the visitor takes the control */
  const autoRef = useRef(true);

  const [width, setWidth] = useState(0);
  const [compressed, setCompressed] = useState(false);
  const [line, setLine] = useState<string>(MERCURY.state.resting);
  const layout = useMemo(() => (width > 0 ? computeLayout(width) : null), [width]);
  const frame = useMemo(() => (layout ? mercuryFrame(layout) : null), [layout]);
  const [pre, word] = useMemo(() => splitTitle(COMPRESSION.title), []);
  const [chNum, chName] = MERCURY.chapter;

  /* measure the stage; the first measure also settles reduced motion on the final state */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let first = true;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (first) {
        first = false;
        reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedRef.current) {
          compressedRef.current = true;
          setCompressed(true);
          setLine(MERCURY.state.pressed);
          sectionRef.current?.setAttribute("data-nodrag", "");
        }
      }
      setWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  /* the GL program (once), and whether the stage is on screen */
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const ctl = ctlRef.current;
    const dc = deviceClass();
    const api = buildGl(canvas, dc === "high" ? 40 : dc === "mid" ? 32 : 24);
    glRef.current = api;
    const fallback = () => {
      glRef.current = null;
      ctl.fallback = true;
      stage.setAttribute("data-fallback", "");
      sectionRef.current?.setAttribute("data-nodrag", "");
    };
    if (!api) fallback();

    let seen = false;
    const sync = () => {
      ctl.visible = ctl.inView && !document.hidden;
      if (ctl.visible) ctl.wake();
    };
    const io = new IntersectionObserver(([e]) => {
      ctl.inView = e.isIntersecting;
      if (e.isIntersecting && !seen) {
        seen = true;
        session.figure(MERCURY.figure);
      }
      sync();
    });
    io.observe(stage);
    document.addEventListener("visibilitychange", sync);
    const onLost = (e: Event) => {
      e.preventDefault();
      api?.dispose();
      fallback();
      ctl.wake();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (glRef.current) glRef.current.dispose();
      glRef.current = null;
    };
  }, []);

  const run = useCallback((to: boolean) => {
    compressedRef.current = to;
    setCompressed(to);
    const tl = tlRef.current;
    if (!tl) return;
    fieldRef.current?.prepare(to);
    // drags and early merges never bake into recorded start values
    tl.invalidate();
    if (reducedRef.current) {
      tl.pause().progress(to ? 1 : 0, true);
      setLine(to ? MERCURY.state.pressed : MERCURY.state.resting);
      fieldRef.current?.dirty();
      return;
    }
    if (to) tl.timeScale(1).play();
    else tl.timeScale(1.7).reverse();
  }, []);

  /* the field, its timeline, the pointer and the draw loop: rebuilt whenever the layout changes */
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const depth = depthRef.current;
    const tagsEl = tagsRef.current;
    if (!layout || !frame || !stage || !canvas || !depth || !tagsEl) return;
    const ctl = ctlRef.current;
    const reduced = reducedRef.current;
    const { W, H, manual, nodes } = layout;
    const { r0, tagBeside } = frame;
    const dc = deviceClass();
    const phone = layout.narrow || window.matchMedia("(max-width: 767px)").matches;
    const weak = !!glRef.current?.weak;
    const dpr = Math.min(window.devicePixelRatio || 1, 1) * (phone ? 0.45 : dc === "high" && !weak ? 0.75 : 0.55);
    const cw = Math.max(1, Math.round(W * dpr));
    const ch = Math.max(1, Math.round(H * dpr));
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced;

    /* ── the field ── */
    const beads: Bead[] = manual.map((p, i) => ({
      u: 0, w: 0, lift: 0, em: 0, intoBead: -1, intoAgent: -1, group: COLLAPSE[i], vol: 1,
      ox: p.x, oy: p.y, x: p.x, y: p.y, r: r0, dragK: 0, dx: p.x, dy: p.y, pulse: 0,
    }));
    const agents: Agent[] = nodes.map((n) => ({ x: n.x, y: n.y, r: 0, vol: 0, count: 0, dragK: 0, dx: n.x, dy: n.y, pulse: 0 }));
    // each bead slides on a quadratic path: control point 0.18 x the distance off the chord, alternating sides
    const ctrl: Pt[] = manual.map((p, i) => {
      const n = nodes[COLLAPSE[i]];
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const s = (i % 2 ? 1 : -1) * 0.18;
      return { x: (p.x + n.x) / 2 - dy * s, y: (p.y + n.y) / 2 + dx * s };
    });
    const F = { k: 10, settle: 0 };
    const ghost = { x: 0, y: 0, r: 0 };
    const neck = new Float32Array(5);
    const ptr = { x: 0, y: 0, z: r0, tx: 0, ty: 0, r: 0, on: false };
    const balls = new Float32Array(BALLS * 4);
    const extra = new Float64Array(BEAD_N);
    let picked: Pick | null = null;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const tagEls = Array.from(tagsEl.querySelectorAll<HTMLElement>(".ai-merc__tag"));
    const agentEls = Array.from(tagsEl.querySelectorAll<HTMLElement>(".ai-merc__agent"));
    const countEls = agentEls.map((el) => el.querySelector<HTMLElement>("em"));
    // one layout read per layout: each tag's width, so a tag near the right edge sets on the bead's left
    const widthOf = (el: HTMLElement) => (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    const tagW = tagEls.map(widthOf);
    const agentW = agentEls.map(widthOf);
    const edge = W - 6;
    // the side is settled once from where the body rests, so a tag never jumps sides mid-slide
    const tagLeft = manual.map((p, i) => p.x + r0 * 1.1 + 10 + tagW[i] > edge);
    /** the tag's anchor x: beside (right, or left near the edge) or centred under, kept on the stage */
    const tagX = (x: number, r: number, gap: number, w: number, left: boolean) => {
      if (tagBeside) return left ? x - r - gap - w : x + r + gap;
      return Math.min(Math.max(x, 6 + w / 2), edge - w / 2);
    };
    const discEls = Array.from(stage.querySelectorAll<HTMLElement>(".ai-merc__disc"));
    const lastCount = new Int32Array(AGENT_N).fill(-1);

    const bodyOf = (p: Pick): Body => (p.kind === "bead" ? beads[p.i] : agents[p.i]);

    /** positions, volumes and radii for this frame; returns the largest radius */
    const solve = (): number => {
      extra.fill(0);
      for (let i = 0; i < BEAD_N; i++) {
        const b = beads[i];
        if (b.intoBead >= 0) extra[b.intoBead] += b.em;
      }
      for (let i = 0; i < BEAD_N; i++) {
        const b = beads[i];
        const u = b.u;
        const P0 = manual[i];
        const C = ctrl[i];
        const P1 = nodes[COLLAPSE[i]];
        const a = (1 - u) * (1 - u);
        const m = 2 * (1 - u) * u;
        const c = u * u;
        b.ox = a * P0.x + m * C.x + c * P1.x;
        b.oy = a * P0.y + m * C.y + c * P1.y;
        b.vol = (1 - b.w) * (1 - b.em) * (1 + extra[i]);
      }
      // a bead merged early rides the body it went into (a root never has a target, so one pass is enough)
      for (let i = 0; i < BEAD_N; i++) {
        const b = beads[i];
        if (b.intoBead >= 0) {
          const t = beads[b.intoBead];
          b.ox += (t.ox - b.ox) * b.em;
          b.oy += (t.oy - b.oy) * b.em;
        } else if (b.intoAgent >= 0) {
          const t = nodes[b.intoAgent];
          b.ox += (t.x - b.ox) * b.em;
          b.oy += (t.y - b.oy) * b.em;
        }
      }
      // an agent is whatever its group's beads no longer hold: volume conserved by construction
      for (let g = 0; g < AGENT_N; g++) {
        let count = 0;
        let sum = 0;
        for (let i = 0; i < BEAD_N; i++) {
          if (beads[i].group === g) {
            count++;
            sum += beads[i].vol;
          }
        }
        agents[g].count = count;
        agents[g].vol = Math.max(0, count - sum);
      }
      let maxR = 0;
      ghost.r = 0;
      neck[4] = 0;
      const place = (B: Body, rx: number, ry: number, r: number) => {
        if (B.dragK > 0 && r > 0) {
          // the ghost keeps a share of the volume where the body was; a neck runs between them
          ghost.x = rx;
          ghost.y = ry;
          ghost.r = GHOST_R * r * B.dragK;
          r *= Math.cbrt(1 - GHOST_V * B.dragK);
          B.x = rx + (B.dx - rx) * B.dragK;
          B.y = ry + (B.dy - ry) * B.dragK;
          // the thread between them thins as it is pulled and is gone past ~6.5 bead radii
          const len = Math.hypot(B.x - rx, B.y - ry);
          const f = 1 - len / (6.5 * r0);
          if (f > 0 && len > 1) {
            neck[0] = rx;
            neck[1] = ry;
            neck[2] = B.x;
            neck[3] = B.y;
            neck[4] = ghost.r * 0.5 * Math.pow(f, 1.4);
          }
        } else {
          B.x = rx;
          B.y = ry;
        }
        if (B.pulse > 0 && B.pulse < 1 && r > 0) r += 0.4 * r0 * Math.sin(Math.PI * B.pulse);
        B.r = r;
        if (r > maxR) maxR = r;
      };
      for (let i = 0; i < BEAD_N; i++) {
        const b = beads[i];
        place(b, b.ox, b.oy, b.vol > 0.004 ? r0 * Math.cbrt(b.vol) * (1 + 0.08 * b.lift) : 0);
      }
      for (let g = 0; g < AGENT_N; g++) {
        const A = agents[g];
        place(A, nodes[g].x, nodes[g].y, A.vol > 0.015 ? r0 * Math.cbrt(A.vol) : 0);
      }
      if (ghost.r > maxR) maxR = ghost.r;
      return maxR;
    };

    /**
     * The nearest body reaches for the cursor: a small drop sits on the sheet
     * at that body's foot, on the line to the cursor, never further out than
     * the union can still join (so it reads as the surface flowing toward the
     * pointer, never as a loose speck). Writes the anchor; returns the radius.
     */
    const want = { x: 0, y: 0, z: r0 };
    const dropWant = (): number => {
      if (!ptr.on || dragging) return 0;
      let best = 1e9;
      let hit: Body | null = null;
      for (let i = 0; i < BEAD_N + AGENT_N; i++) {
        const B = i < BEAD_N ? beads[i] : agents[i - BEAD_N];
        if (B.r <= 0) continue;
        const d = Math.hypot(ptr.tx - B.x, ptr.ty - B.y) - B.r;
        if (d < best) {
          best = d;
          hit = B;
        }
      }
      if (!hit) return 0;
      const B = hit;
      const len = Math.hypot(ptr.tx - B.x, ptr.ty - B.y) || 1;
      const rp = 0.34 * r0 * (1 - clamp01(best / (1.8 * B.r)));
      // centred inside the flank, so the bulge grows out of the surface toward the pointer
      const reach = B.r - rp * 0.35 + Math.min(Math.max(best, 0), F.k * 0.3);
      want.x = B.x + ((ptr.tx - B.x) / len) * reach;
      want.y = B.y + ((ptr.ty - B.y) / len) * reach;
      want.z = B.r;
      return rp;
    };

    const fill = (maxR: number): number => {
      for (let i = 0; i < BEAD_N; i++) {
        const b = beads[i];
        const o = i * 4;
        balls[o] = b.x;
        balls[o + 1] = b.y;
        balls[o + 2] = b.r;
        balls[o + 3] = 0;
      }
      for (let g = 0; g < AGENT_N; g++) {
        const A = agents[g];
        const o = (AGENT_0 + g) * 4;
        balls[o] = A.x;
        balls[o + 1] = A.y;
        balls[o + 2] = A.r;
        balls[o + 3] = clamp01(A.vol / Math.max(1, A.count));
      }
      balls.set([ghost.x, ghost.y, ghost.r, 0], GHOST * 4);
      balls.set([ptr.x, ptr.y, ptr.r, 0], POINTER * 4);
      return Math.max(maxR, ptr.r);
    };

    const writeTags = () => {
      for (let i = 0; i < BEAD_N; i++) {
        const b = beads[i];
        const el = tagEls[i];
        if (!el) continue;
        // a bead's name fades as it is absorbed, and steps back while the bead is held
        const op = b.vol < 0.02 ? 0 : clamp01((b.vol - 0.3) / 0.5) * (1 - 0.7 * b.dragK);
        const x = tagX(b.x, b.r, 10, tagW[i], tagLeft[i]);
        const y = tagBeside ? b.y : b.y + b.r + 8;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = op.toFixed(3);
      }
      for (let g = 0; g < AGENT_N; g++) {
        const A = agents[g];
        const el = agentEls[g];
        if (!el) continue;
        // an agent's name sits centred under its finished body, above its floor
        const rF = r0 * Math.cbrt(Math.max(1, A.count));
        const x = Math.min(Math.max(A.x, 6 + agentW[g] / 2), edge - agentW[g] / 2);
        const y = A.y + rF + 10;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = (clamp01((A.vol - 0.35) / 0.65) * (1 - 0.7 * A.dragK)).toFixed(3);
        const n = Math.round(A.vol);
        if (n !== lastCount[g]) {
          lastCount[g] = n;
          const c = countEls[g];
          if (c) c.textContent = `${MERCURY.absorbed} ${n}`;
        }
      }
    };

    /** no WebGL: the same arrays on flat ink discs under the goo filter */
    const writeDiscs = () => {
      for (let i = 0; i < BEAD_N + AGENT_N; i++) {
        const B = i < BEAD_N ? beads[i] : agents[i - BEAD_N];
        const el = discEls[i];
        if (!el) continue;
        el.style.transform = `translate3d(${B.x.toFixed(1)}px, ${B.y.toFixed(1)}px, 0) scale(${(B.r / r0).toFixed(3)})`;
      }
    };

    /* ── the loop: draws only while something moves and the stage is on screen ── */
    let raf = 0;
    let running = false;
    let last = 0;
    let dirty = true;
    let tl: gsap.core.Timeline | null = null;
    const wake = () => {
      if (running || !ctl.visible) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const markDirty = () => {
      dirty = true;
      wake();
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let busy = dirty || dragging || !!tl?.isActive();
      if (finePointer) {
        const e = 1 - Math.exp(-dt * 9);
        const wr = dropWant();
        // while the drop is gone it jumps to its anchor, so it never slides in from where it was last seen
        if (ptr.r < 0.2) {
          ptr.x = want.x;
          ptr.y = want.y;
          ptr.z = want.z;
        }
        ptr.x += (want.x - ptr.x) * e;
        ptr.y += (want.y - ptr.y) * e;
        ptr.r += (wr - ptr.r) * e;
        ptr.z += (want.z - ptr.z) * e;
        if (ptr.r < 0.05 && wr === 0) ptr.r = 0;
        if (Math.abs(want.x - ptr.x) + Math.abs(want.y - ptr.y) > 0.1 || Math.abs(wr - ptr.r) > 0.05) busy = true;
      }
      if (!busy || !ctl.visible) {
        running = false;
        return;
      }
      dirty = false;
      const maxR = fill(solve());
      const api = glRef.current;
      if (api) api.draw(balls, neck, ptr.z, F.k, maxR * 2 + 2, F.settle, cw, ch, W);
      else writeDiscs();
      writeTags();
      raf = requestAnimationFrame(tick);
    };
    ctl.wake = wake;

    /* ── gestures ── */
    const pulse = (B: Body) => {
      gsap.killTweensOf(B, "pulse");
      gsap.fromTo(B, { pulse: 0 }, { pulse: 1, duration: 0.6, ease: "power2.inOut", onUpdate: markDirty });
    };
    const ring = (x: number, y: number) => {
      // the square hairline runs out from the tap over the floor (page convention)
      const reach = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
      const el = document.createElement("span");
      el.className = "ai-merc__ring";
      el.setAttribute("aria-hidden", "true");
      el.style.width = el.style.height = `${reach * 2}px`;
      el.style.left = `${x - reach}px`;
      el.style.top = `${y - reach}px`;
      stage.appendChild(el);
      gsap.fromTo(el, { scale: 0.01, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 1.4, ease: "power2.out", onComplete: () => el.remove() });
    };
    const nearest = (x: number, y: number, except: Pick | null, within: ((B: Body) => number) | null): Pick | null => {
      let best: Pick | null = null;
      let bd = 1e9;
      for (let i = 0; i < BEAD_N + AGENT_N; i++) {
        const p: Pick = i < BEAD_N ? { kind: "bead", i } : { kind: "agent", i: i - BEAD_N };
        if (except && except.kind === p.kind && except.i === p.i) continue;
        const B = bodyOf(p);
        if (B.r <= 0 || (p.kind === "bead" && beads[p.i].vol < 0.02)) continue;
        const d = Math.hypot(x - B.x, y - B.y);
        if (within && d > within(B)) continue;
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    };
    const hitTest = (x: number, y: number) => nearest(x, y, null, (B) => 1.15 * B.r + 4);
    const tap = (x: number, y: number) => {
      ring(x, y);
      const n = nearest(x, y, null, null);
      if (n) pulse(bodyOf(n));
    };
    const relaxK = () => {
      gsap.to(F, { k: compressedRef.current ? 18 : 10, duration: 0.45, ease: "power2.inOut", overwrite: "auto", onUpdate: markDirty });
    };
    const springBack = (B: Body) => {
      gsap.to(B, { dragK: 0, duration: 0.6, ease: "power3.out", overwrite: "auto", onUpdate: markDirty });
    };
    const merge = (i: number, t: Pick) => {
      const b = beads[i];
      if (t.kind === "bead") {
        let root = t.i;
        while (beads[root].intoBead >= 0) root = beads[root].intoBead;
        if (root === i) {
          springBack(b);
          return;
        }
        b.intoBead = root;
        b.intoAgent = -1;
        b.group = beads[root].group;
      } else {
        b.intoAgent = t.i;
        b.intoBead = -1;
        b.group = t.i;
      }
      gsap.to(b, { em: 1, dragK: 0, duration: 0.35, ease: "power2.out", overwrite: "auto", onUpdate: markDirty });
      setLine(MERCURY.state.merged(STEPS[i], AGENTS[b.group]));
    };
    const startDrag = (p: Pick, x: number, y: number) => {
      picked = p;
      dragging = true;
      const B = bodyOf(p);
      gsap.killTweensOf(B, "dragK");
      B.dragK = 1;
      B.dx = x;
      B.dy = y;
      gsap.to(F, { k: 40, duration: 0.3, ease: "power2.out", overwrite: "auto", onUpdate: markDirty });
      markDirty();
    };
    const endDrag = (x: number, y: number, cancel: boolean) => {
      const p = picked;
      picked = null;
      dragging = false;
      if (!p) return;
      const B = bodyOf(p);
      relaxK();
      if (!cancel && p.kind === "bead") {
        const t = nearest(x, y, p, (o) => 1.3 * (B.r + o.r));
        if (t) {
          merge(p.i, t);
          return;
        }
      }
      springBack(B);
      markDirty();
    };

    type Press = { id: number; x0: number; y0: number; t0: number; hit: Pick | null; armed: boolean; moved: number; timer: number; touch: boolean };
    let press: Press | null = null;
    let over = false;
    const canDrag = () => !reduced && !ctl.fallback;
    const local = (e: PointerEvent): Pt => {
      const r = stage.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / (r.width || W)) * W, y: ((e.clientY - r.top) / (r.height || H)) * H };
    };
    const arm = () => {
      if (!press || press.armed) return;
      press.armed = true;
      try {
        stage.setPointerCapture(press.id);
      } catch {
        // a pointer that is already gone
      }
      stage.setAttribute("data-drag", "");
    };
    const setOver = (v: boolean) => {
      if (v === over) return;
      over = v;
      stage.toggleAttribute("data-over", v);
    };
    const finish = (x: number, y: number, cancel: boolean) => {
      const p = press;
      press = null;
      if (!p) return;
      window.clearTimeout(p.timer);
      if (p.armed) {
        try {
          stage.releasePointerCapture(p.id);
        } catch {
          // already released
        }
      }
      stage.removeAttribute("data-drag");
      if (dragging) {
        endDrag(x, y, cancel);
        return;
      }
      if (!cancel && !reduced && p.moved < 6 && performance.now() - p.t0 < 400) tap(x, y);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (press) return;
      const { x, y } = local(e);
      lastX = x;
      lastY = y;
      const touch = e.pointerType === "touch";
      const hit = canDrag() && !tl?.isActive() ? hitTest(x, y) : null;
      press = { id: e.pointerId, x0: x, y0: y, t0: performance.now(), hit, armed: false, moved: 0, timer: 0, touch };
      if (!hit) return;
      if (!touch) arm();
      else {
        // a finger arms after a short hold with no travel; a vertical pan keeps scrolling the page
        press.timer = window.setTimeout(() => {
          if (press && press.hit && press.moved < 8) arm();
        }, 140);
      }
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      lastX = x;
      lastY = y;
      if (finePointer && e.pointerType !== "touch") {
        ptr.tx = x;
        ptr.ty = y;
        ptr.on = true;
        if (!dragging) setOver(canDrag() && !tl?.isActive() && !!hitTest(x, y));
        wake();
      }
      if (!press || !press.hit) return;
      const dx = x - press.x0;
      const dy = y - press.y0;
      press.moved = Math.max(press.moved, Math.hypot(dx, dy));
      if (!press.armed) {
        if (press.touch && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2) arm();
        else return;
      }
      if (!dragging) {
        if (press.moved <= 3) return;
        startDrag(press.hit, x, y);
      }
      if (picked) {
        const B = bodyOf(picked);
        B.dx = x;
        B.dy = y;
        markDirty();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const { x, y } = local(e);
      finish(x, y, false);
    };
    const onCancel = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      finish(lastX, lastY, true);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      ptr.on = false;
      setOver(false);
      wake();
    };
    const onBlur = () => {
      if (press) finish(lastX, lastY, true);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (press?.armed) e.preventDefault();
    };
    const onContext = (e: Event) => {
      if (press?.armed) e.preventDefault();
    };

    /* ── the timeline, the auto-run ── */
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const timeline = gsap.timeline({
        paused: true,
        onUpdate: markDirty,
        onComplete: () => {
          setLine(MERCURY.state.pressed);
          if (!reduced) {
            // the settled field answers once, from the orchestrator
            pulse(agents[0]);
            if (ctl.visible) ring(nodes[0].x, nodes[0].y);
          }
          if (!loggedRef.current) {
            loggedRef.current = true;
            session.log("compression", MERCURY.log);
          }
        },
        onReverseComplete: () => {
          beads.forEach((b, i) => {
            gsap.killTweensOf(b, "em,dragK");
            b.em = 0;
            b.dragK = 0;
            b.intoBead = -1;
            b.intoAgent = -1;
            b.group = COLLAPSE[i];
          });
          agents.forEach((A) => {
            gsap.killTweensOf(A, "dragK");
            A.dragK = 0;
          });
          setLine(MERCURY.state.resting);
          markDirty();
        },
      });
      tl = timeline;

      // every bead unsticks, slides to its agent on a curve, and hands over its volume on arrival
      beads.forEach((b, i) => {
        const st = i * 0.055;
        timeline.fromTo(b, { lift: 0 }, { lift: 1, duration: 0.28, ease: "power2.out" }, 0.1 + st);
        timeline.fromTo(b, { lift: 1 }, { lift: 0, duration: 0.55, ease: "power2.inOut", immediateRender: false }, 0.5 + st);
        timeline.fromTo(b, { u: 0 }, { u: 1, duration: 0.95, ease: "power3.inOut" }, 0.28 + st);
        timeline.fromTo(b, { w: 0 }, { w: 1, duration: 0.45, ease: "power1.inOut" }, 0.78 + st);
      });
      // the union radius: apart, then gooey while they merge, then settled
      timeline.fromTo(F, { k: 10 }, { k: 46, duration: 1.1, ease: "power2.inOut" }, 0.3);
      timeline.fromTo(F, { k: 46 }, { k: 18, duration: 0.5, ease: "power2.inOut", immediateRender: false }, END - 0.3);
      timeline.fromTo(F, { settle: 0 }, { settle: 1, duration: 0.5, ease: "power2.out" }, END - 0.25);

      timeline.fromTo(q(".ai-merc__trail"), { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.out" }, 0.2);
      // the two layers and the bus between them draw in under the system
      timeline.fromTo(q(".ai-merc__floor"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power3.inOut", stagger: 0.12 }, 1.45);
      timeline.fromTo(q(".ai-merc__ftag"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.12 }, 1.7);
      timeline.fromTo(
        q(".ai-merc__bus"),
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power2.inOut" },
        1.7,
      );
      // the word compresses with the field
      timeline.fromTo(depth, { "--depth": 1 }, { "--depth": 0, duration: 1.5, ease: "power3.inOut" }, 0.25);
      if (lineRef.current) timeline.fromTo(lineRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, 1.72);
      if (afterRef.current) timeline.fromTo(afterRef.current, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 1.76);

      // a rebuild (a resize mid-run) lands on the end state silently, so the words follow it here
      timeline.progress(compressedRef.current ? 1 : 0, true);
      tlRef.current = timeline;
      setLine(compressedRef.current ? MERCURY.state.pressed : MERCURY.state.resting);

      // the first time the stage comes into view, the process compresses itself;
      // scrolling back above it resets, so it can run again. Once the visitor
      // has pressed the control, a refreshed trigger never overrides them.
      ScrollTrigger.create({
        trigger: stage,
        start: "top 62%",
        onEnter: () => {
          if (autoRef.current && !compressedRef.current) run(true);
          autoRef.current = false;
        },
        onLeaveBack: () => {
          autoRef.current = true;
          if (compressedRef.current && !reducedRef.current) run(false);
        },
      });
    }, stage);

    fieldRef.current = {
      prepare: (to) => {
        if (dragging) {
          const p = picked;
          picked = null;
          dragging = false;
          press = null;
          stage.removeAttribute("data-drag");
          if (p) springBack(bodyOf(p));
          relaxK();
        }
        if (!to) {
          // an early merge flows back out of its agent while the rest of the field reverses
          beads.forEach((b, i) => {
            if (b.em <= 0 && b.intoBead < 0 && b.intoAgent < 0) return;
            gsap.to(b, {
              em: 0,
              duration: 0.7,
              ease: "power3.inOut",
              overwrite: "auto",
              onUpdate: markDirty,
              onComplete: () => {
                b.intoBead = -1;
                b.intoAgent = -1;
                b.group = COLLAPSE[i];
                markDirty();
              },
            });
          });
        }
      },
      dirty: markDirty,
    };

    if (!reduced) {
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onCancel);
      stage.addEventListener("lostpointercapture", onCancel);
      stage.addEventListener("pointerleave", onLeave);
      stage.addEventListener("touchmove", onTouchMove, { passive: false });
      stage.addEventListener("contextmenu", onContext);
      window.addEventListener("blur", onBlur);
    }

    stage.setAttribute("data-ready", "");
    markDirty();

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      ctl.wake = () => {};
      tlRef.current = null;
      fieldRef.current = null;
      tl = null;
      ctx.revert();
      gsap.killTweensOf([...beads, ...agents, F]);
      if (!reduced) {
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onCancel);
        stage.removeEventListener("lostpointercapture", onCancel);
        stage.removeEventListener("pointerleave", onLeave);
        stage.removeEventListener("touchmove", onTouchMove);
        stage.removeEventListener("contextmenu", onContext);
        window.removeEventListener("blur", onBlur);
      }
      if (press) window.clearTimeout(press.timer);
      stage.removeAttribute("data-drag");
      stage.removeAttribute("data-over");
      stage.querySelectorAll(".ai-merc__ring").forEach((el) => el.remove());
    };
  }, [layout, frame, run]);

  /* the extrusion leans away from the pointer, as if the pointer were the light (mouse and pen only) */
  useEffect(() => {
    const section = sectionRef.current;
    const depth = depthRef.current;
    if (!section || !depth) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lx = 0;
    let ly = 0;
    let raf = 0;
    const lean = () => {
      raf = 0;
      const r = depth.getBoundingClientRect();
      const vx = (r.left + r.width / 2 - lx) / (window.innerWidth * 0.5);
      const vy = (r.top + r.height / 2 - ly) / (window.innerHeight * 0.5);
      const m = Math.min(1, Math.hypot(vx, vy) * 1.6);
      const len = Math.hypot(vx, vy) || 1;
      let ax = 0.62 * (1 - m) + (vx / len) * m;
      let ay = 0.78 * (1 - m) + (vy / len) * m;
      const n = Math.hypot(ax, ay) || 1;
      ax /= n;
      ay /= n;
      gsap.to(depth, { "--ax": ax, "--ay": ay, duration: 0.9, ease: "power3.out", overwrite: "auto" });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      lx = e.clientX;
      ly = e.clientY;
      if (!raf) raf = requestAnimationFrame(lean);
    };
    const onLeave = () => {
      gsap.to(depth, { "--ax": 0.62, "--ay": 0.78, duration: 1.2, ease: "power3.out", overwrite: "auto" });
    };
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      gsap.killTweensOf(depth, "--ax,--ay");
    };
  }, []);

  const stageStyle = layout && frame
    ? ({
        height: layout.H,
        ["--r0" as string]: `${frame.r0}px`,
        // a step name may wrap to two lines under its bead, never wider than its cell
        ["--cell" as string]: `${Math.floor((layout.W - layout.pad * 2) / (layout.narrow ? 3 : 6) - 10)}px`,
      } as CSSProperties)
    : undefined;

  return (
    <section
      ref={sectionRef}
      data-rail="Compression"
      data-ch={chNum}
      data-fig={MERCURY.figure}
      aria-labelledby="ai-merc-title"
      className="ai-section ai-merc relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-merc__head">
          <div className="ai-merc__titlecol">
            <p className="ai-label">
              <b>{chNum}</b> / {chName}
            </p>
            <h2 id="ai-merc-title" className="ai-merc__title">
              {pre ? <span className="ai-merc__pre">{pre}</span> : null}{" "}
              <span ref={depthRef} className="ai-merc__depth">
                {Array.from({ length: DEPTH_LAYERS }, (_, k) => {
                  const i = DEPTH_LAYERS - k; // farthest first
                  const ink = Math.round(46 - ((i - 2) / (DEPTH_LAYERS - 2)) * 36);
                  const c = i === 1 ? "var(--signal)" : `color-mix(in srgb, var(--ink) ${ink}%, var(--paper))`;
                  return (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="ai-merc__depth-layer"
                      style={{ ["--i" as string]: i, ["--c" as string]: c } as CSSProperties}
                    >
                      {word}
                    </span>
                  );
                })}
                <span className="ai-merc__depth-face">{word}</span>
                <span ref={lineRef} aria-hidden="true" className="ai-merc__depth-line" />
              </span>
            </h2>
          </div>
          <div className="ai-merc__aside">
            <p className="ai-body">{COMPRESSION.body}</p>
            <p className="ai-merc__readout">
              <span className="sr-only">Twelve manual steps collapse into two layers</span>
              <span aria-hidden="true">{MERCURY.readout.before}</span>
              <span ref={afterRef} aria-hidden="true" className="ai-merc__after">
                <i>→</i> {MERCURY.readout.after}
              </span>
            </p>
          </div>
        </header>

        <div className="ai-merc__panel">
          <span aria-hidden="true" className="ai-merc__crop" data-c="tl" />
          <span aria-hidden="true" className="ai-merc__crop" data-c="br" />

          <p className="sr-only">{MERCURY.sr}</p>
          <ol className="sr-only">
            {STEPS.map((step, i) => (
              <li key={step}>
                {step}, handled by the {AGENTS[COLLAPSE[i]]} agent
              </li>
            ))}
          </ol>

          <div ref={stageRef} className="ai-merc__stage" style={stageStyle} aria-hidden="true">
            {layout && frame ? (
              <>
                <svg className="ai-merc__trail" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="none">
                  <path d={layout.trail} />
                </svg>
                <svg className="ai-merc__bus" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="none">
                  <path d={frame.bus} />
                </svg>
                {frame.floors.map((y, l) => (
                  <span
                    key={`floor-${l}`}
                    className="ai-merc__floor"
                    data-l={l + 1}
                    style={{ top: Math.round(y), left: layout.pad, right: layout.pad }}
                  />
                ))}
                {frame.floors.map((y, l) => (
                  <span key={`ftag-${l}`} className="ai-merc__ftag" style={{ top: Math.round(y) + 9, left: layout.pad }}>
                    <b>{MERCURY.floors[l][0]}</b> / {MERCURY.floors[l][1]}
                  </span>
                ))}
              </>
            ) : null}

            <canvas ref={canvasRef} className="ai-merc__gl" />

            <svg className="ai-merc__goo" aria-hidden="true" focusable="false">
              <filter id="ai-merc-goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
                <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
              </filter>
            </svg>
            <div className="ai-merc__discs">
              {Array.from({ length: BEAD_N + AGENT_N }, (_, i) => (
                <i key={i} className="ai-merc__disc" />
              ))}
            </div>

            <div
              ref={tagsRef}
              className="ai-merc__tags"
              data-tags={frame && !frame.tagBeside ? "below" : "beside"}
              data-narrow={layout?.narrow ? "" : undefined}
            >
              {STEPS.map((step, i) => (
                <span key={step} className="ai-merc__tag">
                  <span>
                    <b>{String(i + 1).padStart(2, "0")}</b>
                    {/* a word joiner after each hyphen: "Re-key" never breaks at its hyphen */}
                    {step.replace(/-/g, "-\u2060")}
                  </span>
                </span>
              ))}
              {AGENTS.map((name, g) => (
                <span key={name} className="ai-merc__agent">
                  <span>
                    <b>{name}</b>
                    <i>·</i>
                    <em>
                      {MERCURY.absorbed} {frame ? frame.counts[g] : COLLAPSE.filter((c) => c === g).length}
                    </em>
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="ai-merc__bar">
            <button
              type="button"
              className="ghost-btn ai-merc__btn"
              onClick={() => {
                autoRef.current = false;
                run(!compressed);
              }}
              aria-label={compressed ? MERCURY.control.resetAria : MERCURY.control.compressAria}
            >
              <span className="ghost-btn__layer">
                <span>{compressed ? MERCURY.control.reset : MERCURY.control.compress}</span>
                {compressed ? (
                  <ArrowCounterClockwise size={16} weight="light" aria-hidden="true" />
                ) : (
                  <ArrowsInLineHorizontal size={16} weight="light" aria-hidden="true" />
                )}
              </span>
              <span className="ghost-btn__layer ghost-btn__fill" aria-hidden="true">
                <span>{compressed ? MERCURY.control.reset : MERCURY.control.compress}</span>
                {compressed ? <ArrowCounterClockwise size={16} weight="light" /> : <ArrowsInLineHorizontal size={16} weight="light" />}
              </span>
            </button>
            <p className="ai-merc__state" aria-live="polite">
              <span className="ai-merc__dot" data-on={compressed ? "" : undefined} aria-hidden="true" />
              {line}
            </p>
            <p className="ai-merc__hint" aria-hidden="true">
              <span className="ai-merc__hint-fine">{MERCURY.hint.fine}</span>
              <span className="ai-merc__hint-touch">{MERCURY.hint.touch}</span>
            </p>
          </div>
        </div>

        <p className="ai-figcap ai-merc__figcap">
          <span>
            <b>{MERCURY.figcap[0]}</b>
            {MERCURY.figcap[1]}
          </span>
          <span className="ai-merc__note">{COMPRESSION.note}</span>
        </p>
      </div>
    </section>
  );
}

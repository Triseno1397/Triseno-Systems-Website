"use client";

import "@/app/ai-night.css";
import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { deviceClass } from "@/lib/device";
import { session } from "./session";
import { cleanDark } from "./cleanDark";
import { COMPRESSION } from "./content";
import { NIGHT } from "./night-watch.content";
import {
  CLUSTERS,
  NIGHT_HOURS,
  NIGHT_LEN,
  NIGHT_START_HOUR,
  NIGHT_TOTALS,
  buildConstellation,
  fmt,
  hourLabel,
  nodeCounts,
} from "./nightData";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fig. 09 — twelve hours, unattended: the paper keeps the night.
 *
 * A chapter where the page itself keeps time. A hairline 24-hour ring sits in
 * the middle of the sheet with the hour printed beside it: 18:00. Scrolling
 * passes the hours and a cyan arc fills the ring's lower half. The paper goes
 * to dusk, then truly to ink by 23:00; the type flips to paper-white and the
 * chrome follows (cleanDark, owner "night"). Every finished task of the
 * example night is a point of light that leaves the frame's edge and drifts
 * in a slow loop into its place: the evening's tasks, finished while the
 * sheet was still paper, wait at the edge and stream in as the ink comes up;
 * from 22:00 each one leaves the minute it finished. By 03:00 the points have
 * formed the silhouette of the compressed system from chapter four (one
 * orchestrator, four agents, four buses, 2,318 stars) and the five nodes are
 * named with what each one finished. A table in the margin prints one line
 * per hour, counts only. At dawn the points let go and sink out of the frame,
 * the ink lifts off the paper, the clock strikes 06:00, the ring is full, the
 * sheet is paper, and one line remains.
 *
 * One scroll-scrubbed progress value p (18:00 at 0, 06:00 at 1) is the only
 * state; every frame is a pure function of it, forwards or back. Per changed
 * frame: two opacity writes (dusk, ink), one dash-offset, one transform, one
 * canvas redraw; the clock, rows, copy, node names and summary are written
 * only when their value changes. Layout is read only on resize and refresh. Reduced
 * motion: no pin, the 03:00 state drawn once. Hover (or tap) an hour row and
 * the tasks it finished light in cyan.
 */

const FLIGHT_H = 2.4; // hours a point takes from the edge to its place
const SINK_FROM = 0.88; // p at which the field lets go
const ROW_AT = 0.7; // a row prints 42 minutes into its hour (the hour is as good as closed)
const DONE_AT = 0.97; // the summary, and the session line
const TRAIL_DT = 0.07; // hours between a point and its trail squares
const REDUCED_P = 0.81; // 03:43 — the formed constellation, the table through 03:00
const RING = 0.96; // the ring's radius as a share of the dial's half-width (r 48 in a 100 box)

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const pad2 = (n: number): string => String(n).padStart(2, "0");

/** 24 hour ticks on a dial whose night half (18:00 → 06:00) is the lower half */
const TICKS = Array.from({ length: 24 }, (_, k) => {
  const a = ((6 - k) * 15 * Math.PI) / 180;
  const quarter = k % 6 === 0;
  const r1 = 48;
  const r2 = quarter ? 43.4 : 45.6;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    k,
    x1: (c * r1).toFixed(3),
    y1: (s * r1).toFixed(3),
    x2: (c * r2).toFixed(3),
    y2: (s * r2).toFixed(3),
    quarter,
    night: k >= 18 || k <= 6,
  };
});

/** the lower half of the ring, left (18:00) through the bottom (00:00) to the right (06:00) */
const NIGHT_HALF = "M-48 0 A48 48 0 0 0 48 0";
const DAY_HALF = "M48 0 A48 48 0 0 0 -48 0";

/**
 * The five nodes the stars settle into, named as chapter four names them,
 * each with the tasks it finished that night. Ring units; the label sits
 * clear of its cluster and of the buses: N and S to the right, E and W
 * below, the orchestrator on the one empty diagonal (upper left).
 */
const NODE_LABELS = (() => {
  const counts = nodeCounts();
  const { agentDist, agentAngles } = CLUSTERS;
  return COMPRESSION.agents.map((name, k) => {
    if (k === 0) return { name, count: fmt(counts[0]), x: -0.2, y: -0.22, side: "l" as const };
    const a = agentAngles[k - 1];
    const cx = Math.cos(a) * agentDist;
    const cy = Math.sin(a) * agentDist;
    const vertical = Math.abs(Math.sin(a)) > 0.5;
    return vertical
      ? { name, count: fmt(counts[k]), x: cx + 0.17, y: cy, side: "r" as const }
      : { name, count: fmt(counts[k]), x: cx, y: cy + 0.21, side: "c" as const };
  });
})();

export default function NightWatch() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const duskRef = useRef<HTMLSpanElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialRef = useRef<HTMLElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const hhRef = useRef<HTMLSpanElement>(null);
  const hourOfRef = useRef<HTMLSpanElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  /** set by the effect: light one hour's tasks (-1 clears); "tap" toggles on touch only */
  const hotRef = useRef<(i: number, mode: "hover" | "focus" | "tap") => void>(() => {});
  /** the pointer that pressed last: a mouse click never toggles (hover already lit the hour) */
  const ptrRef = useRef<string>("");

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const dusk = duskRef.current;
    const ink = inkRef.current;
    const canvas = canvasRef.current;
    const dial = dialRef.current;
    const arc = arcRef.current;
    const head = headRef.current;
    const hh = hhRef.current;
    const hourOf = hourOfRef.current;
    const copy = copyRef.current;
    const nodes = nodesRef.current;
    if (!section || !stage || !frame || !dusk || !ink || !canvas || !dial || !arc || !head || !hh || !hourOf || !copy || !nodes) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phoneMq = window.matchMedia("(max-width: 767px)");
    const cls = deviceClass();
    const rows = Array.from(section.querySelectorAll<HTMLElement>(".ai-night__row"));
    const stars = buildConstellation();
    const ctx = canvas.getContext("2d");
    const cs = getComputedStyle(section);
    const PAPER = cs.getPropertyValue("--paper").trim() || "#e6e9e8";
    const SIGNAL = cs.getPropertyValue("--signal").trim() || "#00b4d8";

    /* ── geometry, measured only on resize / refresh ── */
    const geo = { W: 1, H: 1, cx: 0, cy: 0, R: 1, dpr: 1 };
    const st = { p: reduced ? REDUCED_P : 0, t: 0, ink: 0, visible: false, hot: -1, dirty: true };
    const last = {
      hour: -1,
      dusk: "",
      ink: "",
      night: false,
      copy: "",
      nodes: "",
      arc: "",
      head: "",
      done: false,
      rows: new Array<boolean>(rows.length).fill(false),
    };
    let tickFlip = false;
    let figured = false;
    let logged = session.lastEvent("night") !== null;
    const tell = () => {
      if (logged) return;
      logged = true;
      session.setNight({ tasks: NIGHT_TOTALS.tasks, escalations: NIGHT_TOTALS.escalations });
      session.log("night", NIGHT.sessionLine);
    };

    const measure = () => {
      const r = stage.getBoundingClientRect();
      const d = dial.getBoundingClientRect();
      geo.W = Math.max(1, r.width);
      geo.H = Math.max(1, r.height);
      geo.cx = d.left - r.left + d.width / 2;
      geo.cy = d.top - r.top + d.height / 2;
      geo.R = Math.max(1, (d.width / 2) * RING);
      // the arc is drawn in the dial's own units (a dash on a pathLength of 1
      // is only exact without non-scaling-stroke): 2px at any size
      arc.style.strokeWidth = (200 / Math.max(1, d.width)).toFixed(3);
      const cap = phoneMq.matches ? 1 : cls === "high" ? 1.5 : cls === "mid" ? 1.25 : 1;
      geo.dpr = Math.min(window.devicePixelRatio || 1, cap);
      const w = Math.round(geo.W * geo.dpr);
      const h = Math.round(geo.H * geo.dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      last.head = "";
      st.dirty = true;
    };

    /* ── the constellation ── */
    const N = stars.n;
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const t1x = new Float32Array(N);
    const t1y = new Float32Array(N);
    const t2x = new Float32Array(N);
    const t2y = new Float32Array(N);
    /** 0 not yet out, 1 at rest, 2 in flight (drawn with a trail) */
    const state = new Uint8Array(N);

    /** where point i is at night-time tt (hours) and progress pp; returns its flight phase 0..1 */
    const place = (i: number, tt: number, pp: number, ox: Float32Array, oy: Float32Array): number => {
      const { W, H, cx, cy, R } = geo;
      const e = stars.edge[i];
      let ex: number;
      let ey: number;
      if (e < 1) {
        ex = e * W;
        ey = 0;
      } else if (e < 2) {
        ex = W;
        ey = (e - 1) * H;
      } else if (e < 3) {
        ex = (3 - e) * W;
        ey = H;
      } else {
        ex = 0;
        ey = (4 - e) * H;
      }
      const tgx = cx + stars.tx[i] * R;
      const tgy = cy + stars.ty[i] * R;
      const since = tt - stars.enter[i];
      const u = clamp01(since / FLIGHT_H);
      const k = 1 - Math.pow(1 - u, 3);
      let x = ex + (tgx - ex) * k;
      let y = ey + (tgy - ey) * k;
      if (u > 0 && u < 1) {
        // the slow loop: nothing at birth, widest mid-flight, gone on arrival
        const amp = Math.sin(Math.PI * u) * stars.lr[i] * Math.min(W, H);
        const a = stars.lp[i] + stars.lw[i] * since;
        x += Math.sin(a) * amp;
        y += Math.cos(a) * amp * stars.lk[i];
      }
      // dawn: the field lets go, unevenly, and falls out of the frame
      const s = smooth(SINK_FROM + stars.sd[i] * 0.06, 1, pp);
      if (s > 0) {
        const g = s * s;
        x += stars.sx[i] * 0.3 * W * g;
        y += (H * 1.25 - y) * g;
      }
      ox[i] = x;
      oy[i] = y;
      return u;
    };

    const draw = () => {
      if (!ctx) return;
      if (!st.visible) {
        st.dirty = true;
        return;
      }
      st.dirty = false;
      const { W, H, dpr } = geo;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const inkA = st.ink;
      if (inkA <= 0.002) return;
      const t = st.t;
      const p = st.p;
      // 1.5px squares; on a phone's small ring a crisp 1px reads finer
      const sz = Math.max(1, Math.round((phoneMq.matches ? 1.25 : 1.5) * dpr)) / dpr;
      const sinking = p > SINK_FROM;
      for (let i = 0; i < N; i++) {
        if (stars.enter[i] > t) {
          state[i] = 0;
          continue;
        }
        const u = place(i, t, p, px, py);
        const mv = (u > 0.001 && u < 0.999) || sinking;
        state[i] = mv ? 2 : 1;
        if (mv) {
          place(i, t - TRAIL_DT, p - TRAIL_DT / NIGHT_LEN, t1x, t1y);
          place(i, t - 2 * TRAIL_DT, p - 2 * TRAIL_DT / NIGHT_LEN, t2x, t2y);
        }
      }
      const count = N;
      const hot = st.hot;
      const dim = hot >= 0 ? 0.42 : 1;
      const r = (v: number) => Math.round(v * dpr) / dpr;

      // trails, faint to less faint
      ctx.fillStyle = PAPER;
      ctx.globalAlpha = inkA * 0.14 * dim;
      for (let i = 0; i < count; i++) if (state[i] === 2) ctx.fillRect(r(t2x[i]), r(t2y[i]), sz, sz);
      ctx.globalAlpha = inkA * 0.32 * dim;
      for (let i = 0; i < count; i++) if (state[i] === 2) ctx.fillRect(r(t1x[i]), r(t1y[i]), sz, sz);
      // the points, paper
      ctx.globalAlpha = inkA * 0.85 * dim;
      for (let i = 0; i < count; i++) if (state[i] && !stars.cyan[i] && stars.hour[i] !== hot) ctx.fillRect(r(px[i]), r(py[i]), sz, sz);
      // every sixteenth, signal
      ctx.fillStyle = SIGNAL;
      for (let i = 0; i < count; i++) if (state[i] && stars.cyan[i] && stars.hour[i] !== hot) ctx.fillRect(r(px[i]), r(py[i]), sz, sz);
      // the hour under the pointer: its tasks, lit
      if (hot >= 0) {
        ctx.globalAlpha = inkA;
        for (let i = 0; i < count; i++) if (state[i] && stars.hour[i] === hot) ctx.fillRect(r(px[i]), r(py[i]), sz, sz);
      }
      ctx.globalAlpha = 1;
    };

    /* ── one progress value drives everything ── */
    const apply = () => {
      const p = st.p;
      const t = p * NIGHT_LEN;
      st.t = t;
      // the sky: dusk is a bell that peaks at 21:36 and is gone by 23:00; the
      // ink rises under it and lifts again from 05:10
      const duskA = smooth(0.18, 0.3, p) * (1 - smooth(0.3, 0.42, p));
      const inkA = smooth(0.3, 0.42, p) * (1 - smooth(0.93, 1, p));
      st.ink = inkA;
      const ds = duskA.toFixed(3);
      if (ds !== last.dusk) {
        last.dusk = ds;
        dusk.style.opacity = ds;
      }
      const is = inkA.toFixed(3);
      if (is !== last.ink) {
        last.ink = is;
        ink.style.opacity = is;
      }
      // the type flips where ink and paper text are equally legible; the chrome follows
      const night = inkA > 0.5;
      if (night !== last.night) {
        last.night = night;
        section.toggleAttribute("data-night", night);
      }
      if (!reduced) cleanDark("night", night);
      // the clock, on the hour; it strikes 06:00 with the summary line
      const done = reduced || p >= DONE_AT;
      const hour = done && !reduced ? NIGHT_LEN : Math.min(NIGHT_LEN, Math.floor(t + 1e-6));
      if (hour !== last.hour) {
        last.hour = hour;
        hh.textContent = hourLabel(NIGHT_START_HOUR + hour);
        hourOf.textContent = NIGHT.hourOf.replace("{n}", pad2(hour));
        tickFlip = !tickFlip;
        hh.setAttribute("data-tick", tickFlip ? "a" : "b");
      }
      // the ring
      const as = (1 - p).toFixed(4);
      if (as !== last.arc) {
        last.arc = as;
        arc.style.strokeDashoffset = as;
      }
      const hs = `rotate(${(180 - 180 * p).toFixed(2)}deg) translate3d(${geo.R.toFixed(1)}px, 0, 0)`;
      if (hs !== last.head) {
        last.head = hs;
        head.style.transform = hs;
      }
      // the table, one line per closed hour
      for (let i = 0; i < rows.length; i++) {
        const on = t >= i + ROW_AT;
        if (on !== last.rows[i]) {
          last.rows[i] = on;
          rows[i].toggleAttribute("data-on", on);
          rows[i].tabIndex = on ? 0 : -1;
        }
      }
      // the head copy leaves the frame to the night
      // (reduced motion keeps it: the still frame has to carry the heading)
      const c = reduced ? "1" : (1 - smooth(0.05, 0.15, p)).toFixed(2);
      if (c !== last.copy) {
        last.copy = c;
        copy.style.opacity = c;
      }
      // the five nodes are named once the stars have found them, until dawn
      const nd = (smooth(0.6, 0.7, p) * (1 - smooth(SINK_FROM - 0.02, SINK_FROM + 0.02, p))).toFixed(2);
      if (nd !== last.nodes) {
        last.nodes = nd;
        nodes.style.opacity = nd;
      }
      // 06:00: one line remains
      if (done !== last.done) {
        last.done = done;
        section.toggleAttribute("data-done", done);
      }
      // the count goes into the session when the visitor reaches 06:00 (under
      // reduced motion, when the figure is first on screen)
      if (done && !reduced) tell();
      draw();
    };

    /* ── the hour under the pointer ── */
    let focusedAt = 0;
    let focusedRow = -1;
    hotRef.current = (i, mode) => {
      let next = i;
      if (mode === "focus") {
        focusedAt = performance.now();
        focusedRow = i;
      }
      if (mode === "tap") {
        if (ptrRef.current === "mouse") return;
        // a tap also focuses the row (which already lit it): do not toggle it straight off
        if (i === focusedRow && performance.now() - focusedAt < 500) return;
        next = st.hot === i ? -1 : i;
      }
      if (next === st.hot) return;
      if (st.hot >= 0) rows[st.hot]?.removeAttribute("data-hot");
      st.hot = next;
      if (next >= 0) rows[next]?.setAttribute("data-hot", "");
      draw();
    };

    /* ── gating: draw only while on screen; the figure counts once ── */
    const io = new IntersectionObserver(
      ([en]) => {
        st.visible = en.isIntersecting;
        if (!st.visible) return;
        if (!figured) {
          figured = true;
          session.figure("night");
          if (reduced) tell();
        }
        if (st.dirty) draw();
      },
      { threshold: 0 },
    );
    io.observe(section);

    const ro = new ResizeObserver(() => {
      measure();
      apply();
    });
    ro.observe(stage);

    // from here the content layer is JS-shown (data-show); without JS it simply stands
    section.setAttribute("data-js", "");

    const gctx = gsap.context(() => {
      if (!reduced) {
        gsap.to(st, {
          p: 1,
          ease: "none",
          onUpdate: apply,
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            // phones: the pin stays under two viewport heights (M5)
            end: () => (phoneMq.matches ? "+=150%" : "+=220%"),
            pin: true,
            scrub: 0.7,
            invalidateOnRefresh: true,
            onRefresh: () => {
              measure();
              apply();
            },
          },
        });
        // the content layer is shown only while the stage owns the frame, so
        // the clock and the table never print through the corner chrome on
        // the way in or out (the section is data-no-fade: its dark runs edge
        // to edge, so the page's content mask does not do this for it)
        ScrollTrigger.create({
          trigger: section,
          start: "top 55%",
          end: "bottom 64%",
          onToggle: (s) => frame.toggleAttribute("data-show", s.isActive),
        });
      } else {
        frame.setAttribute("data-show", "");
        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (s) => cleanDark("night", s.isActive),
        });
      }
    }, section);

    measure();
    apply();

    return () => {
      gctx.revert();
      io.disconnect();
      ro.disconnect();
      hotRef.current = () => {};
      cleanDark.leave("night");
      frame.removeAttribute("data-show");
      section.removeAttribute("data-js");
      section.removeAttribute("data-night");
      section.removeAttribute("data-done");
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-rail="Night"
      data-ch={NIGHT.num}
      data-fig="night"
      data-no-fade=""
      aria-labelledby="ai-night-title"
      className="ai-night relative z-10"
    >
      <div ref={stageRef} className="ai-night__stage">
        <span ref={duskRef} aria-hidden="true" className="ai-night__dusk" />
        <span ref={inkRef} aria-hidden="true" className="ai-night__ink" />
        <canvas ref={canvasRef} aria-hidden="true" className="ai-night__stars" />

        <div ref={frameRef} className="ai-night__frame">
          <div className="ai-night__left">
            <header className="ai-night__head">
              <p className="ai-label">
                <b>{NIGHT.num}</b> / {NIGHT.name}
              </p>
              <div ref={copyRef} className="ai-night__copy">
                <h2 id="ai-night-title" className="ai-night__title">
                  {NIGHT.title}
                </h2>
                <p className="ai-body ai-night__aside">{NIGHT.aside}</p>
              </div>
            </header>
            <div className="ai-night__clock">
              <span aria-hidden="true" className="ai-night__caret" />
              <span ref={hhRef} className="ai-night__hh">
                {hourLabel(NIGHT_START_HOUR)}
              </span>
              <span ref={hourOfRef} className="ai-night__hour-of">
                {NIGHT.hourOf.replace("{n}", "00")}
              </span>
            </div>
          </div>

          <figure ref={dialRef} className="ai-night__dial">
            <svg className="ai-night__ring" viewBox="-50 -50 100 100" role="img" aria-label={NIGHT.ringLabel}>
              <path className="ai-night__half ai-night__half--day" d={DAY_HALF} />
              <path className="ai-night__half ai-night__half--night" d={NIGHT_HALF} />
              <line className="ai-night__horizon" x1="-48" y1="0" x2="48" y2="0" />
              {TICKS.map((tk) => (
                <line
                  key={tk.k}
                  className="ai-night__tick"
                  data-q={tk.quarter ? "" : undefined}
                  data-day={tk.night ? undefined : ""}
                  x1={tk.x1}
                  y1={tk.y1}
                  x2={tk.x2}
                  y2={tk.y2}
                />
              ))}
              <path ref={arcRef} className="ai-night__arc" d={NIGHT_HALF} pathLength={1} />
            </svg>
            <span ref={headRef} aria-hidden="true" className="ai-night__arc-head" />
            <div ref={nodesRef} aria-hidden="true" className="ai-night__nodes">
              {NODE_LABELS.map((n) => (
                <span
                  key={n.name}
                  className="ai-night__node"
                  data-side={n.side}
                  style={{ "--x": n.x.toFixed(3), "--y": n.y.toFixed(3) } as CSSProperties}
                >
                  <b>{n.name}</b>
                  <i>{n.count}</i>
                </span>
              ))}
            </div>
            {NIGHT.quarters.map((q) => (
              <span key={q} aria-hidden="true" className="ai-night__q" data-q={q.slice(0, 2)}>
                {q}
              </span>
            ))}
          </figure>

          <div className="ai-night__margin">
          <dl className="ai-night__table" aria-label="Tasks per hour of the example night">
            {/* the key; phones print it once over each of their two columns */}
            {(["a", "b"] as const).map((k) => (
              <div key={k} className="ai-night__th" data-k={k} aria-hidden="true">
                {NIGHT.tableHead.map((h, i) => (
                  <span key={h}>
                    <i className="ai-night__th-long">{h}</i>
                    <i className="ai-night__th-short">{NIGHT.tableHeadShort[i]}</i>
                  </span>
                ))}
              </div>
            ))}
            {NIGHT_HOURS.map((r, i) => (
              <div
                key={r.h}
                className="ai-night__row"
                tabIndex={-1}
                onPointerEnter={(e) => e.pointerType === "mouse" && hotRef.current(i, "hover")}
                onPointerLeave={(e) => e.pointerType === "mouse" && hotRef.current(-1, "hover")}
                onFocus={() => hotRef.current(i, "focus")}
                onBlur={() => hotRef.current(-1, "focus")}
                onPointerDown={(e) => {
                  ptrRef.current = e.pointerType;
                }}
                onClick={() => hotRef.current(i, "tap")}
              >
                <dt>{hourLabel(r.h)}</dt>
                <dd>
                  {r.tasks}
                  <span className="sr-only"> tasks</span>
                </dd>
                <dd>
                  {r.approvals}
                  <span className="sr-only"> approvals</span>
                </dd>
                <dd>
                  {r.exceptions}
                  <span className="sr-only"> exceptions</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="ai-night__hint" aria-hidden="true">
            <span className="ai-night__hint-fine">{NIGHT.hintFine}</span>
            <span className="ai-night__hint-touch">{NIGHT.hintTouch}</span>
          </p>
          </div>

          <p className="ai-night__sum">{NIGHT.summary}</p>
          <p className="sr-only">{NIGHT.starsText}</p>

          <p className="ai-figcap ai-night__cap">
            <b>{NIGHT.figcap[0]}</b>
            <span>{NIGHT.figcap[1]}</span>
          </p>
          <p className="ai-night__foot">{NIGHT.foot}</p>
        </div>
      </div>
    </section>
  );
}

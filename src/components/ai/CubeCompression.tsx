"use client";

import "@/app/ai-compression.css";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowCounterClockwise, ArrowsInLineHorizontal } from "@phosphor-icons/react";
import { COMPRESSION } from "./content";

gsap.registerPlugin(ScrollTrigger);

/**
 * 3. Workflow compression — a field of 3D cubes, and a word with depth.
 *
 * The twelve manual steps are twelve paper cubes laid out as a long, slightly
 * crooked process (two serpentine rows on desktop, four on a phone). Scrolling
 * the stage into view (or pressing Compress) runs the process once: every cube
 * lifts in sequence, slides to the agent it belongs to, and the extra cubes
 * tumble and press down into that agent until only five remain, on two layers
 * (an orchestrator over four execution agents). Those five light up in the
 * signal cyan and their faces turn to the agent names. Reset plays it back.
 *
 * The headline's last word is set as stacked, offset copies (an extrusion).
 * The extrusion is tied to the same timeline: as the cubes compress, the
 * layers slide flat under the face and a cyan rule draws beneath it; Reset
 * pulls the depth back out. On a mouse, the extrusion leans away from the
 * pointer, as if the pointer were the light.
 *
 * Interaction, in both states: cubes near the pointer tilt toward it and lift
 * a little; a click or tap sends a wave out from that point across the field.
 * Touch has no hover, so on a phone the tap wave is the interaction, and the
 * field sends one wave of its own from the orchestrator when it compresses.
 *
 * Everything is CSS 3D on DOM nodes (four nested wrappers per cube, so the
 * layout, wave, tilt and fixed viewing angle never fight over one transform).
 * Only transform, opacity, clip-path and visibility animate. Reduced motion:
 * the compressed system is shown at once, nothing tilts or ripples, and the
 * Compress/Reset control switches states without animating.
 */

const STEPS = COMPRESSION.steps;
const COLLAPSE = COMPRESSION.collapseTo;
const AGENTS = COMPRESSION.agents;
const DEPTH_LAYERS = 14;
const FACES = ["back", "right", "left", "top", "bottom"] as const;

/** the first step that collapses into each node keeps its cube; the rest press into it */
const LEADS = AGENTS.map((_, n) => COLLAPSE.indexOf(n));
/** for a non-lead step, its order among the steps pressing into the same node */
const PRESS_ORDER = COLLAPSE.map((n, i) => COLLAPSE.slice(0, i).filter((m, j) => m === n && LEADS[n] !== j).length);

/** a fixed, hand-set mess: x (fraction of cell), y (fraction of cube), rotation in degrees */
const JITTER: Array<[number, number, number]> = [
  [-0.06, -0.12, -6],
  [0.1, 0.16, 5],
  [-0.08, -0.05, 8],
  [0.12, 0.2, -4],
  [-0.1, -0.18, 3],
  [0.05, 0.08, -8],
  [0.09, -0.14, 6],
  [-0.12, 0.12, -5],
  [0.07, -0.2, 4],
  [-0.05, 0.15, -7],
  [0.11, -0.06, 9],
  [-0.09, 0.1, -3],
];

interface Pt {
  x: number;
  y: number;
}

interface Layout {
  W: number;
  H: number;
  /** cube edge in px */
  s: number;
  pad: number;
  narrow: boolean;
  manual: Array<Pt & { r: number }>;
  /** 0 = orchestrator, 1..4 = agents */
  nodes: Pt[];
  oScale: number;
  floors: [number, number];
  trail: string;
  bus: string;
}

function computeLayout(W: number): Layout {
  const narrow = W < 860;
  const pad = narrow ? 14 : 28;
  const inner = W - pad * 2;

  if (narrow) {
    const cols = 3;
    const cell = inner / cols;
    const s = Math.round(Math.min(112, cell * 0.84));
    const rh = s * 1.42;
    const oScale = 1.15;

    const manual = STEPS.map((_, i) => {
      const row = Math.floor(i / cols);
      const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      const [jx, jy, jr] = JITTER[i];
      return { x: pad + cell * (col + 0.5) + jx * cell * 0.7, y: pad + s * 0.78 + row * rh + jy * s * 0.6, r: jr * 0.7 };
    });
    const manualH = pad + s * 0.78 + 3 * rh + s * 0.8 + pad;

    const y0 = pad + s * 0.72 * oScale + 6;
    const floor1 = y0 + s * 0.66 * oScale;
    const ya = floor1 + 34 + s * 0.72;
    const yb = ya + s * 1.5;
    const floor2 = yb + s * 0.66;
    const xl = pad + inner * 0.27;
    const xr = pad + inner * 0.73;
    const nodes: Pt[] = [
      { x: W / 2, y: y0 },
      { x: xl, y: ya },
      { x: xr, y: ya },
      { x: xl, y: yb },
      { x: xr, y: yb },
    ];
    const compH = floor2 + 34 + pad;
    const bus = `M${W / 2} ${floor1} V${yb} M${xl} ${ya} H${xr} M${xl} ${yb} H${xr}`;

    return {
      W,
      H: Math.ceil(Math.max(manualH, compH)),
      s,
      pad,
      narrow,
      manual,
      nodes,
      oScale,
      floors: [floor1, floor2],
      trail: "M" + manual.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L"),
      bus,
    };
  }

  const cols = 6;
  const cell = inner / cols;
  const s = Math.round(Math.min(136, cell * 0.66));
  const oScale = 1.2;
  const rh = s * 1.55 + 40;
  const y0 = pad + s * 0.72 * oScale + 6;
  const y1 = y0 + rh;

  const manual = STEPS.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    const [jx, jy, jr] = JITTER[i];
    return { x: pad + cell * (col + 0.5) + jx * cell, y: (row === 0 ? y0 : y1) + jy * s, r: jr };
  });

  const xs = [0.125, 0.375, 0.625, 0.875].map((f) => pad + inner * f);
  const nodes: Pt[] = [{ x: W / 2, y: y0 }, ...xs.map((x) => ({ x, y: y1 }))];
  const floor1 = y0 + s * 0.66 * oScale;
  const floor2 = y1 + s * 0.66;
  const agentTop = y1 - s * 0.74;
  const busY = agentTop - 20;
  const bus =
    `M${W / 2} ${floor1} V${busY} M${xs[0]} ${busY} H${xs[3]} ` + xs.map((x) => `M${x} ${busY} V${agentTop}`).join(" ");

  return {
    W,
    H: Math.ceil(floor2 + 34 + pad),
    s,
    pad,
    narrow,
    manual,
    nodes,
    oScale,
    floors: [floor1, floor2],
    trail: "M" + manual.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L"),
    bus,
  };
}

/** the headline is "Not Automation. Compression." — the last word gets the depth */
function splitTitle(title: string): [string, string] {
  const cut = title.lastIndexOf(". ", title.length - 2);
  if (cut < 0) return ["", title];
  return [title.slice(0, cut + 1), title.slice(cut + 2)];
}

export default function CubeCompression() {
  const stageRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const afterRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const compressedRef = useRef(false);
  const reducedRef = useRef(false);
  const rippleRef = useRef<((x: number, y: number) => void) | null>(null);

  const [width, setWidth] = useState(0);
  const [compressed, setCompressed] = useState(false);
  const layout = useMemo(() => (width > 0 ? computeLayout(width) : null), [width]);
  const [pre, word] = useMemo(() => splitTitle(COMPRESSION.title), []);

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
        }
      }
      setWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const run = useCallback((to: boolean) => {
    compressedRef.current = to;
    setCompressed(to);
    const tl = tlRef.current;
    if (!tl) return;
    if (reducedRef.current) {
      tl.pause().progress(to ? 1 : 0);
      return;
    }
    if (to) tl.timeScale(1).play();
    else tl.timeScale(1.7).reverse();
  }, []);

  /* the compression timeline, rebuilt whenever the layout changes */
  useEffect(() => {
    const stage = stageRef.current;
    const depth = depthRef.current;
    if (!layout || !stage || !depth) return;
    const { s, manual, nodes, oScale } = layout;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const cubes = q<HTMLElement>(".ai-cube");

      cubes.forEach((el, i) => {
        const p = manual[i];
        gsap.set(el, { x: p.x - s / 2, y: p.y - s / 2, rotation: p.r, z: 0, rotationX: 0, scale: 1, autoAlpha: 1 });
      });

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          if (!reducedRef.current) rippleRef.current?.(nodes[0].x, nodes[0].y);
        },
      });

      // the process runs: each cube lifts in turn, then slides to its agent
      cubes.forEach((el, i) => {
        const n = COLLAPSE[i];
        const node = nodes[n];
        const st = i * 0.035;
        tl.to(el, { z: s * 0.4, duration: 0.28, ease: "power2.out" }, st);
        tl.to(el, { x: node.x - s / 2, y: node.y - s / 2, rotation: 0, duration: 0.95, ease: "power3.inOut" }, 0.28 + st);
        if (LEADS[n] === i) {
          tl.to(el, { z: 0, duration: 0.6, ease: "power2.inOut" }, 0.62 + st);
          tl.to(el, { scale: n === 0 ? oScale : 1, duration: 0.55, ease: "back.out(2.2)" }, 1.62);
        } else {
          // the rest tumble onto a stack above their agent, then press down into it
          const k = PRESS_ORDER[i];
          tl.to(el, { z: s * (0.5 + 0.42 * k), rotationX: i % 2 ? 180 : -180, duration: 0.95, ease: "power2.inOut" }, 0.28 + st);
          tl.to(el, { z: 0, scale: 0.94, duration: 0.32, ease: "power3.in" }, 1.28 + k * 0.06);
          tl.set(el, { autoAlpha: 0 }, 1.6 + k * 0.06);
        }
      });

      const leadSteps = LEADS.map((i) => cubes[i].querySelector(".ai-cube__step"));
      tl.to(leadSteps, { opacity: 0, duration: 0.25, ease: "power1.in" }, 1.35);
      tl.fromTo(q(".ai-cube__agent"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 1.66);
      tl.fromTo(q(".ai-cube__lit"), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, 1.62);
      tl.fromTo(q(".ai-cubes__trail"), { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.out" }, 0.2);

      // the two layers and the bus between them draw in under the system
      tl.fromTo(q(".ai-cubes__floor"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power3.inOut", stagger: 0.12 }, 1.45);
      tl.fromTo(q(".ai-cubes__tag"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.12 }, 1.7);
      tl.fromTo(
        q(".ai-cubes__bus"),
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power2.inOut" },
        1.7,
      );

      // the word compresses with the field
      tl.fromTo(depth, { "--depth": 1 }, { "--depth": 0, duration: 1.5, ease: "power3.inOut" }, 0.25);
      if (lineRef.current) tl.fromTo(lineRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, 1.72);
      if (afterRef.current) tl.fromTo(afterRef.current, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 1.76);

      tl.progress(compressedRef.current ? 1 : 0);
      tlRef.current = tl;

      // the first time the stage comes into view, the process compresses itself;
      // scrolling back above it resets, so it can run again
      ScrollTrigger.create({
        trigger: stage,
        start: "top 62%",
        onEnter: () => {
          if (!compressedRef.current) run(true);
        },
        onLeaveBack: () => {
          if (compressedRef.current && !reducedRef.current) run(false);
        },
      });
    }, stage);

    stage.setAttribute("data-ready", "");
    return () => {
      tlRef.current = null;
      ctx.revert();
    };
  }, [layout, run]);

  /* pointer tilt + click/tap wave, on the stage; extrusion lean, on the section */
  useEffect(() => {
    const stage = stageRef.current;
    const depth = depthRef.current;
    if (!layout || !stage || !depth) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { s } = layout;

    const cubes = Array.from(stage.querySelectorAll<HTMLElement>(".ai-cube"));
    const tilts = cubes.map((el) => el.querySelector<HTMLElement>(".ai-cube__tilt")!);
    const waves = cubes.map((el) => el.querySelector<HTMLElement>(".ai-cube__wave")!);
    const hits = cubes.map((el) => el.querySelector<HTMLElement>(".ai-cube__hit")!);
    const opts = { duration: 0.7, ease: "power3.out" };
    const rx = tilts.map((el) => gsap.quickTo(el, "rotationX", opts));
    const ry = tilts.map((el) => gsap.quickTo(el, "rotationY", opts));
    const rz = tilts.map((el) => gsap.quickTo(el, "z", opts));

    const MAX_TILT = 34;
    const radius = s * 3.2;
    let px = 0;
    let py = 0;
    let raf = 0;

    const visible = (el: HTMLElement) => el.style.visibility !== "hidden";

    const applyTilt = () => {
      raf = 0;
      cubes.forEach((el, i) => {
        if (!visible(el)) return;
        const r = el.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        let f = Math.max(0, 1 - d / radius);
        f = f * f * (3 - 2 * f);
        // directly under the pointer the direction is undefined: ease the angle out there
        const a = MAX_TILT * f * Math.min(1, d / (s * 0.35));
        rx[i]((-dy / d) * a);
        ry[i]((dx / d) * a);
        rz[i](f * s * 0.18);
      });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      cubes.forEach((_, i) => {
        rx[i](0);
        ry[i](0);
        rz[i](0);
      });
    };

    const ripple = (x: number, y: number) => {
      const sr = stage.getBoundingClientRect();
      // a square hairline runs out from the origin over the floor
      const reach = Math.max(Math.hypot(x, y), Math.hypot(sr.width - x, y), Math.hypot(x, sr.height - y), Math.hypot(sr.width - x, sr.height - y));
      const ring = document.createElement("span");
      ring.className = "ai-cubes__ring";
      ring.setAttribute("aria-hidden", "true");
      ring.style.width = ring.style.height = `${reach * 2}px`;
      ring.style.left = `${x - reach}px`;
      ring.style.top = `${y - reach}px`;
      stage.appendChild(ring);
      gsap.fromTo(
        ring,
        { scale: 0.01, opacity: 0.9 },
        { scale: 1, opacity: 0, duration: 1.4, ease: "power2.out", onComplete: () => ring.remove() },
      );

      cubes.forEach((el, i) => {
        if (!visible(el)) return;
        const r = el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - sr.left - x;
        const dy = r.top + r.height / 2 - sr.top - y;
        const d = Math.hypot(dx, dy) || 1;
        const delay = d / 1100;
        gsap
          .timeline({ delay })
          .to(waves[i], {
            z: s * 0.42,
            rotationX: (-dy / d) * 18,
            rotationY: (dx / d) * 18,
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
          })
          .to(waves[i], { z: 0, rotationX: 0, rotationY: 0, duration: 0.95, ease: "elastic.out(1, 0.6)" });
        gsap.fromTo(hits[i], { opacity: 0.4 }, { opacity: 0, duration: 0.8, delay, ease: "power2.out", overwrite: "auto" });
      });
    };
    rippleRef.current = ripple;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const sr = stage.getBoundingClientRect();
      ripple(e.clientX - sr.left, e.clientY - sr.top);
    };

    // the extrusion leans away from the pointer, as if the pointer were the light
    const section = stage.closest("section");
    let lx = 0;
    let ly = 0;
    let lraf = 0;
    const lean = () => {
      lraf = 0;
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
    const onSectionMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      lx = e.clientX;
      ly = e.clientY;
      if (!lraf) lraf = requestAnimationFrame(lean);
    };
    const onSectionLeave = () => {
      gsap.to(depth, { "--ax": 0.62, "--ay": 0.78, duration: 1.2, ease: "power3.out", overwrite: "auto" });
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onDown);
    section?.addEventListener("pointermove", onSectionMove);
    section?.addEventListener("pointerleave", onSectionLeave);

    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      section?.removeEventListener("pointermove", onSectionMove);
      section?.removeEventListener("pointerleave", onSectionLeave);
      if (raf) cancelAnimationFrame(raf);
      if (lraf) cancelAnimationFrame(lraf);
      rippleRef.current = null;
      gsap.killTweensOf([...tilts, ...waves, ...hits]);
      gsap.set([...tilts, ...waves], { clearProps: "transform" });
      stage.querySelectorAll(".ai-cubes__ring").forEach((el) => el.remove());
    };
  }, [layout]);

  const stageStyle = layout
    ? ({
        height: layout.H,
        ["--s" as string]: `${layout.s}px`,
        ["--fs" as string]: `${Math.max(10, Math.min(12.5, layout.s * 0.085)).toFixed(2)}px`,
      } as CSSProperties)
    : undefined;

  return (
    <section data-rail="Compression" aria-labelledby="ai-cubes-title" className="ai-section ai-cubes relative z-10">
      <div className="ai-wrap">
        <header className="ai-cubes__head">
          <div className="ai-cubes__titlecol">
            <p className="ai-label">
              <b>03</b> / Workflow compression
            </p>
            <h2 id="ai-cubes-title" className="ai-cubes__title">
              {pre ? <span className="ai-cubes__pre">{pre}</span> : null}{" "}
              <span ref={depthRef} className="ai-depth">
                {Array.from({ length: DEPTH_LAYERS }, (_, k) => {
                  const i = DEPTH_LAYERS - k; // farthest first
                  const ink = Math.round(46 - ((i - 2) / (DEPTH_LAYERS - 2)) * 36);
                  const c = i === 1 ? "var(--signal)" : `color-mix(in srgb, var(--ink) ${ink}%, var(--paper))`;
                  return (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="ai-depth__layer"
                      style={{ ["--i" as string]: i, ["--c" as string]: c } as CSSProperties}
                    >
                      {word}
                    </span>
                  );
                })}
                <span className="ai-depth__face">{word}</span>
                <span ref={lineRef} aria-hidden="true" className="ai-depth__line" />
              </span>
            </h2>
          </div>
          <div className="ai-cubes__aside">
            <p className="ai-body">{COMPRESSION.body}</p>
            <p className="ai-cubes__readout">
              <span className="sr-only">Twelve manual steps collapse into two layers</span>
              <span aria-hidden="true">12 steps</span>
              <span ref={afterRef} aria-hidden="true" className="ai-cubes__after">
                <i>→</i> 02 layers
              </span>
            </p>
          </div>
        </header>

        <div className="ai-cubes__panel">
          <span aria-hidden="true" className="ai-cubes__crop" data-c="tl" />
          <span aria-hidden="true" className="ai-cubes__crop" data-c="br" />

          <ol className="sr-only">
            {STEPS.map((step, i) => (
              <li key={step}>
                {step}, handled by the {AGENTS[COLLAPSE[i]]} agent
              </li>
            ))}
          </ol>

          <div ref={stageRef} className="ai-cubes__stage" style={stageStyle} aria-hidden="true">
            {layout ? (
              <>
                <svg className="ai-cubes__trail" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="none">
                  <path d={layout.trail} />
                </svg>
                <svg className="ai-cubes__bus" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="none">
                  <path d={layout.bus} />
                </svg>
                {layout.floors.map((y, l) => (
                  <span
                    key={`floor-${l}`}
                    className="ai-cubes__floor"
                    data-l={l + 1}
                    style={{ top: Math.round(y), left: layout.pad, right: layout.pad }}
                  />
                ))}
                {layout.floors.map((y, l) => (
                  <span key={`tag-${l}`} className="ai-cubes__tag" style={{ top: Math.round(y) + 9, left: layout.pad }}>
                    <b>Layer 0{l + 1}</b> / {l === 0 ? "Orchestration" : "Execution agents"}
                  </span>
                ))}
              </>
            ) : null}

            <div className="ai-cubes__world">
              {STEPS.map((step, i) => {
                const n = COLLAPSE[i];
                const lead = LEADS[n] === i;
                return (
                  <div key={step} className="ai-cube" data-lead={lead ? "" : undefined} data-core={lead && n === 0 ? "" : undefined}>
                    <div className="ai-cube__wave">
                      <div className="ai-cube__tilt">
                        <div className="ai-cube__body">
                          <div className="ai-cube__face" data-f="front">
                            {lead ? <i className="ai-cube__lit" /> : null}
                            <i className="ai-cube__hit" />
                            <span className="ai-cube__step">
                              <b>{String(i + 1).padStart(2, "0")}</b>
                              <span>{step}</span>
                            </span>
                            {lead ? (
                              <span className="ai-cube__agent">
                                <b>{n === 0 ? "L1 / Core" : `L2 / 0${n}`}</b>
                                <span>{AGENTS[n]}</span>
                              </span>
                            ) : null}
                          </div>
                          {FACES.map((f) => (
                            <div key={f} className="ai-cube__face" data-f={f}>
                              {lead ? <i className="ai-cube__lit" /> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ai-cubes__bar">
            <button
              type="button"
              className="ghost-btn ai-cubes__btn"
              onClick={() => run(!compressed)}
              aria-label={compressed ? "Reset to the twelve manual steps" : "Compress the twelve steps into five agents"}
            >
              <span className="ghost-btn__layer">
                <span>{compressed ? "Reset" : "Compress"}</span>
                {compressed ? (
                  <ArrowCounterClockwise size={16} weight="light" aria-hidden="true" />
                ) : (
                  <ArrowsInLineHorizontal size={16} weight="light" aria-hidden="true" />
                )}
              </span>
              <span className="ghost-btn__layer ghost-btn__fill" aria-hidden="true">
                <span>{compressed ? "Reset" : "Compress"}</span>
                {compressed ? <ArrowCounterClockwise size={16} weight="light" /> : <ArrowsInLineHorizontal size={16} weight="light" />}
              </span>
            </button>
            <p className="ai-cubes__state" aria-live="polite">
              <span className="ai-cubes__dot" data-on={compressed ? "" : undefined} aria-hidden="true" />
              {compressed ? "Compressed / 5 agents, 2 layers" : "Manual / 12 steps"}
            </p>
            <p className="ai-cubes__hint" aria-hidden="true">
              <span className="ai-cubes__hint-fine">Move to tilt / click to send a wave</span>
              <span className="ai-cubes__hint-touch">Tap to send a wave</span>
            </p>
          </div>
        </div>
        <p className="ai-label ai-cubes__note">{COMPRESSION.note}</p>
      </div>
    </section>
  );
}

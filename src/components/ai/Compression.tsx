"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COMPRESSION } from "./content";

gsap.registerPlugin(ScrollTrigger);

/**
 * 3. Workflow compression — scroll-scrubbed SVG draw.
 *
 * R4: the frame is never empty. On entry the twelve-step manual process is
 * already on the plate, every step named. Scrolling first traces the process in
 * cyan, lighting each step as the trace reaches it; then the twelve steps
 * collapse into five nodes on two layers (orchestrator over four agents), and
 * the resolved system holds for the last ~30% of the scrub. The mono readout
 * counts the diagram only — twelve steps, occupying twelve layers before the
 * collapse and two after. No time, cost or multiple is claimed.
 *
 * Labels are set at the shared 12-13px mono size whatever the drawing's scale
 * (a ResizeObserver converts that to SVG units), and the drawing sits on a
 * frosted plate so its steps can't be confused with the world behind it.
 * Pinned 1.5 viewports on desktop, 0.7 on phones (M5); reduced motion skips
 * the pin and renders the compressed system.
 */

const LABEL_PX = 12.5;
const STROKE_PX = 1.25;

interface Geometry {
  vbW: number;
  vbH: number;
  steps: Array<[number, number]>;
  path: string;
  /** index 0 = orchestrator, 1..4 = agents */
  system: Array<[number, number]>;
  layers: [string, string];
  layerLabel: Array<[number, number]>;
  /** where a step's label sits relative to its marker */
  label: { x: number; y: number; anchor: "middle" | "start" };
  /** agent label offsets (alternating on phones so neighbours never collide) */
  agentLabelY: (i: number) => number;
}

function geometry(mobile: boolean): Geometry {
  if (mobile) {
    // one column: every step keeps its name at a legible size on a phone
    const steps: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [34, 26 + i * 33]);
    return {
      vbW: 400,
      vbH: 410,
      steps,
      path: `M34 26 V${26 + 11 * 33}`,
      system: [
        [200, 130],
        [62, 325],
        [154, 325],
        [246, 325],
        [338, 325],
      ],
      layers: ["M18 130 H382", "M18 325 H382"],
      layerLabel: [
        [18, 88],
        [18, 285],
      ],
      label: { x: 20, y: 6, anchor: "start" },
      agentLabelY: (i) => (i % 2 === 0 ? 44 : 72),
    };
  }
  // three columns, four rows, drawn as one serpentine hairline
  const xs = [200, 600, 1000];
  const steps: Array<[number, number]> = [];
  let path = "";
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 3);
    const col = row % 2 === 0 ? i % 3 : 2 - (i % 3);
    const p: [number, number] = [xs[col], 70 + row * 172];
    steps.push(p);
    path += i === 0 ? `M${p[0]} ${p[1]}` : i % 3 === 0 ? ` V${p[1]}` : ` H${p[0]}`;
  }
  return {
    vbW: 1200,
    vbH: 700,
    steps,
    path,
    system: [
      [600, 230],
      [240, 520],
      [480, 520],
      [720, 520],
      [960, 520],
    ],
    layers: ["M110 230 H1090", "M110 520 H1090"],
    layerLabel: [
      [110, 176],
      [110, 466],
    ],
    label: { x: 0, y: 40, anchor: "middle" },
    agentLabelY: () => 48,
  };
}

export default function Compression() {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const layersRef = useRef<HTMLSpanElement>(null);
  const [mobile, setMobile] = useState<boolean | null>(null);
  const [unit, setUnit] = useState(1.7);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const geo = useMemo(() => geometry(mobile === true), [mobile]);

  /* SVG units per CSS pixel, so labels and strokes keep their real size */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(() => {
      const w = svg.getBoundingClientRect().width;
      if (w > 0) setUnit(geo.vbW / w);
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, [geo]);

  useEffect(() => {
    if (mobile === null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const stepEls = q<SVGGElement>(".ai-flow__step");
      const hits = q<SVGRectElement>(".ai-flow__hit");

      const readout = (time: number) => {
        const squeeze = Math.min(1, Math.max(0, (time - 2.8) / 1.9));
        const eased = squeeze * squeeze * (3 - 2 * squeeze);
        if (layersRef.current) layersRef.current.textContent = String(Math.round(12 - 10 * eased)).padStart(2, "0");
        stage.toggleAttribute("data-compressed", time >= 4.9);
      };

      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" }, onUpdate: () => readout(tl.time()) });

      // A — the manual process is already there; a cyan trace runs it end to end
      tl.fromTo(q(".ai-flow__trace"), { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 2.4 }, 0);
      hits.forEach((el, i) => {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.12 }, (2.4 * i) / 11);
      });

      // B — twelve steps collapse into five nodes on two layers
      stepEls.forEach((el, i) => {
        const from = geo.steps[i];
        const to = geo.system[COMPRESSION.collapseTo[i]];
        tl.to(el, { x: to[0] - from[0], y: to[1] - from[1], duration: 1.5, ease: "power3.inOut" }, 2.8 + i * 0.03);
        tl.to(el.querySelector("text"), { opacity: 0, duration: 0.5 }, 2.8 + i * 0.03);
        tl.to(el, { opacity: 0, duration: 0.3 }, 4.3 + i * 0.02);
      });
      tl.to(q(".ai-flow__path, .ai-flow__trace"), { opacity: 0, duration: 1 }, 2.8);

      // C — the two-layer system draws in, then holds
      tl.fromTo(q(".ai-flow__layer"), { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 1, stagger: 0.15 }, 3.3);
      tl.fromTo(q(".ai-flow__node"), { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: 0.05 }, 4.1);
      tl.fromTo(q(".ai-flow__link"), { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.06 }, 4.3);
      tl.fromTo(q(".ai-flow__tag"), { opacity: 0 }, { opacity: 1, duration: 0.45 }, 4.1);
      tl.to({}, { duration: 2.2 }, 5);

      if (reduced) {
        tl.progress(1);
        readout(tl.duration());
        return;
      }
      tl.progress(0);
      readout(0);

      ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: mobile ? "+=70%" : "+=150%",
        pin: true,
        scrub: 0.4,
        animation: tl,
        invalidateOnRefresh: true,
      });
    }, stage);

    return () => ctx.revert();
  }, [mobile, geo]);

  const fs = LABEL_PX * unit;
  const sw = STROKE_PX * unit;
  const mark = 5 * unit;

  return (
    <section
      data-rail="Compression"
      aria-labelledby="ai-flow-title"
      className="ai-compress relative z-10"
    >
      <div ref={stageRef} className="ai-compress__stage">
        <div className="ai-wrap ai-compress__grid">
          <div className="ai-glass ai-sheet ai-compress__copy">
            <p className="ai-label">
              <b>03</b> / Workflow compression
            </p>
            <h2 id="ai-flow-title" className="ai-h2 mt-5 font-display font-semibold uppercase">
              {COMPRESSION.title}
            </h2>
            <p className="ai-body mt-6 max-w-[42ch] max-md:hidden">{COMPRESSION.body}</p>

            <dl className="ai-readout" aria-label="Twelve manual steps collapse into two layers">
              <div>
                <dt className="ai-label">Steps to layers</dt>
                <dd aria-hidden="true">
                  <span>12</span>
                  <i>→</i>
                  <span ref={layersRef} className="ai-readout__hot">
                    12
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <figure className="ai-glass ai-compress__figure">
            <svg
              ref={svgRef}
              className="ai-flow"
              viewBox={`0 0 ${geo.vbW} ${geo.vbH}`}
              role="img"
              aria-label="A twelve-step manual process collapsing into an orchestrator and four execution agents"
              style={{ fontSize: fs, ["--sw" as string]: sw }}
            >
              <path className="ai-flow__path" d={geo.path} pathLength={1000} />
              <path className="ai-flow__trace" d={geo.path} pathLength={1000} />

              {geo.layers.map((d, i) => (
                <path key={d} className="ai-flow__layer" d={d} pathLength={1000} data-mid={i === 0 ? "" : undefined} />
              ))}
              {geo.system.slice(1).map(([x, y], i) => (
                <path
                  key={i}
                  className="ai-flow__link"
                  d={`M${geo.system[0][0]} ${geo.system[0][1] + 22} L${x} ${y - 24}`}
                  pathLength={1000}
                />
              ))}
              {geo.layerLabel.map(([x, y], i) => (
                <text key={i} className="ai-flow__tag" x={x} y={y}>
                  {i === 0 ? "LAYER 01 / ORCHESTRATION" : "LAYER 02 / EXECUTION AGENTS"}
                </text>
              ))}
              {geo.system.map(([x, y], i) => (
                <g key={i} className="ai-flow__node" transform={`translate(${x} ${y})`}>
                  <path d={i === 0 ? "M0 -28 L25 16 L-25 16 Z" : "M0 -19 L17 11 L-17 11 Z"} data-core={i === 0 ? "" : undefined} />
                  <text y={i === 0 ? -44 : geo.agentLabelY(i)} textAnchor="middle">
                    {COMPRESSION.agents[i].toUpperCase()}
                  </text>
                </g>
              ))}

              {geo.steps.map(([x, y], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <g className="ai-flow__step">
                    <rect x={-mark} y={-mark} width={mark * 2} height={mark * 2} />
                    <rect className="ai-flow__hit" x={-mark} y={-mark} width={mark * 2} height={mark * 2} />
                    <text x={geo.label.x} y={geo.label.y} textAnchor={geo.label.anchor} dominantBaseline={geo.label.anchor === "start" ? "middle" : undefined}>
                      <tspan className="ai-flow__num">{String(i + 1).padStart(2, "0")}</tspan>{" "}
                      {COMPRESSION.steps[i].toUpperCase()}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
            <figcaption className="ai-label ai-compress__note">{COMPRESSION.note}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

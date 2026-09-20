"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COMPRESSION } from "./content";

gsap.registerPlugin(ScrollTrigger);

/**
 * 3. Workflow compression — scroll-scrubbed SVG line draw.
 * Scroll draws a 12-step manual process as one long hairline, then collapses
 * the twelve steps into five nodes on two layers. The mono readout is driven by
 * the same scrub and counts the diagram: steps drawn, then layers they collapse
 * into. Pinned for 1.6 viewports on desktop, 1 on mobile (M5); reduced motion
 * skips the pin and renders the compressed system.
 *
 * R2 timing: the payoff has to be readable wherever a reader stops, so the
 * collapse is front-loaded and the resolved two-layer system holds for the last
 * ~40% of the scrub, and the readout never shows placeholder dashes.
 *
 * R2 truth: this section shows a mechanism, not a result. There is no time,
 * cost or multiple anywhere in it — the owner has not measured one, so the page
 * does not claim one.
 */

interface Geometry {
  vbW: number;
  vbH: number;
  steps: Array<[number, number]>;
  path: string;
  /** index 0 = orchestrator, 1..4 = agents */
  system: Array<[number, number]>;
  layers: [string, string];
  layerLabel: Array<[number, number]>;
  font: number;
  anchor: "middle" | "start";
}

function geometry(mobile: boolean): Geometry {
  const cols = mobile ? 2 : 4;
  const xs = mobile ? [56, 236] : [150, 450, 750, 1050];
  const y0 = mobile ? 40 : 100;
  const gap = mobile ? 78 : 250;
  const steps: Array<[number, number]> = [];
  let path = "";
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    const p: [number, number] = [xs[col], y0 + row * gap];
    steps.push(p);
    path += i === 0 ? `M${p[0]} ${p[1]}` : i % cols === 0 ? ` V${p[1]}` : ` H${p[0]}`;
  }
  if (mobile) {
    return {
      vbW: 400,
      vbH: 500,
      steps,
      path,
      system: [
        [200, 150],
        [62, 360],
        [154, 360],
        [246, 360],
        [338, 360],
      ],
      layers: ["M24 150 H376", "M24 360 H376"],
      layerLabel: [
        [24, 108],
        [24, 318],
      ],
      font: 13,
      anchor: "start",
    };
  }
  return {
    vbW: 1200,
    vbH: 740,
    steps,
    path,
    system: [
      [600, 240],
      [240, 540],
      [480, 540],
      [720, 540],
      [960, 540],
    ],
    layers: ["M110 240 H1090", "M110 540 H1090"],
    layerLabel: [
      [110, 186],
      [110, 486],
    ],
    font: 18,
    anchor: "middle",
  };
}

export default function Compression() {
  const stageRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLSpanElement>(null);
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const geo = useMemo(() => geometry(mobile === true), [mobile]);

  useEffect(() => {
    if (mobile === null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const stepEls = q<SVGGElement>(".ai-flow__step");

      // The readout describes the diagram and nothing else. The left figure is
      // the process (always twelve steps); the right one is how many layers
      // those steps currently occupy: twelve before the collapse, two after.
      // It never reads as nonsense ("00 -> 12") at any scroll position, and no
      // time, cost or multiple is claimed anywhere on this page.
      const readout = (time: number) => {
        const squeeze = Math.min(1, Math.max(0, (time - 3) / 2.2));
        const eased = squeeze * squeeze * (3 - 2 * squeeze);
        if (layersRef.current) layersRef.current.textContent = String(Math.round(12 - 10 * eased)).padStart(2, "0");
        stage.toggleAttribute("data-compressed", time >= 5.2);
      };

      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" }, onUpdate: () => readout(tl.time()) });

      // A — the manual process draws, one step at a time
      tl.fromTo(q(".ai-flow__path"), { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 2.6 }, 0);
      stepEls.forEach((el, i) => {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.1 }, (2.6 * i) / 11 - (i === 0 ? 0 : 0.05));
      });

      // B — twelve steps collapse into five nodes on two layers
      stepEls.forEach((el, i) => {
        const from = geo.steps[i];
        const to = geo.system[COMPRESSION.collapseTo[i]];
        tl.to(el, { x: to[0] - from[0], y: to[1] - from[1], duration: 1.6, ease: "power3.inOut" }, 3 + i * 0.045);
        tl.to(el.querySelector("text"), { opacity: 0, duration: 0.7 }, 3.2 + i * 0.045);
        tl.to(el, { opacity: 0, duration: 0.35 }, 4.7 + i * 0.02);
      });
      tl.to(q(".ai-flow__path"), { opacity: 0.16, duration: 1.2 }, 3);

      // C — the 2-layer system draws in, then holds for the rest of the scrub
      tl.fromTo(q(".ai-flow__layer"), { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 1.1, stagger: 0.18 }, 3.4);
      tl.fromTo(q(".ai-flow__node"), { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.06 }, 4.3);
      tl.fromTo(q(".ai-flow__link"), { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.07 }, 4.6);
      tl.fromTo(q(".ai-flow__tag"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 4.4);
      // the resolved system is the last 40% of the scrub, so wherever the
      // reader settles past the middle they are looking at the payoff
      tl.to({}, { duration: 3.4 }, 5.2);

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
        end: mobile ? "+=95%" : "+=160%",
        pin: true,
        scrub: 0.4,
        animation: tl,
        invalidateOnRefresh: true,
      });
    }, stage);

    return () => ctx.revert();
  }, [mobile, geo]);

  return (
    <section
      data-rail="Compression"
      data-world-side="right"
      data-dof="full"
      aria-labelledby="ai-flow-title"
      className="ai-compress relative z-10"
    >
      <div ref={stageRef} className="ai-compress__stage">
        <div className="ai-wrap ai-compress__grid">
          <div className="ai-compress__copy">
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
                    02
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="ai-compress__figure">
            <svg
              className="ai-flow"
              viewBox={`0 0 ${geo.vbW} ${geo.vbH}`}
              role="img"
              aria-label="A twelve-step manual process collapsing into an orchestrator and four execution agents"
              style={{ fontSize: geo.font, ["--sw" as string]: geo.anchor === "start" ? 1.2 : 1.5 }}
            >
              <path className="ai-flow__path" d={geo.path} pathLength={1000} />

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
                  <text y={i === 0 ? -44 : 42} textAnchor="middle">
                    {COMPRESSION.agents[i].toUpperCase()}
                  </text>
                </g>
              ))}

              {geo.steps.map(([x, y], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <g className="ai-flow__step">
                    <rect x="-5" y="-5" width="10" height="10" />
                    <text
                      x={geo.anchor === "middle" ? 0 : -5}
                      y={geo.anchor === "middle" ? 34 : 28}
                      textAnchor={geo.anchor}
                    >
                      <tspan className="ai-flow__num">{String(i + 1).padStart(2, "0")}</tspan>{" "}
                      {COMPRESSION.steps[i].toUpperCase()}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
            <p className="ai-label ai-compress__note">{COMPRESSION.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

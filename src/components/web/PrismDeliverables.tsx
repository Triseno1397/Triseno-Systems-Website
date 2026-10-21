"use client";

import "@/app/web-prism.css";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import GlassPanel from "@/components/world/GlassPanel";
import { createCrystalTunnel, type CrystalTunnel } from "./crystalTunnel";
import { discover } from "@/lib/discover";

/**
 * What you get, section 04: one beam of light, seven deliverables.
 *
 * You stand inside a hall of crystal, drawn live (crystalTunnel): the
 * camera flies on through rows of faceted crystal folded eight ways round
 * you, the pointer turns your head, and a white beam low along the floor
 * fans out ahead into seven threads of colour, one per deliverable.
 *
 * Nothing is scroll-driven. The deliverables step on by themselves, each one
 * lighting its thread, tinting the hall and rolling a ring of its colour down
 * the tunnel while the camera surges forward; the index on the left jumps to
 * any of them, and the run pauses while the pointer is on the card or the
 * index. Reduced motion: one still frame, every card in a column.
 */

/** red to violet, one per deliverable; the last is the division's own hue */
const BANDS = ["#ff4b4b", "#ff9a30", "#ffd84a", "#4df08c", "#2ee8ff", "#4d80ff", "#9d5cff"];

/** how long each deliverable holds before the next */
const HOLD_MS = 5200;

interface Deliverable {
  title: string;
  short: string;
  body: string;
  spec: Array<[string, string]>;
}

const DELIVERABLES: Deliverable[] = [
  {
    title: "Strategy",
    short: "Strategy",
    body: "Where you win before a pixel is drawn: the narrative, the page structure and the one idea that carries everything.",
    spec: [
      ["Output", "Sitemap, page briefs, offer hierarchy"],
      ["Decides", "What the first screen asks for"],
    ],
  },
  {
    title: "Custom design",
    short: "Design",
    body: "Art direction with a point of view. Type, colour, grid and motion language built for your brand, not picked from a theme store.",
    spec: [
      ["Output", "Design system and every page state"],
      ["Templates used", "0"],
    ],
  },
  {
    title: "Build",
    short: "Build",
    body: "Hand-built in Next.js and TypeScript, headless where it helps, accessible by default, and yours to own.",
    spec: [
      ["Stack", "Next.js, GSAP, WebGL where it earns it"],
      ["Handover", "Repository, docs, CMS training"],
    ],
  },
  {
    title: "Performance 90 or higher",
    short: "Performance",
    body: "A Lighthouse performance target of 90 or higher on the pages we ship. Motion runs on transform and opacity; 3D and video load late.",
    spec: [
      ["Target", "Lighthouse performance ≥ 90"],
      ["LCP element", "Text or a poster, never a video"],
    ],
  },
  {
    title: "SEO-ready structure",
    short: "SEO",
    body: "Semantic headings, metadata, structured data, a sitemap and clean URLs in place on launch day.",
    spec: [
      ["Includes", "Schema, Open Graph, redirects map"],
      ["Checked", "Crawl and index report at launch"],
    ],
  },
  {
    title: "Integrations",
    short: "Integrations",
    body: "Booking, payments, CRM, email and analytics wired in, so a form submission lands where your team already works.",
    spec: [
      ["Typical", "Scheduling, checkout, CRM, email"],
      ["Tracked", "Every conversion event, named"],
    ],
  },
  {
    title: "Ongoing iteration",
    short: "Iteration",
    body: "After launch the page keeps earning: new sections, offers and landing pages, tested and shipped on a monthly cadence.",
    spec: [
      ["Cadence", "Monthly release, weekly on request"],
      ["Measured", "Conversion rate per page"],
    ],
  },
];

const N = DELIVERABLES.length;

export default function PrismDeliverables() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tunnelRef = useRef<CrystalTunnel | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  /** the deliverable in view, for a hall built after the first pick */
  const active0 = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    if (reduce) setStaticMode(true);
    let onScreen = false;
    // the hall is built a screen ahead (its program links in the background),
    // never at page load
    const build = () => {
      if (tunnelRef.current) return;
      const tunnel = createCrystalTunnel(canvas, { phone }, () => root.setAttribute("data-live", ""));
      tunnelRef.current = tunnel;
      tunnel?.select(active0.current, BANDS[active0.current]);
      if (reduce) tunnel?.still();
      else tunnel?.setActive(onScreen);
    };
    const ahead = new IntersectionObserver(([e]) => e.isIntersecting && build(), { rootMargin: "100% 0px 100% 0px" });
    ahead.observe(root);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting && !document.hidden;
      setRunning(onScreen && !reduce);
      if (!reduce) tunnelRef.current?.setActive(onScreen);
    });
    io.observe(root);
    const onVis = () => {
      if (document.hidden) tunnelRef.current?.setActive(false);
    };
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => tunnelRef.current?.resize());
    ro.observe(canvas);
    return () => {
      ahead.disconnect();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      tunnelRef.current?.dispose();
      tunnelRef.current = null;
    };
  }, []);

  // each deliverable lights its thread and rolls its colour down the hall
  useEffect(() => {
    active0.current = active;
    tunnelRef.current?.select(active, BANDS[active]);
  }, [active]);

  // the run: step on while the section is on screen and nobody is reading
  useEffect(() => {
    if (!running || paused || staticMode) return;
    const id = window.setTimeout(() => setActive((i) => (i + 1) % N), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [running, paused, staticMode, active]);

  const pick = useCallback((i: number) => {
    setActive(i);
    discover("web-crystal-pick");
  }, []);
  const hold = { onPointerEnter: () => setPaused(true), onPointerLeave: () => setPaused(false) };

  return (
    <section
      ref={rootRef}
      data-rail="Deliverables"
      data-station="stack"
      data-no-fade=""
      data-static={staticMode ? "" : undefined}
      aria-labelledby="web-prism-title"
      className="web-section web-prism"
      style={{ "--hold": `${HOLD_MS}ms` } as CSSProperties}
    >
      <div className="web-prism__stage">
        <div
          className="web-prism__film"
          role="img"
          aria-label="Inside a hall of faceted crystal, one white beam splits into seven threads of colour"
        >
          <canvas ref={canvasRef} className="web-prism__canvas" aria-hidden="true" />
        </div>
        <div className="web-prism__scrim" aria-hidden="true" />

        <div className="web-prism__grid">
          <div className="web-prism__aside" {...hold}>
            <p className="web-eyebrow">
              <span className="web-sq" aria-hidden="true" />
              04 — What you get
            </p>
            <h2 id="web-prism-title" className="web-h2">
              Seven deliverables. One team.
            </h2>
            <p className="web-body web-prism__lead">
              One brief goes in and seven things come out, on every project. Nothing is an add-on, and nothing
              starts from a theme.
            </p>

            <ol className="web-prism__bands" aria-label="The seven deliverables">
              {DELIVERABLES.map((d, i) => (
                <li
                  key={d.title}
                  className="web-prism__band"
                  style={{ "--band": BANDS[i] } as CSSProperties}
                  data-on={i === active ? "" : undefined}
                  data-done={i < active ? "" : undefined}
                >
                  <button type="button" className="web-prism__bandbtn" aria-pressed={i === active} onClick={() => pick(i)}>
                    <i aria-hidden="true">{i === active && running && !paused ? <b key={`run-${active}`} /> : null}</i>
                    <span className="web-prism__bandn">{String(i + 1).padStart(2, "0")}</span>
                    <span className="web-prism__bandname">{d.short}</span>
                  </button>
                </li>
              ))}
            </ol>

            <p className="web-prism__count" aria-hidden="true">
              <span className="web-readout-hue">{String(active + 1).padStart(2, "0")}</span>
              <span>/ {String(N).padStart(2, "0")}</span>
            </p>
          </div>

          <div className="web-prism__cards" aria-live="polite" {...hold}>
            {DELIVERABLES.map((d, i) => (
              <GlassPanel
                key={d.title}
                world="web"
                as="article"
                smoked
                veil={0.58}
                className={`web-prism__card${staticMode || i === active ? " is-active" : ""}`}
                style={{ "--band": BANDS[i] } as CSSProperties}
              >
                <span className="web-prism__n">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="web-prism__title">{d.title}</h3>
                <p className="web-prism__body">{d.body}</p>
                <dl className="web-prism__spec">
                  {d.spec.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </GlassPanel>
            ))}
          </div>
        </div>

        <p className="web-prism__cap" aria-hidden="true">
          <b>One beam in</b>
          <span>Seven out</span>
        </p>
      </div>
    </section>
  );
}

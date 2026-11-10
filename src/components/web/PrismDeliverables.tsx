"use client";

import "@/app/web-prism.css";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import GlassPanel from "@/components/world/GlassPanel";
import { discover } from "@/lib/discover";

/**
 * What you get, section 04: one light, seven deliverables.
 *
 * You stand inside a cathedral of black crystal (the plate,
 * /tour/plate-crystal-*.webp): white light falls through the vault from the
 * upper left and breaks into colour on the facets and the wet floor. The
 * place is alive: the camera creeps in and leans with the pointer, the
 * shafts breathe and drift, and the whole hall takes the colour of the
 * deliverable in view, dipping through white between two of them.
 *
 * Nothing is scroll-driven. The deliverables step on by themselves; the
 * index on the left jumps to any of them, and the run pauses while the
 * pointer is on the card or the index. Reduced motion: one still frame,
 * every card in a column.
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
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  /** the colour wash dips out while the hue changes under it */
  const [swap, setSwap] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setStaticMode(true);
    let onScreen = false;
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting && !document.hidden;
      setRunning(onScreen && !reduce);
    });
    io.observe(root);
    const onVis = () => {
      if (document.hidden) setRunning(false);
      else if (onScreen && !reduce) setRunning(true);
    };
    document.addEventListener("visibilitychange", onVis);
    // the hall leans a few pixels after a mouse; a finger is for scrolling
    let raf = 0;
    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !onScreen || reduce) return;
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf)
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          stage.style.setProperty("--px", (-px).toFixed(3));
          stage.style.setProperty("--py", (-py).toFixed(3));
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  // each deliverable casts its colour through the hall: the wash dips to
  // white, takes the new hue, and comes back
  const swapTimer = useRef(0);
  const go = useCallback((i: number) => {
    setSwap(true);
    setActive(i);
    window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => setSwap(false), 200);
  }, []);
  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  // the run: step on while the section is on screen and nobody is reading
  useEffect(() => {
    if (!running || paused || staticMode) return;
    const id = window.setTimeout(() => go((active + 1) % N), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [running, paused, staticMode, active, go]);

  const pick = useCallback(
    (i: number) => {
      go(i);
      discover("web-crystal-pick");
    },
    [go],
  );
  const hold = { onPointerEnter: () => setPaused(true), onPointerLeave: () => setPaused(false) };

  return (
    <section
      ref={rootRef}
      data-rail="Deliverables"
      data-station="stack"
      data-no-fade=""
      data-static={staticMode ? "" : undefined}
      data-run={running ? "" : undefined}
      aria-labelledby="web-prism-title"
      className="web-section web-prism"
      style={{ "--hold": `${HOLD_MS}ms` } as CSSProperties}
    >
      <div ref={stageRef} className="web-prism__stage" style={{ "--band": BANDS[active] } as CSSProperties}>
        <div
          className="web-prism__film"
          role="img"
          aria-label="Inside a cathedral of black crystal, white light falls through the vault and breaks into seven colours"
        >
          <picture className="web-prism__plate">
            <source media="(max-width: 767px)" srcSet="/tour/plate-crystal-m.webp" />
            <img
              ref={(img) => {
                if (img?.complete && img.naturalWidth > 0) img.setAttribute("data-loaded", "");
              }}
              src="/tour/plate-crystal-wide.webp"
              alt=""
              decoding="async"
              loading="lazy"
              draggable={false}
              onLoad={(e) => e.currentTarget.setAttribute("data-loaded", "")}
            />
          </picture>
          <span className="web-prism__beam web-prism__beam--a" aria-hidden="true" />
          <span className="web-prism__beam web-prism__beam--b" aria-hidden="true" />
          <span className="web-prism__wash" data-swap={swap ? "" : undefined} aria-hidden="true" />
          <span className="web-prism__spill" aria-hidden="true" />
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
          <b>One light in</b>
          <span>Seven out</span>
        </p>
      </div>
    </section>
  );
}

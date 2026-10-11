"use client";

import "@/app/web-prism.css";
import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GlassPanel from "@/components/world/GlassPanel";
import { createFrameScrubber, type FrameFilm } from "@/lib/frameScrub";

gsap.registerPlugin(ScrollTrigger);

/**
 * What you get, section 04: one beam of light, seven deliverables.
 *
 * A pinned film the scroll bar plays: the camera stands inside a block of
 * optical crystal where a single white beam runs down the floor. As the
 * visitor scrolls the beam splits into seven spectral threads, and each
 * thread is a deliverable. The index on the left lights one band at a time,
 * the card on the right swaps to that deliverable, and the counter keeps
 * the place. Scroll back and the light folds into one beam again.
 *
 * The film is a generated clip cut into frames (public/frames/prism-*),
 * drawn by lib/frameScrub, fetched only when the section is near. Clicking a
 * band in the index scrolls to that deliverable's place in the film.
 * Reduced motion: no pin; the final frame with the seven cards in a column.
 */

const FILM: FrameFilm = {
  landscape: { dir: "/frames/prism-d", count: 96, width: 1280, height: 720 },
  portrait: { dir: "/frames/prism-m", count: 96, width: 600, height: 1067 },
};

/** red to violet, one per deliverable; the last is the division's own hue */
const BANDS = ["#ff4b4b", "#ff9a30", "#ffd84a", "#4df08c", "#2ee8ff", "#4d80ff", "#9d5cff"];

/** the film plays across the whole pin; the cards begin once the beam has split */
const CARDS_FROM = 0.26;

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
  const filmRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const film = filmRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !film || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrub = createFrameScrubber(canvas, FILM, () => film.setAttribute("data-ready", ""));

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        scrub.load();
        io.disconnect();
      },
      { rootMargin: "120% 0px 120% 0px" },
    );
    io.observe(stage);
    const ro = new ResizeObserver(() => scrub.resize());
    ro.observe(stage);

    const cards = Array.from(root.querySelectorAll<HTMLElement>(".web-prism__card"));
    const bands = Array.from(root.querySelectorAll<HTMLElement>(".web-prism__band"));
    const lead = root.querySelector<HTMLElement>(".web-prism__lead");

    if (reduce) {
      root.setAttribute("data-static", "");
      scrub.load();
      scrub.setProgress(1);
      return () => {
        io.disconnect();
        ro.disconnect();
        scrub.dispose();
      };
    }

    let active = -2;
    const apply = (p: number) => {
      scrub.setProgress(p);
      const idx = p < CARDS_FROM ? -1 : Math.min(N - 1, Math.floor(((p - CARDS_FROM) / (1 - CARDS_FROM)) * N));
      if (idx === active) return;
      active = idx;
      cards.forEach((c, i) => c.toggleAttribute("data-active", i === idx));
      bands.forEach((b, i) => {
        b.toggleAttribute("data-on", i === idx);
        b.toggleAttribute("data-done", i < idx);
      });
      if (countRef.current) countRef.current.textContent = String(Math.max(0, idx) + 1).padStart(2, "0");
      stage.toggleAttribute("data-cards", idx >= 0);
      if (lead) lead.toggleAttribute("data-hide", idx >= 0);
    };

    const st = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: `+=${N * 70 + 90}%`,
      pin: true,
      scrub: 0.4,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: (self) => apply(self.progress),
      onUpdate: (self) => apply(self.progress),
    });
    stRef.current = st;
    apply(0);

    return () => {
      st.kill();
      stRef.current = null;
      io.disconnect();
      ro.disconnect();
      scrub.dispose();
    };
  }, []);

  /** the index is a table of contents: a band scrolls to its deliverable */
  const jump = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    const p = CARDS_FROM + ((i + 0.5) / N) * (1 - CARDS_FROM);
    const y = st.start + (st.end - st.start) * p;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section
      ref={rootRef}
      data-rail="Deliverables"
      data-station="stack"
      aria-labelledby="web-prism-title"
      className="web-section web-prism"
    >
      <div ref={stageRef} className="web-prism__stage">
        <div
          ref={filmRef}
          className="web-prism__film"
          role="img"
          aria-label="Inside a block of optical crystal, one white beam splits into seven threads of colour"
        >
          <canvas ref={canvasRef} className="web-prism__canvas" aria-hidden="true" />
        </div>
        <div className="web-prism__scrim" aria-hidden="true" />

        <div className="web-prism__grid">
          <div className="web-prism__aside">
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
                <li key={d.title} className="web-prism__band" style={{ "--band": BANDS[i] } as CSSProperties}>
                  <button type="button" className="web-prism__bandbtn" onClick={() => jump(i)}>
                    <i aria-hidden="true" />
                    <span className="web-prism__bandn">{String(i + 1).padStart(2, "0")}</span>
                    <span className="web-prism__bandname">{d.short}</span>
                  </button>
                </li>
              ))}
            </ol>

            <p className="web-prism__count" aria-hidden="true">
              <span ref={countRef} className="web-readout-hue">
                01
              </span>
              <span>/ {String(N).padStart(2, "0")}</span>
            </p>
          </div>

          <div className="web-prism__cards" aria-live="polite">
            {DELIVERABLES.map((d, i) => (
              <GlassPanel
                key={d.title}
                world="web"
                as="article"
                smoked
                veil={0.58}
                className="web-prism__card"
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

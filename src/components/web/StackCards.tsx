"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * What you get — sticky stacking cards, section 04, standing in the world.
 *
 * Each deliverable is a frosted sheet that sticks a few pixels below the last.
 * As the next sheet arrives, the one underneath scales back into the tray and
 * its CONTENT fades out before the incoming edge can reach its lowest row — so
 * no row is ever sliced mid-glyph; what remains of a covered sheet is its
 * hairline edge.
 *
 * Every sheet carries a small, live-built illustration of the thing it
 * delivers — a sitemap, a type specimen, the build, a performance meter, a
 * search result, an integration pipeline, a release history — so the section
 * shows the work instead of listing it. White hairlines, one violet accent.
 *
 * Reduced motion: the sheets are not sticky; they sit in a plain column.
 */

type VizKey = "map" | "spec" | "code" | "perf" | "serp" | "flow" | "bars";

interface Deliverable {
  title: string;
  body: string;
  viz: VizKey;
  spec: Array<[string, string]>;
}

const DELIVERABLES: Deliverable[] = [
  {
    title: "Strategy",
    body: "Where you win before a pixel is drawn: the narrative, the page structure and the one idea that carries everything.",
    viz: "map",
    spec: [
      ["Output", "Sitemap, page briefs, offer hierarchy"],
      ["Decides", "What the first screen asks for"],
    ],
  },
  {
    title: "Custom design",
    body: "Art direction with a point of view. Type, colour, grid and motion language built for your brand, not picked from a theme store.",
    viz: "spec",
    spec: [
      ["Output", "Design system and every page state"],
      ["Templates used", "0"],
    ],
  },
  {
    title: "Build",
    body: "Hand-built in Next.js and TypeScript, headless where it helps, accessible by default, and yours to own.",
    viz: "code",
    spec: [
      ["Stack", "Next.js, GSAP, WebGL where it earns it"],
      ["Handover", "Repository, docs, CMS training"],
    ],
  },
  {
    title: "Performance 90 or higher",
    body: "A Lighthouse performance target of 90 or higher on the pages we ship. Motion runs on transform and opacity; 3D and video load late.",
    viz: "perf",
    spec: [
      ["Target", "Lighthouse performance ≥ 90"],
      ["LCP element", "Text or a poster, never a video"],
    ],
  },
  {
    title: "SEO-ready structure",
    body: "Semantic headings, metadata, structured data, a sitemap and clean URLs in place on launch day.",
    viz: "serp",
    spec: [
      ["Includes", "Schema, Open Graph, redirects map"],
      ["Checked", "Crawl and index report at launch"],
    ],
  },
  {
    title: "Integrations",
    body: "Booking, payments, CRM, email and analytics wired in, so a form submission lands where your team already works.",
    viz: "flow",
    spec: [
      ["Typical", "Scheduling, checkout, CRM, email"],
      ["Tracked", "Every conversion event, named"],
    ],
  },
  {
    title: "Ongoing iteration",
    body: "After launch the page keeps earning: new sections, offers and landing pages, tested and shipped on a monthly cadence.",
    viz: "bars",
    spec: [
      ["Cadence", "Monthly release, weekly on request"],
      ["Measured", "Conversion rate per page"],
    ],
  },
];

export default function StackCards() {
  const rootRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const cards = gsap.utils.toArray<HTMLElement>(".web-stack__card", root);
      const total = cards.length;

      // Counter: the last card whose top has passed 60% of the viewport. Works with or without motion.
      const count = () => {
        let idx = 0;
        const line = window.innerHeight * 0.6;
        cards.forEach((card, i) => {
          if (card.getBoundingClientRect().top <= line) idx = i;
        });
        if (countRef.current) countRef.current.textContent = String(idx + 1).padStart(2, "0");
      };
      ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onUpdate: count,
        onRefresh: count,
      });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        cards.forEach((card, i) => {
          if (i === total - 1) return;
          const inner = card.querySelector<HTMLElement>(".web-stack__inner");
          const content = card.querySelector<HTMLElement>(".web-stack__content");
          const next = cards[i + 1];
          if (!inner || !content) return;
          const depth = total - 1 - i;
          const top = () => parseFloat(getComputedStyle(card).top);

          // Settle back into the tray, from the moment the next sheet touches
          // this one until it has stuck on top of it.
          gsap.fromTo(
            inner,
            { scale: 1 },
            {
              scale: 1 - Math.min(depth, 4) * 0.03,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: next,
                start: () => `top ${top() + inner.offsetHeight}px`,
                end: () => `top ${parseFloat(getComputedStyle(next).top)}px`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );

          // Hand over cleanly: the content is gone before the incoming edge
          // reaches this sheet's lowest row (the spec row starts ~80% down).
          gsap.fromTo(
            content,
            { opacity: 1 },
            {
              opacity: 0,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: next,
                start: () => `top ${top() + inner.offsetHeight}px`,
                end: () => `top ${top() + inner.offsetHeight * 0.84}px`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} data-rail="Deliverables" data-station="stack" className="web-section web-stack">
      <div className="web-stack__aside">
        <p className="web-eyebrow">
          <span className="web-sq" aria-hidden="true" />
          04 — What you get
        </p>
        <h2 className="web-h2">Seven deliverables. One team.</h2>
        <p className="web-body">
          Every engagement ships all seven. Nothing is an add-on, and nothing starts from a theme.
        </p>
        <p className="web-stack__count" aria-hidden="true">
          <span ref={countRef} className="web-readout-hue">
            01
          </span>
          <span>/ {String(DELIVERABLES.length).padStart(2, "0")}</span>
        </p>
      </div>

      <ol className="web-stack__list">
        {DELIVERABLES.map((d, i) => (
          <li key={d.title} className="web-stack__card" style={{ "--i": i } as CSSProperties}>
            <div className="web-stack__inner">
              <div className="web-stack__content">
                <div className="web-stack__top">
                  <span className="web-stack__n">{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden="true" className="web-stack__frame">
                    {Array.from({ length: i + 1 }, (_, k) => (
                      <i key={k} />
                    ))}
                  </span>
                </div>
                <div className="web-stack__viz" aria-hidden="true">
                  {VIZ[d.viz]}
                </div>
                <h3 className="web-stack__title">{d.title}</h3>
                <p className="web-stack__body">{d.body}</p>
                <dl className="web-stack__spec">
                  {d.spec.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── the seven illustrations: live HTML/CSS, hairline white, one violet accent ── */

const PERF: Array<[string, number]> = [
  ["Performance", 96],
  ["Accessibility", 100],
  ["Best practice", 100],
  ["SEO", 100],
];
const RELEASES = [22, 30, 28, 41, 38, 47, 52, 49, 61, 66, 71, 84];

const VIZ: Record<VizKey, ReactNode> = {
  map: (
    <span className="dv dv-map">
      <span className="dv-map__root">Home — one promise</span>
      <span className="dv-map__kids">
        <span>Offer</span>
        <span data-hot="">Proof</span>
        <span>Prices</span>
        <span>Book</span>
      </span>
    </span>
  ),
  spec: (
    <span className="dv dv-spec">
      <span className="dv-spec__aa">Aa</span>
      <span className="dv-spec__meta">
        <span>Display — 700, tracked</span>
        <span>Body — 400, 62ch</span>
        <span>Grid — 12 col, 0 radius</span>
      </span>
      <span className="dv-spec__sw">
        <i />
        <i />
        <i />
        <i />
      </span>
    </span>
  ),
  code: (
    <span className="dv dv-code">
      <span>
        <b>export default</b> function Page() {"{"}
      </span>
      <span>
        {"  "}return &lt;Hero offer=&quot;book&quot; /&gt;;
      </span>
      <span>{"}"}</span>
      <span className="dv-code__ok">build passed · 0 templates</span>
    </span>
  ),
  perf: (
    <span className="dv dv-perf">
      {PERF.map(([k, v], i) => (
        <span key={k} className="dv-perf__row" data-hot={i === 0 ? "" : undefined}>
          <span>{k}</span>
          <i style={{ "--v": v / 100 } as CSSProperties} />
          <b>{v}</b>
        </span>
      ))}
      <span className="dv-perf__note">Target, per shipped page</span>
    </span>
  ),
  serp: (
    <span className="dv dv-serp">
      <span className="dv-serp__url">fennickandrowe.example › boiler-repair</span>
      <span className="dv-serp__t">Boiler repair in Northgate — engineer in 90 min</span>
      <span className="dv-serp__d">Fixed prices · No call-out fee · 4.9 / 5</span>
    </span>
  ),
  flow: (
    <span className="dv dv-flow">
      <span data-hot="">Form</span>
      <i />
      <span>Calendar</span>
      <i />
      <span>CRM</span>
      <i />
      <span>Email</span>
      <i />
      <span>Analytics</span>
    </span>
  ),
  bars: (
    <span className="dv dv-bars">
      <span className="dv-bars__plot">
        {RELEASES.map((h, i) => (
          <i
            key={i}
            style={{ "--h": h / 100 } as CSSProperties}
            data-hot={i === RELEASES.length - 1 ? "" : undefined}
          />
        ))}
      </span>
      <span className="dv-bars__axis">
        <span>Launch</span>
        <span>12 monthly releases</span>
      </span>
    </span>
  ),
};

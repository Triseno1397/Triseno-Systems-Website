"use client";

import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * What you get — sticky stacking cards. Each deliverable sticks a few pixels
 * below the last; as the next one arrives the card underneath scales back and
 * dims (transform + filter only), so the stack reads as seven sheets in a tray.
 * A mono counter in the sticky heading tracks the card on top.
 */

interface Deliverable {
  title: string;
  body: string;
  spec: Array<[string, string]>;
}

const DELIVERABLES: Deliverable[] = [
  {
    title: "Strategy",
    body: "Where you win before a pixel is drawn: the narrative, the page structure and the one idea that carries everything.",
    spec: [
      ["Output", "Sitemap, page briefs, offer hierarchy"],
      ["Decides", "What the first screen asks for"],
    ],
  },
  {
    title: "Custom design",
    body: "Art direction with a point of view. Type, colour, grid and motion language built for your brand, not picked from a theme store.",
    spec: [
      ["Output", "Design system and every page state"],
      ["Templates used", "0"],
    ],
  },
  {
    title: "Build",
    body: "Hand-built in Next.js and TypeScript, headless where it helps, accessible by default, and yours to own.",
    spec: [
      ["Stack", "Next.js, GSAP, WebGL where it earns it"],
      ["Handover", "Repository, docs, CMS training"],
    ],
  },
  {
    title: "Performance 90 or higher",
    body: "A Lighthouse performance target of 90 or higher on the pages we ship. Motion runs on transform and opacity; 3D and video load late.",
    spec: [
      ["Target", "Lighthouse performance ≥ 90"],
      ["LCP element", "Text or a poster, never a video"],
    ],
  },
  {
    title: "SEO-ready structure",
    body: "Semantic headings, metadata, structured data, a sitemap and clean URLs in place on launch day.",
    spec: [
      ["Includes", "Schema, Open Graph, redirects map"],
      ["Checked", "Crawl and index report at launch"],
    ],
  },
  {
    title: "Integrations",
    body: "Booking, payments, CRM, email and analytics wired in, so a form submission lands where your team already works.",
    spec: [
      ["Typical", "Scheduling, checkout, CRM, email"],
      ["Tracked", "Every conversion event, named"],
    ],
  },
  {
    title: "Ongoing iteration",
    body: "After launch the page keeps earning: new sections, offers and landing pages, tested and shipped on a monthly cadence.",
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
          const next = cards[i + 1];
          if (!inner) return;
          const depth = total - 1 - i;
          // fromTo with an explicit brightness(1) start: tweening `filter` from
          // the computed `none` lets GSAP read the start as brightness(0), which
          // drives the sheet to black instead of to 0.82.
          gsap.fromTo(
            inner,
            { scale: 1, filter: "brightness(1)" },
            {
              scale: 1 - Math.min(depth, 4) * 0.03,
              // Sheets settle back into the tray but never become unreadable:
              // a card can sit half-uncovered for a whole viewport of scroll.
              filter: "brightness(0.82)",
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: next,
                // From the moment the next sheet touches this one until it has stuck on top of it.
                start: () => `top ${parseFloat(getComputedStyle(card).top) + inner.offsetHeight}px`,
                end: () => `top ${parseFloat(getComputedStyle(next).top)}px`,
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
              <div className="web-stack__top">
                <span className="web-stack__n">{String(i + 1).padStart(2, "0")}</span>
                <span aria-hidden="true" className="web-stack__frame">
                  {Array.from({ length: i + 1 }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
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
          </li>
        ))}
      </ol>
    </section>
  );
}

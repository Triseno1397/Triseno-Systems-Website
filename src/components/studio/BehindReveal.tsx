"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Aperture from "./Aperture";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §3 — Behind the Studio. Its own mechanic, nothing to do with the
   hero's iris (M1): a pile of prints — stills pulled from the studio's own
   frames — that deals itself out in depth as you scroll. Each print sits on
   its own parallax plane, travels at its own rate and turns from the stack
   into a fan, so the section reads as a contact sheet being spread across a
   table. The copy beside it arrives line by line (split-line mask wipe) and
   settles solid; on phones it is simply solid from the start.
   ───────────────────────────────────────────────────────────────────────── */

interface Print {
  src: string;
  cap: string;
  /** resting place in the fan: x/y offset in % of the print, rotation in deg */
  x: number;
  y: number;
  r: number;
  /** parallax depth: how far the print travels across the section */
  depth: number;
}

const PRINTS: Print[] = [
  { src: "/posters/apparel-tryon.jpg", cap: "02 · handheld, last light", x: -46, y: -18, r: -9, depth: 1.25 },
  { src: "/posters/asmr-unbox.jpg", cap: "03 · close mic, locked off", x: 44, y: -30, r: 7, depth: 0.7 },
  { src: "/posters/ugc-watch-unbox.jpg", cap: "04 · practical light", x: 38, y: 34, r: -5, depth: 1.05 },
  { src: "/posters/product-hero.jpg", cap: "01 · rim light, slow push", x: -26, y: 26, r: 3, depth: 0.45 },
];

interface SplitLinesProps {
  as: "h2" | "p";
  text: string;
  className?: string;
  id?: string;
}

function SplitLines({ as, text, className, id }: SplitLinesProps) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // M5: reduced motion keeps the server-rendered text exactly as it is — and
    // so do phones, where a long paragraph mid-wipe reads as broken type.
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) return;

    let revealed = false;
    let width = -1;
    let ctx: gsap.Context | null = null;
    let alive = true;

    const build = () => {
      if (!alive) return;
      const w = el.clientWidth;
      if (w === width) return;
      width = w;
      ctx?.revert();

      // 1. words -> measure which line each one landed on
      el.textContent = "";
      const words = text.split(/\s+/).map((word) => {
        const span = document.createElement("span");
        span.style.display = "inline-block";
        span.textContent = word;
        el.appendChild(span);
        el.appendChild(document.createTextNode(" "));
        return span;
      });
      const lines: string[][] = [];
      let top = Number.NaN;
      words.forEach((span) => {
        if (span.offsetTop !== top) {
          top = span.offsetTop;
          lines.push([]);
        }
        lines[lines.length - 1].push(span.textContent ?? "");
      });

      // 2. one mask per line
      el.textContent = "";
      const inner: HTMLElement[] = lines.map((line) => {
        const mask = document.createElement("span");
        mask.className = "sx-line-mask";
        const row = document.createElement("span");
        row.className = "sx-line";
        row.textContent = line.join(" ");
        mask.appendChild(row);
        el.appendChild(mask);
        el.appendChild(document.createTextNode(" "));
        return row;
      });

      if (revealed) return;
      ctx = gsap.context(() => {
        gsap.fromTo(
          inner,
          { yPercent: 105, clipPath: "inset(0% 0% 100% 0%)" },
          {
            yPercent: 0,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.04,
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
            onComplete: () => {
              revealed = true;
            },
          },
        );
      }, el);
    };

    // Line breaks move when Unbounded / Geist swap in, even at the same width.
    const afterFonts = () => {
      width = -1;
      build();
    };
    (document.fonts?.ready ?? Promise.resolve()).then(afterFonts, afterFonts);
    const ro = new ResizeObserver(() => build());
    ro.observe(el);

    return () => {
      alive = false;
      ro.disconnect();
      ctx?.revert();
      el.textContent = text;
    };
  }, [text]);

  const Tag = as;
  return (
    <Tag ref={ref} id={id} className={className}>
      {text}
    </Tag>
  );
}

const COPY = [
  "Our founder spent nearly a decade behind professional cameras in Los Angeles. Broadcast, live production, and large-scale shoots — nationally televised award shows, stadium events, and corporate stages for global technology brands. Ten years of one discipline: knowing which shot sells the moment, and getting it.",
  "That's the entire craft of product advertising. The angle, the light, the three seconds that stop a scroll. We don't guess at what converts on screen. Reading a frame has been the job for ten years.",
  "When a brand hands us their product, it gets the same treatment those stages got. Shot with intent, built to perform, delivered like it matters. Because to the person buying it, it does.",
];

export default function BehindReveal() {
  const root = useRef<HTMLElement>(null);

  // Deal the prints: each one travels on its own plane and turns from the
  // stack into its place in the fan. Scrubbed, so it is scroll-driven, not timed.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const prints = gsap.utils.toArray<HTMLElement>(".sx-print", root.current);
        prints.forEach((el, i) => {
          const p = PRINTS[i];
          gsap.fromTo(
            el,
            { xPercent: p.x * 0.12, yPercent: 60 * p.depth, rotation: p.r * 0.2 },
            {
              xPercent: p.x,
              yPercent: p.y - 40 * p.depth,
              rotation: p.r,
              ease: "none",
              scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
            },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} data-rail="Behind" className="sx-behind" aria-labelledby="sx-behind-title">
      <div className="sx-behind__grid">
        <div className="sx-behind__text">
          <p className="sx-kicker font-mono">
            <Aperture size={14} strokeWidth={1.25} glow />
            Behind the Studio
          </p>
          <SplitLines
            as="h2"
            id="sx-behind-title"
            className="sx-behind__title font-display font-bold uppercase"
            text="Triseno was built by a camera professional."
          />
          <span aria-hidden="true" className="sx-behind__rule" />
          {COPY.map((para) => (
            <SplitLines key={para.slice(0, 24)} as="p" className="sx-behind__para font-sans font-light" text={para} />
          ))}
        </div>

        {/* Contact sheet: prints from the studio's own frames, dealt in depth. */}
        <div aria-hidden="true" className="sx-behind__scene">
          <div className="sx-prints">
            {PRINTS.map((p) => (
              <figure key={p.src} className="sx-print">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" loading="lazy" decoding="async" />
                <figcaption className="font-mono">{p.cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

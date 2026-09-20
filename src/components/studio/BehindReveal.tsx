"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Aperture from "./Aperture";
import { LazyVideo } from "./media";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §3 — split-text line reveal with mask wipe (site-map.md).
   Each block of copy is measured into its real rendered lines; every line
   sits in its own mask and wipes up (clip-path + transform) in sequence when
   the block enters. The copy is the existing "Behind the Studio" text.
   The scene is a viewfinder: a lens window with the iris around it.
   ───────────────────────────────────────────────────────────────────────── */

const LENS_CLIP = "/videos/pickleball-hypermotion.mp4";

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
    // M5: reduced motion keeps the server-rendered text exactly as it is.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
            duration: 1.25,
            ease: "expo.out",
            stagger: 0.085,
            scrollTrigger: { trigger: el, start: "top 84%", once: true },
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
  "Our founder spent nearly a decade behind professional cameras in Los Angeles. Broadcast, live production, and large-scale shoots, including major award shows and corporate productions for companies like Meta, Google, and Epic Games. Ten years of one discipline: knowing which shot sells the moment, and getting it.",
  "That's the entire craft of product advertising. The angle, the light, the three seconds that stop a scroll. We don't guess at what converts on screen. Reading a frame has been the job for ten years.",
  "When a brand hands us their product, it gets the same treatment those stages got. Shot with intent, built to perform, delivered like it matters. Because to the person buying it, it does.",
];

export default function BehindReveal() {
  return (
    <section data-rail="Behind" className="sx-behind" aria-labelledby="sx-behind-title">
      <div aria-hidden="true" className="sx-glow sx-glow--side" />

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

        {/* Viewfinder scene: stays in frame while the copy scrolls past it. */}
        <div aria-hidden="true" className="sx-behind__scene">
          <div className="sx-lens">
            <span className="sx-lens__iris">
              <Aperture size="100%" open={0.78} strokeWidth={1.25} glow />
            </span>
            <LazyVideo src={LENS_CLIP} className="sx-lens__glass" />
            <span className="sx-lens__cross" />
            <i className="sx-lens__corner sx-lens__corner--tl" />
            <i className="sx-lens__corner sx-lens__corner--tr" />
            <i className="sx-lens__corner sx-lens__corner--bl" />
            <i className="sx-lens__corner sx-lens__corner--br" />
          </div>
          <p className="sx-lens__readout font-mono">
            <span>24.00 FPS</span>
            <span>Shutter 180°</span>
            <span>Los Angeles</span>
          </p>
        </div>
      </div>
    </section>
  );
}

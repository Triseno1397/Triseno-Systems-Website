"use client";

import { useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import { getLenis } from "@/components/world/SmoothScroll";
import Aperture, { aperturePath } from "./Aperture";
import { LazyVideo } from "./media";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §1 — scroll-expansion hero (site-map.md). The showreel starts as a
   small aperture window between the two halves of the headline; scrolling
   opens the iris into a 0-radius frame and expands it to full bleed.
   Only clip-path / transform / opacity are written per frame. The mono
   readout (timecode, f-stop, frame coverage) counts with scroll progress.
   ───────────────────────────────────────────────────────────────────────── */

const SHOWREEL = "/videos/product-hero.mp4";
// 11–22s: the blade, the sparks, the smoke. Outside it the clip carries a
// baked-in brand super and an end card that would print under our headline.
const REEL_RANGE: [number, number] = [11, 22];
const REEL_SECONDS = 25;
const FPS = 24;
const F_STOPS = ["f/16", "f/11", "f/8", "f/5.6", "f/4", "f/2.8", "f/2", "f/1.4"];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const pad = (n: number, l = 2) => String(n).padStart(l, "0");

export default function ExpansionHero() {
  const root = useRef<HTMLElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const iris = useRef<SVGPathElement>(null);
  const left = useRef<HTMLSpanElement>(null);
  const right = useRef<HTMLSpanElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const stop = useRef<HTMLSpanElement>(null);
  const cover = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current;
        if (!section) return;
        let vw = 0;
        let vh = 0;
        let s = 0;
        let last = -1;

        const measure = () => {
          vw = window.innerWidth;
          vh = section.querySelector<HTMLElement>(".sx-hero__stage")?.offsetHeight ?? window.innerHeight;
          // The window size lives in CSS (--s); the ring is drawn at 1.2 x that.
          s = (ring.current?.offsetWidth ?? 0) / 1.2 || Math.min(vh * 0.3, vw * 0.21);
        };

        const render = (p: number) => {
          last = p;
          const open = smooth(p / 0.3); // iris opens, circle -> 0-radius frame
          const grow = easeInOut((p - 0.1) / 0.8); // frame -> full bleed
          const w = s + (vw - s) * grow;
          const h = s + (vh - s) * grow;
          const x = (vw - w) / 2;
          const y = (vh - h) / 2;
          const r = (s / 2) * (1 - open);
          const inset = (o: number, rad: number) =>
            `inset(${(y - o).toFixed(1)}px ${(x - o).toFixed(1)}px ${(y - o).toFixed(1)}px ${(x - o).toFixed(1)}px round ${rad.toFixed(1)}px)`;

          if (clip.current) clip.current.style.clipPath = inset(0, r);
          if (edge.current) {
            edge.current.style.clipPath = inset(1, r > 0 ? r + 1 : 0);
            // The hairline frames the window; at full bleed there is no frame.
            edge.current.style.opacity = (1 - smooth((grow - 0.7) / 0.3)).toFixed(3);
          }
          // The whole reel is visible in the small window, then fills the frame.
          if (media.current) media.current.style.transform = `scale(${Math.max(w / vw, h / vh).toFixed(4)})`;
          if (veil.current) veil.current.style.opacity = grow.toFixed(3);
          if (ring.current) {
            ring.current.style.opacity = (1 - smooth((p - 0.1) / 0.22)).toFixed(3);
            ring.current.style.transform = `translate(-50%, -50%) rotate(${(p * 160).toFixed(2)}deg) scale(${(1 + grow * 2).toFixed(3)})`;
          }
          iris.current?.setAttribute("d", aperturePath(0.12 + open * 0.88));

          const drift = grow * 10;
          if (vw >= 768) {
            // At full bleed the headline lifts so the copy and CTA below it
            // rest inside the chrome lane, clear of the bottom fade band.
            const rise = (-vh * 0.12 * grow).toFixed(1);
            if (left.current) left.current.style.transform = `translate3d(${(-drift).toFixed(1)}px,${rise}px,0)`;
            if (right.current) right.current.style.transform = `translate3d(${drift.toFixed(1)}px,${rise}px,0)`;
          } else {
            // Mobile: the window is gone at full bleed, so the halves close up into one headline.
            const join = s / 2 + 16;
            const lift = vh * 0.12;
            if (left.current) left.current.style.transform = `translate3d(0,${((join - lift) * grow).toFixed(1)}px,0)`;
            if (right.current) right.current.style.transform = `translate3d(0,${((-join - lift) * grow).toFixed(1)}px,0)`;
          }
          const arrive = smooth((p - 0.72) / 0.28);
          if (copy.current) {
            copy.current.style.opacity = arrive.toFixed(3);
            copy.current.style.transform = `translate3d(0,${((1 - arrive) * 28).toFixed(1)}px,0)`;
            copy.current.style.pointerEvents = arrive > 0.6 ? "auto" : "none";
          }
          if (hint.current) hint.current.style.opacity = (1 - smooth(p / 0.12)).toFixed(3);

          const frames = Math.round(p * REEL_SECONDS * FPS);
          if (tc.current) tc.current.textContent = `00:00:${pad(Math.floor(frames / FPS))}:${pad(frames % FPS)}`;
          if (stop.current) stop.current.textContent = F_STOPS[Math.min(F_STOPS.length - 1, Math.floor(p * F_STOPS.length))];
          if (cover.current) cover.current.textContent = `${pad(Math.round(((w * h) / (vw * vh)) * 100), 3)}%`;
        };

        measure();
        render(0);
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          onRefresh: (self) => {
            measure();
            render(self.progress);
          },
          onUpdate: (self) => render(self.progress),
        });
        const onResize = () => {
          measure();
          render(Math.max(0, last));
        };
        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          st.kill();
          [clip, edge, media, veil, ring, left, right, copy, hint].forEach((r) => r.current?.removeAttribute("style"));
        };
      });
      // M5: no scrub. The CSS renders the final frame; the readout matches it.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (tc.current) tc.current.textContent = `00:00:${pad(REEL_SECONDS)}:00`;
        if (stop.current) stop.current.textContent = F_STOPS[F_STOPS.length - 1];
        if (cover.current) cover.current.textContent = "100%";
      });
    },
    { scope: root },
  );

  const toFormats = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("formats");
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  };

  const formatsInner = (
    <>
      <span>See what we make</span>
      <ArrowDown size={16} weight="light" aria-hidden="true" />
    </>
  );

  return (
    <section ref={root} data-rail="Showreel" className="sx-hero" aria-labelledby="sx-hero-title">
      <div className="sx-hero__stage">
        {/* 1px hairline: a white layer clipped 1px wider than the media. */}
        <div ref={edge} aria-hidden="true" className="sx-hero__edge" />
        <div ref={clip} className="sx-hero__clip">
          <div ref={media} className="sx-hero__media">
            <LazyVideo src={SHOWREEL} eager range={REEL_RANGE} className="sx-fill" />
          </div>
          <div ref={veil} aria-hidden="true" className="sx-hero__veil" />
        </div>

        <div ref={ring} aria-hidden="true" className="sx-hero__ring">
          <Aperture size="100%" open={0.12} strokeWidth={1.25} glow pathRef={iris} />
        </div>

        <h1 id="sx-hero-title" className="sx-hero__title font-display font-bold uppercase">
          <span ref={left} className="sx-hero__half sx-hero__half--l">
            {/* D1: reads exactly like the chrome lockup — TRISENO / CREATIVE. */}
            <span className="sx-hero__eyebrow font-mono font-normal">
              <Aperture size={14} strokeWidth={1.25} glow />
              Triseno / Creative
            </span>
            <span>Video</span> <span>that</span> <span>sells</span>
          </span>
          <span className="sr-only"> </span>
          <span ref={right} className="sx-hero__half sx-hero__half--r">
            <span>while</span> <span>it</span> <span>scrolls.</span>
          </span>
        </h1>

        <div ref={copy} className="sx-hero__copy">
          <p className="sx-hero__lede font-sans font-light">
            We script, shoot, and edit performance creative for Instagram, TikTok, YouTube, and every feed in
            between — from UGC to cinematic brand films. Built to convert, not just to look good.
          </p>
          <div className="sx-hero__actions">
            <GhostButton href="/contact">Start a Conversation</GhostButton>
            <a href="#formats" onClick={toFormats} className="ghost-btn">
              <span className="ghost-btn__layer">{formatsInner}</span>
              <span aria-hidden="true" className="ghost-btn__layer ghost-btn__fill">
                {formatsInner}
              </span>
            </a>
          </div>
        </div>

        {/* One slim line of camera data — no rules, no REC lamp. */}
        <div aria-hidden="true" className="sx-hero__readout font-mono">
          <span>
            TC <b ref={tc}>00:00:00:00</b>
          </span>
          <span ref={hint} className="sx-hero__hint">
            Scroll to open
          </span>
          <span>
            IRIS <b ref={stop}>f/16</b> · FRAME <b ref={cover}>000%</b>
          </span>
        </div>
      </div>
    </section>
  );
}

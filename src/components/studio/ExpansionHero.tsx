"use client";

import { useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown } from "@phosphor-icons/react";
import GhostButton from "@/components/ui/GhostButton";
import GlassPanel from "@/components/world/GlassPanel";
import { getLenis } from "@/components/world/SmoothScroll";
import Aperture from "./Aperture";
import { LazyVideo } from "./media";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §1 — scroll-expansion hero (site-map.md). A steel iris the size of
   a wall stands on a wet soundstage floor between the two halves of the
   headline (the plate: a rendered still, /tour/plate-reel-*.webp). The reel
   shows through its small opening; scrolling swings the nine blades back
   until the whole ring is picture, then the frame grows past the ring to
   full bleed. Only clip-path / transform / opacity are written per frame.
   The mono readout (timecode, f-stop, frame coverage) counts with scroll.
   ───────────────────────────────────────────────────────────────────────── */

const SHOWREEL = "/videos/product-hero.mp4";
// 11–22s: the blade, the sparks, the smoke. Outside it the clip carries a
// baked-in brand super and an end card that would print under our headline.
const REEL_RANGE: [number, number] = [11, 22];
const REEL_SECONDS = 25;
const FPS = 24;
const F_STOPS = ["f/16", "f/11", "f/8", "f/5.6", "f/4", "f/2.8", "f/2", "f/1.4"];

/* the plate's geometry, as fractions of the rendered image's HEIGHT (the
   desktop and phone cuts share the full height of the render, centred):
   the iris sits dead centre; its opening, the reach of the blades, the inner
   edge of the bezel and the outer rim */
const PLATE_WIDE = 2752 / 1536;
const PLATE_TALL = 1392 / 2304;
const HOLE = 0.036;
const RIM = 0.153;
const RIM_OUTER = 0.176;
const BLADES = 9;
/* the plate pushes in a little across the stage, about the iris centre */
const PLATE_PUSH = 0.08;

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

/** the opening as a polygon: a regular nine-sided iris that rounds off into
 *  a circle as it reaches the bezel (`round` 0..1), turned by `twist` */
function irisPolygon(cx: number, cy: number, r: number, twist: number, round: number): string {
  const N = 36;
  const seg = (Math.PI * 2) / BLADES;
  const apo = Math.cos(Math.PI / BLADES);
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // distance to the edge of a regular polygon with circumradius 1
    const phi = (((a + twist) % seg) + seg) % seg;
    const poly = apo / Math.cos(phi - seg / 2);
    const k = poly + (1 - poly) * round;
    pts.push(`${(cx + Math.cos(a) * r * k).toFixed(1)}px ${(cy + Math.sin(a) * r * k).toFixed(1)}px`);
  }
  return `polygon(${pts.join(",")})`;
}

export default function ExpansionHero() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLImageElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
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
        /** the plate's rendered height under object-fit: cover */
        let ih = 0;
        let last = -1;

        const measure = () => {
          // the stage, not the window: <main> keeps the rail's lane
          vw = stage.current?.clientWidth || window.innerWidth;
          vh = stage.current?.offsetHeight || window.innerHeight;
          const ratio = vw < 768 ? PLATE_TALL : PLATE_WIDE;
          ih = Math.max(vh, vw / ratio);
          // the headline flanks the ring: the middle column is the rim's width
          stage.current?.style.setProperty("--s", `${(2 * RIM_OUTER * ih).toFixed(1)}px`);
        };

        const render = (p: number) => {
          last = p;
          // Timeline: blades open (0-.22) · frame grows past the ring to full
          // bleed (.2-.66) · copy arrives (.58-.70) and HOLDS · the whole
          // stage dissolves into the world (.84-1) while the formats section
          // fades in on the spot.
          const open = smooth(p / 0.22);
          const grow = easeInOut((p - 0.2) / 0.46);
          const out = smooth((p - 0.84) / 0.16);
          const ps = 1 + PLATE_PUSH * p;
          const cx = vw / 2;
          const cy = vh / 2;
          // the bezel's inner edge, in px, as the plate pushes in
          const rim = RIM * ih * ps;
          const ring = rim * 2;
          const w = ring + (vw - ring) * grow;
          const h = ring + (vh - ring) * grow;
          const x = (vw - w) / 2;
          const y = (vh - h) / 2;
          const r = rim * (1 - grow);
          const inset = (o: number, rad: number) =>
            `inset(${(y - o).toFixed(1)}px ${(x - o).toFixed(1)}px ${(y - o).toFixed(1)}px ${(x - o).toFixed(1)}px round ${rad.toFixed(1)}px)`;

          if (plate.current) plate.current.style.transform = `scale(${ps.toFixed(4)})`;
          if (clip.current) {
            if (open < 1) {
              // the blades swing back: the opening grows from the still's own
              // hole to the bezel, turning as a real iris does
              const rr = (HOLE + (RIM - HOLE) * open) * ih * ps;
              clip.current.style.clipPath = irisPolygon(cx, cy, rr, (1 - open) * 0.5, smooth((open - 0.72) / 0.28));
            } else clip.current.style.clipPath = inset(0, r);
          }
          if (edge.current) {
            edge.current.style.clipPath = inset(1, r > 0 ? r + 1 : 0);
            // The hairline frames the window once it leaves the ring; at
            // full bleed there is no frame.
            edge.current.style.opacity = (smooth((grow - 0.04) / 0.16) * (1 - smooth((grow - 0.7) / 0.3))).toFixed(3);
          }
          // The reel fills the ring while the blades open, then fills the frame.
          if (media.current) media.current.style.transform = `scale(${Math.max(w / vw, h / vh).toFixed(4)})`;
          if (veil.current) veil.current.style.opacity = grow.toFixed(3);

          const drift = grow * 10;
          if (vw >= 768) {
            // At full bleed the headline lifts so the copy and CTA below it
            // rest inside the chrome lane, clear of the bottom fade band.
            // It also steps down in size, so the copy card never touches it.
            const rise = (-vh * 0.17 * grow).toFixed(1);
            const k = (1 - 0.14 * grow).toFixed(4);
            if (left.current) left.current.style.transform = `translate3d(${(-drift).toFixed(1)}px,${rise}px,0) scale(${k})`;
            if (right.current) right.current.style.transform = `translate3d(${drift.toFixed(1)}px,${rise}px,0) scale(${k})`;
          } else {
            // Mobile: the window is gone at full bleed, so the halves close up into one headline.
            const join = RIM_OUTER * ih + 16;
            const lift = vh * 0.12;
            if (left.current) left.current.style.transform = `translate3d(0,${((join - lift) * grow).toFixed(1)}px,0)`;
            if (right.current) right.current.style.transform = `translate3d(0,${((-join - lift) * grow).toFixed(1)}px,0)`;
          }
          const arrive = smooth((p - 0.58) / 0.12);
          if (copy.current) {
            copy.current.style.opacity = arrive.toFixed(3);
            copy.current.style.transform = `translate3d(0,${((1 - arrive) * 28).toFixed(1)}px,0)`;
            copy.current.style.pointerEvents = arrive > 0.6 ? "auto" : "none";
          }
          if (hint.current) hint.current.style.opacity = (1 - smooth(p / 0.12)).toFixed(3);
          if (stage.current) {
            stage.current.style.opacity = (1 - out).toFixed(3);
            // gone = not hit-testable, so it never blocks the chapter beneath
            stage.current.style.visibility = out > 0.995 ? "hidden" : "visible";
          }

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
          [plate, clip, edge, media, veil, left, right, copy, hint, stage].forEach((r) => r.current?.removeAttribute("style"));
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
      <div ref={stage} className="sx-hero__stage">
        {/* the soundstage and its steel iris: the still everything else stands
            in, asked for at parse time and faded up once decoded */}
        <link rel="preload" as="image" href="/tour/plate-reel-wide.webp" media="(min-width: 768px)" />
        <link rel="preload" as="image" href="/tour/plate-reel-m.webp" media="(max-width: 767px)" />
        <picture className="sx-hero__plate">
          <source media="(max-width: 767px)" srcSet="/tour/plate-reel-m.webp" />
          <img
            ref={(img) => {
              plate.current = img;
              if (img?.complete && img.naturalWidth > 0) img.setAttribute("data-loaded", "");
            }}
            src="/tour/plate-reel-wide.webp"
            alt=""
            decoding="async"
            fetchPriority="high"
            draggable={false}
            onLoad={(e) => e.currentTarget.setAttribute("data-loaded", "")}
          />
        </picture>
        {/* 1px hairline: a white layer clipped 1px wider than the media. */}
        <div ref={edge} aria-hidden="true" className="sx-hero__edge" />
        <div ref={clip} className="sx-hero__clip">
          <div ref={media} className="sx-hero__media">
            <LazyVideo src={SHOWREEL} eager range={REEL_RANGE} poster={19.7} className="sx-fill" />
          </div>
          <div ref={veil} aria-hidden="true" className="sx-hero__veil" />
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
            {/* What we sell, on the first screen. */}
            <span className="sx-hero__eyebrow sx-hero__eyebrow--r font-mono font-normal">Ad creative for paid social</span>
            <span>while</span> <span>it</span> <span>scrolls.</span>
          </span>
        </h1>

        <div ref={copy} className="sx-hero__copy">
          <GlassPanel world="creative" veil={0.8} className="sx-hero__glass">
            <p className="sx-hero__lede font-sans font-light">
              We script, shoot, and edit performance creative for Instagram, TikTok, YouTube, and every feed in
              between — from UGC to cinematic brand films. Built to convert, not just to look good.
            </p>
            <div className="sx-hero__actions">
              <GhostButton href="/contact?division=creative">Start a Conversation</GhostButton>
              <a href="#formats" onClick={toFormats} className="ghost-btn">
                <span className="ghost-btn__layer">{formatsInner}</span>
                <span aria-hidden="true" className="ghost-btn__layer ghost-btn__fill">
                  {formatsInner}
                </span>
              </a>
            </div>
          </GlassPanel>
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

"use client";

import { useEffect, useRef, useState } from "react";
import manifest from "../../../public/art-manifest.json";

/* ─────────────────────────────────────────────────────────────────────────
   /studio — THE WORLD (design-loop/world-plates.md). A night film soundstage:
   sodium-amber shafts falling through haze from the rigging onto a wet floor,
   light stands and a crane at the edges, a calm dark centre. One fixed layer
   behind the whole page — the iris hero opens into it, and the filmstrip,
   the contact sheet and the testimonial wall all sit on this stage.

   The plate is the base; it is brought to life on top:
   · camera — page scroll dollies in (scale 1 → 1.12) and cranes (small
     vertical drift); the pointer adds a few px of parallax;
   · light — each of the plate's shafts breathes, out of phase, and a soft
     amber key follows the pointer;
   · air — haze drifts through the beams and dust hangs in them.
   Only transform / opacity (DOM) and a transparent canvas are animated.
   The blur placeholder paints instantly; the plate fades in over it, so the
   page's text stays the LCP element.
   ───────────────────────────────────────────────────────────────────────── */

type Art = { w: number; h: number; blur: string };
const ART = manifest as unknown as Record<string, Art | undefined>;

const PLATES = {
  desktop: "/worlds/creative-desktop.webp",
  mobile: "/worlds/creative-mobile.webp",
} as const;

/** The plate's lamps and where their shafts land, in plate-normalised coords. */
interface Shaft {
  lamp: [number, number];
  floor: [number, number];
  /** half-width of the beam where it meets the floor, as a fraction of plate width */
  spread: number;
  phase: number;
}
const SHAFTS: Record<keyof typeof PLATES, Shaft[]> = {
  desktop: [
    { lamp: [0.088, 0.03], floor: [0.33, 0.7], spread: 0.1, phase: 0 },
    { lamp: [0.222, 0.09], floor: [0.43, 0.72], spread: 0.09, phase: 1.9 },
    { lamp: [0.725, 0.135], floor: [0.58, 0.72], spread: 0.08, phase: 3.1 },
    { lamp: [0.862, 0.065], floor: [0.66, 0.7], spread: 0.1, phase: 4.4 },
  ],
  mobile: [
    { lamp: [0.13, 0.12], floor: [0.34, 0.66], spread: 0.16, phase: 0 },
    { lamp: [0.71, 0.3], floor: [0.56, 0.68], spread: 0.12, phase: 2.2 },
    { lamp: [0.86, 0.2], floor: [0.72, 0.68], spread: 0.16, phase: 3.7 },
  ],
};

const amber = (a: number) => `rgba(255, 150, 70, ${a})`;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function StudioBackdrop() {
  const cam = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const camera = cam.current;
    const canvas = cvs.current;
    const ctx = canvas?.getContext("2d");
    if (!camera || !canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wideQ = window.matchMedia("(min-width: 768px)");
    const SCALE = 0.5; // atmosphere is soft light — rendered at half resolution

    let W = 0;
    let H = 0;
    let kind: keyof typeof PLATES = "desktop";
    let target = 0;
    let p = 0;
    let t = 0;
    let px = 0; // pointer, -1..1
    let py = 0;
    let lx = 0.5; // pointer light, 0..1 (eased)
    let ly = 0.45;
    let tx = 0.5;
    let ty = 0.45;
    let raf = 0;
    let alive = true;

    // deterministic dust
    let seed = 11;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const dust = Array.from({ length: 70 }, () => ({ s: rnd(), a: rnd(), k: Math.floor(rnd() * 4), f: rnd() * 6.28 }));

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      kind = wideQ.matches ? "desktop" : "mobile";
      canvas.width = Math.max(1, Math.round(W * SCALE));
      canvas.height = Math.max(1, Math.round(H * SCALE));
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    };
    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? clamp01(window.scrollY / max) : 0;
    };

    /** plate coords -> screen coords, for an object-fit: cover plate */
    const map = (u: number, v: number): [number, number] => {
      const art = ART[PLATES[kind]];
      const pw = art?.w ?? (kind === "desktop" ? 2880 : 1170);
      const ph = art?.h ?? (kind === "desktop" ? 1620 : 2069);
      const s = Math.max(W / pw, H / ph);
      return [(W - pw * s) / 2 + u * pw * s, (H - ph * s) / 2 + v * ph * s];
    };

    const place = () => {
      // camera: dolly in + crane, plus pointer parallax
      const scale = 1 + 0.12 * p;
      const drift = -H * 0.035 * p;
      camera.style.transform = `translate3d(${(px * -8).toFixed(2)}px, ${(drift + py * -6).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const pwScale = map(1, 0)[0] - map(0, 0)[0];

      // breathing shafts, laid over the plate's own beams
      for (const sh of SHAFTS[kind]) {
        const breathe = 0.5 + 0.5 * Math.sin(t * 0.5 + sh.phase);
        const a = 0.035 + 0.075 * breathe;
        const [ax, ay] = map(sh.lamp[0], sh.lamp[1]);
        const [fx, fy] = map(sh.floor[0], sh.floor[1]);
        const half = sh.spread * pwScale;
        const g = ctx.createLinearGradient(ax, ay, fx, fy);
        g.addColorStop(0, amber(a * 1.4));
        g.addColorStop(0.6, amber(a * 0.55));
        g.addColorStop(1, amber(0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ax - 6, ay);
        ctx.lineTo(ax + 6, ay);
        ctx.lineTo(fx + half, fy);
        ctx.lineTo(fx - half, fy);
        ctx.closePath();
        ctx.fill();
      }

      // haze drifting across the stage
      for (let i = 0; i < 3; i++) {
        const cx = W * (0.5 + 0.42 * Math.sin(t * 0.045 + i * 2.3));
        const cy = H * (0.52 + 0.08 * Math.cos(t * 0.06 + i * 1.3));
        const r = Math.max(W, H) * (0.28 + i * 0.08);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, amber(0.045));
        g.addColorStop(1, amber(0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // dust hanging in the beams
      const shafts = SHAFTS[kind];
      for (const d of dust) {
        const sh = shafts[d.k % shafts.length];
        const along = (d.s + t * 0.006) % 1;
        const [ax, ay] = map(sh.lamp[0], sh.lamp[1]);
        const [fx, fy] = map(sh.floor[0], sh.floor[1]);
        const across = (d.a - 0.5) * 2 * sh.spread * pwScale * along;
        const x = ax + (fx - ax) * along + across + Math.sin(t * 0.4 + d.f) * 4;
        const y = ay + (fy - ay) * along;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + d.f);
        ctx.fillStyle = amber(0.25 + 0.4 * tw);
        ctx.fillRect(x, y, 2, 2);
      }

      // a soft key light that follows the pointer
      if (kind === "desktop") {
        const cx = lx * W;
        const cy = ly * H;
        const r = Math.min(W, H) * 0.42;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, amber(0.07));
        g.addColorStop(1, amber(0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    let lastAt = 0;
    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (now - lastAt < 32) return;
      lastAt = now;
      p += (target - p) * 0.12;
      lx += (tx - lx) * 0.06;
      ly += (ty - ly) * 0.06;
      t += 1 / 30;
      place();
      draw();
    };
    const still = () => {
      p = target;
      place();
      draw();
    };

    const onScroll = reduced
      ? () => {
          readScroll();
          still();
        }
      : readScroll;
    const onResize = () => {
      resize();
      readScroll();
      if (reduced) still();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX / W;
      ty = e.clientY / H;
      px = tx * 2 - 1;
      py = ty * 2 - 1;
    };

    resize();
    readScroll();
    if (reduced) still();
    else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onPointer, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    wideQ.addEventListener("change", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      wideQ.removeEventListener("change", onResize);
    };
  }, []);

  const blurD = ART[PLATES.desktop]?.blur;
  const blurM = ART[PLATES.mobile]?.blur;

  return (
    <div aria-hidden="true" className="sx-world" data-world-layer="">
      <div ref={cam} className="sx-world__camera">
        {/* instant placeholders, one per breakpoint */}
        {blurD ? <span className="sx-world__blur sx-world__blur--d" style={{ backgroundImage: `url(${blurD})` }} /> : null}
        {blurM ? <span className="sx-world__blur sx-world__blur--m" style={{ backgroundImage: `url(${blurM})` }} /> : null}
        <picture>
          <source media="(min-width: 768px)" srcSet={PLATES.desktop} />
          <img
            src={PLATES.mobile}
            alt=""
            decoding="async"
            fetchPriority="low"
            className="sx-world__plate"
            data-on={loaded ? "" : undefined}
            onLoad={() => setLoaded(true)}
            ref={(img) => {
              if (img?.complete && img.naturalWidth > 0 && !loaded) setLoaded(true);
            }}
          />
        </picture>
        <canvas ref={cvs} className="sx-world__air" />
      </div>
      {/* keeps the calm centre calm: a soft neutral falloff, no hue */}
      <span className="sx-world__vignette" />
    </div>
  );
}

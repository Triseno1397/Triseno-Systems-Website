"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import WorldPlate from "@/components/world/WorldPlate";
import { plate as plateFor } from "@/components/world/plates";
import { platePose, plateTransform, type PlatePose } from "@/components/world/plateMotion";

/* ─────────────────────────────────────────────────────────────────────────
   /studio — THE WORLD (design-loop/world-plates.md). A night film soundstage:
   sodium-amber shafts falling through haze from the rigging onto a wet floor,
   light stands and a crane at the edges, a calm dark centre. One fixed layer
   behind the whole page — the iris hero opens into it, and the filmstrip,
   the contact sheet and the testimonial wall all sit on this stage.

   The plate itself is the shared WorldPlate (world-plates.md): its camera
   (scroll push-in, pointer parallax), placeholder, pointer light and dust.
   Every GlassPanel on the page paints a pre-blurred copy of the same plate
   on the same pose model, so the glass always lines up with the stage.

   On top, this page's own air, locked to that same pose every frame:
   · each of the plate's four shafts breathes, out of phase;
   · haze drifts through the beams; dust hangs in them.
   A transparent half-resolution canvas; transform / opacity only.
   ───────────────────────────────────────────────────────────────────────── */

const PLATE = plateFor("creative");
type Kind = "desktop" | "mobile";
const SIZE = { desktop: [2880, 1620], mobile: [1170, 2069] } as const;

/** The plate's lamps and where their shafts land, in plate-normalised coords. */
interface Shaft {
  lamp: [number, number];
  floor: [number, number];
  /** half-width of the beam where it meets the floor, as a fraction of plate width */
  spread: number;
  phase: number;
}
const SHAFTS: Record<Kind, Shaft[]> = {
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

export default function StudioBackdrop() {
  const cam = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);

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
    let kind: Kind = "desktop";
    let t = 0;
    let raf = 0;
    let alive = true;

    // deterministic dust
    let seed = 11;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const dust = Array.from({ length: 70 }, () => ({ s: rnd(), a: rnd(), k: Math.floor(rnd() * 4), f: rnd() * 6.28 }));

    // the air layer is laid out exactly like WorldPlate's camera: 104% of the
    // viewport, the plate covering it about its horizon line
    const resize = () => {
      W = camera.clientWidth || window.innerWidth;
      H = camera.clientHeight || window.innerHeight;
      kind = wideQ.matches ? "desktop" : "mobile";
      canvas.width = Math.max(1, Math.round(W * SCALE));
      canvas.height = Math.max(1, Math.round(H * SCALE));
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    };

    /** plate coords -> screen coords, for an object-fit: cover plate */
    const map = (u: number, v: number): [number, number] => {
      const [pw, ph] = SIZE[kind];
      const oy = PLATE.horizon[kind];
      const s = Math.max(W / pw, H / ph);
      return [(W - pw * s) / 2 + u * pw * s, (H - ph * s) * oy + v * ph * s];
    };

    // same pose model and same clock as WorldPlate and every GlassPanel
    const pose: PlatePose = { tx: 0, ty: 0, s: 1 };
    let lastPose = "";
    const place = () => {
      const tr = plateTransform(platePose(pose));
      if (tr !== lastPose) {
        lastPose = tr;
        camera.style.transform = tr;
      }
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

      ctx.globalCompositeOperation = "source-over";
    };

    // the air redraws at 30fps; its pose follows the plate on the GSAP ticker
    let lastAt = 0;
    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (now - lastAt < 32) return;
      lastAt = now;
      t += 1 / 30;
      draw();
    };
    const onResize = () => {
      resize();
      place();
      draw();
    };

    resize();
    place();
    draw();
    gsap.ticker.add(place);
    if (!reduced) raf = requestAnimationFrame(loop);
    window.addEventListener("resize", onResize);
    wideQ.addEventListener("change", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      gsap.ticker.remove(place);
      window.removeEventListener("resize", onResize);
      wideQ.removeEventListener("change", onResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="sx-world" data-world-layer="">
      {/* camera stations: further into the soundstage at Behind the studio,
          arriving at the hero spotlight pool as the gate enters */}
      <WorldPlate world="creative" stations={[0, '[data-rail="Behind"]', '[data-rail="Gate"]']} />
      {/* this page's air over the plate, on the plate's own camera */}
      <div ref={cam} className="sx-world__air-cam">
        <canvas ref={cvs} className="sx-world__air" />
      </div>
    </div>
  );
}

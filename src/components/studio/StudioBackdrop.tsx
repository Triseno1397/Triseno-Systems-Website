"use client";

import { useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   /studio — THE WORLD. One fixed, continuously rendered scene that runs
   behind every section of the page, so the page is a camera move through a
   lit soundstage rather than a stack of black document blocks (bar.md 1, 3).

   It is a rendered scene, not a DOM background: the canvas draws a stage
   floor in perspective, two key-light shafts, the light pool they throw, the
   division's aperture standing on the floor, haze and dust. Page scroll is
   the camera: it dollies forward, cranes, and yaws, so no two scroll
   positions frame the stage the same way, and sections never hard-cut —
   they arrive inside the same continuous move.

   Hue (amber) only ever appears here as scene light (design-system §2). The
   DOM behind it stays true black.

   NOTE FOR THE FOUNDATION: this is a single, self-contained element mounted
   once at the top of StudioWorld. When `DivisionWorld` lands it replaces this
   file wholesale — nothing else on the page reads from it.
   ───────────────────────────────────────────────────────────────────────── */

const BLADES = 6;
const amber = (a: number) => `rgba(255, 138, 61, ${a})`;
const white = (a: number) => `rgba(255, 255, 255, ${a})`;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

interface Mote {
  u: number;
  z: number;
  drift: number;
}

export default function StudioBackdrop() {
  const cvs = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cvs.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let target = 0;
    let p = 0;
    let t = 0;
    let raf = 0;
    let alive = true;

    // Deterministic motes: same world on every load, no hydration mismatch.
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const motes: Mote[] = Array.from({ length: 48 }, () => ({
      u: rnd() * 2 - 1,
      z: 0.6 + rnd() * 9,
      drift: rnd() * Math.PI * 2,
    }));

    // The scene is light, haze and hairlines of light — it is rendered below
    // display resolution and scaled up, which costs a third of the fill rate
    // and softens the beams the way a real lens would.
    const SCALE = 0.55;
    let vignette: HTMLCanvasElement | null = null;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.max(1, Math.round(W * SCALE));
      canvas.height = Math.max(1, Math.round(H * SCALE));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

      // The vignette never changes, so it is baked once and composited.
      const v = vignette ?? document.createElement("canvas");
      v.width = canvas.width;
      v.height = canvas.height;
      const vc = v.getContext("2d");
      if (vc) {
        vc.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        // Sized off the diagonal so a tall phone viewport is not crushed to black.
        const d = Math.hypot(W, H);
        const g = vc.createRadialGradient(W / 2, H * 0.5, d * 0.22, W / 2, H * 0.5, d * 0.74);
        g.addColorStop(0, "rgba(0, 0, 0, 0)");
        g.addColorStop(1, "rgba(0, 0, 0, 0.78)");
        vc.fillStyle = g;
        vc.fillRect(0, 0, W, H);
      }
      vignette = v;
    };

    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? clamp01(window.scrollY / max) : 0;
    };

    /** A light shaft falling from an off-frame softbox onto the stage floor. */
    const shaft = (apexX: number, baseX: number, spread: number, floorY: number, strength: number) => {
      const g = ctx.createLinearGradient(apexX, -H * 0.25, baseX, floorY);
      g.addColorStop(0, amber(strength));
      g.addColorStop(0.55, amber(strength * 0.4));
      g.addColorStop(1, amber(0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(apexX - W * 0.035, -H * 0.25);
      ctx.lineTo(apexX + W * 0.035, -H * 0.25);
      ctx.lineTo(baseX + spread, floorY);
      ctx.lineTo(baseX - spread, floorY);
      ctx.closePath();
      ctx.fill();
    };

    const draw = () => {
      const fy = H * 0.34; // floor foreshortening
      const fx = W * 0.5;
      const hy = H * (0.66 - 0.17 * p); // the camera cranes as the page travels
      const vx = W * (0.5 + 0.17 * Math.sin(p * 5.1 + 0.4)); // and yaws across the stage
      const travel = p * 30 + t * 0.05;

      ctx.clearRect(0, 0, W, H);

      // ── far light: the key throwing off the back of the stage ──
      const back = ctx.createRadialGradient(vx, hy, 0, vx, hy, Math.max(W, H) * 0.56);
      back.addColorStop(0, amber(0.28));
      back.addColorStop(0.2, amber(0.075));
      back.addColorStop(0.55, amber(0.015));
      back.addColorStop(1, amber(0));
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = "lighter";

      // ── two shafts, swung by the same camera yaw ──
      shaft(vx - W * 0.34, vx - W * 0.16, W * 0.2, hy + fy * 0.7, 0.05);
      shaft(vx + W * 0.42, vx + W * 0.22, W * 0.26, hy + fy * 0.55, 0.035);

      // ── the pool of light the shafts leave on the floor ──
      const pool = ctx.createRadialGradient(vx, hy + fy * 0.26, 0, vx, hy + fy * 0.26, W * 0.52);
      pool.addColorStop(0, amber(0.16));
      pool.addColorStop(0.45, amber(0.05));
      pool.addColorStop(1, amber(0));
      ctx.save();
      ctx.translate(vx, hy + fy * 0.26);
      ctx.scale(1, 0.3);
      ctx.translate(-vx, -(hy + fy * 0.26));
      ctx.fillStyle = pool;
      ctx.fillRect(-W, hy - H, W * 3, H * 3);
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";

      // ── the floor: depth ribs sliding toward the camera as it dollies ──
      ctx.lineWidth = 1 / SCALE;
      for (let i = 1; i <= 26; i++) {
        const z = i - (travel % 1);
        if (z <= 0.35) continue;
        const y = hy + fy / z;
        if (y > H + 2) continue;
        ctx.strokeStyle = white(0.075 / Math.pow(z, 0.62));
        ctx.beginPath();
        ctx.moveTo(Math.max(-10, vx - (fx * 3) / z), y);
        ctx.lineTo(Math.min(W + 10, vx + (fx * 3) / z), y);
        ctx.stroke();
      }
      // ── and the rails running to the vanishing point ──
      ctx.strokeStyle = white(0.04);
      ctx.beginPath();
      for (let u = -5; u <= 5; u++) {
        if (u === 0) continue;
        ctx.moveTo(vx, hy);
        ctx.lineTo(vx + (u * fx) / 0.4, hy + fy / 0.4);
      }
      ctx.stroke();

      // ── the signature object: the aperture standing on the stage ──
      const ringR = H * (0.15 + 0.2 * p);
      const ringY = hy - H * 0.05;
      const open = 0.24 + 0.62 * p;
      const k = ringR * (0.14 + 0.66 * open);
      const twist = (1 - open) * 0.9 - Math.PI / 2 + t * 0.012;
      ctx.save();
      ctx.shadowColor = amber(0.55);
      ctx.shadowBlur = 26 * SCALE;
      ctx.strokeStyle = white(0.17);
      ctx.lineWidth = 1 / SCALE;
      ctx.beginPath();
      ctx.arc(vx, ringY, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = white(0.11);
      ctx.beginPath();
      for (let i = 0; i < BLADES; i++) {
        const a0 = twist + (i / BLADES) * Math.PI * 2;
        const a1 = twist + ((i + 1) / BLADES) * Math.PI * 2;
        const x0 = Math.cos(a0) * k;
        const y0 = Math.sin(a0) * k;
        const x1 = Math.cos(a1) * k;
        const y1 = Math.sin(a1) * k;
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const dx = (x1 - x0) / len;
        const dy = (y1 - y0) / len;
        const b = x0 * dx + y0 * dy;
        const s = -b + Math.sqrt(Math.max(0, b * b - (x0 * x0 + y0 * y0 - ringR * ringR)));
        ctx.moveTo(vx + x0, ringY + y0);
        ctx.lineTo(vx + x0 + dx * s, ringY + y0 + dy * s);
      }
      ctx.stroke();
      ctx.restore();

      // ── haze drifting through the shafts ──
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const cx = vx + Math.sin(t * 0.07 + i * 2.1) * W * 0.3;
        const cy = hy + Math.cos(t * 0.05 + i * 1.7) * H * 0.16 - H * 0.04;
        const r = H * (0.3 + i * 0.16);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, white(0.022));
        g.addColorStop(1, white(0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // ── dust in the beam ──
      for (const m of motes) {
        const z = ((m.z - travel * 0.5) % 10 + 10) % 10 + 0.5;
        const x = vx + (m.u * fx) / z + Math.sin(t * 0.3 + m.drift) * (6 / z);
        const y = hy + (fy * 0.7) / z - (H * 0.12) / z;
        if (y > H || x < -20 || x > W + 20) continue;
        ctx.fillStyle = amber(Math.min(0.5, 0.11 / z) * (0.6 + 0.4 * Math.sin(t * 0.9 + m.drift)));
        ctx.fillRect(x, y, 1.4, 1.4);
      }
      ctx.globalCompositeOperation = "source-over";

      // ── lens vignette, so type always has a dark field to sit on ──
      if (vignette) ctx.drawImage(vignette, 0, 0, W, H);
    };

    const still = () => {
      p = target;
      draw();
    };

    // 30fps is plenty for haze and a dolly, and it halves the cost.
    let lastAt = 0;
    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (now - lastAt < 32) return;
      lastAt = now;
      p += (target - p) * 0.14;
      t += 1 / 30;
      draw();
    };

    const onResize = () => {
      resize();
      readScroll();
      if (reduced) still();
    };

    // M5: reduced motion keeps the camera tied to the scroll position (which is
    // scrubbed, not jacked) but drops every idle animation.
    const onScroll = reduced
      ? () => {
          readScroll();
          still();
        }
      : readScroll;

    resize();
    readScroll();
    if (reduced) still();
    else raf = requestAnimationFrame(loop);
    // The canvas is a scaled-up low-resolution render; the browser's own
    // smoothing is what turns the beams into light rather than bands.
    canvas.style.imageRendering = "auto";
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={cvs} aria-hidden="true" className="sx-world" />;
}

"use client";

import { useEffect, useRef } from "react";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";

const KINDS: GlyphKind[] = ["circle", "square", "triangle"];
const OUTLINE = KINDS.map((k) => glyphPoints(k, 48));

/**
 * Triseno beams with collision.
 *
 * Inspired by the 21st.dev "background beams with collision", rebuilt from
 * scratch and made Triseno's own: it is light raining onto the portal's wet
 * floor. Soft shafts of white light fall to a floor line (which the portal pins
 * to the real 3D floor under the gate object); where a shaft lands it throws a
 * ripple across the floor in the shape of one of the three division glyphs
 * (circle / square / triangle, laid flat in perspective) and a short spray of
 * light. Each shaft mirrors faintly below the line, like everything else in
 * this world. White only — the portal is achromatic. Single 2D canvas; runs
 * only while on screen AND while its layer is actually shown — the portal keeps
 * it mounted in a fixed full-screen layer and fades it in near the gate, and an
 * IntersectionObserver alone would have it drawing behind a hidden layer for
 * the whole page. Static frame for reduced motion.
 */

interface BeamsCollisionProps {
  /** Where the floor line sits, as a fraction of the canvas height. */
  floor?: number;
  /** Live floor position (fraction of canvas height); wins over `floor` when given. */
  getFloor?: () => number;
  /** Horizontal band the shafts may fall in, as fractions of the width. Default: full width. */
  xRange?: [number, number];
  /** Draw the 1px floor line (default true). Off when a rendered floor is already there. */
  floorLine?: boolean;
  /** False while the layer holding it is faded out — the loop parks. */
  active?: boolean;
  className?: string;
}

interface Beam {
  x: number; // 0..1 of width
  y: number; // head position, px
  len: number;
  speed: number; // px / s
  width: number;
  wait: number; // seconds until it starts falling again
  kind: number; // index into KINDS
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: number;
  rot: number;
  spin: number;
}

interface Ripple {
  x: number;
  life: number;
  max: number;
  kind: number;
}

export default function BeamsCollision({
  floor = 0.8,
  getFloor,
  xRange,
  floorLine = true,
  className = "",
  active = true,
}: BeamsCollisionProps) {
  const getFloorRef = useRef(getFloor);
  // the loop's handles, so showing or hiding the layer parks it in place
  const run = useRef<{ start: () => void; stop: () => void } | null>(null);
  const activeRef = useRef(active);
  const onScreen = useRef(false);
  useEffect(() => {
    getFloorRef.current = getFloor;
  }, [getFloor]);
  const x0 = xRange?.[0] ?? 0;
  const x1 = xRange?.[1] ?? 1;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const host = canvas?.parentElement;
    if (!canvas || !ctx || !host) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // phones: 1.5x is indistinguishable for thin light lines and draws about
    // half the pixels of a 2-3x screen every frame
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    let w = 0;
    let h = 0;
    let floorY = 0;
    let beams: Beam[] = [];
    const sparks: Spark[] = [];
    const ripples: Ripple[] = [];

    // A falling shaft is the same picture every frame, only longer or shorter,
    // so it is drawn once into a small sprite and stamped from then on.
    // Rebuilding its gradients per beam per frame was the most expensive thing
    // on this canvas, and on a phone it showed.
    const SHAFT_W = 8; // css px: a 1px core inside a 7px glow
    const sprite = (paint: (g: CanvasRenderingContext2D, W: number, H: number) => void) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(SHAFT_W * dpr));
      c.height = Math.max(1, Math.round(256 * dpr));
      const g = c.getContext("2d");
      if (g) paint(g, c.width, c.height);
      return c;
    };
    const core = Math.max(1, Math.round(dpr));
    const shaft = sprite((g, W, H) => {
      const glow = g.createLinearGradient(0, 0, 0, H);
      glow.addColorStop(0, "rgba(255,255,255,0)");
      glow.addColorStop(1, "rgba(255,255,255,0.14)");
      g.fillStyle = glow;
      g.fillRect(Math.round((W - 7 * dpr) / 2), 0, Math.round(7 * dpr), H);
      const line = g.createLinearGradient(0, 0, 0, H);
      line.addColorStop(0, "rgba(255,255,255,0)");
      line.addColorStop(1, "rgba(255,255,255,0.95)");
      g.fillStyle = line;
      g.fillRect(Math.round(W / 2 - core / 2), 0, core, H);
    });
    // the same shaft mirrored in the wet floor, fading downward
    const mirror = sprite((g, W, H) => {
      const line = g.createLinearGradient(0, 0, 0, H);
      line.addColorStop(0, "rgba(255,255,255,0.22)");
      line.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = line;
      g.fillRect(Math.round(W / 2 - core / 2), 0, core, H);
    });
    // the floor line only changes with the canvas width
    let lineGrad: CanvasGradient | null = null;
    let lineGradW = -1;

    const seed = () => {
      const count = Math.max(
        4,
        Math.min(13, Math.round((w * (x1 - x0)) / 130)),
      );
      beams = Array.from({ length: count }, (_, i) => ({
        x:
          x0 +
          (x1 - x0) *
            ((i + 0.5) / count + (Math.random() - 0.5) * (0.6 / count)),
        y: reduced
          ? floorY * (0.25 + Math.random() * 0.6)
          : Math.random() * floorY * 0.9,
        len: 90 + Math.random() * 180,
        speed: 240 + Math.random() * 380,
        width: 1,
        wait: reduced ? 0 : Math.random() * 1.2,
        kind: i % KINDS.length,
      }));
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      w = r.width;
      h = r.height;
      floorY = Math.round(h * floor) + 0.5;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      seed();
      if (reduced) draw(0);
    };

    /** Stroke a glyph outline centred on (x, y). sy < 1 lays it down on the floor. */
    const strokeGlyph = (
      kind: number,
      x: number,
      y: number,
      r: number,
      sy: number,
      rot: number,
    ) => {
      if (!ctx) return;
      const pts = OUTLINE[kind];
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const k = (i % 48) * 2;
        const px = pts[k] * c - pts[k + 1] * s;
        const py = pts[k] * s + pts[k + 1] * c;
        if (i === 0) ctx.moveTo(x + px * r, y - py * r * sy);
        else ctx.lineTo(x + px * r, y - py * r * sy);
      }
      ctx.stroke();
    };

    const burst = (x: number, kind: number) => {
      const n = 7 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const v = 80 + Math.random() * 260;
        const max = 0.7 + Math.random() * 0.8;
        sparks.push({
          x,
          y: floorY - 1,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: max,
          max,
          size: 1 + Math.random() * 1.2,
          kind,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 9,
        });
      }
      ripples.push({ x, life: 1.4, max: 1.4, kind });
    };

    function draw(dt: number) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const live = getFloorRef.current?.();
      if (typeof live === "number") floorY = Math.round(h * live) + 0.5;

      // floor line, fading out toward both edges
      if (floorLine) {
        if (!lineGrad || lineGradW !== w) {
          lineGrad = ctx.createLinearGradient(0, 0, w, 0);
          lineGrad.addColorStop(0, "rgba(255,255,255,0)");
          lineGrad.addColorStop(0.18, "rgba(255,255,255,0.9)");
          lineGrad.addColorStop(0.82, "rgba(255,255,255,0.9)");
          lineGrad.addColorStop(1, "rgba(255,255,255,0)");
          lineGradW = w;
        }
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.stroke();
      }

      for (const b of beams) {
        if (b.wait > 0) {
          b.wait -= dt;
          continue;
        }
        b.y += b.speed * dt;
        const x = Math.round(b.x * w);
        const head = Math.min(b.y, floorY);
        const tail = Math.max(0, b.y - b.len);
        if (head > tail) {
          ctx.drawImage(shaft, x - SHAFT_W / 2, tail, SHAFT_W, head - tail);
          // faint mirror under the floor line — the ground here is wet
          const depth = Math.min(head - tail, h - floorY, 140);
          const near = floorY + (floorY - head);
          if (near < h && depth > 0) {
            ctx.drawImage(mirror, x - SHAFT_W / 2, near, SHAFT_W, depth);
          }
        }
        if (!reduced && b.y - b.len >= floorY) {
          b.y = -20;
          b.wait = 0.2 + Math.random() * 1.6;
          b.len = 90 + Math.random() * 180;
          b.speed = 240 + Math.random() * 380;
        } else if (!reduced && b.y >= floorY && b.y - b.speed * dt < floorY) {
          burst(x, b.kind);
        }
      }

      // glyph-shaped ripples spreading across the floor from each impact
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life -= dt;
        if (r.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        const k = 1 - r.life / r.max; // 0 -> 1
        const e = 1 - Math.pow(1 - k, 3);
        ctx.lineWidth = 1;
        for (let ring = 0; ring < 2; ring++) {
          const rk = Math.max(0, e - ring * 0.22);
          if (rk <= 0) continue;
          ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * (ring === 0 ? 0.9 : 0.45)})`;
          strokeGlyph(r.kind, r.x, floorY, 8 + rk * 110, 0.22, 0);
        }
        const glow = ctx.createRadialGradient(
          r.x,
          floorY,
          0,
          r.x,
          floorY,
          40 + e * 60,
        );
        glow.addColorStop(0, `rgba(255,255,255,${0.5 * (1 - k)})`);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(r.x - 110, floorY - 50, 220, 50);
      }

      // sparks are tiny spinning glyph outlines
      ctx.lineWidth = 1;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy += 520 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.spin * dt;
        if (s.y > floorY - s.size && s.vy > 0) {
          s.y = floorY - s.size;
          s.vy *= -0.32;
          s.vx *= 0.6;
          s.spin *= 0.5;
        }
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (s.life / s.max) * 1.4)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let raf = 0;
    let last = 0;
    let running = false;
    // On a phone this is background weather behind the gate, and drawing it
    // every frame costs more than it shows: half rate is indistinguishable for
    // falling light and leaves the scroll the whole budget.
    const minStep = coarse ? 1 / 32 : 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      if (dt < minStep) return;
      last = now;
      draw(dt);
    };
    const start = () => {
      if (running || reduced || !activeRef.current) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.isIntersecting;
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);
    run.current = { start, stop };

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      run.current = null;
    };
  }, [floor, x0, x1, floorLine]);

  // shown or hidden: park the loop rather than rebuild the canvas
  useEffect(() => {
    activeRef.current = active;
    if (active && onScreen.current) run.current?.start();
    if (!active) run.current?.stop();
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}

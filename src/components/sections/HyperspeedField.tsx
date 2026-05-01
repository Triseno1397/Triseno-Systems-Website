"use client";

/**
 * Star Trek-style hyperspeed warp field. Renders streaking stars from a
 * center vanishing point onto a <canvas> sized to its container.
 *
 * Driven by a ref (not state) so the parent can update intensity per-scroll
 * without triggering React re-renders. Each rAF tick reads the current
 * progress (0..1) and scales star speed, line thickness, trail length, and
 * cyan tint accordingly.
 *
 * 0   = a few sparse stars drifting
 * 0.4 = ambient acceleration, lines lengthening
 * 0.8 = clear hyperspeed
 * 1.0 = full warp snap
 */

import { useEffect, useRef } from "react";

interface Props {
  progressRef: React.MutableRefObject<number>;
  starCount?: number;
  /** Tag set on the <canvas> for any external styling hooks */
  className?: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
}

export default function HyperspeedField({
  progressRef,
  starCount,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const COUNT = starCount ?? (isMobile ? 220 : 420);
    const FOCAL = 220; // perspective focal length

    let stars: Star[] = [];
    let dpr = 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      stars = [];
      const spread = Math.max(width, height);
      for (let i = 0; i < COUNT; i++) {
        const z = Math.random() * spread;
        stars.push({
          x: (Math.random() - 0.5) * spread * 2,
          y: (Math.random() - 0.5) * spread * 2,
          z,
          pz: z,
        });
      }
    };

    resize();
    seed();

    let rafId = 0;
    const loop = () => {
      const p = Math.max(0, Math.min(1, progressRef.current));

      // Trail effect: lower fade alpha at higher speed = longer streaks.
      const fadeAlpha = Math.max(0.06, 0.32 - p * 0.26);
      ctx.fillStyle = `rgba(5, 8, 16, ${fadeAlpha})`;
      ctx.fillRect(0, 0, width, height);

      const speed = 0.4 + p * 36;
      const cx = width / 2;
      const cy = height / 2;
      const spread = Math.max(width, height);

      ctx.lineCap = "round";

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed;
        if (s.z <= 1) {
          s.x = (Math.random() - 0.5) * spread * 2;
          s.y = (Math.random() - 0.5) * spread * 2;
          s.z = spread;
          s.pz = spread;
          continue;
        }

        const sx = (s.x / s.z) * FOCAL + cx;
        const sy = (s.y / s.z) * FOCAL + cy;
        const px = (s.x / s.pz) * FOCAL + cx;
        const py = (s.y / s.pz) * FOCAL + cy;

        // Skip stars whose tail and head are both off-canvas.
        if (
          (sx < -16 && px < -16) ||
          (sx > width + 16 && px > width + 16) ||
          (sy < -16 && py < -16) ||
          (sy > height + 16 && py > height + 16)
        ) {
          continue;
        }

        // Closer stars draw thicker; warp progress widens lines further.
        const proximity = 1 - s.z / spread;
        const lw = Math.max(0.4, proximity * (1.6 + p * 2.2));
        ctx.lineWidth = lw;

        // Color: cool white core, shifting toward cyan as it streaks
        // and as warp progress increases.
        const tailLen = Math.hypot(sx - px, sy - py);
        const heatBoost = Math.min(1, tailLen / 80) * 0.5 + p * 0.5;
        const r = Math.round(220 - heatBoost * 60);
        const g = Math.round(238 - heatBoost * 30);
        const b = 255;
        const alpha = Math.min(1, 0.35 + proximity * 0.6 + p * 0.25);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [progressRef, starCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

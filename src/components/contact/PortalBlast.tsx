"use client";

/**
 * PortalBlast — the climax of the /contact easter egg.
 *
 * A real-time canvas hyperspeed warp. When the dragged emblem collapses the
 * stationary one into a singularity, this overlay detonates it: a field of
 * stars accelerates out of the collapse point toward the viewer, drawn with
 * additive blending and frame-persistence so each one smears into a glowing
 * motion-blur streak (the same hyperspeed language as the homepage hero),
 * then the whole field blows out to white and that white-out carries across
 * the navigation into /web-design.
 *
 * The warp emanates from the exact screen point where the singularity formed
 * (passed in as `origin`) via a perspective projection, so the explosion is
 * anchored to the emblem, not the middle of the page.
 *
 * Snappy by design — the full sequence is ~0.5s. Navigation fires the instant
 * the screen is blown out, so the user never waits on a bright frame. The old
 * document stays painted until /web-design's curtain (the same bloom,
 * dissolving) takes over — see PageCurtain.
 *
 * prefers-reduced-motion skips the warp entirely: a calm bloom fade, no
 * acceleration, streaking, or strobe.
 */

import { useEffect, useRef } from "react";

/**
 * Reduced-motion fallback bloom + the look the canvas blows out to. Kept in
 * sync with PageCurtain's arrival bloom so the white-out carries seamlessly
 * across the navigation. If you retune one, retune the other.
 */
const PORTAL_BLOOM =
  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.99) 0%, rgba(231,250,255,0.98) 34%, rgba(110,224,255,0.92) 62%, rgba(36,118,178,0.6) 82%, rgba(8,12,22,0.4) 100%)";

type Props = {
  origin: { x: number; y: number } | null;
  onNavigate: () => void;
};

type Star = {
  x: number;
  y: number;
  z: number;
  pz: number;
  r: number;
  g: number;
  b: number;
};

export default function PortalBlast({ origin, onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const navFired = useRef(false);

  useEffect(() => {
    const fireNav = () => {
      if (navFired.current) return;
      navFired.current = true;
      onNavigate();
    };

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Reduced motion: calm bloom fade, no warp. Nothing accelerates or strobes.
    if (reduce) {
      const bloom = bloomRef.current;
      if (bloom) {
        requestAnimationFrame(() => {
          bloom.style.opacity = "1";
        });
      }
      const t = window.setTimeout(fireNav, 300);
      return () => window.clearTimeout(t);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      const t = window.setTimeout(fireNav, 200);
      return () => window.clearTimeout(t);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.scale(dpr, dpr);

    const ox = origin ? origin.x : vw / 2;
    const oy = origin ? origin.y : vh / 2;
    const maxDim = Math.max(vw, vh);
    const focal = maxDim * 0.5;
    const isMobile = vw < 768;
    const COUNT = isMobile ? 280 : 560;

    const rnd = Math.random;
    // Mostly cyan, with a minority of white-blue and a few purple beams for
    // chromatic energy (echoes the hero's chromatic-aberration look).
    const tint = (): [number, number, number] => {
      const k = rnd();
      if (k < 0.08) return [157, 92, 255];
      if (k < 0.22) return [180, 216, 255];
      return [0, 229, 255];
    };

    const stars: Star[] = [];
    for (let i = 0; i < COUNT; i++) {
      const [r, g, b] = tint();
      const z = 0.08 + rnd() * 0.92;
      stars.push({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z, pz: z, r, g, b });
    }

    // Timing (ms). Snappy: warp accelerates → detonation blast (shockwave +
    // core + velocity surge) → white-out flash overtakes → nav the instant the
    // screen is blown out.
    const WARP_MS = 360;
    const BLAST_START = 230;
    const BLAST_MS = 220;
    const FLASH_START = 380;
    const FLASH_MS = 200;
    const NAV_MS = 540;
    const TOTAL = 590;
    const SPEED_MIN = 0.12;
    const SPEED_MAX = 4.4;
    const SURGE = 7; // velocity kick at detonation — streaks lurch outward

    const vignette = ctx.createRadialGradient(
      ox,
      oy,
      maxDim * 0.08,
      ox,
      oy,
      maxDim * 0.78
    );
    vignette.addColorStop(0, "rgba(5,8,16,0)");
    vignette.addColorStop(1, "rgba(5,8,16,0.55)");

    let startTs = 0;
    let lastTs = 0;
    let raf = 0;

    const frame = (ts: number) => {
      if (!startTs) {
        startTs = ts;
        lastTs = ts;
      }
      const t = ts - startTs;
      let dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.033) dt = 0.033;

      const wp = Math.min(1, t / WARP_MS);
      const accel = wp * wp * wp; // cubic-in: slow wind-up, explosive release
      const bright = 0.35 + 0.65 * Math.min(1, t / (WARP_MS * 0.9));

      // Detonation envelope — a 0→1→0 pulse over the blast window. Drives the
      // velocity surge, the longer streaks, the shockwave, and the core bloom.
      const bp = (t - BLAST_START) / BLAST_MS;
      const blastEnv = bp > 0 && bp < 1 ? Math.sin(bp * Math.PI) : 0;
      const speed =
        SPEED_MIN + (SPEED_MAX - SPEED_MIN) * accel + SURGE * blastEnv;

      // Frame persistence → motion-blur trails. Less fade at higher speed and
      // through the blast = longer streaks. Also dims the page into tunnel black.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(5,8,16,${Math.max(0.05, 0.34 - 0.2 * accel - 0.14 * blastEnv)})`;
      ctx.fillRect(0, 0, vw, vh);

      ctx.globalAlpha = 0.6;
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;

      // Stars — additive so overlapping cores blow to white naturally.
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed * dt;
        if (s.z < 0.05) {
          s.x = rnd() * 2 - 1;
          s.y = rnd() * 2 - 1;
          s.z = 0.6 + rnd() * 0.4;
          s.pz = s.z;
          continue;
        }
        const sx = ox + (s.x / s.z) * focal;
        const sy = oy + (s.y / s.z) * focal;
        const px = ox + (s.x / s.pz) * focal;
        const py = oy + (s.y / s.pz) * focal;
        const close = 1 - s.z;
        ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${Math.min(1, close * 1.3) * bright})`;
        ctx.lineWidth = Math.max(0.5, close * close * 3.4 + 0.4);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";

      // ── Detonation blast — shockwave rings + core bloom, right before the
      //    flash. This is the explosive beat the warp builds toward.
      if (t >= BLAST_START && t < FLASH_START + BLAST_MS) {
        ctx.globalCompositeOperation = "lighter";

        // Core detonation bloom — a white-hot ball swelling out of the point.
        const coreR =
          (1 - Math.pow(1 - Math.min(1, Math.max(0, bp)), 2)) * maxDim * 0.5;
        if (coreR > 1) {
          const cg = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreR);
          cg.addColorStop(0, `rgba(255,255,255,${0.9 * blastEnv})`);
          cg.addColorStop(0.35, `rgba(150,240,255,${0.65 * blastEnv})`);
          cg.addColorStop(1, "rgba(0,229,255,0)");
          ctx.fillStyle = cg;
          ctx.fillRect(0, 0, vw, vh);
        }

        // Shockwave rings — bright edges that burst outward and fade. Two,
        // staggered, for a layered concussion.
        const drawRing = (rp: number) => {
          if (rp <= 0 || rp >= 1) return;
          const radius = (1 - Math.pow(1 - rp, 3)) * maxDim * 1.25;
          const fade = 1 - rp;
          ctx.strokeStyle = `rgba(0,229,255,${0.22 * fade})`;
          ctx.lineWidth = 36 * fade + 6;
          ctx.beginPath();
          ctx.arc(ox, oy, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(236,250,255,${0.95 * fade})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ox, oy, radius * 1.02, 0, Math.PI * 2);
          ctx.stroke();
        };
        drawRing(bp);
        drawRing((t - BLAST_START - 70) / BLAST_MS);

        ctx.globalCompositeOperation = "source-over";
      }

      // White-out punch — overtakes the warp and flattens to near-uniform
      // white so the seam across navigation is invisible.
      if (t >= FLASH_START) {
        const fp = Math.min(1, (t - FLASH_START) / FLASH_MS);
        const e = 1 - Math.pow(1 - fp, 3); // easeOutCubic
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, maxDim * 0.95);
        g.addColorStop(0, `rgba(255,255,255,${e})`);
        g.addColorStop(0.4, `rgba(231,250,255,${e})`);
        g.addColorStop(1, `rgba(110,224,255,${e * 0.85})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vw, vh);
        ctx.fillStyle = `rgba(236,250,255,${e * 0.82})`;
        ctx.fillRect(0, 0, vw, vh);
      }

      if (t >= NAV_MS) fireNav();
      if (t < TOTAL) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[200]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Reduced-motion fallback only — the canvas stays empty in that path. */}
      <div
        ref={bloomRef}
        className="absolute inset-0"
        style={{
          background: PORTAL_BLOOM,
          opacity: 0,
          transition: "opacity 280ms ease-out",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The warp tunnel's picture, and its clock. Shared by the worker that draws
   it off the main thread (warp.worker.ts) and, where a browser cannot hand a
   canvas to a worker, by WarpProvider itself.

   Cheap by construction: the streaks are bucketed by brightness and width and
   stroked as a handful of paths (not one stroke per streak, 720 a frame), the
   hue bloom is painted once into a small canvas and stretched, and nothing
   builds a gradient or a colour string inside the loop beyond one per bucket.
   ───────────────────────────────────────────────────────────────────────── */

export const T_IN = 520; // cover ramps up (ease-out: ~97% by 360ms)
export const T_OUT = 800; // cover ramps down
const ALPHA_STEPS = 8;
const WIDTHS = [1, 2, 3.2];

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface TunnelSetup {
  hue: [number, number, number];
  /** the destination glyph's outline, 96 points (x, y pairs) */
  ring: Float32Array | number[];
  reduced: boolean;
  /** streak count */
  stars: number;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export interface Tunnel {
  /** advance by `step` ms of warp time and draw; `outAt` is the warp time the
   *  dissolve began (0 = not yet). Returns true once the dissolve is over. */
  frame(step: number, outAt: number): boolean;
  /** the warp time so far */
  time(): number;
}

export function createTunnel(ctx: Ctx2D, size: () => { w: number; h: number; dpr: number }, setup: TunnelSetup): Tunnel {
  const { hue, ring, reduced } = setup;
  const [hr, hg, hb] = hue;
  const n = setup.stars;
  // struct of arrays: no objects to chase per frame
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const sl = new Float32Array(n);
  const reseed = (i: number, z: number) => {
    sx[i] = (Math.random() * 2 - 1) * 1.6;
    sy[i] = (Math.random() * 2 - 1) * 1.6;
    sz[i] = z;
  };
  for (let i = 0; i < n; i++) {
    reseed(i, Math.random() * 0.95 + 0.05);
    sl[i] = 0.35 + Math.random() * 0.65;
  }

  // the bloom, painted once and stretched every frame
  const bloomCanvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement("canvas"), { width: 256, height: 256 });
  {
    const b = bloomCanvas.getContext("2d") as Ctx2D;
    const g = b.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, `rgba(${hr},${hg},${hb},0.42)`);
    g.addColorStop(0.35, `rgba(${hr},${hg},${hb},0.12)`);
    g.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
    b.fillStyle = g;
    b.fillRect(0, 0, 256, 256);
  }

  // the streak buckets: [alpha step][width] -> flat list of segment coords
  const buckets: number[][] = Array.from({ length: ALPHA_STEPS * WIDTHS.length }, () => []);
  const styles = Array.from({ length: ALPHA_STEPS }, (_, a) => `rgba(${hr},${hg},${hb},${((a + 0.5) / ALPHA_STEPS).toFixed(3)})`);
  const gateStyle = `rgb(${hr},${hg},${hb})`;

  let t = 0;
  return {
    time: () => t,
    frame(step, outAt) {
      t += step;
      const dt = Math.min(48, step) / 16.67;
      const { w, h, dpr } = size();
      const inK = clamp01(t / (reduced ? 400 : T_IN));
      const outK = outAt ? clamp01((t - outAt) / (reduced ? 450 : T_OUT)) : 0;
      // the cover closes fast and fully: the old page is gone, not ghosted,
      // by the time the tunnel is up to speed
      const cover = (1 - Math.pow(1 - inK, 3)) * (1 - easeInOutCubic(outK));
      const speed = reduced ? 0 : 0.0025 + 0.05 * easeInOutCubic(inK) * (1 - easeOutExpo(outK) * 0.94);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${cover.toFixed(4)})`;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.max(w, h) * 0.55;
      const r = scale * 0.9;
      ctx.globalAlpha = cover;
      ctx.drawImage(bloomCanvas as CanvasImageSource, cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;

      if (!reduced && cover > 0.002) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "butt";
        for (const b of buckets) b.length = 0;
        const half = scale * 0.5;
        for (let i = 0; i < n; i++) {
          const pz = sz[i];
          const z = pz - speed * dt;
          sz[i] = z;
          if (z <= 0.012) {
            reseed(i, 1);
            continue;
          }
          const x0 = cx + (sx[i] / pz) * half;
          const y0 = cy + (sy[i] / pz) * half;
          const x1 = cx + (sx[i] / z) * half;
          const y1 = cy + (sy[i] / z) * half;
          if ((x1 < -50 || x1 > w + 50 || y1 < -50 || y1 > h + 50) && (x0 < 0 || x0 > w || y0 < 0 || y0 > h)) continue;
          const a = clamp01(1.25 - z) * cover * sl[i];
          if (a < 0.02) continue;
          const lw = 0.6 + (1 - z) * 2.8;
          const wi = lw < 1.5 ? 0 : lw < 2.6 ? 1 : 2;
          const ai = Math.min(ALPHA_STEPS - 1, Math.floor(a * ALPHA_STEPS));
          buckets[ai * WIDTHS.length + wi].push(x0, y0, x1, y1);
        }
        for (let ai = 0; ai < ALPHA_STEPS; ai++) {
          for (let wi = 0; wi < WIDTHS.length; wi++) {
            const seg = buckets[ai * WIDTHS.length + wi];
            if (!seg.length) continue;
            ctx.strokeStyle = styles[ai];
            ctx.lineWidth = WIDTHS[wi];
            ctx.beginPath();
            for (let k = 0; k < seg.length; k += 4) {
              ctx.moveTo(seg[k], seg[k + 1]);
              ctx.lineTo(seg[k + 2], seg[k + 3]);
            }
            ctx.stroke();
          }
        }

        // a procession of destination-glyph gates flying past the camera
        ctx.strokeStyle = gateStyle;
        for (let g = 0; g < 5; g++) {
          const phase = ((t / 1100) * (0.6 + speed * 14) + g / 5) % 1;
          const gs = Math.pow(phase, 3.2) * scale * 2.4 + 6;
          const ga = Math.sin(phase * Math.PI) * 0.85 * cover;
          if (ga <= 0.01) continue;
          ctx.globalAlpha = ga;
          ctx.lineWidth = 1 + phase * 2;
          ctx.beginPath();
          for (let i = 0; i <= 96; i++) {
            const k = (i % 96) * 2;
            const px = cx + ring[k] * gs;
            const py = cy - ring[k + 1] * gs;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      return !!outAt && outK >= 1;
    },
  };
}

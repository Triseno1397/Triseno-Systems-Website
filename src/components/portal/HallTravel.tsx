"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { addFrameJob } from "@/components/world/frameLoop";
import { HALL_PLATES, buildHall, drawHall, hallCover, type HallSprites } from "./hallNest";

/**
 * The hall of doors as a place the scroll walks down (hallNest.ts): the
 * rendered still, nested in itself, drawn on a canvas over the still. The
 * page says how many portals in the camera is with `set(u)`; the canvas
 * redraws in the frame's write phase, only when that number has moved.
 *
 * Until the plate is decoded and cut (and under reduced motion, always) the
 * still itself shows: the same hall, at rest.
 */

export interface HallTravelHandle {
  /** the camera is `u` portals down the hall */
  set: (u: number) => void;
}

/** cap on the canvas: sharp on a phone, never a 4K buffer for a dark hall */
const MAX_DPR = 2;
const MAX_PIXELS = 3_200_000;

interface Props {
  /** reduced motion: the still only */
  still?: boolean;
  /** how the still loads: the full world wants it early, the lite one late */
  eager?: boolean;
}

const HallTravel = forwardRef<HallTravelHandle, Props>(function HallTravel({ still = false, eager = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ u: 0, drawn: -1, dirty: false });

  useImperativeHandle(
    ref,
    () => ({
      set: (u: number) => {
        const s = state.current;
        if (Math.abs(u - s.u) < 0.0004) return;
        s.u = u;
        s.dirty = true;
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || still) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const s = state.current;
    const mq = window.matchMedia("(max-width: 767px)");
    let sprites: HallSprites | null = null;
    let cover = 8;
    let W = 0;
    let H = 0;
    let dead = false;
    let idle = 0;
    let bitmap: ImageBitmap | null = null;

    const paint = () => {
      if (!sprites || W < 2 || H < 2) return;
      drawHall(ctx, W, H, sprites, s.u, cover);
      s.drawn = s.u;
      s.dirty = false;
      if (!canvas.hasAttribute("data-live")) canvas.setAttribute("data-live", "");
    };

    const size = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      if (r.width * r.height * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (r.width * r.height));
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (w === W && h === H) return;
      W = w;
      H = h;
      canvas.width = W;
      canvas.height = H;
      if (sprites) cover = hallCover(sprites.plate, W, H);
      // a resized canvas is blank: fill it before this frame is shown
      paint();
    };

    const load = () => {
      const plate = mq.matches ? HALL_PLATES.tall : HALL_PLATES.wide;
      const img = new Image();
      img.decoding = "async";
      img.src = plate.src;
      img
        .decode()
        .then(() => (typeof createImageBitmap === "function" ? createImageBitmap(img).catch(() => null) : null))
        .then((bmp) => {
          if (dead || (mq.matches ? HALL_PLATES.tall : HALL_PLATES.wide) !== plate) {
            bmp?.close();
            return;
          }
          // cutting the plate is a few canvases' worth of work: do it while
          // the page is idle, well before the scroll reaches the hall
          const cut = () => {
            if (dead) {
              bmp?.close();
              return;
            }
            const built = buildHall(bmp ?? img, plate);
            if (!built) return;
            bitmap?.close();
            bitmap = bmp;
            sprites = built;
            if (W > 1 && H > 1) cover = hallCover(plate, W, H);
            paint();
          };
          if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(cut, { timeout: 2500 });
          else idle = window.setTimeout(cut, 600);
        })
        .catch(() => {});
    };

    size();
    load();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    mq.addEventListener("change", load);
    const off = addFrameJob({
      write: () => {
        if (s.dirty) paint();
      },
    });
    return () => {
      dead = true;
      off();
      ro.disconnect();
      mq.removeEventListener("change", load);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      bitmap?.close();
    };
  }, [still]);

  return (
    <>
      <picture>
        <source media="(max-width: 767px)" srcSet={HALL_PLATES.tall.src} />
        <img
          src={HALL_PLATES.wide.src}
          alt=""
          decoding="async"
          fetchPriority={eager ? "low" : undefined}
          loading={eager ? undefined : "lazy"}
          draggable={false}
        />
      </picture>
      {still ? null : <canvas ref={canvasRef} className="hall-plate__travel" />}
    </>
  );
});

export default HallTravel;

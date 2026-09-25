import gsap from "gsap";
import { primeScroll } from "./plateMotion";

/* ─────────────────────────────────────────────────────────────────────────
   ONE FRAME, TWO PHASES.

   The content fade, every GlassPanel and the world plate all update each
   frame from layout (getBoundingClientRect) and then write styles. Run as
   separate ticker callbacks they interleave — read, write, read, write — and
   every read after a write forces the browser to re-run style and layout
   mid-frame. Here every reader runs first, then every writer, so the frame
   pays for layout once.

   Runs on the GSAP ticker, after Lenis has moved the page in the same frame.
   The 3D world is the last writer of the frame (scene/pieces.tsx FrameDriver):
   it renders after every DOM write, in the same tick, off the same clock.
   ───────────────────────────────────────────────────────────────────────── */

export interface FrameJob {
  /** measure only — no style writes. `time` is the ticker's clock, seconds */
  read?: (time: number) => void;
  /** write only — no layout reads */
  write?: (time: number) => void;
}

const jobs = new Set<FrameJob>();
/** runs first in every frame, before any measuring — the smooth scroller */
let pre: ((time: number) => void) | null = null;
let installed = false;
/** the ticker's own interval, smoothed — what one frame of this display is */
let lastTick = -1;
let rafInterval = 1 / 60;

/** Seconds between two ticks of the display this page is on (1/60, 1/120, 1/144…). */
export function frameInterval(): number {
  return rafInterval;
}

const tick = (time: number) => {
  if (lastTick >= 0) {
    const d = time - lastTick;
    // ignore a tab that was asleep: a 2s gap is not a frame rate
    if (d > 0 && d < 0.1) rafInterval += (d - rafInterval) * 0.1;
  }
  lastTick = time;
  // 1. the page moves; 2. one scroll measurement; 3. every read; 4. every write
  pre?.(time);
  if (jobs.size === 0) return;
  primeScroll();
  jobs.forEach((j) => j.read?.(time));
  jobs.forEach((j) => j.write?.(time));
};

function install() {
  if (installed) return;
  installed = true;
  // one permanent callback at the front of the GSAP ticker
  gsap.ticker.add(tick, false, true);
}

/** The smooth scroller registers here so it always runs first in the frame. */
export function setPreFrame(fn: ((time: number) => void) | null) {
  install();
  pre = fn;
}

export function addFrameJob(job: FrameJob): () => void {
  install();
  jobs.add(job);
  return () => {
    jobs.delete(job);
  };
}

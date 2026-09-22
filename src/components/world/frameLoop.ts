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
   ───────────────────────────────────────────────────────────────────────── */

export interface FrameJob {
  /** measure only — no style writes */
  read?: () => void;
  /** write only — no layout reads */
  write?: () => void;
}

const jobs = new Set<FrameJob>();
/** runs first in every frame, before any measuring — the smooth scroller */
let pre: ((time: number) => void) | null = null;
let installed = false;

const tick = (time: number) => {
  // 1. the page moves; 2. one scroll measurement; 3. every read; 4. every write
  pre?.(time);
  if (jobs.size === 0) return;
  primeScroll();
  jobs.forEach((j) => j.read?.());
  jobs.forEach((j) => j.write?.());
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

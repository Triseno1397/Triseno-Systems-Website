import gsap from "gsap";

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
let running = false;

const tick = () => {
  jobs.forEach((j) => j.read?.());
  jobs.forEach((j) => j.write?.());
};

export function addFrameJob(job: FrameJob): () => void {
  jobs.add(job);
  if (!running) {
    running = true;
    gsap.ticker.add(tick);
  }
  return () => {
    jobs.delete(job);
    if (running && jobs.size === 0) {
      running = false;
      gsap.ticker.remove(tick);
    }
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   One motion model for every copy of a world plate on the page — the plate
   itself (WorldPlate) and every GlassPanel's blurred copy of it — so the
   glass always shows exactly the part of the world that is behind it.

   Read it on the GSAP ticker (after Lenis has moved the page) so the plate and
   the glass move in the same frame as the content.
   ───────────────────────────────────────────────────────────────────────── */

import gsap from "gsap";

const pointer = { x: 0, y: 0 };
// scroll progress, measured once per GSAP tick: the first caller in a frame is
// the frame loop's read phase, so later callers (overlays, canvases) never
// force a layout by reading scrollHeight after the frame's style writes
let progFrame = -1;
let progValue = 0;
let installed = false;
// The smooth scroller moves the page at the top of every frame. Asking the
// document where it ended up (window.scrollY) straight afterwards makes the
// browser flush style and layout mid-frame, every frame — so the scroller
// hands its own number over instead, and nothing has to ask.
let fedY = 0;
let hasFeed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Touch scrolling is the browser's own, so nothing calls feedScroll: take the
  // position from the scroll event instead, where layout is already settled,
  // rather than asking the document for it in the middle of a frame.
  const onScroll = () => {
    fedY = window.scrollY;
    hasFeed = true;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );
}

/** Measure this frame's scroll progress now (called first in the frame loop). */
// the scrollable height, re-measured only when the document or viewport
// actually changes size — never read mid-frame
let maxScroll = -1;
let viewport = 0;
// bumped whenever the page's shape changes, so anything that measured the page
// (where a camera station begins, say) knows to measure again — and knows not
// to on every other frame
let epoch = 0;
let watching = false;
function watchSize() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const measure = () => {
    viewport = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - viewport);
    epoch++;
  };
  measure();
  new ResizeObserver(measure).observe(document.body);
  window.addEventListener("resize", measure, { passive: true });
}

/** This frame's scroll, the viewport, the scrollable height, and which shape of
 *  page they belong to. Everything that used to read the document for these
 *  reads them here instead. */
export function scrollMetrics(): { p: number; vh: number; max: number; epoch: number } {
  primeScroll();
  return { p: progValue, vh: viewport, max: maxScroll, epoch };
}

/** The scroller's own position for this frame, so no one reads it back off
 *  the document after it has just been written. */
export function feedScroll(y: number) {
  fedY = y;
  hasFeed = true;
}

export function primeScroll() {
  const frame = gsap.ticker.frame;
  if (frame === progFrame) return;
  progFrame = frame;
  watchSize();
  progValue = Math.min(1, Math.max(0, (hasFeed ? fedY : window.scrollY) / maxScroll));
}

export interface PlatePose {
  /** translate of the plate layer, px */
  tx: number;
  ty: number;
  /** scale about the plate's vanishing point */
  s: number;
}

let reduced: boolean | null = null;

/** The plate's pose right now: a scroll push-in and a few px of pointer parallax. */
export function platePose(out: PlatePose): PlatePose {
  install();
  if (reduced === null) reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    out.tx = 0;
    out.ty = 0;
    out.s = 1;
    return out;
  }
  const frame = gsap.ticker.frame;
  if (frame !== progFrame) primeScroll();
  const prog = progValue;
  out.tx = -pointer.x * 6;
  out.ty = -pointer.y * 4 - prog * 10;
  out.s = 1 + 0.12 * prog;
  return out;
}

export function plateTransform(p: PlatePose, dx = 0, dy = 0): string {
  return `translate3d(${(p.tx + dx).toFixed(2)}px, ${(p.ty + dy).toFixed(2)}px, 0) scale(${p.s.toFixed(4)})`;
}

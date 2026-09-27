/* The warp tunnel, drawn in a worker: its canvas was handed over by
   WarpProvider (transferControlToOffscreen), so the tunnel keeps its frame
   rate while the main thread builds and boots the destination page — the
   moment the old tunnel stalled. The worker owns the tunnel's clock; the page
   tells it when to dissolve and hears back when it is done, with how the
   frames went. */

import { createTunnel, type Tunnel, type TunnelSetup } from "./warpTunnel";

type Msg =
  | { type: "init"; canvas: OffscreenCanvas }
  | { type: "size"; w: number; h: number; dpr: number }
  | ({ type: "start" } & TunnelSetup)
  | { type: "out" }
  | { type: "stop" };

// the worker's own global, typed by hand (the project's lib is the DOM's)
const scope = self as unknown as {
  postMessage(m: unknown): void;
  onmessage: ((e: MessageEvent<Msg>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
};

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
const dims = { w: 1, h: 1, dpr: 1 };
let tunnel: Tunnel | null = null;
let outAt = 0;
let wantOut = false;
let last = 0;
let raf = 0;
let running = false;
// how the frames went: the longest interval, and how many ran long
let maxGap = 0;
let long = 0;
let frames = 0;

const next = (cb: (t: number) => void) =>
  scope.requestAnimationFrame ? scope.requestAnimationFrame(cb) : (setTimeout(() => cb(performance.now()), 16) as unknown as number);
const cancel = (id: number) => (scope.cancelAnimationFrame ? scope.cancelAnimationFrame(id) : clearTimeout(id));

const loop = (now: number) => {
  if (!running || !tunnel || !ctx) return;
  const raw = last ? now - last : 16.67;
  last = now;
  if (frames > 0) {
    maxGap = Math.max(maxGap, raw);
    if (raw > 25) long++;
  }
  frames++;
  // warp time advances by at most one 1/20s step per drawn frame, so a
  // stalled machine still plays every beat
  const step = Math.min(50, Math.max(0, raw));
  if (wantOut && !outAt) outAt = tunnel.time() + step;
  const done = tunnel.frame(step, outAt);
  if (done) {
    running = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    scope.postMessage({ type: "done", maxGap: Math.round(maxGap), long, frames });
    return;
  }
  raf = next(loop);
};

scope.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "init") {
    canvas = m.canvas;
    ctx = canvas.getContext("2d", { alpha: true, desynchronized: true }) as OffscreenCanvasRenderingContext2D | null;
  } else if (m.type === "size") {
    dims.w = m.w;
    dims.h = m.h;
    dims.dpr = m.dpr;
    if (canvas) {
      canvas.width = Math.round(m.w * m.dpr);
      canvas.height = Math.round(m.h * m.dpr);
    }
  } else if (m.type === "start") {
    if (!ctx) return;
    cancel(raf);
    tunnel = createTunnel(ctx, () => dims, m);
    outAt = 0;
    wantOut = false;
    last = 0;
    maxGap = 0;
    long = 0;
    frames = 0;
    running = true;
    raf = next(loop);
  } else if (m.type === "out") {
    wantOut = true;
  } else if (m.type === "stop") {
    running = false;
    cancel(raf);
    if (ctx && canvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
};

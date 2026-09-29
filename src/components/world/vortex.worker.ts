/* The Creative vortex, drawn in a worker (see vortex.ts). Same protocol as
   warp.worker.ts, plus: `init` carries the plate's URL, which the worker
   fetches and decodes itself, and the worker answers `init` with `ready` or,
   when it cannot get WebGL2, `nogl` (the page then warps down the streak
   tunnel instead). */

import { createVortex, type Vortex } from "./vortex";

type Msg =
  | { type: "init"; canvas: OffscreenCanvas; texture: string }
  | { type: "size"; w: number; h: number; dpr: number }
  | { type: "start" }
  | { type: "out" }
  | { type: "stop" };

const scope = self as unknown as {
  postMessage(m: unknown): void;
  onmessage: ((e: MessageEvent<Msg>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | null = null;
let vortex: Vortex | null = null;
let outAt = 0;
let wantOut = false;
let last = 0;
let raf = 0;
let running = false;
let maxGap = 0;
let long = 0;
let frames = 0;

const next = (cb: (t: number) => void) =>
  scope.requestAnimationFrame ? scope.requestAnimationFrame(cb) : (setTimeout(() => cb(performance.now()), 16) as unknown as number);
const cancel = (id: number) => (scope.cancelAnimationFrame ? scope.cancelAnimationFrame(id) : clearTimeout(id));

const blank = () => {
  if (!gl) return;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
};

const loop = (now: number) => {
  if (!running || !vortex) return;
  const raw = last ? now - last : 16.67;
  last = now;
  if (frames > 0) {
    maxGap = Math.max(maxGap, raw);
    if (raw > 25) long++;
  }
  frames++;
  const step = Math.min(50, Math.max(0, raw));
  if (wantOut && !outAt) outAt = vortex.time() + step;
  if (vortex.frame(step, outAt)) {
    running = false;
    blank();
    scope.postMessage({ type: "done", maxGap: Math.round(maxGap), long, frames });
    return;
  }
  raf = next(loop);
};

scope.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "init") {
    canvas = m.canvas;
    try {
      gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false }) as WebGL2RenderingContext | null;
      if (!gl) throw new Error("no webgl2");
      vortex = createVortex(gl, () => ({ w: canvas!.width, h: canvas!.height }));
      scope.postMessage({ type: "ready" });
    } catch {
      gl = null;
      vortex = null;
      scope.postMessage({ type: "nogl" });
      return;
    }
    fetch(m.texture)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b))
      .then((img) => vortex?.setTexture(img))
      .catch(() => {});
  } else if (m.type === "size") {
    if (canvas) {
      canvas.width = Math.max(1, Math.round(m.w * m.dpr));
      canvas.height = Math.max(1, Math.round(m.h * m.dpr));
    }
  } else if (m.type === "start") {
    if (!vortex) return;
    cancel(raf);
    vortex.reset();
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
    blank();
  }
};

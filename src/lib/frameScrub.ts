/* ─────────────────────────────────────────────────────────────────────────
   frameScrub — a film the scroll bar plays.

   A generated clip is cut into a numbered sequence of WebP frames (one set
   framed for landscape screens, one cropped for portrait phones), and this
   draws whichever frame the current scroll progress asks for onto a canvas,
   cover-fitted. Scrubbing a <video> by currentTime stutters on Safari and
   fights the decoder on phones; a frame sequence is instant in both
   directions, which is what a scrubbed section needs.

   Loading is progressive so the first scroll never waits for the whole film:
   the first and last frames, then every 16th, 8th, 4th, 2nd, then the rest.
   Until a frame has arrived the nearest loaded neighbour is drawn, so the
   film sharpens in time rather than popping in all at once. Frames decode
   off the main thread (createImageBitmap) where the browser allows it.

   Nothing here starts on its own: the section calls load() when it is near
   the viewport, setProgress() from its ScrollTrigger, dispose() on unmount.
   ───────────────────────────────────────────────────────────────────────── */

export interface FrameSet {
  /** public path of the folder, no trailing slash, e.g. "/frames/ferro-d" */
  dir: string;
  /** frames are named 001.webp … count.webp */
  count: number;
  /** native frame size, for the canvas backing store cap */
  width: number;
  height: number;
}

export interface FrameFilm {
  landscape: FrameSet;
  portrait: FrameSet;
}

type Frame = ImageBitmap | HTMLImageElement;

export interface FrameScrubber {
  /** begin fetching (idempotent) */
  load(): void;
  /** 0..1 — draws the matching frame on the next animation frame */
  setProgress(p: number): void;
  /** re-measure the canvas against its parent box and redraw */
  resize(): void;
  /** true once the first frame has been drawn */
  readonly ready: boolean;
  dispose(): void;
}

const CONCURRENCY = 6;
const MAX_DPR = 2;

/* AVIF frames are about half the bytes of WebP at the same look; each set
   ships both and the browser that can decode AVIF gets it. One probe per
   page, a 1x1 AVIF decoded off a data URL. */
let avifProbe: Promise<boolean> | null = null;
function supportsAvif(): Promise<boolean> {
  if (avifProbe) return avifProbe;
  avifProbe = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0);
    img.onerror = () => resolve(false);
    img.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  });
  return avifProbe;
}

function progressiveOrder(count: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  const push = (i: number) => {
    if (i >= 0 && i < count && !seen.has(i)) {
      seen.add(i);
      out.push(i);
    }
  };
  push(0);
  push(count - 1);
  for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += step) push(i);
  return out;
}

export interface FrameHooks {
  /** after every frame drawn to the canvas (a shader stage re-uploads it) */
  onDraw?: () => void;
  /** once every frame has been fetched (or skipped) */
  onLoaded?: () => void;
  /** after each frame arrives: how many are in, out of how many */
  onFetched?: (count: number, total: number) => void;
}

export function createFrameScrubber(
  canvas: HTMLCanvasElement,
  film: FrameFilm,
  onFirstFrame?: () => void,
  hooks: FrameHooks = {},
): FrameScrubber {
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const set = portrait ? film.portrait : film.landscape;
  const frames: Array<Frame | null> = new Array(set.count).fill(null);
  const ctx = canvas.getContext("2d", { alpha: false });
  let loading = false;
  let fetched = 0;
  let disposed = false;
  let ready = false;
  let progress = 0;
  let drawnIndex = -1;
  let raf = 0;
  let cssW = 0;
  let cssH = 0;

  let ext = "webp";
  const name = (i: number, e = ext) => `${set.dir}/${String(i + 1).padStart(3, "0")}.${e}`;

  function measure() {
    const box = canvas.parentElement ?? canvas;
    const r = box.getBoundingClientRect();
    cssW = Math.max(1, Math.round(r.width));
    cssH = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // never more backing pixels than the frames themselves carry
    const scale = Math.min(dpr, set.width / cssW, set.height / cssH, dpr);
    const w = Math.max(1, Math.round(cssW * Math.max(scale, 0.5)));
    const h = Math.max(1, Math.round(cssH * Math.max(scale, 0.5)));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      drawnIndex = -1;
    }
  }

  /** nearest loaded frame to i, preferring earlier (the film reads forward) */
  function nearest(i: number): number {
    if (frames[i]) return i;
    for (let d = 1; d < set.count; d++) {
      if (i - d >= 0 && frames[i - d]) return i - d;
      if (i + d < set.count && frames[i + d]) return i + d;
    }
    return -1;
  }

  function draw() {
    raf = 0;
    if (disposed || !ctx) return;
    const want = Math.round(progress * (set.count - 1));
    const idx = nearest(want);
    if (idx < 0 || idx === drawnIndex) return;
    const img = frames[idx] as Frame;
    const iw = img.width;
    const ih = img.height;
    const cw = canvas.width;
    const ch = canvas.height;
    // cover fit, centred
    const s = Math.max(cw / iw, ch / ih);
    const dw = iw * s;
    const dh = ih * s;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    drawnIndex = idx;
    hooks.onDraw?.();
    if (!ready) {
      ready = true;
      onFirstFrame?.();
    }
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  async function fetchFrame(i: number) {
    try {
      if ("createImageBitmap" in window) {
        let res = await fetch(name(i));
        if (!res.ok && ext !== "webp") res = await fetch(name(i, "webp"));
        if (!res.ok) return;
        const blob = await res.blob();
        if (disposed) return;
        frames[i] = await createImageBitmap(blob);
      } else {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            frames[i] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = name(i);
        });
      }
    } catch {
      /* a missing frame is skipped; its neighbours stand in */
    }
    fetched++;
    hooks.onFetched?.(fetched, set.count);
    // redraw if the frame that just arrived is closer to the wanted one
    const want = Math.round(progress * (set.count - 1));
    if (nearest(want) !== drawnIndex) schedule();
  }

  function load() {
    if (loading || disposed) return;
    loading = true;
    void supportsAvif().then((ok) => {
      if (ok) ext = "avif";
      startFetching();
    });
  }

  function startFetching() {
    if (disposed) return;
    const order = progressiveOrder(set.count);
    let cursor = 0;
    const worker = async () => {
      while (cursor < order.length && !disposed) {
        const i = order[cursor++];
        await fetchFrame(i);
      }
    };
    void Promise.all(Array.from({ length: CONCURRENCY }, worker)).then(() => {
      if (!disposed) hooks.onLoaded?.();
    });
  }

  measure();

  return {
    load,
    setProgress(p: number) {
      progress = Math.min(1, Math.max(0, p));
      schedule();
    },
    resize() {
      measure();
      schedule();
    },
    get ready() {
      return ready;
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      for (const f of frames) if (f && "close" in f) f.close();
      frames.fill(null);
    },
  };
}

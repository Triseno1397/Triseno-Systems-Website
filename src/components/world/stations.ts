import gsap from "gsap";
import { stationPlates, type PlateWorld } from "./plates";
import { scrollMetrics } from "./plateMotion";

/* ─────────────────────────────────────────────────────────────────────────
   Camera stations — one continuous camera move through a world, not a
   slideshow of backgrounds.

   A world has up to three stations (plates.ts): the base plate, a view
   further in, and the arrival. Page scroll is one dolly:
     · inside station N the camera keeps pushing in (its plate scales up);
     · around each hand-off, station N — still pushing in, past where it
       started — dissolves into station N+1, which enters at its WIDER framing
       and immediately starts pushing in too. Zoom-in + dissolve between two
       views of the same place, horizon and vanishing point held, reads as the
       camera travelling forward. Nothing ever snaps back or slides.
   Every copy of the plate on the page (WorldPlate and each GlassPanel's
   blurred copy) reads this one model on the same GSAP tick, so frosted glass
   always shows the room it is actually in.

   Where each station begins: a number is a fraction of the page's scroll; a
   string is a CSS selector — the station arrives as that element enters (its
   top at 55% of the viewport). Default: station 1 at the top, the final
   station on the page's gate ([data-rail="Gate"], else the last [data-rail]),
   the middle one half-way between.
   ───────────────────────────────────────────────────────────────────────── */

export type StationStart = number | string;

export interface StationFrame {
  /** 0..1 — how much of this station shows over the ones before it */
  alpha: number;
  /** station-local push-in, multiplied onto the plate pose */
  scale: number;
  /** true once the station is close enough to need its full image */
  near: boolean;
}

/** how far the camera pushes into one station, as a scale */
const PUSH = 0.2;

const registry = new Map<PlateWorld, StationStart[] | "off">();

/**
 * WorldPlate registers where its stations begin (or "off" for the base plate
 * only); every GlassPanel of that world follows the same registration.
 */
export function setStationStarts(world: PlateWorld, starts: StationStart[] | "off" | undefined) {
  if (starts) registry.set(world, starts);
  else registry.delete(world);
}

let reduced: boolean | null = null;
const cache = new Map<PlateWorld, { tick: number; frames: StationFrame[] }>();
// Where each station begins is a property of the page's layout, not of the
// frame: resolving it means a querySelector and a measurement per station, and
// this runs for the plate and for every panel of frosted glass on the page. It
// is worked out once per shape of page instead.
const bounds = new Map<PlateWorld, { epoch: number; b: number[] }>();

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function resolve(start: StationStart, max: number, vh: number): number | null {
  if (typeof start === "number") return start;
  let el: Element | null = null;
  if (start === "__last__") {
    const all = document.querySelectorAll("main [data-rail]");
    el = all[all.length - 1] ?? null;
  } else el = document.querySelector(start);
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  return Math.min(1, Math.max(0, (top - vh * 0.55) / max));
}

function defaultStarts(n: number): StationStart[] {
  if (n <= 1) return [0];
  const gate = document.querySelector('[data-rail="Gate"]') ? '[data-rail="Gate"]' : null;
  const last = gate ?? "__last__";
  return n === 2 ? [0, last] : [0, "__mid__", last];
}

/** This frame's station layers for a world (cached per GSAP tick). */
export function stationFrames(world: PlateWorld): StationFrame[] {
  const tick = gsap.ticker.frame;
  const hit = cache.get(world);
  if (hit && hit.tick === tick) return hit.frames;

  const spec0 = registry.get(world);
  const n = spec0 === "off" ? 1 : stationPlates(world).length;
  const frames: StationFrame[] = Array.from({ length: n }, (_, i) => ({ alpha: i === 0 ? 1 : 0, scale: 1, near: i === 0 }));
  if (n > 1 && typeof window !== "undefined") {
    if (reduced === null) reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { p, vh, max, epoch } = scrollMetrics();

    let known = bounds.get(world);
    if (!known || known.epoch !== epoch || known.b.length !== n) {
      const spec = (spec0 && spec0 !== "off" ? spec0 : undefined) ?? defaultStarts(n);
      const fresh: number[] = [];
      for (let i = 0; i < n; i++) {
        const s = spec[i];
        if (i === 0) fresh.push(0);
        else if (s === "__mid__" || s === undefined) fresh.push(NaN);
        else fresh.push(resolve(s, max, vh) ?? NaN);
      }
      // unresolved starts: spread evenly between their neighbours
      const lastB = Number.isNaN(fresh[n - 1]) ? 0.82 : fresh[n - 1];
      fresh[n - 1] = lastB;
      for (let i = 1; i < n - 1; i++) if (Number.isNaN(fresh[i])) fresh[i] = (lastB * i) / (n - 1);
      for (let i = 1; i < n; i++) fresh[i] = Math.max(fresh[i], fresh[i - 1] + 0.02);
      known = { epoch, b: fresh };
      bounds.set(world, known);
    }
    const b = known.b;

    // the dissolve spans about one viewport of scroll either side of a start
    const d = Math.min(0.08, (0.5 * vh) / max);
    for (let i = 0; i < n; i++) {
      const start = b[i];
      const end = i + 1 < n ? b[i + 1] : 1;
      const u = (p - start) / Math.max(1e-3, end - start);
      frames[i].alpha = i === 0 ? 1 : smooth(start - d, start + d, p);
      frames[i].scale = reduced ? 1 : Math.min(1 + PUSH * 1.35, Math.max(0.975, 1 + PUSH * u));
      // load a station's full image a little over a viewport ahead of need
      frames[i].near = i === 0 || p > start - d - (1.4 * vh) / max;
    }
    // a station completely covered by a later one does not need to draw
    for (let i = n - 2; i >= 0; i--) if (frames[i + 1].alpha >= 0.999) frames[i].alpha = 0;
  }
  cache.set(world, { tick, frames });
  return frames;
}

/** The station most in view and how far into the next hand-off it is — for page overlays. */
export function activeStation(world: PlateWorld): { index: number; blend: number } {
  const f = stationFrames(world);
  let index = 0;
  for (let i = 0; i < f.length; i++) if (f[i].alpha >= 0.5) index = i;
  const next = f[index + 1];
  return { index, blend: next ? next.alpha : 0 };
}

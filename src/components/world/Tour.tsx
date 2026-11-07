"use client";

import "../../app/explore.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getLenis } from "./SmoothScroll";
import { useWarp } from "./WarpProvider";
import GhostButton from "@/components/ui/GhostButton";
import { PAGE_NAMES, TOUR, TOUR_TOTAL, type TourStop } from "@/lib/exhibits";
import { TOTAL, openMap } from "@/lib/discover";

/**
 * The guided tour, on every page of the world (lib/exhibits.ts exploreVariant).
 *
 * For the visitor who will not explore on their own: one button, and the site
 * plays its showpieces for them (lib/exhibits.ts TOUR). At each stop the page
 * glides to the piece, then PLAYS it, scrolling slowly through the pinned
 * scene so it runs in front of the visitor, and presses the piece's own
 * buttons where it has them (the crystal hall's colours, a gallery case).
 * Between pages it warps. A real scroll, swipe or key pauses it; Resume
 * replays the stop. It finishes on one card with the next step.
 *
 * It opens on a short hands-free card, so the visitor knows the site is about
 * to drive and that there is nothing for them to do but watch.
 *
 * The scroll is driven frame by frame on a wall clock, with a timer behind
 * every move, so a stop always ends even if a frame never comes.
 *
 * State lives in sessionStorage so the tour survives the page changes.
 */

const KEY = "triseno:tour";
const START_EVENT = "triseno:tour-start";
/** how long the hands-free card stays up before the first stop */
const INTRO_MS = 4600;

/** any button on the page can start the tour */
export function startTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

function load(): number | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 && n < TOUR.length ? n : null;
  } catch {
    return null;
  }
}
function save(i: number | null) {
  try {
    if (i == null) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, String(i));
  } catch {
    // storage blocked: the tour ends at the first page change
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

const railEl = (rail: string) => document.querySelector<HTMLElement>(`main [data-rail="${CSS.escape(rail)}"]`);

/** a pinned section's scroll travel lives on its pin-spacer */
const hostOf = (el: HTMLElement) =>
  el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;

/** where a stop starts and where its play ends, in page scroll */
function rangeOf(s: TourStop): { start: number; end: number } | null {
  const el = railEl(s.rail);
  if (!el) return null;
  const host = hostOf(el);
  const top = host.getBoundingClientRect().top + window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const clamp = (y: number) => Math.max(0, Math.min(max, Math.round(y)));
  if (s.through) {
    const to = railEl(s.through);
    const end = to ? hostOf(to).getBoundingClientRect().top + window.scrollY : top;
    return { start: clamp(top), end: clamp(end) };
  }
  const travel = Math.max(0, host.offsetHeight - window.innerHeight);
  const [a, b] = s.play ?? [0, 0];
  return { start: clamp(top + travel * a), end: clamp(top + travel * b) };
}

/** move the page from one y to another over ms; always calls done */
function drive(from: number, to: number, ms: number, ease: (t: number) => number, done: () => void) {
  const lenis = getLenis();
  const set = (y: number) => {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    // instant: the page's own `scroll-behavior: smooth` would turn every
    // frame's step into a fresh smooth scroll and the page would crawl
    else window.scrollTo({ top: y, behavior: "instant" });
  };
  let raf = 0;
  let over = false;
  const t0 = performance.now();
  const finish = () => {
    if (over) return;
    over = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(watchdog);
    set(to);
    done();
  };
  const step = () => {
    if (over) return;
    const t = Math.min(1, (performance.now() - t0) / ms);
    set(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else finish();
  };
  // frames can stall (a hidden tab, a busy GPU): the clock still ends the move
  const watchdog = window.setTimeout(finish, ms + 400);
  if (ms <= 0 || Math.abs(to - from) < 2) finish();
  else raf = requestAnimationFrame(step);
  return () => {
    over = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(watchdog);
  };
}

/** the tour pressing a piece's own buttons; returns its timers */
function act(s: TourStop): number[] {
  const at = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
  if (s.act === "prism") {
    const bands = [...document.querySelectorAll<HTMLButtonElement>(".web-prism__bandbtn")];
    if (!bands.length) return [];
    const timers: number[] = [];
    for (let k = 1; k * 1350 + 800 < s.ms - 900; k++) timers.push(at(800 + k * 1350, () => bands[k % bands.length]?.click()));
    return timers;
  }
  if (s.act === "case") {
    return [
      at(1600, () => document.querySelector<HTMLButtonElement>('[aria-label^="Step into case 2"]')?.click()),
      at(s.ms - 2600, () => document.querySelector<HTMLButtonElement>(".sxc__back")?.click()),
    ];
  }
  return [];
}

type Phase = "idle" | "intro" | "moving" | "playing" | "paused" | "end";

export default function Tour() {
  const pathname = usePathname() ?? "/";
  const { travel, busy } = useWarp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [touch, setTouch] = useState(false);
  // the home hero carries the same launcher: while that one is on screen the
  // corner dock steps back, so the first screen shows one way in, not two
  const [heroHasIt, setHeroHasIt] = useState(false);
  const idxRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);
  const stopDrive = useRef<(() => void) | null>(null);
  const reduced = useRef(false);

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
    document.documentElement.toggleAttribute("data-touring", p !== "idle");
  };
  const setI = (i: number | null) => {
    idxRef.current = i;
    setIdx(i);
    save(i);
  };

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    stopDrive.current?.();
    stopDrive.current = null;
  };

  /** play stop i, which is on this page */
  const runStop = useCallback(
    (i: number) => {
      clearAll();
      setI(i);
      const s = TOUR[i];
      const r = rangeOf(s);
      if (!r) {
        // the section is not on this page as built: skip it
        timers.current.push(window.setTimeout(() => advance(), 50));
        return;
      }
      setP("moving");
      const dist = Math.abs(r.start - window.scrollY);
      const approach = reduced.current ? 0 : Math.min(2600, Math.max(900, 900 + dist / 2.2));
      stopDrive.current = drive(window.scrollY, r.start, approach, easeInOut, () => {
        if (idxRef.current !== i || phaseRef.current !== "moving") return;
        setP("playing");
        setRunKey((k) => k + 1);
        // the play leaves a beat at the end to take the last frame in
        const playMs = reduced.current ? 0 : Math.max(0, s.ms - 1800);
        stopDrive.current = drive(r.start, r.end, playMs, easeSine, () => {});
        timers.current.push(...act(s), window.setTimeout(() => advance(), s.ms));
      });
    },
    // advance is stable through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const advance = useCallback(() => {
    const i = idxRef.current;
    if (i == null) return;
    clearAll();
    const next = i + 1;
    if (next >= TOUR.length) {
      setI(null);
      setP("end");
      return;
    }
    if (TOUR[next].page === TOUR[i].page) {
      runStop(next);
      return;
    }
    setI(next);
    setP("moving");
    travel(TOUR[next].page);
  }, [runStop, travel]);

  /** the first stop, from wherever the visitor is */
  const begin = useCallback(() => {
    clearAll();
    if (pathname !== TOUR[0].page) {
      setI(0);
      setP("moving");
      travel(TOUR[0].page);
    } else runStop(0);
  }, [pathname, runStop, travel]);

  /** the hands-free card first, then the first stop */
  const start = useCallback(() => {
    clearAll();
    setI(0);
    setP("intro");
    timers.current.push(window.setTimeout(begin, reduced.current ? 2400 : INTRO_MS));
  }, [begin]);

  const exit = useCallback(() => {
    clearAll();
    setI(null);
    setP("idle");
  }, []);

  const pause = useCallback(() => {
    if (phaseRef.current !== "moving" && phaseRef.current !== "playing") return;
    clearAll();
    setP("paused");
  }, []);

  const resume = useCallback(() => {
    if (idxRef.current != null) runStop(idxRef.current);
  }, [runStop]);

  const skip = useCallback(() => {
    if (phaseRef.current === "intro") begin();
    else if (idxRef.current != null) advance();
  }, [advance, begin]);

  // the start button, wherever it is
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const on = () => start();
    window.addEventListener(START_EVENT, on);
    return () => window.removeEventListener(START_EVENT, on);
  }, [start]);

  // arriving on a page mid-tour: once the warp has finished and the page has
  // settled, carry on from the saved stop
  useEffect(() => {
    if (busy) return;
    const i = load();
    if (i == null || TOUR[i].page !== pathname) return;
    setI(i);
    setP("moving");
    const id = window.setTimeout(() => runStop(i), 1400);
    return () => window.clearTimeout(id);
  }, [pathname, busy, runStop]);

  // the visitor takes over. Only a real gesture counts: a resting finger on a
  // trackpad sends tiny wheel events, so the wheel has to add up first.
  useEffect(() => {
    if (phase !== "moving" && phase !== "playing") return;
    const keys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End"]);
    let acc = 0;
    let lastWheel = 0;
    let touchY: number | null = null;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now - lastWheel > 400) acc = 0;
      lastWheel = now;
      acc += Math.abs(e.deltaY);
      if (acc > 90) pause();
    };
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0]?.clientY ?? null);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY != null && y != null && Math.abs(y - touchY) > 14) pause();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
      else if (keys.has(e.key)) pause();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, pause, exit]);

  // the hero's launcher, when the page has one. The hero mounts it a beat
  // after the page (it reads the explore mode on the client), so look again
  // for a couple of seconds; and on the home page the hero is a fixed sheet
  // that fades out as you scroll, so "on screen" means visible, not merely
  // intersecting
  useEffect(() => {
    if (phase !== "idle") return;
    let tries = 0;
    let timer = 0;
    let raf = 0;
    let hero: HTMLElement | null = null;
    const check = () => {
      raf = 0;
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      const cs = getComputedStyle(hero);
      setHeroHasIt(cs.visibility !== "hidden" && r.bottom > 0 && r.top < window.innerHeight);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const look = () => {
      hero = document.querySelector<HTMLElement>(".tour-launch--hero");
      if (!hero) {
        setHeroHasIt(false);
        if (tries++ < 8) timer = window.setTimeout(look, 300);
        return;
      }
      check();
      window.addEventListener("scroll", onScroll, { passive: true });
    };
    look();
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [phase, pathname]);

  // Esc also leaves the hands-free card
  useEffect(() => {
    if (phase !== "intro") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, exit]);

  useEffect(() => () => clearAll(), []);

  if (phase === "idle") {
    return (
      <div className="tour-dock" data-hidden={heroHasIt ? "" : undefined}>
        <button type="button" className="tour-launch" onClick={start}>
          <span className="tour-launch__fill" aria-hidden="true" />
          <span className="tour-launch__glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path d="M3.5 2.2v11.6L13 8z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="tour-launch__text">
            <b className="font-display">Take the guided tour</b>
            <small className="font-mono">Hands-free · 90 seconds</small>
          </span>
          <i className="tour-launch__sweep" aria-hidden="true" />
        </button>
        <button type="button" className="tour-explore font-mono" onClick={openMap}>
          <span className="tour-explore__glyph" aria-hidden="true" />
          Explore {TOTAL} exhibits
        </button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="tour-intro" role="dialog" aria-label="The guided tour is about to start">
        <div className="tour-intro__card">
          <p className="tour-intro__meta font-mono">
            <i aria-hidden="true" /> Guided tour · hands-free
          </p>
          <h2 className="tour-intro__title font-display">Sit back. The site will drive.</h2>
          <p className="tour-intro__body">
            From here it scrolls, clicks and changes pages on its own. Nothing to do but watch
            {touch ? "." : ": move your mouse to look around."} Every stop is a component we can build into your site.
          </p>
          <p className="tour-intro__hint font-mono">
            {touch ? "Swipe at any time to take the wheel." : "Scroll at any time to take the wheel · Esc ends it."}
          </p>
          <div className="tour-intro__row">
            <button type="button" className="tour-card__btn tour-card__btn--solid font-mono" onClick={skip}>
              Start now
            </button>
            <button type="button" className="tour-card__textbtn font-mono" onClick={exit}>
              Explore on my own
            </button>
            <span className="tour-intro__bar" aria-hidden="true">
              <i style={{ animationDuration: `${reduced.current ? 2400 : INTRO_MS}ms` }} />
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "end") {
    return (
      <div className="tour-card tour-card--end" role="dialog" aria-label="End of the tour">
        <p className="tour-card__meta font-mono">Guided tour · complete</p>
        <h2 className="tour-card__title font-display">That was the collection.</h2>
        <p className="tour-card__caption">
          Every piece you just saw is a component we can build into your website, in your brand and for your
          customers.
        </p>
        <div className="tour-card__end">
          <GhostButton href="/contact?division=web">Start a Conversation</GhostButton>
          <button type="button" className="tour-card__textbtn font-mono" onClick={exit}>
            Explore on my own
          </button>
        </div>
      </div>
    );
  }

  const stop = idx != null ? TOUR[idx] : null;
  const here = stop ? stop.page === pathname : false;
  const driving = phase === "moving" || phase === "playing";
  return (
    <div className="tour-card" role="region" aria-label="Guided tour" aria-live="polite" data-phase={phase}>
      <div className="tour-card__top">
        <p className="tour-card__meta font-mono">
          <span className="tour-card__state" data-driving={driving ? "" : undefined}>
            <i aria-hidden="true" />
            {driving ? "Hands-free" : "You took the wheel"}
          </span>
          {" · "}
          {String((idx ?? 0) + 1).padStart(2, "0")} / {String(TOUR_TOTAL).padStart(2, "0")}
          {stop ? ` · ${PAGE_NAMES[stop.page]}` : ""}
        </p>
        <button type="button" className="tour-card__x font-mono" onClick={exit} aria-label="End the tour">
          End
        </button>
      </div>
      {stop && here ? (
        <div key={idx} className="tour-card__body">
          <h2 className="tour-card__title font-display">{stop.title}</h2>
          <p className="tour-card__caption">{stop.caption}</p>
        </div>
      ) : (
        <div className="tour-card__body">
          <p className="tour-card__caption">Travelling to {stop ? PAGE_NAMES[stop.page] : ""}…</p>
        </div>
      )}
      <div className="tour-card__controls">
        {phase === "paused" ? (
          <button type="button" className="tour-card__btn tour-card__btn--solid font-mono" onClick={resume}>
            Resume the tour
          </button>
        ) : (
          <button type="button" className="tour-card__btn font-mono" onClick={pause}>
            Pause
          </button>
        )}
        <button type="button" className="tour-card__btn font-mono" onClick={skip}>
          Next
        </button>
        <span className="tour-card__bar" aria-hidden="true">
          {phase === "playing" && stop ? <i key={runKey} style={{ animationDuration: `${stop.ms}ms` }} /> : null}
        </span>
      </div>
    </div>
  );
}

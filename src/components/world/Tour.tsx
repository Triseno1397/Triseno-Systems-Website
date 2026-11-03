"use client";

import "../../app/explore.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getLenis } from "./SmoothScroll";
import { useWarp } from "./WarpProvider";
import GhostButton from "@/components/ui/GhostButton";
import { PAGE_NAMES, TOUR_PAGES, TOUR_TOTAL, exhibitNo, tourStops, type Exhibit } from "@/lib/exhibits";

/**
 * The guided tour (localhost concept, port 3401 or ?explore=tour).
 *
 * For the visitor who will not explore on their own: one button, and the site
 * shows itself. The tour walks Home, Web Design, Creative and Work, stopping
 * on each exhibit (lib/exhibits.ts). At a stop it glides the page to the
 * moment worth seeing (pinned sections play as it passes through them), holds
 * while a caption card says what the piece is and what it would do on your
 * site, then moves on; at the end of a page it warps to the next one and
 * carries on. A wheel, a touch or a key pauses it where it is; Resume glides
 * back to the stop. It finishes on one card with the next step.
 *
 * State lives in sessionStorage so the tour survives the page changes.
 */

const KEY = "triseno:tour";
const START_EVENT = "triseno:tour-start";

/** any button on the page can start the tour */
export function startTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

interface Saved {
  page: number;
  stop: number;
}

function load(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function save(s: Saved | null) {
  try {
    if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: the tour ends at the first page change
  }
}

/** stops before this one, across the tour, for "Stop 07 of 15" */
function stopNumber(page: number, stop: number) {
  let n = 0;
  for (let p = 0; p < page; p++) n += tourStops(TOUR_PAGES[p]).length;
  return n + stop + 1;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** glide the page to y; resolves when it arrives */
function glide(y: number, reduced: boolean): { done: Promise<void>; cancel: () => void } {
  const from = window.scrollY;
  const dist = Math.abs(y - from);
  const dur = reduced ? 0 : Math.min(4.5, Math.max(1.4, 1.1 + dist / 1500));
  const lenis = getLenis();
  let raf = 0;
  let cancelled = false;
  const done = new Promise<void>((resolve) => {
    if (dur === 0 || dist < 2) {
      window.scrollTo(0, y);
      resolve();
      return;
    }
    if (lenis) {
      lenis.scrollTo(y, { duration: dur, easing: ease, force: true, onComplete: () => resolve() });
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      if (cancelled) return resolve();
      const t = Math.min(1, (now - t0) / (dur * 1000));
      window.scrollTo(0, from + (y - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else resolve();
    };
    raf = requestAnimationFrame(step);
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.stop();
      lenis?.start();
    },
  };
}

function targetY(e: Exhibit): number | null {
  const el = document.querySelector<HTMLElement>(`main [data-rail="${CSS.escape(e.rail)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const top = r.top + window.scrollY;
  const travel = Math.max(0, r.height - window.innerHeight);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(max, Math.round(top + travel * (e.at ?? 0))));
}

type Phase = "idle" | "moving" | "holding" | "paused" | "end";

export default function Tour() {
  const pathname = usePathname() ?? "/";
  const { travel, busy } = useWarp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pos, setPos] = useState<Saved | null>(null);
  const [holdKey, setHoldKey] = useState(0);
  const posRef = useRef<Saved | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const timer = useRef(0);
  const motion = useRef<{ cancel: () => void } | null>(null);
  const reduced = useRef(false);

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
    document.documentElement.toggleAttribute("data-touring", p !== "idle");
  };

  const clearAll = () => {
    window.clearTimeout(timer.current);
    motion.current?.cancel();
    motion.current = null;
  };

  const exhibit = pos ? tourStops(TOUR_PAGES[pos.page])[pos.stop] ?? null : null;

  /** go to a stop on this page, glide there, hold, then advance */
  const runStop = useCallback(
    (s: Saved) => {
      clearAll();
      const stops = tourStops(TOUR_PAGES[s.page]);
      const e = stops[s.stop];
      posRef.current = s;
      setPos(s);
      save(s);
      if (!e) return;
      const y = targetY(e);
      setP("moving");
      if (y == null) {
        // the section is not on this page as built: skip it
        timer.current = window.setTimeout(() => advance(), 50);
        return;
      }
      const m = glide(y, reduced.current);
      motion.current = m;
      m.done.then(() => {
        if (phaseRef.current !== "moving" || posRef.current !== s) return;
        motion.current = null;
        setP("holding");
        setHoldKey((k) => k + 1);
        timer.current = window.setTimeout(() => advance(), e.dwell ?? 5000);
      });
    },
    // advance is stable through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const advance = useCallback(() => {
    const s = posRef.current;
    if (!s) return;
    const stops = tourStops(TOUR_PAGES[s.page]);
    if (s.stop + 1 < stops.length) {
      runStop({ page: s.page, stop: s.stop + 1 });
      return;
    }
    if (s.page + 1 < TOUR_PAGES.length) {
      const next = { page: s.page + 1, stop: 0 };
      clearAll();
      posRef.current = next;
      setPos(next);
      save(next);
      setP("moving");
      travel(TOUR_PAGES[next.page]);
      return;
    }
    clearAll();
    save(null);
    setP("end");
  }, [runStop, travel]);

  const start = useCallback(() => {
    const first = { page: 0, stop: 0 };
    posRef.current = first;
    setPos(first);
    save(first);
    if (pathname !== TOUR_PAGES[0]) {
      setP("moving");
      travel(TOUR_PAGES[0]);
    } else runStop(first);
  }, [pathname, runStop, travel]);

  const exit = useCallback(() => {
    clearAll();
    save(null);
    posRef.current = null;
    setPos(null);
    setP("idle");
  }, []);

  const pause = useCallback(() => {
    if (phaseRef.current !== "moving" && phaseRef.current !== "holding") return;
    clearAll();
    setP("paused");
  }, []);

  const resume = useCallback(() => {
    if (posRef.current) runStop(posRef.current);
  }, [runStop]);

  const skip = useCallback(() => {
    if (posRef.current) advance();
  }, [advance]);

  // the start button, wherever it is
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const on = () => start();
    window.addEventListener(START_EVENT, on);
    return () => window.removeEventListener(START_EVENT, on);
  }, [start]);

  // arriving on a page mid-tour: once the warp has finished and the page has
  // settled, carry on from the saved stop
  useEffect(() => {
    if (busy) return;
    const s = load();
    if (!s || TOUR_PAGES[s.page] !== pathname) return;
    posRef.current = s;
    setPos(s);
    setP("moving");
    const id = window.setTimeout(() => runStop(s), 1400);
    return () => window.clearTimeout(id);
  }, [pathname, busy, runStop]);

  // the visitor takes over: a wheel, a touch or a scrolling key pauses the tour
  useEffect(() => {
    if (phase !== "moving" && phase !== "holding") return;
    const keys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End"]);
    const onWheel = () => pause();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
      else if (keys.has(e.key)) pause();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, pause, exit]);

  useEffect(() => () => clearAll(), []);

  if (phase === "idle") {
    return (
      <button type="button" className="tour-launch font-mono" onClick={start}>
        <span className="tour-launch__dot" aria-hidden="true" />
        Take the tour
        <span className="tour-launch__len">2 min</span>
      </button>
    );
  }

  if (phase === "end") {
    return (
      <div className="tour-card tour-card--end" role="dialog" aria-label="End of the tour">
        <p className="tour-card__meta font-mono">Guided tour · complete</p>
        <h2 className="tour-card__title font-display">That was the collection.</h2>
        <p className="tour-card__caption">
          Every exhibit you just saw is a component we can build into your website, in your brand and for your
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

  const n = pos ? stopNumber(pos.page, pos.stop) : 0;
  const pageName = pos ? PAGE_NAMES[TOUR_PAGES[pos.page]] : "";
  return (
    <div className="tour-card" role="region" aria-label="Guided tour" aria-live="polite" data-phase={phase}>
      <div className="tour-card__top">
        <p className="tour-card__meta font-mono">
          Guided tour · Stop {String(n).padStart(2, "0")} of {TOUR_TOTAL} · {pageName}
        </p>
        <button type="button" className="tour-card__x font-mono" onClick={exit} aria-label="End the tour">
          End
        </button>
      </div>
      {exhibit ? (
        <div key={`${pos?.page}-${pos?.stop}`} className="tour-card__body">
          <p className="tour-card__no font-mono">Exhibit {String(exhibitNo(exhibit)).padStart(2, "0")}</p>
          <h2 className="tour-card__title font-display">{exhibit.title}</h2>
          <p className="tour-card__caption">{exhibit.caption}</p>
          <p className="tour-card__use">
            <span className="font-mono">On your site</span> {exhibit.goodFor}
          </p>
          {exhibit.tryIt ? (
            <p className="tour-card__try font-mono">
              <i aria-hidden="true" /> Pause and try it: {exhibit.tryIt}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="tour-card__body">
          <p className="tour-card__caption">Travelling to {pageName}…</p>
        </div>
      )}
      <div className="tour-card__controls">
        {phase === "paused" ? (
          <button type="button" className="tour-card__btn font-mono" onClick={resume}>
            Resume
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
          {phase === "holding" && exhibit ? (
            <i key={holdKey} style={{ animationDuration: `${exhibit.dwell ?? 5000}ms` }} />
          ) : null}
        </span>
      </div>
    </div>
  );
}

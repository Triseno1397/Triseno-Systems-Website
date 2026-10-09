"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import "@/app/ai-projection.css";
import { addFrameJob } from "@/components/world/frameLoop";
import { getLenis } from "@/components/world/SmoothScroll";
import { reelFrame, session, setReel, timecode } from "./session";
import { toggleKeys, toggleSpec, useKeysOpen, useSpec } from "./OperatorKeys";
import { SLATE, chapterNumber } from "./projection.content";

/* ─────────────────────────────────────────────────────────────────────────
   THE SLATE — a mono instrument fixed bottom-centre for the whole visit,
   in the same lane as the corner buttons and clear of both:

     TC 00:02:14:08 . CH 04 COMPRESSION . FPS 60 . SPEC . ?

   TC   the page as a seven-minute reel at 24 fps: scroll depth mapped to a
        frame, printed as HH:MM:SS:FF (session.ts: reelFrame, timecode).
   CH   the chapter in view, by the same rule the progress rail uses (the
        [data-rail] section covering most of the viewport), numbered from
        its data-ch or from CHAPTERS.
   FPS  the rate this machine is actually drawing: the ticker's own interval,
        averaged over 30 ticks, rounded; blank while the tab is hidden.
   A 5px square at the left goes cyan while the reel is moving. A small "g"
   lights while a chord is armed. On every chapter change the CH field cuts:
   the new number and name wipe in left to right (clip-path, 600 ms). SPEC toggles the notes, ? opens the keys.

   Every write happens in one frame job's write phase, only when a field's
   string changed; scroll comes from Lenis (or window.scrollY), the document
   height is re-read once a second, the chapter scan runs at most every
   150 ms and only after a scroll. No layout read runs per frame.

   It also owns the page's single [data-fig] IntersectionObserver: a figure
   that scrolls into view is recorded once with session.figure(id).

   Portaled to <body>: on phones the chrome's bottom scrim sits at z 790 in
   the root stacking context, and nothing inside <main> (an isolated
   stacking context) could ever print above it; here the slate shares the
   corner buttons' z 800. ContentFade never sees it, so it is never masked.
   Hidden under html[data-warping] like the chrome; white under
   html[data-clean-dark]. Phones show CH and ? only; reduced motion shows no
   FPS.
   ───────────────────────────────────────────────────────────────────────── */

const noop = () => () => {};
const serverFalse = () => false;
const useMounted = () => useSyncExternalStore(noop, () => true, serverFalse);

/** the chapter scan: how often (s) and how often the section list is re-read */
const SCAN_EVERY = 0.15;
const LIST_EVERY = 2;
const FPS_TICKS = 30;

export default function Slate() {
  const mounted = useMounted();
  const spec = useSpec();
  const keysOpen = useKeysOpen();
  const rootRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLElement>(null);
  const chNumRef = useRef<HTMLElement>(null);
  const chNameRef = useRef<HTMLElement>(null);
  const fpsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const tcEl = tcRef.current;
    const chNum = chNumRef.current;
    const chName = chNameRef.current;
    const fpsEl = fpsRef.current;
    if (!root || !tcEl || !chNum || !chName || !fpsEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.toggleAttribute("data-reduced", reduced);

    /* figures: each [data-fig] host counts once, the first time it is seen */
    const watched = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.fig;
          if (id) session.figure(id);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.3 },
    );
    const watch = () => {
      document.querySelectorAll<HTMLElement>("main [data-fig]").forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        io.observe(el);
      });
    };
    watch();
    const timers: number[] = [window.setTimeout(watch, 1200), window.setTimeout(watch, 3200)];

    /* the reel */
    let y = 0;
    let max = 0;
    let lastMaxAt = -10;
    let lastFrame = -1;
    let dirty = true;
    let lastScan = -10;
    let lastList = -10;
    let sections: HTMLElement[] = [];
    let chKey = "";
    let pending: { num: string | null; rail: string } | null = null;
    let lastT = -1;
    let fpsSum = 0;
    let fpsN = 0;
    let fpsShown = -1;
    let hidden = document.visibilityState === "hidden";
    let movedAt = -10;
    let running = false;
    let armed = false;
    let cut: "a" | "b" = "b";

    const read = (t: number) => {
      const lenis = getLenis();
      y = lenis ? lenis.scroll : window.scrollY;
      if (t - lastMaxAt > 1) {
        lastMaxAt = t;
        const limit = lenis ? lenis.limit : 0;
        max = limit > 0 ? limit : document.documentElement.scrollHeight - window.innerHeight;
      }
      if (!dirty || t - lastScan < SCAN_EVERY) return;
      dirty = false;
      lastScan = t;
      if (!sections.length || t - lastList > LIST_EVERY) {
        lastList = t;
        sections = Array.from(document.querySelectorAll<HTMLElement>("main [data-rail]"));
      }
      // the section covering the most of the viewport right now
      const vh = window.innerHeight;
      let best = -1;
      let el: HTMLElement | null = null;
      for (const sec of sections) {
        const r = sec.getBoundingClientRect();
        const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (vis > best + 1) {
          best = vis;
          el = sec;
        }
      }
      if (!el) return;
      const rail = el.dataset.rail ?? "";
      const num = el.dataset.ch ?? chapterNumber(rail);
      const key = `${num}|${rail}`;
      if (key !== chKey) {
        chKey = key;
        pending = { num, rail };
      }
    };

    const write = (t: number) => {
      const p = max > 0 ? (y <= 0 ? 0 : y >= max ? 1 : y / max) : 0;
      const frame = reelFrame(p);
      if (frame !== lastFrame) {
        lastFrame = frame;
        tcEl.textContent = timecode(frame);
        setReel({ progress: p, frame });
        movedAt = t;
        if (!running) {
          running = true;
          root.setAttribute("data-running", "");
        }
      } else if (running && t - movedAt > 0.18) {
        running = false;
        root.removeAttribute("data-running");
      }
      if (pending) {
        const { num, rail } = pending;
        pending = null;
        chNum.textContent = num ?? "";
        chName.textContent = rail;
        // a cut: the new chapter wipes in. Alternating between two identical
        // keyframe names restarts the animation with no reflow
        cut = cut === "a" ? "b" : "a";
        root.setAttribute("data-cut", cut);
        root.toggleAttribute("data-unnumbered", !num);
        setReel({ ch: num, rail });
      }
      if (reduced) return;
      if (lastT >= 0) {
        const d = t - lastT;
        // a tab that was asleep is not a frame
        if (d > 0 && d < 0.1) {
          fpsSum += d;
          fpsN++;
        }
      }
      lastT = t;
      if (fpsN >= FPS_TICKS) {
        const f = hidden || fpsSum <= 0 ? 0 : Math.round(fpsN / fpsSum);
        fpsSum = 0;
        fpsN = 0;
        if (f !== fpsShown) {
          fpsShown = f;
          fpsEl.textContent = f ? String(f) : "--";
          setReel({ fps: f });
        }
      }
    };

    const stop = addFrameJob({ read, write });
    const onScroll = () => {
      dirty = true;
    };
    const onResize = () => {
      dirty = true;
      lastMaxAt = -10;
    };
    const onVis = () => {
      hidden = document.visibilityState === "hidden";
      fpsSum = 0;
      fpsN = 0;
      lastT = -1;
      if (hidden && fpsShown !== 0) {
        fpsShown = 0;
        fpsEl.textContent = "--";
        setReel({ fps: 0 });
      }
    };
    const onChord = (e: Event) => {
      const on = !!(e as CustomEvent<{ armed?: boolean }>).detail?.armed;
      if (on === armed) return;
      armed = on;
      root.toggleAttribute("data-armed", on);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("ai:chord", onChord);
    // sections arrive with the page (pin-spacers, fonts): scan again once settled
    timers.push(window.setTimeout(onScroll, 400), window.setTimeout(onResize, 1500));

    return () => {
      stop();
      io.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("ai:chord", onChord);
      setReel({ fps: 0, ch: null, rail: null });
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div ref={rootRef} className="ai-slate" role="group" aria-label={SLATE.label} data-world-layer="">
      <span aria-hidden="true" className="ai-slate__run" />
      <span aria-hidden="true" className="ai-slate__g">
        g
      </span>
      <span aria-hidden="true" className="ai-slate__f ai-slate__f--tc">
        <i>{SLATE.tc}</i>
        <b ref={tcRef}>00:00:00:00</b>
      </span>
      <span aria-hidden="true" className="ai-slate__sep ai-slate__sep--tc" />
      <span className="ai-slate__f ai-slate__f--ch">
        <i aria-hidden="true">{SLATE.ch}</i>
        <span className="sr-only">{SLATE.chSr}</span>
        <b ref={chNumRef} />
        <em ref={chNameRef} />
      </span>
      <span aria-hidden="true" className="ai-slate__sep ai-slate__sep--fps" />
      <span aria-hidden="true" className="ai-slate__f ai-slate__f--fps">
        <i>{SLATE.fps}</i>
        <b ref={fpsRef}>--</b>
      </span>
      <span aria-hidden="true" className="ai-slate__sep ai-slate__sep--btn" />
      <button
        type="button"
        className="ai-slate__btn ai-slate__btn--spec"
        aria-pressed={spec}
        aria-label={SLATE.specLabel}
        onClick={() => toggleSpec()}
      >
        {SLATE.spec}
      </button>
      <button
        type="button"
        className="ai-slate__btn ai-slate__btn--keys"
        aria-haspopup="dialog"
        aria-expanded={keysOpen}
        aria-controls="ai-keys"
        aria-label={SLATE.keysLabel}
        onClick={() => toggleKeys()}
      >
        {SLATE.keys}
      </button>
    </div>,
    document.body,
  );
}

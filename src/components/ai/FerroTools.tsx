"use client";

import "@/app/ai-ferro.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createFrameScrubber, type FrameFilm } from "@/lib/frameScrub";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";
import { cleanDark } from "./cleanDark";
import { coreReady } from "./coreReady";

gsap.registerPlugin(ScrollTrigger);

/**
 * The landing: "If it eats your day, we can build it", as a splash that
 * plays itself the moment the page arrives.
 *
 * Full bleed and dark from the first frame. As soon as half the film has
 * loaded, and the hero's core below has finished its one heavy build (it
 * runs while this frame is still, coreReady, so it never lands mid-splash;
 * never waited on for more than a few seconds), it runs on its own clock, not the scroll bar's: the flat mirror of
 * ferrofluid shoots up into a crown of spikes in under a second, the
 * headline slams down onto it with a flash and a jolt of the camera, and
 * the clock eases out so the last of the crown forming plays in slow
 * motion. Then it never quite stops: the final frames drift back and forth
 * very slowly, so the crown shimmers while you read.
 *
 * Scrolling pins the crown and docks the headline in the top lane; the six
 * tools we build most step through beside it, one card at a time, with an
 * index that doubles as a table of contents.
 *
 * While the landing is under the nav it owns the page's dark (cleanDark), so
 * the chrome is white line-work over the film instead of ink.
 *
 * The film is a generated clip cut into frames (public/frames/ferro-*),
 * drawn by lib/frameScrub. Reduced motion: no splash, no pin; the crown at
 * its final frame and every card.
 */

const FILM: FrameFilm = {
  landscape: { dir: "/frames/ferro-d", count: 180, width: 1920, height: 1080 },
  portrait: { dir: "/frames/ferro-m", count: 121, width: 720, height: 1280 },
};

/** a short line per tool, set in mono under the card */
const PHRASES: Record<string, string> = {
  catalog: "The right part, the first time.",
  revenue: "Every lead answered in minutes.",
  orchestration: "Answers like your best employee.",
  compression: "On your phone before you ask.",
  broadcast: "Built around how you work.",
  retainer: "Nobody re-types anything again.",
};

const N = CAPABILITIES.length;
/** the headline is docked by here; the cards follow */
const CARDS_FROM = 0.18;
/** where in the film the crown erupts; the headline lands on it */
const IMPACT = 0.8;
/** the splash's own length, and the longest it waits for every frame */
const SPLASH_S = 3.8;
const WAIT_MS = 4000;
const CORE_WAIT_MS = 4500;
/** expo.out reaches progress p at t = -T log2(1 - p) / 10 */
const IMPACT_AT = (-SPLASH_S * Math.log2(1 - IMPACT)) / 10;
const SLAM_S = 0.4;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function FerroTools() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const dark = ScrollTrigger.create({
      trigger: root,
      start: "top top+=1",
      end: "bottom top+=72",
      // measured after the pin below has added its length to the section
      refreshPriority: -1,
      onToggle: (self) => (self.isActive ? cleanDark.enter("landing") : cleanDark.leave("landing")),
    });
    if (dark.isActive || window.scrollY < 2) cleanDark.enter("landing");
    return () => {
      dark.kill();
      cleanDark.leave("landing");
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    const flash = flashRef.current;
    if (!stage || !media || !canvas || !flash) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start: (() => void) | null = null;
    const scrub = createFrameScrubber(canvas, FILM, () => media.setAttribute("data-ready", ""), {
      // the frames arrive spread across the film (every 16th, 8th, 4th...), so
      // with half of them in every gap is one frame wide and the rest fill
      // in while it plays
      onFetched: (n, total) => n >= total * 0.5 && start?.(),
      onLoaded: () => start?.(),
    });
    scrub.load();
    const ro = new ResizeObserver(() => scrub.resize());
    ro.observe(stage);

    const title = stage.querySelector<HTMLElement>(".ai-ft__title");
    const slam = stage.querySelector<HTMLElement>(".ai-ft__slam");
    const anchor = stage.querySelector<HTMLElement>(".ai-ft__anchor");
    const aside = stage.querySelector<HTMLElement>(".ai-ft__aside");
    const cue = stage.querySelector<HTMLElement>(".ai-ft__cue");
    const shade = stage.querySelector<HTMLElement>(".ai-ft__shade");
    const cards = Array.from(stage.querySelectorAll<HTMLElement>(".ai-ft__card"));
    const items = Array.from(stage.querySelectorAll<HTMLElement>(".ai-ft__item"));

    if (reduce) {
      stage.setAttribute("data-static", "");
      scrub.setProgress(1);
      return () => {
        ro.disconnect();
        scrub.dispose();
      };
    }

    /* ── the splash: the film on its own clock ── */
    const clock = { p: 0 };
    const draw = () => scrub.setProgress(clock.p);
    scrub.setProgress(0);
    gsap.set(slam, { opacity: 0, scale: 2.6 });
    gsap.set(cue, { opacity: 0 });

    const splash = gsap.timeline({ paused: true });
    splash
      // fast out of the gate, then a long ease so the crown lands in slow motion
      .to(clock, { p: 1, duration: SPLASH_S, ease: "expo.out", onUpdate: draw }, 0)
      // the headline falls onto the screen and lands with the eruption
      .to(slam, { opacity: 1, scale: 1, duration: SLAM_S, ease: "power4.in" }, IMPACT_AT - SLAM_S)
      .fromTo(flash, { opacity: 0 }, { opacity: 0.55, duration: 0.04, ease: "none" }, IMPACT_AT)
      .to(flash, { opacity: 0, duration: 0.8, ease: "power2.out" }, IMPACT_AT + 0.04)
      .fromTo(
        media,
        { x: 0, y: 0 },
        {
          keyframes: [
            { x: -16, y: 10, duration: 0.045 },
            { x: 12, y: -8, duration: 0.05 },
            { x: -8, y: 5, duration: 0.055 },
            { x: 4, y: -3, duration: 0.07 },
            { x: 0, y: 0, duration: 0.1 },
          ],
        },
        IMPACT_AT,
      )
      // the camera settles back from the jolt as the slow motion takes over
      .fromTo(media, { scale: 1.08 }, { scale: 1, duration: SPLASH_S, ease: "power2.out" }, IMPACT_AT)
      .to(cue, { opacity: 1, duration: 0.9, ease: "power2.out" }, IMPACT_AT + 1.4)
      // and the crown never quite stops: the last frames drift, slowly
      .add(() => {
        gsap.fromTo(clock, { p: 1 }, { p: 0.95, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: draw });
      });

    let started = false;
    let filmIn = false;
    let coreIn = false;
    const go = () => {
      if (started || !filmIn || !coreIn) return;
      started = true;
      stage.setAttribute("data-played", "");
      splash.play(0);
    };
    start = () => {
      filmIn = true;
      go();
    };
    const offCore = coreReady.then(() => {
      coreIn = true;
      go();
    });
    // a slow connection still gets the splash, with the nearest frames standing
    // in; a core that never reports in never holds it either
    const fallback = window.setTimeout(() => start?.(), WAIT_MS);
    const coreCeiling = window.setTimeout(() => {
      coreIn = true;
      go();
    }, CORE_WAIT_MS);

    /* ── the scroll: dock the headline, step through the tools ── */
    const easeDock = gsap.parseEase("power3.inOut");
    let dock = { x: 0, y: 0, s: 0.5 };

    const measure = () => {
      if (!title) return;
      const phone = stage.getBoundingClientRect().width < 768;
      title.style.transform = "";
      const t = title.getBoundingClientRect();
      const a = anchor?.getBoundingClientRect();
      if (a) dock = { x: a.left - t.left, y: a.top - t.top, s: phone ? 0.78 : 0.42 };
    };

    let active = -2;
    const apply = (p: number) => {
      const k = easeDock(clamp01(p / CARDS_FROM));
      const s = 1 - (1 - dock.s) * k;
      if (title) title.style.transform = `translate(-50%, -50%) translate3d(${dock.x * k}px, ${dock.y * k}px, 0) scale(${s})`;
      if (aside) {
        aside.style.opacity = String(k);
        aside.style.transform = `translate3d(0, ${(1 - k) * 12}px, 0)`;
      }
      if (cue) cue.style.visibility = k > 0.05 ? "hidden" : "";
      if (shade) shade.style.opacity = String(k);

      const idx = p < CARDS_FROM ? -1 : Math.min(N - 1, Math.floor(((p - CARDS_FROM) / (1 - CARDS_FROM)) * N));
      if (idx === active) return;
      active = idx;
      cards.forEach((c, i) => c.toggleAttribute("data-active", i === idx));
      items.forEach((it, i) => {
        it.toggleAttribute("data-on", i === idx);
        it.toggleAttribute("data-done", i < idx);
      });
      if (countRef.current) countRef.current.textContent = String(Math.max(0, idx) + 1).padStart(2, "0");
    };

    const st = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: `+=${N * 60 + 40}%`,
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: (self) => {
        measure();
        apply(self.progress);
      },
      onUpdate: (self) => apply(self.progress),
    });
    stRef.current = st;
    measure();
    apply(0);

    return () => {
      window.clearTimeout(fallback);
      window.clearTimeout(coreCeiling);
      offCore();
      splash.kill();
      gsap.killTweensOf(clock);
      st.kill();
      stRef.current = null;
      ro.disconnect();
      scrub.dispose();
    };
  }, []);

  /** the index is a table of contents: an item scrolls to its tool */
  const jump = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    const p = CARDS_FROM + ((i + 0.5) / N) * (1 - CARDS_FROM);
    window.scrollTo({ top: st.start + (st.end - st.start) * p, behavior: "smooth" });
  };

  return (
    <section
      ref={rootRef}
      id="capabilities"
      data-rail="Capabilities"
      data-ch="01"
      data-no-fade=""
      aria-labelledby="ai-cap-title"
      className="ai-ft relative z-10"
    >
      <div ref={stageRef} className="ai-ft__stage">
        <div
          ref={mediaRef}
          className="ai-ft__media"
          role="img"
          aria-label="A pool of liquid metal on a dark steel plate shooting up into a crown of mirror-bright spikes"
        >
          <canvas ref={canvasRef} className="ai-ft__canvas" aria-hidden="true" />
        </div>
        <span ref={flashRef} aria-hidden="true" className="ai-ft__flash" />
        <span aria-hidden="true" className="ai-ft__shade" />
        <span aria-hidden="true" className="ai-ft__anchor" />

        <div className="ai-ft__layer">
          <h2 id="ai-cap-title" className="ai-ft__title font-display">
            <span className="ai-ft__slam">
              <span>If It Eats Your Day,</span>
              <span>We Can Build It</span>
            </span>
          </h2>

          <div className="ai-ft__aside">
            <p className="ai-ft__intro">{CAPABILITIES_INTRO.body}</p>
            <ol className="ai-ft__index font-mono" aria-label="The six tools">
              {CAPABILITIES.map((cap, i) => (
                <li key={cap.id} className="ai-ft__item">
                  <button type="button" className="ai-ft__itembtn" onClick={() => jump(i)}>
                    <i aria-hidden="true" />
                    <span className="ai-ft__itemn">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ai-ft__itemname">{cap.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="ai-ft__count font-mono" aria-hidden="true">
              <span ref={countRef}>01</span>
              <span>/ {String(N).padStart(2, "0")}</span>
            </p>
          </div>

          <div className="ai-ft__cards" aria-live="polite">
            {CAPABILITIES.map((cap, i) => (
              <article key={cap.id} className="ai-ft__card">
                <p className="ai-ft__tag font-mono">
                  <b>{String(i + 1).padStart(2, "0")}</b> / {cap.tag}
                </p>
                <h3 className="ai-ft__cardtitle font-display">{cap.title}</h3>
                <p className="ai-ft__cardbody">{cap.body}</p>
                <p className="ai-ft__phrase font-mono">{PHRASES[cap.id] ?? ""}</p>
              </article>
            ))}
          </div>

          <p className="ai-ft__cap font-mono" aria-hidden="true">
            <b>01</b> / Capabilities
          </p>
        </div>

        <p className="ai-ft__cue font-mono" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </p>
      </div>
    </section>
  );
}

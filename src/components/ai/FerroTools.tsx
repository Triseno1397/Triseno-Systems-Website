"use client";

import "@/app/ai-ferro.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createFrameScrubber, type FrameFilm } from "@/lib/frameScrub";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";

gsap.registerPlugin(ScrollTrigger);

/**
 * 02, Capabilities: "If it eats your day, we can build it", as a film the
 * scroll bar plays.
 *
 * A window on the paper opens to full bleed (a clip-path, so nothing
 * reflows), crop marks riding its corners, the headline set twice, ink on
 * the paper and paper on the plate, so each letter changes colour exactly
 * where it crosses the edge. Once open, the headline docks small in the top
 * lane and the film runs under the scroll: a flat mirror of ferrofluid lifts
 * at the centre and climbs into a crown of spikes, and the six tools we
 * build most step through beside it, one card at a time, with an index that
 * doubles as a table of contents. Scroll back and the crown sinks.
 *
 * The film is a generated clip cut into frames (public/frames/ferro-*),
 * drawn by lib/frameScrub, fetched only when the section is near.
 * Reduced motion: no pin; the open plate at its final frame, every card.
 */

const FILM: FrameFilm = {
  landscape: { dir: "/frames/ferro-d", count: 121, width: 1600, height: 900 },
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
/** the window is open by here; the cards begin once the fluid has lifted */
const OPEN_BY = 0.16;
const CARDS_FROM = 0.3;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function FerroTools() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const media = mediaRef.current;
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !media || !paper || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrub = createFrameScrubber(canvas, FILM, () => media.setAttribute("data-ready", ""));

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        scrub.load();
        io.disconnect();
      },
      { rootMargin: "120% 0px 120% 0px" },
    );
    io.observe(stage);
    const ro = new ResizeObserver(() => scrub.resize());
    ro.observe(stage);

    const crops = Array.from(stage.querySelectorAll<HTMLElement>(".ai-ft__crop"));
    const titles = Array.from(stage.querySelectorAll<HTMLElement>(".ai-ft__title"));
    const anchor = stage.querySelector<HTMLElement>(".ai-ft__anchor");
    const aside = stage.querySelector<HTMLElement>(".ai-ft__aside");
    const cards = Array.from(stage.querySelectorAll<HTMLElement>(".ai-ft__card"));
    const items = Array.from(stage.querySelectorAll<HTMLElement>(".ai-ft__item"));

    if (reduce) {
      stage.setAttribute("data-static", "");
      scrub.load();
      scrub.setProgress(1);
      return () => {
        io.disconnect();
        ro.disconnect();
        scrub.dispose();
      };
    }

    const easeOpen = gsap.parseEase("power2.inOut");
    const easeDock = gsap.parseEase("power3.inOut");
    let W = 1;
    let H = 1;
    let phone = false;
    let dock = { x: 0, y: 0, s: 0.5 };

    const measure = () => {
      const r = stage.getBoundingClientRect();
      W = r.width;
      H = r.height;
      phone = W < 768;
      // the headline docks with its top-left on the anchor, scaled down
      titles.forEach((t) => (t.style.transform = ""));
      const t = titles[0]?.getBoundingClientRect();
      const a = anchor?.getBoundingClientRect();
      if (t && a) dock = { x: a.left - t.left, y: a.top - t.top, s: phone ? 0.78 : 0.42 };
    };

    let active = -2;
    const apply = (p: number) => {
      const o = easeOpen(clamp01(p / OPEN_BY));
      const ix = (1 - o) * (phone ? 0.08 : 0.31) * W;
      const iy = (1 - o) * (phone ? 0.3 : 0.24) * H;
      const clip = `inset(${iy}px ${ix}px ${iy}px ${ix}px)`;
      media.style.clipPath = clip;
      paper.style.clipPath = clip;
      crops.forEach((c) => {
        const sx = c.dataset.c === "tl" || c.dataset.c === "bl" ? ix : -ix;
        const sy = c.dataset.c === "tl" || c.dataset.c === "tr" ? iy : -iy;
        c.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      });

      scrub.setProgress(clamp01((p - 0.12) / 0.85));

      const k = easeDock(clamp01((p - OPEN_BY) / (CARDS_FROM - OPEN_BY)));
      const s = 1 - (1 - dock.s) * k;
      const tr = `translate(-50%, -50%) translate3d(${dock.x * k}px, ${dock.y * k}px, 0) scale(${s})`;
      titles.forEach((t) => (t.style.transform = tr));
      if (aside) {
        aside.style.opacity = String(k);
        aside.style.transform = `translate3d(0, ${(1 - k) * 12}px, 0)`;
      }

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
      end: `+=${N * 65 + 90}%`,
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
      st.kill();
      stRef.current = null;
      io.disconnect();
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
      data-ch="02"
      aria-labelledby="ai-cap-title"
      className="ai-ft relative z-10"
    >
      <div ref={stageRef} className="ai-ft__stage">
        <div
          ref={mediaRef}
          className="ai-ft__media"
          role="img"
          aria-label="A pool of liquid metal on a dark steel plate rising into a crown of mirror-bright spikes"
        >
          <canvas ref={canvasRef} className="ai-ft__canvas" aria-hidden="true" />
        </div>
        <span aria-hidden="true" className="ai-ft__crop" data-c="tl" />
        <span aria-hidden="true" className="ai-ft__crop" data-c="tr" />
        <span aria-hidden="true" className="ai-ft__crop" data-c="bl" />
        <span aria-hidden="true" className="ai-ft__crop" data-c="br" />
        <span aria-hidden="true" className="ai-ft__anchor" />

        {/* ink on the paper: the headline only, for the moment it crosses the edge */}
        <div className="ai-ft__layer ai-ft__layer--ink" aria-hidden="true">
          <p className="ai-ft__title font-display">
            <span>If It Eats Your Day,</span>
            <span>We Can Build It</span>
          </p>
        </div>

        {/* paper on the plate: the headline, the index and the cards */}
        <div ref={paperRef} className="ai-ft__layer ai-ft__layer--paper">
          <h2 id="ai-cap-title" className="ai-ft__title font-display">
            <span>If It Eats Your Day,</span>
            <span>We Can Build It</span>
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
            <b>02</b> / Capabilities
          </p>
        </div>
      </div>
    </section>
  );
}

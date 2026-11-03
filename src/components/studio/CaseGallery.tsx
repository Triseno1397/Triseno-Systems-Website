"use client";

import "../../app/studio-cases.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { discover } from "@/lib/discover";
import Aperture from "./Aperture";

/**
 * /studio §2 — who we make it for: a gallery of four businesses. It took the
 * place of the Formats filmstrip (2026-11-02); the showreel hero stays first,
 * and its "See what we make" button lands here (#formats).
 *
 * (Moved here from the retired AI Infrastructure page on 2026-11-02, where it
 * was the "museum". Same room, same camera; the copy and the hue are
 * Creative's now.)
 *
 * A dark gallery after hours. Four glass cases on marble plinths, each holding
 * a tilt-shift miniature of a kind of business (a production studio, a stock
 * room, a machine shop, a clinic front desk), all moving at once on one floor
 * loop. The spotlights come on one by one as the page opens. Click a case (or
 * focus it and press Enter) and the camera glides into it: the miniature is
 * alive (a silent seamless loop), and beside it the shoot sheet prints the ad
 * the studio would make for that business, step by step, each step lighting
 * one stop of an amber line drawn through the miniature itself.
 *
 * The way out is a placard in the corner of the case: a tiny floor plan of
 * the four cases with this one lit, "Back to the floor"; Esc does the same.
 *
 * On a landscape screen the gallery fills the screen, the title standing in
 * the dark above the cases. Phones keep a framed 4:3 stage under the title. Reduced motion: lights on, no camera travel, the line drawn,
 * the stills instead of the films.
 */

interface Case {
  key: string;
  title: string;
  full: string;
  body: string;
  /** the shoot sheet: stage, what happens, when */
  log: Array<[stage: string, line: string, when: string]>;
  still: string;
  film: string;
  /** the case's centre across the gallery plate, percent of its width */
  gx: number;
  /** one stop per log line, in the case film's own pixels (1600 x 900) */
  path: ReadonlyArray<readonly [number, number]>;
}

const INTRO = {
  floor: "Four businesses, one ad each. Step into a case to see how we would make theirs.",
};

const CASES: Case[] = [
  {
    key: "media",
    title: "Studios & Agencies",
    full: "A production studio",
    body: "A studio selling its own crew: a fifteen-second teaser cut from one day on set, built to stop a producer mid-scroll.",
    log: [
      ["brief", "sell the crew, not the gear", "day 1"],
      ["hook", "first second: the dolly push", "0.0s"],
      ["shoot", "one day on set, two cameras", "day 2"],
      ["cut", "15s teaser, captions burned in", "day 3"],
      ["launch", "three hooks tested on Meta", "week 1"],
    ],
    still: "/worlds/ai-mus-media.webp",
    film: "/videos/ai-mus-media.mp4",
    gx: 14.8,
    // the camera on the dolly, the crew, the boom, the gear cart, the editor
    path: [[660, 432], [490, 462], [702, 330], [930, 528], [976, 420]],
  },
  {
    key: "retail",
    title: "Online Stores",
    full: "An online store",
    body: "A catalog brand with a thousand products: a UGC-style demo that answers the one question every buyer asks before checkout.",
    log: [
      ["brief", "answer 'will it fit?' on camera", "day 1"],
      ["hook", "the box opened in the first frame", "0.0s"],
      ["shoot", "creator demo in the stock room", "day 2"],
      ["cut", "9:16, 4:5 and 1:1 from one edit", "day 3"],
      ["launch", "retargeting set live on TikTok", "week 1"],
    ],
    still: "/worlds/ai-mus-retail.webp",
    film: "/videos/ai-mus-retail.mp4",
    gx: 37.3,
    // the office computer, the shelves, the right box, the forklift, the packing table
    path: [[410, 498], [560, 330], [742, 300], [664, 482], [926, 506]],
  },
  {
    key: "trades",
    title: "Trades & Industrial",
    full: "A machine shop",
    body: "A shop that wins on precision: a 'how it's made' spot with sparks, tolerances and the finished part, made for buyers who scroll on the floor.",
    log: [
      ["brief", "show the tolerance, not the logo", "day 1"],
      ["hook", "first second: sparks off the lathe", "0.0s"],
      ["shoot", "one morning on the shop floor", "day 2"],
      ["cut", "20s spot, ASMR sound up front", "day 3"],
      ["launch", "LinkedIn and YouTube pre-roll", "week 1"],
    ],
    still: "/worlds/ai-mus-trades.webp",
    film: "/videos/ai-mus-trades.mp4",
    gx: 62.7,
    // the office, the parts rack, the machinist, the tool chest, the bench
    path: [[1000, 342], [860, 372], [642, 414], [816, 456], [736, 520]],
  },
  {
    key: "services",
    title: "Clinics & Offices",
    full: "A clinic front desk",
    body: "A practice that needs bookings, not likes: a warm testimonial-style ad that ends on one clear step, book online.",
    log: [
      ["brief", "one ask: book online today", "day 1"],
      ["hook", "a real question, asked to camera", "0.0s"],
      ["shoot", "front desk and waiting room", "day 2"],
      ["cut", "30s story, 6s bumper from it", "day 3"],
      ["launch", "local radius ads on Instagram", "week 1"],
    ],
    still: "/worlds/ai-mus-services.webp",
    film: "/videos/ai-mus-services.mp4",
    gx: 85.2,
    // the form, the receptionist's screen, the door, the waiting reader, the seated man
    path: [[636, 410], [534, 380], [726, 350], [966, 420], [766, 476]],
  },
];

gsap.registerPlugin(ScrollTrigger);

/** the floor fills the screen on landscape screens (studio-cases.css carries the same query) */
const FULL_MQ = "(min-aspect-ratio: 1/1) and (min-width: 768px)";

/** a loop of the whole floor, every miniature moving at once */
const GALLERY_FILM = "/videos/ai-mus-gallery.mp4";
const GALLERY_STILL = "/worlds/ai-mus-gallery.webp";

/** the gallery plate's case row: vertical centre, and the zoom that fills the stage with one case */
const GY = 37.8;
const ZOOM = 2.55;

const STEP_MS = 1150;
/** a pick from inside another case: out to the gallery, then in to the next */
const TRAVEL_MS = 650;

/** the case's film: silent, looping, playing only while on screen; reduced
 *  motion and data-saver keep the still */
function CaseFilm({ src, poster, className = "sxc__film", eager = false }: { src: string; poster: string; className?: string; eager?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conn?.saveData) return;
    const ahead = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ahead.disconnect();
      v.preload = "auto";
      v.load();
    }, { rootMargin: "60% 0px 60% 0px" });
    ahead.observe(v);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => {
      ahead.disconnect();
      io.disconnect();
    };
  }, []);
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      onPlaying={(e) => e.currentTarget.setAttribute("data-playing", "")}
    />
  );
}

export default function CaseGallery() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(-1);
  const [run, setRun] = useState(0);
  const [lit, setLit] = useState(false);
  const [inside, setInside] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const reduced = useRef(false);
  const timers = useRef<number[]>([]);
  const backRef = useRef<HTMLButtonElement>(null);
  const hitRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const kase = CASES[active];
  const total = kase.log.length;

  /* full screen (landscape): while the floor is under the nav, the page's
     content fade is off, so the gallery runs to the top edge instead of
     dissolving into the soundstage behind it (html[data-fade-hold], world.css) */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const mq = window.matchMedia(FULL_MQ);
    const root = document.documentElement;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top+=72",
      end: "bottom top+=72",
      refreshPriority: -1,
      onToggle: (self) => root.toggleAttribute("data-fade-hold", self.isActive && mq.matches),
    });
    return () => {
      st.kill();
      root.removeAttribute("data-fade-hold");
    };
  }, []);

  /* the lights come on as the gallery arrives; the camera waits on the floor */
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setLit(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.length = 0;
  };

  /* one run: the sheet's steps settle one after another, then the end line */
  useEffect(() => {
    if (run === 0) return;
    clear();
    if (reduced.current) {
      setStep(total);
      return clear;
    }
    setStep(-1);
    for (let i = 0; i <= total; i++) timers.current.push(window.setTimeout(() => setStep(i), 350 + i * STEP_MS));
    return clear;
  }, [run, active, total]);

  /* a pick: from the floor the camera goes straight in; from inside another
     case it backs out first */
  const pick = (i: number) => {
    if (i === active && inside) return;
    clear();
    setLit(true);
    const goIn = () => {
      discover("studio-case");
      setActive(i);
      setInside(true);
      setRun((r) => r + 1);
      window.setTimeout(() => backRef.current?.focus({ preventScroll: true }), reduced.current ? 0 : 900);
    };
    if (reduced.current || !inside) {
      goIn();
      return;
    }
    setInside(false);
    setStep(-1);
    timers.current.push(window.setTimeout(goIn, TRAVEL_MS));
  };

  const leave = useCallback(() => {
    if (!inside) return;
    clear();
    setInside(false);
    setStep(-1);
    const from = active;
    window.setTimeout(() => hitRefs.current[from]?.focus({ preventScroll: true }), 60);
  }, [inside, active]);

  useEffect(() => {
    if (!inside) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inside, leave]);

  useEffect(() => () => clear(), []);

  const closed = step >= total;
  const nodeState = (n: number): "off" | "run" | "done" => (step < n ? "off" : step === n ? "run" : "done");

  return (
    <section
      ref={rootRef}
      id="formats"
      data-rail="Cases"
      data-no-fade=""
      aria-labelledby="sxc-title"
      className="sxc-section sxc relative z-10"
    >
      <div className="sxc-wrap">
        <header className="sxc__head">
          <div>
            <p className="sxc-label sxc__eyebrow">
              <Aperture size={13} strokeWidth={1.25} glow />
              <span>
                <b>02</b> / Who we make it for
              </span>
            </p>
            <h2 id="sxc-title" className="sxc-h2 font-display font-semibold uppercase">
              One studio. Every format the feed demands.
            </h2>
          </div>
          <p key={inside ? active : "floor"} className="sxc-body sxc__body">
            {inside ? kase.body : INTRO.floor}
          </p>
        </header>

        <div className="sxc__room" data-lit={lit ? "" : undefined} data-inside={inside ? "" : undefined}>
          <div className="sxc__stage">
            <div
              className="sxc__frame sxc__gallery"
              style={{ ["--gx" as string]: `${kase.gx}%`, ["--gy" as string]: `${GY}%`, ["--z" as string]: ZOOM }}
            >
              <picture>
                <source media="(max-width: 767px)" srcSet="/worlds/ai-mus-gallery-m.webp" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={GALLERY_STILL} alt="" decoding="async" loading="lazy" draggable={false} />
              </picture>
              <CaseFilm src={GALLERY_FILM} poster={GALLERY_STILL} className="sxc__film sxc__floorfilm" eager />
              {CASES.map((c, i) => (
                <span key={c.key} aria-hidden="true" className="sxc__lamp" style={{ ["--x" as string]: `${c.gx}%`, ["--i" as string]: i }} />
              ))}
              {CASES.map((c, i) => (
                <button
                  key={c.key}
                  ref={(el) => {
                    hitRefs.current[i] = el;
                  }}
                  type="button"
                  tabIndex={inside ? -1 : 0}
                  aria-label={`Step into case ${i + 1}: ${c.title}`}
                  className="sxc__hit"
                  style={{ ["--x" as string]: `${c.gx}%`, ["--i" as string]: i }}
                  onClick={() => pick(i)}
                >
                  <span className="sxc__plaque" aria-hidden="true">
                    <span className="sxc__plaquen font-mono">Case {String(i + 1).padStart(2, "0")}</span>
                    <span className="sxc__plaquename font-display">{c.title}</span>
                    <span className="sxc__plaquego font-mono">Step inside</span>
                  </span>
                </button>
              ))}
            </div>

            {CASES.map((c, i) => {
              const on = i === active;
              return (
                <div key={c.key} className="sxc__frame sxc__case" data-on={on ? "" : undefined} aria-hidden={!on}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="sxc__still" src={c.still} alt="" decoding="async" loading="lazy" draggable={false} />
                  {on ? <CaseFilm key={c.film} src={c.film} poster={c.still} /> : null}
                  {on ? (
                    <svg className="sxc__path" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
                      {c.path.slice(1).map(([x, y], s) => {
                        const [px, py] = c.path[s];
                        return (
                          <line
                            key={`l${s}`}
                            x1={px}
                            y1={py}
                            x2={x}
                            y2={y}
                            pathLength={1}
                            className="sxc__seg"
                            data-on={nodeState(s + 1) !== "off" ? "" : undefined}
                          />
                        );
                      })}
                      {c.path.map(([x, y], n) => (
                        <g key={`n${n}`} className="sxc__node" data-state={nodeState(n)} transform={`translate(${x} ${y})`}>
                          <circle className="sxc__halo" r="22" />
                          <circle className="sxc__dot" r="6" />
                        </g>
                      ))}
                    </svg>
                  ) : null}
                </div>
              );
            })}

            <span aria-hidden="true" className="sxc__vignette" />
            <p aria-hidden="true" className="sxc__hud font-mono">
              <i /> {inside ? <>Case {String(active + 1).padStart(2, "0")} · on set</> : "The floor · pick a case"}
            </p>

            <button
              ref={backRef}
              type="button"
              className="sxc__back"
              tabIndex={inside ? 0 : -1}
              aria-hidden={!inside}
              onClick={leave}
            >
              <span className="sxc__plan" aria-hidden="true">
                {CASES.map((c, i) => (
                  <i key={c.key} data-on={i === active ? "" : undefined} />
                ))}
              </span>
              <span className="sxc__backtext">
                <span className="sxc__backlead font-mono">Case {String(active + 1).padStart(2, "0")} of 04</span>
                <span className="sxc__backgo font-display">Back to the floor</span>
              </span>
              <kbd className="sxc__esc font-mono" aria-hidden="true">
                Esc
              </kbd>
            </button>
          </div>

          {/* the shoot sheet: the ad, step by step */}
          <div className="sxc__label">
            <div role="region" aria-label={`${kase.full}: the ad we would make`} className="sxc-console">
              <div className="sxc-console__bar">
                <span className="sxc-console__lights" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="sxc-console__path">
                  shoot sheet / <b>{kase.title.toLowerCase()}</b>
                </span>
                <button
                  type="button"
                  className="sxc-console__replay"
                  onClick={() => (inside ? setRun((r) => r + 1) : pick(active))}
                  aria-label="Replay"
                >
                  <ArrowClockwise size={14} weight="light" aria-hidden="true" />
                  <span>Replay</span>
                </button>
              </div>

              <ol className="sxc-trace" aria-live="polite">
                <li className="sxc-trace__boot" data-on="">
                  <span className="sxc-trace__t">brief</span>
                  <span>
                    {kase.full.toLowerCase()} / <em>one shoot</em> / every format the feed wants
                  </span>
                </li>
                {kase.log.map(([stage, line, when], i) => {
                  const state = step > i ? "done" : step === i ? "run" : "wait";
                  return (
                    <li key={`${active}-${i}`} className="sxc-trace__row" data-state={state}>
                      <span className="sxc-trace__t">{String(i + 1).padStart(2, "0")}</span>
                      <span className="sxc-trace__agent">{stage}</span>
                      <span className="sxc-trace__msg">
                        <span className="sxc-trace__said">
                          <span className="sxc-trace__type" style={{ ["--n" as string]: line.length }}>
                            {line}
                          </span>
                        </span>
                      </span>
                      <span
                        className="sxc-trace__state"
                        aria-label={state === "done" ? `done, ${when}` : state === "run" ? "in progress" : "next"}
                      >
                        {state === "done" ? (
                          <>
                            <i className="sxc-tick" aria-hidden="true" /> {when}
                          </>
                        ) : state === "run" ? (
                          <i className="sxc-spin" aria-hidden="true" />
                        ) : (
                          <i className="sxc-wait" aria-hidden="true" />
                        )}
                      </span>
                    </li>
                  );
                })}
                <li className="sxc-trace__end" data-on={closed ? "" : undefined}>
                  <span className="sxc-trace__t">&gt;</span>
                  <span>
                    ad ready <b>{total}/{total}</b> / 9:16 · 4:5 · 1:1 / cut for the feed it runs in
                  </span>
                </li>
              </ol>
              <p className="sxc-console__note">An example campaign for a fictional business.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

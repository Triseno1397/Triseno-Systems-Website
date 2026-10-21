"use client";

import "../../app/ai-museum.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { INDUSTRIES, INDUSTRIES_INTRO } from "./content";
import { session, useSession } from "./session";
import RoutingSlip, { type SlipOutcome } from "./RoutingSlip";
import { CONSOLE_SLIP } from "./console-slip.content";

/**
 * 4. Who it is for: a small museum of businesses.
 *
 * A dark gallery after hours. Four glass cases stand on marble plinths, each
 * holding a tilt-shift miniature of a kind of business (a production studio,
 * a stock room, a machine shop, a clinic front desk). As the section arrives
 * the spotlights come on one by one, and the camera stays out on the floor:
 * all four cases in view at once, each with its brass placard on the plinth.
 * Click a case (or focus it and press Enter) and the camera glides into it,
 * where the miniature is alive (a silent Kling loop that starts and ends on
 * the same frame, so it loops without a seam).
 *
 * Beside the case stands its exhibit label: the dark, backlit console that
 * prints that business's day, step by step. Each step lights one stop of a
 * thin cyan line drawn through the miniature itself (an SVG over the film, in
 * the film's own coordinates), so the tool is seen doing the job inside the
 * model while the label says what it did.
 *
 * The way out is a placard of its own in the corner of the case: a tiny floor
 * plan of the four cases with this one lit, "Back to the floor", and the Esc
 * key does the same. Everything else the console did before stays: Replay,
 * the halted step on Trades & Industrial and its routing slip, the session
 * memory.
 *
 * GALLERY_FILM, when set, is a loop of the whole floor with all four
 * miniatures moving at once, laid over the gallery still.
 *
 * The camera is CSS (transform on the gallery plate about the case's centre,
 * opacity for the hand-off to the case film), so it follows clicks instead of
 * a baked move. Reduced motion: lights on, no camera travel, the trace settled,
 * the full line drawn, the stills instead of the films.
 */

/** the tab and step that halt: the cycle whose fourth step hands off to a person */
const HALT_TAB = INDUSTRIES.findIndex((ind) => ind.log.some(([agent]) => agent === "fallback"));
const HALT_AT = HALT_TAB >= 0 ? INDUSTRIES[HALT_TAB].log.findIndex(([agent]) => agent === "fallback") : -1;

type Halt = "none" | "line" | "slip" | "done";
type Review = { kind: SlipOutcome; value?: string; ms: number };
type Row = { key: string; agent: string; msg: string; ms: number; at: number; canHalt: boolean; human: boolean; node: number };

/** a step's duration as the console prints it; a person's time is in seconds */
function fmtMs(ms: number, human = false) {
  return !human && ms < 10000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * One case per industry. `gx` is the case's centre across the gallery plate
 * (percent of its width); the gallery shot puts all four at the same height.
 * `path` is one stop per log line, in the case film's own pixels (1600 x 900),
 * placed on the thing in the miniature that step is about.
 */
const CASES = [
  {
    key: "media",
    still: "/worlds/ai-mus-media.webp",
    film: "/videos/ai-mus-media.mp4",
    gx: 14.8,
    meta: "Footage / delivery",
    // camera on the dolly, crew with the tablet, the boom, the gear cart, the editor
    path: [[660, 432], [490, 462], [702, 330], [930, 528], [976, 420]],
  },
  {
    key: "retail",
    still: "/worlds/ai-mus-retail.webp",
    film: "/videos/ai-mus-retail.mp4",
    gx: 37.3,
    meta: "Catalog / orders",
    // the office computer, the shelves, the right box, the forklift, the packing table
    path: [[410, 498], [560, 330], [742, 300], [664, 482], [926, 506]],
  },
  {
    key: "trades",
    still: "/worlds/ai-mus-trades.webp",
    film: "/videos/ai-mus-trades.mp4",
    gx: 62.7,
    meta: "Quotes / orders",
    // the office inbox, the parts rack, the machinist (a person), the tool chest, the bench
    path: [[1000, 342], [860, 372], [642, 414], [816, 456], [736, 520]],
  },
  {
    key: "services",
    still: "/worlds/ai-mus-services.webp",
    film: "/videos/ai-mus-services.mp4",
    gx: 85.2,
    meta: "Bookings / intake",
    // the patient's form, the receptionist's screen, the door, the waiting reader, the seated man
    path: [[636, 410], [534, 380], [726, 350], [966, 420], [766, 476]],
  },
] as const;

/** a loop of the whole floor, every miniature moving at once (Kling, start and
 *  end on the gallery still, the seam crossfaded) */
const GALLERY_FILM: string | null = "/videos/ai-mus-gallery.mp4";

/** the gallery plate's case row: vertical centre, and the zoom that fills the stage with one case */
const GY = 37.8;
const ZOOM = 2.55;

const STEP_MS = 1150;
/** a pick from inside another case: out to the gallery, then in to the next */
const TRAVEL_MS = 650;

function fakeMs(seed: number, i: number) {
  // stable, plausible per-step durations: 180 - 1400 ms
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return Math.round(180 + (v - Math.floor(v)) * 1220);
}

/** mm:ss.mmm */
function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}

/** the halted step's wait, counted beside its spinner: one text write per
 *  tenth of a second, no React render; aria-hidden so the live log is not
 *  re-announced ten times a second */
function HaltClock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t0 = performance.now();
    let last = "";
    const id = window.setInterval(() => {
      const s = ((performance.now() - t0) / 1000).toFixed(1) + "s";
      if (s !== last) {
        last = s;
        el.textContent = s;
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span ref={ref} className="ai-trace__wait" aria-hidden="true" title={CONSOLE_SLIP.waitLabel}>
      0.0s
    </span>
  );
}

/** the case's film: silent, looping, playing only while on screen; reduced
 *  motion and data-saver keep the still */
function CaseFilm({ src, poster, className = "ai-mus__film" }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conn?.saveData) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
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
      preload="metadata"
      onPlaying={(e) => e.currentTarget.setAttribute("data-playing", "")}
    />
  );
}

export default function AgentConsole() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(-1); // steps settled so far - 1
  const [run, setRun] = useState(0);
  /** the gallery's lights are on */
  const [lit, setLit] = useState(false);
  /** the camera is in the active case (false: out in the gallery) */
  const [inside, setInside] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const reduced = useRef(false);
  const travel = useRef<number[]>([]);

  /* the halt: "none" -> "line" (the halted step's message swaps) -> "slip"
     (the slip is printing or printed) -> "done" (resolved, resuming) */
  const [halt, setHalt] = useState<Halt>("none");
  const haltRef = useRef<Halt>("none");
  const [review, setReview] = useState<Review | null>(null);
  const slipDone = useRef(false);
  const timers = useRef<number[]>([]);
  /* the run holds the slip's bay from its first frame when it can halt */
  const [bay, setBay] = useState(false);
  const haltStart = useRef(0);
  const replayRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const hitRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastTrace = useSession((s) => s.lastTrace);

  const industry = INDUSTRIES[active];
  const kase = CASES[active % CASES.length];
  const total = industry.log.length;

  /* the rows as printed: the industry's steps, plus the person's review row
     before "report" once a slip is resolved; each row's clock is everything
     before it, plus a beat. `node` is the stop on the line a row lights. */
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = industry.log.map(([agent, msg], i) => ({
      key: `${active}-${i}`,
      agent,
      msg,
      ms: fakeMs(active + 1, i),
      at: 0,
      canHalt: active === HALT_TAB && i === HALT_AT,
      human: false,
      node: i,
    }));
    if (review && active === HALT_TAB) {
      list.splice(HALT_AT + 1, 0, {
        key: `${active}-review`,
        agent: CONSOLE_SLIP.reviewAgent,
        msg: review.kind === "approve" ? CONSOLE_SLIP.approvedLine : CONSOLE_SLIP.correctedLine(review.value ?? ""),
        ms: review.ms,
        at: 0,
        canHalt: false,
        human: true,
        node: -1,
      });
    }
    let at = 40;
    for (const row of list) {
      row.at = at;
      at += row.ms + 40;
    }
    return list;
  }, [industry, active, review]);

  /* first arrival: the lights come on; the camera waits on the floor */
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      slipDone.current = window.sessionStorage.getItem(CONSOLE_SLIP.storageKey) === "1";
    } catch {
      // storage blocked: the slip prints once per page load instead
    }
    const el = rootRef.current;
    if (!el) return;
    const T = travel.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || seen.current) return;
        seen.current = true;
        session.figure("industries");
        setLit(true);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      T.forEach((t) => window.clearTimeout(t));
      T.length = 0;
    };
  }, []);

  // one run: steps settle one after another, then the result line. On the
  // Trades tab the run stops at the fallback step until the slip is resolved
  // (once per session); the resume timers join the same list, so a tab change
  // or Replay mid-slip clears everything and dismisses the slip.
  useEffect(() => {
    if (run === 0) return;
    const haltAt = active === HALT_TAB && !slipDone.current ? HALT_AT : -1;
    const T = timers.current;
    const later = (fn: () => void, ms: number) => T.push(window.setTimeout(fn, ms));
    const clear = () => {
      T.forEach((t) => window.clearTimeout(t));
      T.length = 0;
    };
    setReview(null);
    haltRef.current = "none";
    setHalt("none");
    setBay(haltAt >= 0);
    if (reduced.current) {
      if (haltAt >= 0) {
        setStep(haltAt);
        haltStart.current = performance.now();
        haltRef.current = "slip";
        setHalt("slip");
      } else setStep(total);
      return clear;
    }
    setStep(-1);
    const last = haltAt >= 0 ? haltAt : total;
    for (let i = 0; i <= last; i++) later(() => setStep(i), 350 + i * STEP_MS);
    if (haltAt >= 0) {
      // the step types its message (900 ms), holds a beat, then halts
      const t0 = 350 + haltAt * STEP_MS;
      later(() => {
        haltStart.current = performance.now();
        haltRef.current = "line";
        setHalt("line");
      }, t0 + 1000);
      later(() => {
        haltRef.current = "slip";
        setHalt("slip");
      }, t0 + 1500);
    }
    return clear;
  }, [run, active, total]);

  /* the visitor's decision: remember it, record it, resume the cycle. The
     person's row carries the whole wait, from the halt line to the decision
     (the same clock the halted step was counting), not only the slip's part. */
  const resolve = useCallback(
    (kind: SlipOutcome, decisionMs: number, value?: string) => {
      if (haltRef.current !== "slip") return;
      if (haltStart.current) decisionMs = Math.max(decisionMs, performance.now() - haltStart.current);
      slipDone.current = true;
      try {
        window.sessionStorage.setItem(CONSOLE_SLIP.storageKey, "1");
      } catch {
        // storage blocked: slipDone still holds for this page
      }
      const ms = Math.max(1, Math.round(decisionMs));
      setReview({ kind, value, ms });
      haltRef.current = "done";
      setHalt("done");
      const S = CONSOLE_SLIP.slip;
      session.setSlip(
        kind === "approve"
          ? { outcome: "approved", to: S.person, at: S.at }
          : { outcome: "corrected", to: S.person, value, at: S.at },
      );
      session.bump(kind === "approve" ? "approvals" : "corrections");
      const rowsTotal = total + 1; // with the review row
      if (reduced.current) {
        setStep(rowsTotal);
        return;
      }
      const T = timers.current;
      for (let i = HALT_AT + 1; i <= rowsTotal; i++) {
        T.push(window.setTimeout(() => setStep(i), 160 + (i - HALT_AT - 1) * STEP_MS));
      }
    },
    [total],
  );

  const stopAll = () => {
    const T = travel.current;
    T.forEach((t) => window.clearTimeout(t));
    T.length = 0;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.length = 0;
  };

  /* a pick: from the floor the camera goes straight in; from inside another
     case it backs out first. The run starts as it arrives. */
  const pick = (i: number) => {
    if (i === active && inside) return;
    stopAll();
    seen.current = true;
    setLit(true);
    const goIn = () => {
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
    travel.current.push(window.setTimeout(goIn, TRAVEL_MS));
  };

  /* the way out: back to the floor, the run stopped, focus on the case we left */
  const leave = useCallback(() => {
    if (!inside) return;
    stopAll();
    setInside(false);
    setStep(-1);
    haltRef.current = "none";
    setHalt("none");
    setBay(false);
    const from = active;
    window.setTimeout(() => hitRefs.current[from]?.focus({ preventScroll: true }), 60);
  }, [inside, active]);

  useEffect(() => {
    if (!inside) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && haltRef.current !== "slip") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inside, leave]);

  const sum = rows.reduce((a, r) => a + r.ms, 0);
  const closed = step >= rows.length;
  const H = CONSOLE_SLIP.halt;

  /* the line through the miniature: a stop is reached once its row runs */
  const nodeState = (n: number): "off" | "run" | "done" | "halt" => {
    const r = rows.findIndex((row) => row.node === n);
    if (r < 0 || step < r) return "off";
    if (step === r) return rows[r].canHalt && halt !== "none" && halt !== "done" ? "halt" : "run";
    return "done";
  };

  return (
    <section
      ref={rootRef}
      data-rail="Industries"
      data-ch="04"
      data-fig="industries"
      aria-labelledby="ai-ind-title"
      className="ai-section ai-mus relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-mus__head">
          <div>
            <p className="ai-label">
              <b>04</b> / Who it is for
            </p>
            <h2 id="ai-ind-title" className="ai-h2 font-display font-semibold uppercase">
              {INDUSTRIES_INTRO.title}
            </h2>
          </div>
          <p key={inside ? active : "floor"} className="ai-body ai-mus__body">
            {inside ? industry.body : INDUSTRIES_INTRO.floor}
          </p>
        </header>

        <div className="ai-mus__room" data-lit={lit ? "" : undefined} data-inside={inside ? "" : undefined} data-bay={bay ? "" : undefined}>
          {/* the stage: the gallery plate, the lights, the case films, the line */}
          <div className="ai-mus__stage">
            <div
              className="ai-mus__frame ai-mus__gallery"
              style={{ ["--gx" as string]: `${kase.gx}%`, ["--gy" as string]: `${GY}%`, ["--z" as string]: ZOOM }}
            >
              <picture>
                <source media="(max-width: 767px)" srcSet="/worlds/ai-mus-gallery-m.webp" />
                <img src="/worlds/ai-mus-gallery.webp" alt="" decoding="async" loading="lazy" draggable={false} />
              </picture>
              {GALLERY_FILM ? <CaseFilm src={GALLERY_FILM} poster="/worlds/ai-mus-gallery.webp" className="ai-mus__film ai-mus__floorfilm" /> : null}
              {CASES.map((c, i) => (
                <span key={c.key} aria-hidden="true" className="ai-mus__lamp" style={{ ["--x" as string]: `${c.gx}%`, ["--i" as string]: i }} />
              ))}
              {/* on the floor, the cases themselves are the way in; each wears its placard */}
              {CASES.map((c, i) => (
                <button
                  key={c.key}
                  ref={(el) => {
                    hitRefs.current[i] = el;
                  }}
                  type="button"
                  tabIndex={inside ? -1 : 0}
                  aria-label={`Step into case ${i + 1}: ${INDUSTRIES[i].title}`}
                  className="ai-mus__hit"
                  style={{ ["--x" as string]: `${c.gx}%`, ["--i" as string]: i }}
                  onClick={() => pick(i)}
                >
                  <span className="ai-mus__plaque" aria-hidden="true">
                    <span className="ai-mus__plaquen font-mono">Case {String(i + 1).padStart(2, "0")}</span>
                    <span className="ai-mus__plaquename font-display">{INDUSTRIES[i].title}</span>
                    <span className="ai-mus__plaquego font-mono">Step inside</span>
                  </span>
                </button>
              ))}
            </div>

            {CASES.map((c, i) => {
              const on = i === active;
              return (
                <div key={c.key} className="ai-mus__frame ai-mus__case" data-on={on ? "" : undefined} aria-hidden={!on}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ai-mus__still" src={c.still} alt="" decoding="async" loading="lazy" draggable={false} />
                  {on ? <CaseFilm key={c.film} src={c.film} poster={c.still} /> : null}
                  {on ? (
                    <svg className="ai-mus__path" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
                      {c.path.slice(1).map(([x, y], s) => {
                        const [px, py] = c.path[s];
                        const st = nodeState(s + 1);
                        return (
                          <line
                            key={`l${s}`}
                            x1={px}
                            y1={py}
                            x2={x}
                            y2={y}
                            pathLength={1}
                            className="ai-mus__seg"
                            data-on={st !== "off" ? "" : undefined}
                          />
                        );
                      })}
                      {c.path.map(([x, y], n) => (
                        <g key={`n${n}`} className="ai-mus__node" data-state={nodeState(n)} transform={`translate(${x} ${y})`}>
                          <circle className="ai-mus__halo" r="22" />
                          <circle className="ai-mus__dot" r="6" />
                        </g>
                      ))}
                    </svg>
                  ) : null}
                </div>
              );
            })}

            <span aria-hidden="true" className="ai-mus__vignette" />
            <p aria-hidden="true" className="ai-mus__hud font-mono">
              <i /> {inside ? <>Case {String(active + 1).padStart(2, "0")} · live</> : "The floor · pick a case"}
            </p>

            {/* the way out: a placard with the floor plan, this case lit */}
            <button
              ref={backRef}
              type="button"
              className="ai-mus__back"
              tabIndex={inside ? 0 : -1}
              aria-hidden={!inside}
              onClick={leave}
            >
              <span className="ai-mus__plan" aria-hidden="true">
                {CASES.map((c, i) => (
                  <i key={c.key} data-on={i === active ? "" : undefined} />
                ))}
              </span>
              <span className="ai-mus__backtext">
                <span className="ai-mus__backlead font-mono">Case {String(active + 1).padStart(2, "0")} of 04</span>
                <span className="ai-mus__backgo font-display">Back to the floor</span>
              </span>
              <kbd className="ai-mus__esc font-mono" aria-hidden="true">
                Esc
              </kbd>
            </button>
          </div>

          {/* the exhibit label: the case's day, printed as it happens */}
          <div className="ai-mus__label">
            <div id="ai-console" role="region" aria-label={`${industry.full}: example day`} className="ai-console">
              <div className="ai-console__bar">
                <span className="ai-console__lights" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="ai-console__path">
                  a day at <b>{industry.title.toLowerCase()}</b>
                </span>
                <button
                  ref={replayRef}
                  type="button"
                  className="ai-console__replay"
                  onClick={() => (inside ? setRun((r) => r + 1) : pick(active))}
                  aria-label="Replay"
                >
                  <ArrowClockwise size={14} weight="light" aria-hidden="true" />
                  <span>Replay</span>
                </button>
              </div>

              <ol className="ai-trace" aria-live="polite">
                <li className="ai-trace__boot" data-on="">
                  <span className="ai-trace__t">00:00.000</span>
                  <span>
                    tool <em>on</em> / {total} jobs today / anything unusual goes to a person
                    {lastTrace ? <> / {CONSOLE_SLIP.bootBench(lastTrace.totalMs)}</> : null}
                  </span>
                </li>
                {rows.map((row, i) => {
                  const state = step > i ? "done" : step === i ? "run" : "wait";
                  const dur = fmtMs(row.ms, row.human);
                  const halted = row.canHalt && halt !== "none";
                  return (
                    <li
                      key={row.key}
                      className="ai-trace__row"
                      data-state={state}
                      data-halt={halted ? "" : undefined}
                      data-human={row.human ? "" : undefined}
                    >
                      <span className="ai-trace__t">{clock(row.at)}</span>
                      <span className="ai-trace__agent">{row.agent}</span>
                      <span className="ai-trace__msg">
                        <span className="ai-trace__said">
                          <span className="ai-trace__type" style={{ ["--n" as string]: row.msg.length }}>
                            {row.msg}
                          </span>
                        </span>
                        {halted ? (
                          <span className="ai-trace__halt">
                            {H.lead} <b>{H.cmp}</b> . {H.tail}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="ai-trace__state"
                        aria-label={
                          state === "done"
                            ? `done in ${dur}`
                            : state === "run"
                              ? halted
                                ? "halted, awaiting a person"
                                : "running"
                              : "queued"
                        }
                      >
                        {state === "done" ? (
                          <>
                            <i className="ai-tick" aria-hidden="true" /> {dur}
                          </>
                        ) : state === "run" ? (
                          <>
                            {halted ? <HaltClock /> : null}
                            <i className="ai-spin" aria-hidden="true" />
                          </>
                        ) : (
                          <i className="ai-wait" aria-hidden="true" />
                        )}
                      </span>
                    </li>
                  );
                })}
                <li className="ai-trace__end" data-on={closed ? "" : undefined}>
                  <span className="ai-trace__t">&gt;</span>
                  <span>
                    all done <b>{total}/{total}</b> / {(sum / 1000).toFixed(2)}s / nobody lifted a finger
                  </span>
                </li>
              </ol>
              <p className="ai-console__note">An example day, timings illustrative.</p>
            </div>
            {/* the routing slip prints out of the slot under the label; its bay
                is held for the whole Trades run, so the label grows with the
                pick, never at the halt or after the tear */}
            <RoutingSlip
              open={halt === "slip"}
              reserve={bay}
              onResolve={resolve}
              returnFocus={() => replayRef.current?.focus({ preventScroll: true })}
            />
          </div>
        </div>

      </div>
    </section>
  );
}

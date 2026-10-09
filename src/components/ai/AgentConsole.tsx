"use client";

import "../../app/ai-industries.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { INDUSTRIES, INDUSTRIES_INTRO } from "./content";
import { session, useSession } from "./session";
import RoutingSlip, { type SlipOutcome } from "./RoutingSlip";
import { CONSOLE_SLIP } from "./console-slip.content";

/**
 * 4. Industries — an agent trace you can run (after 21st.dev's "Agent Trace" /
 * "Tool Call" components, set as a print-out on the spec sheet). Pick an
 * industry on the left; on the right a dark console, the one black object on
 * the paper, runs that industry's example cycle: each step names its agent,
 * shows a tool call working, then settles with a tick and its duration, and
 * the cycle closes with a result line. It runs when it first comes into view
 * and whenever you pick another industry; Replay runs it again.
 *
 * The industry picker is a chroma grid: four plates printed as ink on the
 * paper (the world plates, inverted to a grayscale duotone). A spotlight
 * follows the pointer across the whole grid and develops the plate under it
 * back into its cyan data-light; the selected industry stays developed, with
 * a cyan hairline. On touch the spotlight blooms where you tap.
 *
 * The durations are illustrative (the section says so); nothing here claims a
 * real result. Reduced motion: the whole trace, settled, no typing; the
 * spotlight jumps instead of easing.
 *
 * The payoff (item "console-slip"): on the Enterprise cycle the fourth step,
 * "fallback . low confidence, human review requested", means it. The step's
 * spinner keeps turning, its line halts on "confidence 0.61 < 0.80 . routing
 * to a person", and a paper routing slip prints out of a slot under the glass
 * (RoutingSlip). APPROVE tears it and the console resumes, printing the
 * approval and closing the cycle; CORRECT lets the visitor retype the vendor,
 * which the resumed log prints back. While it waits, the halted step counts
 * the wait beside its spinner, and the person's row carries the time they
 * really took. Picking the Enterprise tab reserves the slip's bay under the
 * glass at once, so nothing on the page moves at the halt itself. Once a slip
 * is resolved the session remembers it, so Replay and later visits to the
 * tab run straight through.
 */

/** the tab and step that halt: the cycle whose fourth step hands off to a person */
const HALT_TAB = INDUSTRIES.findIndex((ind) => ind.log.some(([agent]) => agent === "fallback"));
const HALT_AT = HALT_TAB >= 0 ? INDUSTRIES[HALT_TAB].log.findIndex(([agent]) => agent === "fallback") : -1;

type Halt = "none" | "line" | "slip" | "done";
type Review = { kind: SlipOutcome; value?: string; ms: number };
type Row = { key: string; agent: string; msg: string; ms: number; at: number; canHalt: boolean; human: boolean };

/** a step's duration as the console prints it; a person's time is in seconds */
function fmtMs(ms: number, human = false) {
  return !human && ms < 10000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** one scene per industry (GPT Image 2.5, design-loop/art-src/industries) */
const PLATES = [
  { src: "/worlds/ai-ind-broadcast.webp", loop: "/videos/ai-ind-broadcast.mp4", pos: "50% 45%", scale: 1.08, meta: "Footage / delivery" },
  { src: "/worlds/ai-ind-ecommerce.webp", loop: "/videos/ai-ind-ecommerce.mp4", pos: "50% 55%", scale: 1.08, meta: "Catalog / orders" },
  { src: "/worlds/ai-ind-enterprise.webp", loop: "/videos/ai-ind-enterprise.mp4", pos: "50% 60%", scale: 1.08, meta: "Quotes / orders" },
  { src: "/worlds/ai-ind-saas.webp", loop: "/videos/ai-ind-saas.mp4", pos: "50% 50%", scale: 1.08, meta: "Bookings / intake" },
];

/** the selected card's scene, alive: a silent loop (Kling 3.0 from the same
 *  still) that plays only while the card is on screen; reduced motion and
 *  data-saver keep the still */
function CardLoop({ src, poster, className = "ai-chroma__loop" }: { src: string; poster: string; className?: string }) {
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
  return <video ref={ref} className={className} src={src} poster={poster} muted loop playsInline preload="metadata" />;
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

const SPOT_R = 170; // spotlight radius, px

const STEP_MS = 1150;

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

export default function AgentConsole() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(-1); // steps settled so far - 1
  const [run, setRun] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const reduced = useRef(false);

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
  const lastTrace = useSession((s) => s.lastTrace);

  const industry = INDUSTRIES[active];
  const total = industry.log.length;

  /* the rows as printed: the industry's steps, plus the person's review row
     before "report" once a slip is resolved; each row's clock is everything
     before it, plus a beat */
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = industry.log.map(([agent, msg], i) => ({
      key: `${active}-${i}`,
      agent,
      msg,
      ms: fakeMs(active + 1, i),
      at: 0,
      canHalt: active === HALT_TAB && i === HALT_AT,
      human: false,
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
      });
    }
    let at = 40;
    for (const row of list) {
      row.at = at;
      at += row.ms + 40;
    }
    return list;
  }, [industry, active, review]);

  /* chroma grid spotlight: one set of CSS vars on the grid, eased in rAF */
  const gridRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const spot = useRef({ x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0, raf: 0 });

  const tick = useCallback(function step() {
    const s = spot.current;
    const k = reduced.current ? 1 : 0.16;
    s.x += (s.tx - s.x) * k;
    s.y += (s.ty - s.y) * k;
    s.r += (s.tr - s.r) * (reduced.current ? 1 : 0.12);
    const el = gridRef.current;
    if (el) {
      el.style.setProperty("--sx", `${s.x.toFixed(1)}px`);
      el.style.setProperty("--sy", `${s.y.toFixed(1)}px`);
      el.style.setProperty("--sr", `${Math.max(0, s.r).toFixed(1)}px`);
    }
    const done = Math.abs(s.tx - s.x) < 0.3 && Math.abs(s.ty - s.y) < 0.3 && Math.abs(s.tr - s.r) < 0.3;
    s.raf = done ? 0 : requestAnimationFrame(step);
  }, []);

  const aim = useCallback(
    (clientX: number, clientY: number, r: number, jump = false) => {
      const el = gridRef.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      const s = spot.current;
      s.tx = clientX - b.left;
      s.ty = clientY - b.top;
      s.tr = r;
      if (jump) {
        s.x = s.tx;
        s.y = s.ty;
      }
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    },
    [tick],
  );

  const release = useCallback(() => {
    const s = spot.current;
    s.tr = 0;
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  }, [tick]);

  // each card's offset inside the grid, so one spotlight spans all four
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      tabRefs.current.forEach((card) => {
        if (!card) return;
        card.style.setProperty("--ox", `${card.offsetLeft}px`);
        card.style.setProperty("--oy", `${card.offsetTop}px`);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const s = spot.current;
    return () => {
      ro.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      slipDone.current = window.sessionStorage.getItem(CONSOLE_SLIP.storageKey) === "1";
    } catch {
      // storage blocked: the slip prints once per page load instead
    }
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          session.figure("industries");
          setRun((r) => r + 1);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // one run: steps settle one after another, then the result line. On the
  // Enterprise tab the run stops at the fallback step until the slip is
  // resolved (once per session); the resume timers join the same list, so a
  // tab change or Replay mid-slip clears everything and dismisses the slip.
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

  const pick = (i: number) => {
    if (i === active) return;
    setActive(i);
    setRun((r) => r + 1);
  };

  const onTabKey = (e: React.KeyboardEvent) => {
    const n = INDUSTRIES.length;
    let next = -1;
    // 2x2: left/right step through, up/down jump a row
    if (e.key === "ArrowRight") next = (active + 1) % n;
    else if (e.key === "ArrowLeft") next = (active - 1 + n) % n;
    else if (e.key === "ArrowDown") next = (active + 2) % n;
    else if (e.key === "ArrowUp") next = (active - 2 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    pick(next);
    tabRefs.current[next]?.focus();
  };

  const sum = rows.reduce((a, r) => a + r.ms, 0);
  const closed = step >= rows.length;
  const H = CONSOLE_SLIP.halt;

  return (
    <section
      ref={rootRef}
      data-rail="Industries"
      data-ch="04"
      data-fig="industries"
      aria-labelledby="ai-ind-title"
      className="ai-section relative z-10"
    >
      <div className="ai-wrap ai-console-grid">
        <div className="ai-console-side">
          <header>
            <p className="ai-label">
              <b>04</b> / Who it is for
            </p>
            <h2 id="ai-ind-title" className="ai-h2 font-display font-semibold uppercase">
              {INDUSTRIES_INTRO.title}
            </h2>
          </header>
          <div
            ref={gridRef}
            role="tablist"
            aria-label="Industries"
            className="ai-chroma"
            onKeyDown={onTabKey}
            onPointerEnter={(e) => {
              if (e.pointerType !== "touch") aim(e.clientX, e.clientY, SPOT_R, true);
            }}
            onPointerMove={(e) => {
              if (e.pointerType !== "touch") aim(e.clientX, e.clientY, SPOT_R);
            }}
            onPointerLeave={release}
            onPointerDown={(e) => {
              if (e.pointerType === "touch") aim(e.clientX, e.clientY, SPOT_R * 0.8, true);
            }}
            onPointerUp={(e) => {
              if (e.pointerType === "touch") release();
            }}
            onPointerCancel={release}
          >
            {INDUSTRIES.map((ind, i) => {
              const plate = PLATES[i % PLATES.length];
              const on = i === active;
              return (
                <button
                  key={ind.title}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="ai-console"
                  tabIndex={on ? 0 : -1}
                  className="ai-chroma__card"
                  data-on={on ? "" : undefined}
                  onClick={() => pick(i)}
                  style={{ ["--pos" as string]: plate.pos, ["--s" as string]: plate.scale }}
                >
                  <span className="ai-chroma__media" aria-hidden="true">
                    <span className="ai-chroma__plate ai-chroma__plate--ink">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={plate.src} alt="" decoding="async" loading="lazy" draggable={false} />
                    </span>
                    <span className="ai-chroma__plate ai-chroma__plate--lit">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={plate.src} alt="" decoding="async" loading="lazy" draggable={false} />
                      {on ? <CardLoop key={plate.loop} src={plate.loop} poster={plate.src} /> : null}
                    </span>
                    <span className="ai-chroma__num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ai-chroma__live">{on ? "Running" : "Standby"}</span>
                  </span>
                  <span className="ai-chroma__cap">
                    <span className="ai-chroma__name">{ind.title}</span>
                    <span className="ai-chroma__meta">
                      {ind.log.length} jobs / {plate.meta}
                    </span>
                  </span>
                  <span className="ai-chroma__frame" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <p key={active} className="ai-body ai-console-side__body">
            {industry.body}
          </p>
        </div>

        {/* the console floats over a live macro of the silicon it runs on */}
        <div className="ai-rig">
        <CardLoop className="ai-rig__film" src="/videos/ai-chip.mp4" poster="/worlds/ai-chip.webp" />
        <span aria-hidden="true" className="ai-rig__veil" />
        <span aria-hidden="true" className="ai-rig__hud font-mono"><i />Running now · live</span>
        <div id="ai-console" role="tabpanel" aria-label={`${industry.full}: example day`} className="ai-console">
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
              onClick={() => setRun((r) => r + 1)}
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
                      state === "done" ? `done in ${dur}` : state === "run" ? (halted ? "halted, awaiting a person" : "running") : "queued"
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
        {/* the routing slip prints out of the slot under the glass; its bay is
            held for the whole Enterprise run, so the rig grows with the tab
            pick, never at the halt or after the tear */}
        <RoutingSlip
          open={halt === "slip"}
          reserve={bay}
          onResolve={resolve}
          returnFocus={() => replayRef.current?.focus({ preventScroll: true })}
        />
        </div>
      </div>
    </section>
  );
}

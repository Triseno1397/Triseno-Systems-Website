"use client";

import "../../app/ai-industries.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { INDUSTRIES, INDUSTRIES_INTRO } from "./content";

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
 */

/** one scene per industry (GPT Image 2.5, design-loop/art-src/industries) */
const PLATES = [
  { src: "/worlds/ai-ind-broadcast.webp", loop: "/videos/ai-ind-broadcast.mp4", pos: "50% 45%", scale: 1.08, meta: "Rundown / post" },
  { src: "/worlds/ai-ind-ecommerce.webp", loop: "/videos/ai-ind-ecommerce.mp4", pos: "50% 55%", scale: 1.08, meta: "SKU graph" },
  { src: "/worlds/ai-ind-enterprise.webp", loop: "/videos/ai-ind-enterprise.mp4", pos: "50% 60%", scale: 1.08, meta: "PO / ledger" },
  { src: "/worlds/ai-ind-saas.webp", loop: "/videos/ai-ind-saas.mp4", pos: "50% 50%", scale: 1.08, meta: "Ticket / runbook" },
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

  const industry = INDUSTRIES[active];
  const total = industry.log.length;

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
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          setRun((r) => r + 1);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // one run: steps settle one after another, then the result line
  useEffect(() => {
    if (run === 0) return;
    if (reduced.current) {
      setStep(total);
      return;
    }
    setStep(-1);
    const timers: number[] = [];
    for (let i = 0; i <= total; i++) timers.push(window.setTimeout(() => setStep(i), 350 + i * STEP_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [run, active, total]);

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

  const sum = industry.log.reduce((a, _, i) => a + fakeMs(active + 1, i), 0);
  const closed = step >= total;

  return (
    <section ref={rootRef} data-rail="Industries" aria-labelledby="ai-ind-title" className="ai-section relative z-10">
      <div className="ai-wrap ai-console-grid">
        <div className="ai-console-side">
          <header>
            <p className="ai-label">
              <b>04</b> / Industries
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
                      {ind.log.length} agents / {plate.meta}
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
        <span aria-hidden="true" className="ai-rig__hud font-mono"><i />Node 07 · live</span>
        <div id="ai-console" role="tabpanel" aria-label={`${industry.full}: example agent cycle`} className="ai-console">
          <div className="ai-console__bar">
            <span className="ai-console__lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="ai-console__path">
              ~/triseno/agents <b>run</b> {industry.title.toLowerCase().replace(/[^a-z]+/g, "-")}
            </span>
            <button type="button" className="ai-console__replay" onClick={() => setRun((r) => r + 1)} aria-label="Replay the cycle">
              <ArrowClockwise size={14} weight="light" aria-hidden="true" />
              <span>Replay</span>
            </button>
          </div>

          <ol className="ai-trace" aria-live="polite">
            <li className="ai-trace__boot" data-on="">
              <span className="ai-trace__t">00:00.000</span>
              <span>
                orchestrator <em>online</em> / {total} agents assigned / fallback: human review
              </span>
            </li>
            {industry.log.map(([agent, msg], i) => {
              const state = step > i ? "done" : step === i ? "run" : "wait";
              const ms = fakeMs(active + 1, i);
              // the clock at the start of this step: everything before it, plus a beat
              const at = industry.log.slice(0, i).reduce((a, _, j) => a + fakeMs(active + 1, j) + 40, 40);
              return (
                <li key={`${active}-${i}`} className="ai-trace__row" data-state={state}>
                  <span className="ai-trace__t">{clock(at)}</span>
                  <span className="ai-trace__agent">{agent}</span>
                  <span className="ai-trace__msg">
                    <span className="ai-trace__type" style={{ ["--n" as string]: msg.length }}>
                      {msg}
                    </span>
                  </span>
                  <span className="ai-trace__state" aria-label={state === "done" ? `done in ${ms} ms` : state === "run" ? "running" : "queued"}>
                    {state === "done" ? (
                      <>
                        <i className="ai-tick" aria-hidden="true" /> {ms}ms
                      </>
                    ) : state === "run" ? (
                      <i className="ai-spin" aria-hidden="true" />
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
                cycle closed <b>{total}/{total}</b> / {(sum / 1000).toFixed(2)}s / audit trail written
              </span>
            </li>
          </ol>
          <p className="ai-console__note">An example cycle, timings illustrative.</p>
        </div>
        </div>
      </div>
    </section>
  );
}

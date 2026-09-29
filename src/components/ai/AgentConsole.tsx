"use client";

import { useEffect, useRef, useState } from "react";
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
 * The durations are illustrative (the section says so); nothing here claims a
 * real result. Reduced motion: the whole trace, settled, no typing.
 */

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
          <div role="tablist" aria-label="Industries" className="ai-tabs">
            {INDUSTRIES.map((ind, i) => (
              <button
                key={ind.title}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls="ai-console"
                className="ai-tab"
                onClick={() => pick(i)}
              >
                <span className="ai-tab__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ai-tab__name">{ind.title}</span>
                <span aria-hidden="true" className="ai-tab__bar" />
              </button>
            ))}
          </div>
          <p key={active} className="ai-body ai-console-side__body">
            {industry.body}
          </p>
        </div>

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
    </section>
  );
}

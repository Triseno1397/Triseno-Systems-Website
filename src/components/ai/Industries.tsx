"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import GlassPanel from "@/components/world/GlassPanel";
import { INDUSTRIES, INDUSTRIES_INTRO, type Industry } from "./content";

/**
 * 5. Industries — accordion rows in display type; opening a row types out a
 * mono agent log beside the industry copy. The log is labelled illustrative:
 * system-style messages about that industry's workflow, no client names, no
 * metrics. Rows below the change glide with FLIP transforms and the open panel
 * wipes in with clip-path, so no layout property is ever animated (M4).
 */

const CHARS_PER_SECOND = 70;
const LINE_PAUSE = 0.28; // seconds between lines

function AgentLog({ industry, run }: { industry: Industry; run: boolean }) {
  const lines = industry.log.map(([agent, message]) => `${agent.padEnd(9, " ")}> ${message}`);
  const total = lines.reduce((n, l) => n + l.length, 0);
  const [typed, setTyped] = useState(0);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSkip(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      // each finished line costs a short pause before the next one starts
      let budget = t * CHARS_PER_SECOND;
      let count = 0;
      for (const line of lines) {
        if (budget <= 0) break;
        const take = Math.min(line.length, budget);
        count += take;
        budget -= take;
        if (take === line.length) budget -= LINE_PAUSE * CHARS_PER_SECOND;
      }
      setTyped(Math.floor(count));
      if (count < total) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // `lines` is derived from `industry`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, industry, total]);

  const shown = skip ? total : typed;
  let remaining = shown;
  const done = shown >= total;

  return (
    <div className="ai-log" role="img" aria-label={`Example agent log: ${industry.log.map(([, m]) => m).join("; ")}.`}>
      <p className="ai-log__head ai-label">
        <span>Agent log</span>
        <span className="ai-log__state" data-on={done ? "" : undefined}>
          <span className="ai-log__dot" />
          {done ? "Cycle complete" : "Running"}
        </span>
      </p>
      <ol aria-hidden="true" className="ai-log__lines">
        {lines.map((line, i) => {
          const take = Math.max(0, Math.min(line.length, remaining));
          remaining -= take;
          const current = !done && take > 0 && take < line.length;
          const waiting = !done && take === line.length && remaining <= 0 && i < lines.length - 1;
          return (
            <li key={i} data-started={take > 0 ? "" : undefined}>
              <span className="ai-log__t">{`t+${(i * 0.4).toFixed(1)}s`}</span>
              <span className="ai-log__text">
                <span className="ai-log__agent">{line.slice(0, Math.min(take, 9))}</span>
                {take > 9 ? line.slice(9, take) : ""}
                {current || waiting ? <i className="ai-log__caret" /> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Industries() {
  const [open, setOpen] = useState(0);
  const [seen, setSeen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const before = useRef<number[] | null>(null);

  // start typing the first log only once the section is on screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (i: number) => {
    before.current = rowRefs.current.map((el) => (el ? el.getBoundingClientRect().top : 0));
    setOpen((cur) => (cur === i ? -1 : i));
  };

  // FLIP: rows that moved glide from where they were (transform only)
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      const delta = prev[i] - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.animate([{ transform: `translate3d(0, ${delta}px, 0)` }, { transform: "translate3d(0, 0, 0)" }], {
        duration: 900,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    });
  }, [open]);

  return (
    <section
      ref={sectionRef}
      data-rail="Industries"
      aria-labelledby="ai-ind-title"
      className="ai-section relative z-10"
    >
      <GlassPanel world="ai" className="ai-band">
      <div className="ai-wrap">
        <div>
        <header className="ai-head ai-head--single">
          <p className="ai-label">
            <b>05</b> / Industries
          </p>
          <h2 id="ai-ind-title" className="ai-h2 font-display font-semibold uppercase">
            {INDUSTRIES_INTRO.title}
          </h2>
        </header>

        <ul className="ai-rows">
          {INDUSTRIES.map((industry, i) => {
            const isOpen = open === i;
            return (
              <li
                key={industry.title}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className="ai-row"
                data-open={isOpen ? "" : undefined}
              >
                <h3>
                  <button
                    type="button"
                    className="ai-row__trigger"
                    aria-expanded={isOpen}
                    aria-controls={`ai-ind-panel-${i}`}
                    id={`ai-ind-trigger-${i}`}
                    onClick={() => toggle(i)}
                  >
                    <span className="ai-label ai-row__index">
                      <b>{String(i + 1).padStart(2, "0")}</b>
                    </span>
                    <span className="ai-row__title font-display font-semibold uppercase">{industry.title}</span>
                    <span aria-hidden="true" className="ai-row__sign">
                      <i />
                      <i />
                    </span>
                  </button>
                </h3>
                {isOpen ? (
                  <div
                    id={`ai-ind-panel-${i}`}
                    role="region"
                    aria-labelledby={`ai-ind-trigger-${i}`}
                    className="ai-row__panel"
                  >
                    <div>
                      <p className="ai-label">{industry.full}</p>
                      <p className="ai-body mt-4 max-w-[48ch]">{industry.body}</p>
                    </div>
                    <AgentLog industry={industry} run={seen} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        </div>
      </div>
      </GlassPanel>
    </section>
  );
}

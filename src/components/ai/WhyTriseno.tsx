"use client";

import { useEffect, useRef, useState } from "react";
import { STATS, STATS_NOTE, WHY } from "./content";

/**
 * 7. Why Triseno — a two-state switch (a mechanic used nowhere else on the
 * page). One control flips all three rows between what a typical AI vendor
 * offers and what Triseno builds; each statement is replaced by a clip-path
 * wipe, row by row. When the section first comes into view it shows the
 * vendor state for a beat and then flips to Triseno on its own, so the
 * mechanism is visible without a click; any click takes over. At rest the type
 * is solid white — the wipe only masks while it runs. Reduced motion: it rests
 * on Triseno and swaps instantly.
 */
export default function WhyTriseno() {
  const ref = useRef<HTMLElement>(null);
  const touched = useRef(false);
  const [state, setState] = useState<0 | 1>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => {
          if (!touched.current) setState(1);
        }, reduced ? 0 : 1100);
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const choose = (next: 0 | 1) => {
    touched.current = true;
    setState(next);
  };

  return (
    <section
      ref={ref}
      data-rail="Why"
      data-world-side="right"
      data-dof="full"
      aria-labelledby="ai-why-title"
      className="ai-section relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-why__head">
          <div className="grid gap-4">
            <p className="ai-label">
              <b>07</b> / Compare
            </p>
            <h2 id="ai-why-title" className="ai-h2 font-display font-semibold uppercase">
              {WHY.title}
            </h2>
          </div>
          <div role="radiogroup" aria-label="Compare" className="ai-switch" data-state={state}>
            <span aria-hidden="true" className="ai-switch__thumb" />
            {WHY.states.map((label, i) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={state === i}
                className="ai-switch__opt"
                onClick={() => choose(i as 0 | 1)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <ul className="ai-why" data-state={state} aria-live="polite">
          {WHY.rows.map((row, i) => (
            <li key={row.topic} className="ai-why__row" style={{ ["--i" as string]: i }}>
              <p className="ai-label ai-why__topic">
                <b>{String(i + 1).padStart(2, "0")}</b> / {row.topic}
              </p>
              <p className="ai-why__cell">
                <span className="ai-why__say ai-why__say--vendor" aria-hidden={state !== 0}>
                  {row.vendor}
                </span>
                <span className="ai-why__say ai-why__say--triseno" aria-hidden={state !== 1}>
                  {row.triseno}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STRIP = Array.from({ length: 30 }, (_, i) => i % 10);

/**
 * 6. Counts — odometer data readouts (site-map mechanic), on a frame of their
 * own so nothing crowds the numbers. Each digit is a strip of numerals that
 * rolls to its value with one transform when the row scrolls into view. The
 * real value is always in the DOM for assistive tech; reduced motion lands on
 * it immediately. Marked the way the diagrams are marked: with what it counts.
 */
export function AiStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let column = 0;

  return (
    <section
      data-rail="Counts"
      data-world-side="left"
      data-dof="full"
      aria-labelledby="ai-counts-title"
      className="ai-section relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-head ai-head--single">
          <p className="ai-label">
            <b>06</b> / Counts
          </p>
          <h2 id="ai-counts-title" className="ai-h2 font-display font-semibold uppercase">
            The System, Counted
          </h2>
        </header>

        <div ref={ref} className="ai-stats" data-on={on ? "" : undefined}>
          {STATS.map((stat) => (
            <div key={stat.label} className="ai-stat">
              <p className="ai-odo" aria-hidden="true">
                {stat.parts.map((part, i) => {
                  if (typeof part === "string") {
                    return (
                      <span key={i} className="ai-odo__glyph">
                        {part}
                      </span>
                    );
                  }
                  const c = column++;
                  return (
                    <span key={i} className="ai-odo__window">
                      <span className="ai-odo__strip" style={{ ["--to" as string]: 20 + part, ["--i" as string]: c }}>
                        {STRIP.map((n, k) => (
                          <span key={k}>{n}</span>
                        ))}
                      </span>
                    </span>
                  );
                })}
              </p>
              <p className="sr-only">
                {stat.text}: {stat.label}
              </p>
              <p className="ai-label ai-stat__label">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="ai-label ai-stats__basis">
          <b>{STATS_NOTE.tag}</b>
          <span>{STATS_NOTE.text}</span>
        </p>
      </div>
    </section>
  );
}

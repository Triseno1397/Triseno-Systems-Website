"use client";

import { useEffect, useRef, useState } from "react";
import { STATS, STATS_NOTE, WHY } from "./content";

/**
 * 6. Why Triseno — three reasons, one per column, on a frame of their own.
 *
 * R2: the headline figures that used to sit here ("50+ systems", "3x
 * compression") are gone. The odometer now has its own frame (AiStats below)
 * and counts what the page draws, not results.
 *
 * Mechanic: each column's hairline rule draws in from the left on entry
 * (transform only, staggered), which is not used anywhere else on the page.
 */
export default function WhyTriseno() {
  const ref = useRef<HTMLUListElement>(null);
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
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      data-rail="Why"
      data-world-side="right"
      aria-labelledby="ai-why-title"
      className="ai-section relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-head ai-head--single">
          <p className="ai-label">
            <b>07</b> / {WHY.label}
          </p>
          <h2 id="ai-why-title" className="ai-h2 font-display font-semibold uppercase">
            {WHY.title}
          </h2>
        </header>

        <ul ref={ref} className="ai-why" data-on={on ? "" : undefined}>
          {WHY.blocks.map((block, i) => (
            <li key={block.title} style={{ ["--i" as string]: i }}>
              <span aria-hidden="true" className="ai-why__rule" />
              <p className="ai-label">
                <b>{String(i + 1).padStart(2, "0")}</b>
              </p>
              <h3 className="ai-h3 mt-5 font-display font-semibold uppercase">{block.title}</h3>
              <p className="ai-body mt-4 max-w-[38ch]">{block.body}</p>
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

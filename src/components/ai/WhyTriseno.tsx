"use client";

import { useEffect, useRef, useState } from "react";
import { STATS, WHY } from "./content";

/**
 * 6. Why Triseno — odometer data readouts.
 * Each digit is a strip of numerals that rolls to its value with one transform
 * (two full turns, staggered per column) when the row scrolls into view. The
 * figures are the ones in the owner's copy; the real value is always in the
 * DOM for assistive tech and reduced motion lands on it immediately.
 */

const STRIP = Array.from({ length: 30 }, (_, i) => i % 10);

export default function WhyTriseno() {
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
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let column = 0;

  return (
    <section data-rail="Why" aria-labelledby="ai-why-title" className="ai-section relative z-10">
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>06</b> / {WHY.label}
          </p>
          <h2 id="ai-why-title" className="ai-h2 font-display font-semibold uppercase">
            {WHY.title}
          </h2>
        </header>

        <div ref={ref} className="ai-stats" data-on={on ? "" : undefined}>
          {STATS.map((stat) => (
            <div key={stat.text} className="ai-stat">
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
                      <span
                        className="ai-odo__strip"
                        style={{ ["--to" as string]: 20 + part, ["--i" as string]: c }}
                      >
                        {STRIP.map((n, k) => (
                          <span key={k}>{n}</span>
                        ))}
                      </span>
                    </span>
                  );
                })}
              </p>
              <p className="sr-only">{stat.text}</p>
              <p className="ai-label ai-stat__label">{stat.label}</p>
            </div>
          ))}
        </div>

        <ul className="ai-why" data-on={on ? "" : undefined}>
          {WHY.blocks.map((block, i) => (
            <li key={block.title} style={{ ["--i" as string]: i }}>
              <span aria-hidden="true" className="ai-why__rule" />
              <p className="ai-label">
                <b>{String(i + 1).padStart(2, "0")}</b>
              </p>
              <h3 className="ai-h3 mt-5 font-display font-semibold uppercase">{block.title}</h3>
              <p className="ai-body mt-4 max-w-[44ch]">{block.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

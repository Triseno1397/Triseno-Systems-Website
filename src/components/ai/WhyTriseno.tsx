"use client";

import { useEffect, useRef, useState } from "react";
import { WHY } from "./content";

/**
 * 6. Why Triseno — three reasons, one per column, on a frame of their own.
 *
 * R2: this section used to be an odometer of headline figures ("50+ systems",
 * "3x compression"). None of those numbers had been measured, and an unsourced
 * figure is the easiest exit a sceptic has, so they are gone rather than
 * dressed up with a qualifier. The mechanism in section 03 and the five-step
 * process in section 04 carry the credibility instead. The only numbers left
 * on this page describe something the reader can see on it.
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
            <b>06</b> / {WHY.label}
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

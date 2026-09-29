"use client";

import { useEffect, useRef, useState } from "react";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";
import CapabilityDiagram from "./CapabilityDiagram";
import Scramble from "./Scramble";

/**
 * 2. Capabilities — an expanding-column accordion (after 21st.dev's
 * "Interactive Image Accordion", rebuilt for the spec sheet). Six columns side
 * by side: five fold to spines (number and name set vertically) while one
 * stands open with its brief and its live diagram. Hover, focus or click a
 * spine and it opens as the rest fold.
 *
 * Nothing changes width. Every column is laid out at the open width and
 * placed with a transform; what shows of it is a clip-path. Opening one moves
 * the columns after it and widens its clip, so the accordion runs on the
 * compositor. Phones: a stack of rows, one open at a time.
 */

const SPINE = 68;

export default function Capabilities() {
  const [open, setOpen] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = CAPABILITIES.length;
  const openW = Math.max(0, w - SPINE * (n - 1));

  return (
    <section id="capabilities" data-rail="Capabilities" aria-labelledby="ai-cap-title" className="ai-section relative z-10">
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>02</b> / Capabilities
          </p>
          <h2 id="ai-cap-title" className="ai-h2 font-display font-semibold uppercase">
            {CAPABILITIES_INTRO.title}
          </h2>
          <p className="ai-body ai-head__aside">{CAPABILITIES_INTRO.body}</p>
        </header>

        <ul ref={listRef} className="ai-cols" data-ready={w > 0 ? "" : undefined} style={{ ["--open-w" as string]: `${openW}px`, ["--spine" as string]: `${SPINE}px` }}>
          {CAPABILITIES.map((cap, i) => {
            const on = open === i;
            const x = i * SPINE + (i > open ? openW - SPINE : 0);
            const cut = on ? 0 : openW - SPINE;
            return (
              <li
                key={cap.id}
                className="ai-col"
                data-open={on ? "" : undefined}
                style={{ ["--x" as string]: `${x}px`, ["--cut" as string]: `${cut}px` }}
                onMouseEnter={() => setOpen(i)}
              >
                <button
                  type="button"
                  className="ai-col__spine"
                  aria-expanded={on}
                  aria-controls={`ai-col-${cap.id}`}
                  onClick={() => setOpen(i)}
                  onFocus={() => setOpen(i)}
                >
                  <span className="ai-col__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ai-col__name">{cap.title}</span>
                  <span aria-hidden="true" className="ai-col__dot" />
                </button>
                <div id={`ai-col-${cap.id}`} className="ai-col__body" aria-hidden={!on}>
                  <p className="ai-label ai-col__tag">
                    <i aria-hidden="true" className="ai-live" /> {cap.tag}
                  </p>
                  <h3 className="ai-col__title font-display font-semibold uppercase">
                    <span className="sr-only">{cap.title}</span>
                    {on ? <Scramble key={i} text={cap.title} duration={0.55} /> : <span aria-hidden="true">{cap.title}</span>}
                  </h3>
                  <p className="ai-body ai-col__text">{cap.body}</p>
                  <div className="ai-col__fig">{on ? <CapabilityDiagram kind={cap.id} /> : null}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

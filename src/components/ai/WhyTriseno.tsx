"use client";

import { useState } from "react";
import GlassPanel from "@/components/world/GlassPanel";
import { WHY } from "./content";

/**
 * 6. Why Triseno — a two-state switch (a mechanic used nowhere else on the
 * page). A split frame: the headline, one line of lead and the switch stand
 * directly on the world on the left; the four comparison rows sit on one
 * frosted panel on the right. One control flips every row between what a
 * typical AI vendor sells and what Triseno builds — the statement and its
 * one-line consequence are each replaced by a clip-path wipe, row by row.
 *
 * It rests on "Triseno" and only moves when the reader flips it, so no
 * settled frame ever catches the switch or a row mid-wipe. At rest the type is
 * solid white. Reduced motion: the swap is instant.
 *
 * R5: the counts/odometer section that used to precede this was cut — three
 * numbers no prospect would ask for, the lead one repeating section 03.
 */
export default function WhyTriseno() {
  const [state, setState] = useState<0 | 1>(1);

  return (
    <section data-rail="Why" aria-labelledby="ai-why-title" className="ai-section relative z-10">
      <div className="ai-wrap ai-why-split">
        <header className="ai-why__head">
          <span aria-hidden="true" className="ai-scrim" />
          <p className="ai-label">
            <b>06</b> / {WHY.label}
          </p>
          <h2 id="ai-why-title" className="ai-h2 font-display font-semibold uppercase">
            {WHY.title}
          </h2>
          <p className="ai-body max-w-[30ch]">{WHY.lead}</p>
          <div role="radiogroup" aria-label="Compare" className="ai-switch" data-state={state}>
            <span aria-hidden="true" className="ai-switch__thumb" />
            {WHY.states.map((label, i) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={state === i}
                className="ai-switch__opt"
                onClick={() => setState(i as 0 | 1)}
              >
                <span className="max-sm:hidden">{label}</span>
                <span className="sm:hidden">{WHY.statesShort[i]}</span>
              </button>
            ))}
          </div>
        </header>

        <GlassPanel world="ai" className="ai-why__panel">
          <ul className="ai-why" data-state={state} aria-live="polite">
            {WHY.rows.map((row, i) => (
              <li key={row.topic} className="ai-why__row" style={{ ["--i" as string]: i }}>
                <p className="ai-label ai-why__topic">
                  <b>{String(i + 1).padStart(2, "0")}</b> / {row.topic}
                </p>
                <div className="ai-why__cell">
                  <p className="ai-why__swap ai-why__swap--vendor" aria-hidden={state !== 0}>
                    <span className="ai-why__say">{row.vendor}</span>
                    <span className="ai-body ai-why__note">{row.vendorNote}</span>
                  </p>
                  <p className="ai-why__swap ai-why__swap--triseno" aria-hidden={state !== 1}>
                    <span className="ai-why__say">{row.triseno}</span>
                    <span className="ai-body ai-why__note">{row.trisenoNote}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </section>
  );
}

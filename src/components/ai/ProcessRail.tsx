"use client";

import { useEffect, useRef, useState } from "react";
import { PROCESS, PROCESS_INTRO } from "./content";

/**
 * 5. Process — a draggable rail. Five stations on one hairline; a handle you
 * grab and pull along it (or click a station, or use the arrow keys: it is a
 * slider). While you drag, the station under the handle lights; let go and it
 * snaps home and the sheet below wipes to that step's brief, what happens in
 * it and what you get at the end of it. The handle and the filled length of
 * the rail move by transform only.
 */

const N = PROCESS.length;

export default function ProcessRail() {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const pos = useRef(0); // 0..1 along the rail

  const place = (p: number, snap: boolean) => {
    pos.current = p;
    const track = trackRef.current;
    const handle = handleRef.current;
    const fill = fillRef.current;
    if (!track || !handle || !fill) return;
    handle.style.transition = snap ? "" : "none";
    fill.style.transition = snap ? "" : "none";
    handle.style.transform = `translate3d(${(p * track.clientWidth).toFixed(1)}px, 0, 0)`;
    fill.style.transform = `scaleX(${p.toFixed(4)})`;
  };

  useEffect(() => {
    place(active / (N - 1), true);
    const ro = new ResizeObserver(() => place(pos.current, false));
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (i: number) => {
    const k = Math.max(0, Math.min(N - 1, i));
    setActive(k);
    place(k / (N - 1), true);
  };

  const fromEvent = (x: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - r.left) / r.width));
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const p = fromEvent(e.clientX);
    place(p, false);
    setActive(Math.round(p * (N - 1)));
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = fromEvent(e.clientX);
    place(p, false);
    const k = Math.round(p * (N - 1));
    if (k !== active) setActive(k);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    go(Math.round(pos.current * (N - 1)));
  };

  const step = PROCESS[active];

  return (
    <section data-rail="Process" aria-labelledby="ai-proc-title" className="ai-section relative z-10">
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>05</b> / Process
          </p>
          <h2 id="ai-proc-title" className="ai-h2 font-display font-semibold uppercase">
            {PROCESS_INTRO.title}
          </h2>
          <p className="ai-body ai-head__aside">Five steps, every engagement. Drag the handle along the rail, or pick a step.</p>
        </header>

        <div className="ai-rail" data-dragging={dragging ? "" : undefined}>
          <div
            ref={trackRef}
            className="ai-rail__track"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <span className="ai-rail__line" />
            <span ref={fillRef} className="ai-rail__fill" />
            {PROCESS.map((p, i) => (
              <span
                key={p.name}
                className="ai-rail__stop"
                data-on={i <= active ? "" : undefined}
                data-here={i === active ? "" : undefined}
                style={{ left: `${(i / (N - 1)) * 100}%` }}
              />
            ))}
            <div
              ref={handleRef}
              role="slider"
              tabIndex={0}
              aria-label="Process step"
              aria-valuemin={1}
              aria-valuemax={N}
              aria-valuenow={active + 1}
              aria-valuetext={`${active + 1} of ${N}: ${step.name}`}
              className="ai-rail__handle"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  go(active + 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  go(active - 1);
                } else if (e.key === "Home") go(0);
                else if (e.key === "End") go(N - 1);
              }}
            >
              <span className="ai-rail__grip" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
          <ol className="ai-rail__names">
            {PROCESS.map((p, i) => (
              <li key={p.name} style={{ left: `${(i / (N - 1)) * 100}%` }}>
                <button type="button" data-on={i === active ? "" : undefined} onClick={() => go(i)} tabIndex={-1}>
                  <b>{String(i + 1).padStart(2, "0")}</b> {p.name}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div key={active} className="ai-stepsheet" aria-live="polite">
          <div className="ai-stepsheet__lead">
            <p className="ai-label">
              <b>{String(active + 1).padStart(2, "0")}</b> / {N.toString().padStart(2, "0")}
            </p>
            <h3 className="ai-stepsheet__name font-display font-bold uppercase">{step.name}</h3>
            <p className="ai-body">{step.summary}</p>
          </div>
          <ul className="ai-stepsheet__list">
            {step.happens.map((h, i) => (
              <li key={h} style={{ ["--i" as string]: i }}>
                <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {h}
              </li>
            ))}
          </ul>
          <p className="ai-stepsheet__out">
            <span className="ai-label">Deliverable</span>
            {step.deliverable}
          </p>
        </div>
      </div>
    </section>
  );
}

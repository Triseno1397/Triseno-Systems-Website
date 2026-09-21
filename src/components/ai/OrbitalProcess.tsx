"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, Play } from "@phosphor-icons/react";
import GlassPanel from "@/components/world/GlassPanel";
import Glyph from "@/components/world/Glyph";
import { DIVISIONS } from "@/lib/divisions";
import { PROCESS, PROCESS_INTRO } from "./content";

/**
 * 4. Process — radial orbital timeline, tailored.
 * Five nodes ride a hairline dial around the triangle glyph. The dial turns on
 * its own; whichever node passes under the fixed reading head at the top
 * becomes the open step, so the orbit itself is the auto-advance. Clicking or
 * focusing a node stops the orbit, eases that node to the head and locks the
 * panel; Escape / "Resume orbit" / 14s idle releases it. Tabs pattern for
 * keyboards (arrow keys, Home, End). Node positions are transforms only.
 */

const N = PROCESS.length;
const STEP = 360 / N;
const DRIFT = STEP / 7.5; // degrees per second: one step every 7.5s
const RESUME_AFTER = 14000;

export default function OrbitalProcess() {
  const [active, setActive] = useState(0);
  const [locked, setLocked] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGGElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sim = useRef({ angle: 0, locked: false, active: 0, visible: false, reduced: false });
  const resumeTimer = useRef(0);
  const tween = useRef<gsap.core.Tween | null>(null);

  const place = useCallback(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;
    const radius = orbit.offsetWidth * 0.5 * 0.78;
    const a = sim.current.angle;
    nodeRefs.current.forEach((el, i) => {
      if (!el) return;
      const rad = ((a + i * STEP) * Math.PI) / 180;
      el.style.transform = `translate3d(${(Math.sin(rad) * radius).toFixed(1)}px, ${(-Math.cos(rad) * radius).toFixed(1)}px, 0)`;
    });
    if (ringRef.current) ringRef.current.style.transform = `rotate(${a.toFixed(2)}deg)`;
  }, []);

  /* the orbit */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const s = sim.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(([entry]) => (s.visible = entry.isIntersecting), { threshold: 0.15 });
    io.observe(section);

    const tick = (_time: number, deltaMs: number) => {
      if (!s.visible) return;
      if (!s.locked && !s.reduced) {
        s.angle -= DRIFT * Math.min(0.05, deltaMs / 1000);
        const current = ((Math.round(-s.angle / STEP) % N) + N) % N;
        if (current !== s.active) {
          s.active = current;
          setActive(current);
        }
      }
      place();
    };
    gsap.ticker.add(tick);
    place();
    window.addEventListener("resize", place);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [place]);

  const release = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    tween.current?.kill();
    sim.current.locked = false;
    setLocked(false);
  }, []);

  const lock = useCallback(
    (index: number) => {
      const s = sim.current;
      const i = ((index % N) + N) % N;
      s.locked = true;
      s.active = i;
      setLocked(true);
      setActive(i);

      // shortest way round to bring node i under the reading head
      const base = -i * STEP;
      const target = base + Math.round((s.angle - base) / 360) * 360;
      tween.current?.kill();
      if (s.reduced) {
        s.angle = target;
        place();
      } else {
        tween.current = gsap.to(s, { angle: target, duration: 1.4, ease: "expo.out" });
      }

      window.clearTimeout(resumeTimer.current);
      if (!s.reduced) resumeTimer.current = window.setTimeout(release, RESUME_AFTER);
    },
    [place, release],
  );

  useEffect(
    () => () => {
      window.clearTimeout(resumeTimer.current);
      tween.current?.kill();
    },
    [],
  );

  const onKey = (e: React.KeyboardEvent) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = N - 1;
    else if (e.key === "Escape") {
      release();
      return;
    }
    if (next < 0 && e.key !== "ArrowLeft" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = ((next % N) + N) % N;
    lock(i);
    nodeRefs.current[i]?.focus({ preventScroll: true });
  };

  const step = PROCESS[active];

  return (
    <section
      ref={sectionRef}
      data-rail="Process"
      aria-labelledby="ai-process-title"
      className="ai-section relative z-10"
    >
      <div className="ai-wrap">
        <div className="ai-process">
          <div className="ai-process__stage">
            <span aria-hidden="true" className="ai-scrim" />
            <header className="ai-head ai-head--single">
                <p className="ai-label">
                <b>04</b> / Process &nbsp;·&nbsp; {PROCESS_INTRO.body}
                </p>
              <h2 id="ai-process-title" className="ai-h2 font-display font-semibold uppercase">
            {PROCESS_INTRO.title}
              </h2>
            </header>

          <div ref={orbitRef} className="ai-orbit" data-locked={locked ? "" : undefined}>
            <svg aria-hidden="true" className="ai-orbit__dial" viewBox="-100 -100 200 200">
              <circle className="ai-orbit__ring ai-orbit__ring--faint" r="56" />
              <g ref={ringRef} className="ai-orbit__turn">
                <circle className="ai-orbit__ring" r="78" />
                {Array.from({ length: 60 }, (_, i) => {
                  const major = i % 12 === 0;
                  return (
                    <path
                      key={i}
                      className="ai-orbit__tick"
                      data-major={major ? "" : undefined}
                      d={`M0 ${-(major ? 90 : 93)} V-96`}
                      transform={`rotate(${i * 6})`}
                    />
                  );
                })}
                {/* sequence arcs: Diagnose -> the open step, lit in cyan */}
                {Array.from({ length: N - 1 }, (_, i) => {
                  const a0 = (i * STEP * Math.PI) / 180;
                  const a1 = ((i + 1) * STEP * Math.PI) / 180;
                  const p = (a: number) => `${(Math.sin(a) * 78).toFixed(3)} ${(-Math.cos(a) * 78).toFixed(3)}`;
                  return (
                    <path
                      key={i}
                      className="ai-orbit__arc"
                      data-on={i < active ? "" : undefined}
                      d={`M${p(a0)} A78 78 0 0 1 ${p(a1)}`}
                    />
                  );
                })}
              </g>
              {/* fixed reading head */}
              <path className="ai-orbit__head" d="M-4.5 -99 L4.5 -99 L0 -91 Z" />
            </svg>

            <div aria-hidden="true" className="ai-orbit__core">
              <Glyph kind="triangle" size="100%" color={DIVISIONS.ai.hue} strokeWidth={1.5} glow />
            </div>

            <div role="tablist" aria-label="Engagement steps" aria-orientation="horizontal" onKeyDown={onKey}>
              {PROCESS.map((p, i) => (
                <button
                  key={p.name}
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`ai-step-tab-${i}`}
                  aria-selected={i === active}
                  aria-controls="ai-step-panel"
                  tabIndex={i === active ? 0 : -1}
                  className="ai-orbit__node"
                  data-active={i === active ? "" : undefined}
                  onClick={() => lock(i)}
                  onFocus={(e) => {
                    // keyboard focus stops the orbit; mouse focus is handled by the click
                    if (e.currentTarget.matches(":focus-visible")) lock(i);
                  }}
                >
                  <span className="ai-orbit__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ai-orbit__name font-display font-medium uppercase">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          </div>

          <GlassPanel world="ai" className="ai-sheet ai-process__panel">
          <div
            id="ai-step-panel"
            role="tabpanel"
            aria-labelledby={`ai-step-tab-${active}`}
            className="ai-step"
            data-locked={locked ? "" : undefined}
          >
            <p className="ai-step__meta ai-label">
              <span>
                Step <b>{String(active + 1).padStart(2, "0")}</b> / {String(N).padStart(2, "0")}
              </span>
              <span className="ai-step__state" aria-live="polite">
                {locked ? "Locked" : "Orbit running"}
              </span>
            </p>

            <div key={active} className="ai-step__body">
              <h3 className="ai-h3 font-display font-semibold uppercase">{step.name}</h3>
              <p className="ai-body mt-4">{step.summary}</p>

              <p className="ai-label mt-8">What happens</p>
              <ul className="ai-step__list">
                {step.happens.map((line, i) => (
                  <li key={line}>
                    <span className="ai-label">
                      <b>{String(i + 1).padStart(2, "0")}</b>
                    </span>
                    <span className="ai-body">{line}</span>
                  </li>
                ))}
              </ul>

              <p className="ai-label mt-8">Deliverable</p>
              <p className="ai-body mt-3">{step.deliverable}</p>
            </div>

            <div className="ai-step__nav">
              <button type="button" className="ai-mini-btn" onClick={() => lock(active - 1)} aria-label="Previous step">
                <ArrowLeft size={16} weight="light" aria-hidden="true" />
              </button>
              <button type="button" className="ai-mini-btn" onClick={() => lock(active + 1)} aria-label="Next step">
                <ArrowRight size={16} weight="light" aria-hidden="true" />
              </button>
              {locked ? (
                <button type="button" className="ai-mini-btn ai-mini-btn--wide" onClick={release}>
                  <Play size={14} weight="light" aria-hidden="true" />
                  <span>Resume orbit</span>
                </button>
              ) : null}
            </div>
          </div>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import CapabilityDiagram from "./CapabilityDiagram";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";

/**
 * 2. Capabilities — spotlight cards (site-map mechanic), now ONE card per
 * viewport instead of a bento wall. Each capability owns a full frame and one
 * glass card that holds its copy and its diagram side by side, so the type is
 * always on a readable substrate and never laid over the drawing it describes.
 * Cards alternate left / right and push the lattice to the opposite side of
 * the frame, so the world moves with the reading order.
 *
 * The spotlight is still the mechanic: at rest a card is four corner ticks; the
 * 1px border and the cyan hairline field exist only inside the travelling light
 * (clip-path circles). With no pointer the light scans the on-screen card on
 * its own, and the card under the light flips IDLE -> LIVE. Touch devices get
 * full borders (CSS).
 */
const RADIUS = 320;

export default function Capabilities() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frames = Array.from(root.querySelectorAll<HTMLElement>(".ai-cap"));
    const onScreen = new Set<HTMLElement>();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) onScreen.add(el);
          else onScreen.delete(el);
        });
      },
      { threshold: 0 },
    );
    frames.forEach((f) => io.observe(f));

    if (!hover) return () => io.disconnect();

    let raf = 0;
    let px = -9999;
    let py = -9999;
    let x = 0;
    let y = 0;
    let started = false;
    let lastMove = 0;
    let last = performance.now();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      lastMove = performance.now();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!onScreen.size) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const idle = px < 0 || now - lastMove > 4000;
      let tx = px;
      let ty = py;
      if (idle) {
        const t = now / 1000;
        tx = window.innerWidth * (0.5 + 0.34 * Math.sin(t * 0.29));
        ty = window.innerHeight * (0.5 + 0.26 * Math.sin(t * 0.43 + 0.8));
        if (reduced) {
          tx = window.innerWidth * 0.5;
          ty = window.innerHeight * 0.45;
        }
      }
      if (!started) {
        started = true;
        x = tx;
        y = ty;
      }
      const k = reduced ? 1 : 1 - Math.exp(-dt * (idle ? 2 : 12));
      x += (tx - x) * k;
      y += (ty - y) * k;

      onScreen.forEach((section) => {
        const card = section.querySelector<HTMLElement>(".ai-card");
        if (!card) return;
        const ring = card.querySelector<HTMLElement>(".ai-card__ring");
        const field = card.querySelector<HTMLElement>(".ai-card__field");
        const r = card.getBoundingClientRect();
        const lx = x - r.left;
        const ly = y - r.top;
        if (ring) ring.style.clipPath = `circle(${RADIUS}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`;
        if (field) field.style.clipPath = `circle(${RADIUS - 44}px at ${(lx - 1).toFixed(1)}px ${(ly - 1).toFixed(1)}px)`;
        card.toggleAttribute("data-live", lx > -40 && ly > -40 && lx < r.width + 40 && ly < r.height + 40);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const total = String(CAPABILITIES.length).padStart(2, "0");

  return (
    <div ref={rootRef} id="capabilities">
      {CAPABILITIES.map((cap, i) => {
        const side = i % 2 === 0 ? "left" : "right";
        return (
          <section
            key={cap.id}
            data-rail="Capabilities"
            data-side={side}
            data-world-side={side === "left" ? "right" : "left"}
            aria-labelledby={`ai-cap-${cap.id}`}
            className="ai-cap relative z-10"
          >
            <div className="ai-wrap">
              {i === 0 ? (
                <header className="ai-cap__head">
                  <p className="ai-label">
                    <b>02</b> / Capabilities
                  </p>
                  <h2 className="ai-h2 font-display font-semibold uppercase">{CAPABILITIES_INTRO.title}</h2>
                </header>
              ) : null}

              <article className="ai-card">
                <span aria-hidden="true" className="ai-card__ring" />
                <div className="ai-card__panel">
                  <span aria-hidden="true" className="ai-card__field" />
                  <span aria-hidden="true" className="ai-card__tick ai-card__tick--tl" />
                  <span aria-hidden="true" className="ai-card__tick ai-card__tick--tr" />
                  <span aria-hidden="true" className="ai-card__tick ai-card__tick--bl" />
                  <span aria-hidden="true" className="ai-card__tick ai-card__tick--br" />

                  <p className="ai-card__meta ai-label">
                    <span>
                      <b>{String(i + 1).padStart(2, "0")}</b> / {total} &nbsp;{cap.tag}
                    </span>
                    <span aria-hidden="true" className="ai-card__status">
                      <i>Idle</i>
                      <i>Live</i>
                    </span>
                  </p>

                  {/* diagram and copy are side by side inside the one card, so
                      the type never sits on top of the thing it describes */}
                  <div className="ai-card__grid">
                    <div className="ai-card__copy">
                      <h3 id={`ai-cap-${cap.id}`} className="ai-h3 font-display font-semibold uppercase">
                        {cap.title}
                      </h3>
                      <p className="ai-body ai-card__body">{cap.body}</p>
                    </div>
                    <figure className="ai-card__figure">
                      <CapabilityDiagram kind={cap.id} />
                      <figcaption className="ai-label ai-card__note">Illustrative</figcaption>
                    </figure>
                  </div>
                </div>
              </article>
            </div>
          </section>
        );
      })}
    </div>
  );
}

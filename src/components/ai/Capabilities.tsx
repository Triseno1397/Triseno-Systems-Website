"use client";

import { useEffect, useRef } from "react";
import CapabilityDiagram from "./CapabilityDiagram";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";

/**
 * 2. Capabilities — spotlight cards in a bento.
 * At rest a card is only four corner ticks. The 1px border and a faint cyan
 * field (a grid of hairline marks, not a colour wash) exist only inside the
 * spotlight: both are clip-path circles that follow the light.
 * Beyond the stock mechanic: the card under the light flips IDLE -> LIVE and
 * its diagram comes up to full strength, and with no pointer in the grid the
 * light scans the bento on its own. Touch devices get full borders (CSS).
 */
const RADIUS = 300;

export default function Capabilities() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hover) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".ai-card"));
    const rings = cards.map((c) => c.querySelector<HTMLElement>(".ai-card__ring"));
    const fields = cards.map((c) => c.querySelector<HTMLElement>(".ai-card__field"));

    let raf = 0;
    let visible = false;
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
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = grid.getBoundingClientRect();
      const inside = px >= g.left - 80 && px <= g.right + 80 && py >= g.top - 80 && py <= g.bottom + 80;
      const idle = !inside || now - lastMove > 4000;
      let tx = px;
      let ty = py;
      if (idle) {
        // scan only the part of the bento that is on screen
        const top = Math.max(g.top, 0);
        const bottom = Math.max(top + 1, Math.min(g.bottom, window.innerHeight));
        if (reduced) {
          tx = g.left + g.width * 0.3;
          ty = top + (bottom - top) * 0.4;
        } else {
          const t = now / 1000;
          tx = g.left + g.width * (0.5 + 0.42 * Math.sin(t * 0.29));
          ty = top + (bottom - top) * (0.5 + 0.34 * Math.sin(t * 0.43 + 0.8));
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

      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const lx = x - r.left;
        const ly = y - r.top;
        const ring = rings[i];
        const field = fields[i];
        // the panel sits 1px inside the ring, so its field is offset by that pixel
        if (ring) ring.style.clipPath = `circle(${RADIUS}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`;
        if (field) field.style.clipPath = `circle(${RADIUS - 40}px at ${(lx - 1).toFixed(1)}px ${(ly - 1).toFixed(1)}px)`;
        const over = lx > -24 && ly > -24 && lx < r.width + 24 && ly < r.height + 24;
        card.toggleAttribute("data-live", over);
      });
    };

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
    io.observe(section);
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      data-rail="Capabilities"
      aria-labelledby="ai-cap-title"
      className="ai-section relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>02</b> / Capabilities
          </p>
          <h2 id="ai-cap-title" className="ai-h2 font-display font-semibold uppercase">
            {CAPABILITIES_INTRO.title}
          </h2>
          <p className="ai-body max-w-[58ch]">{CAPABILITIES_INTRO.body}</p>
        </header>

        <div ref={gridRef} className="ai-bento">
          {CAPABILITIES.map((cap, i) => (
            <article key={cap.id} className={`ai-card ai-card--${cap.slot}`}>
              <span aria-hidden="true" className="ai-card__ring" />
              <div className="ai-card__panel">
                <span aria-hidden="true" className="ai-card__field" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--tl" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--tr" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--bl" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--br" />

                <p className="ai-card__meta ai-label">
                  <span>
                    <b>{String(i + 1).padStart(2, "0")}</b> / {cap.tag}
                  </span>
                  <span aria-hidden="true" className="ai-card__status">
                    <i>Idle</i>
                    <i>Live</i>
                  </span>
                </p>
                <div className="ai-card__diagram">
                  <CapabilityDiagram kind={cap.id} />
                </div>
                <h3 className="ai-h3 font-display font-semibold uppercase">{cap.title}</h3>
                <p className="ai-body ai-card__body">{cap.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

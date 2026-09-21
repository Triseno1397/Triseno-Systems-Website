"use client";

import { useEffect, useRef } from "react";
import CapabilityDiagram from "./CapabilityDiagram";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";

/**
 * 2. Capabilities — spotlight cards in a bento (site-map mechanic; the 21st.dev
 * spotlight-card component, tailored). ONE frame, not six clones.
 *
 * At rest a card is four corner ticks, its diagram and its name. A light
 * travels over the bento — the pointer, or on its own when idle — and inside
 * its radius the 1px white border and a cyan hairline field appear
 * (clip-path circles; the field is line-work, never a colour wash).
 *
 * Beyond the stock demo: exactly one card is ever LIVE (the one nearest the
 * light), its diagram comes up to full strength, and its description is read
 * out in the single caption line under the bento. So the frame carries six
 * names and six drawings but only ever one paragraph — the light decides which.
 * Touch devices have no light: every card shows full borders and its own
 * description, and the caption is not rendered. Reduced motion: the light rests
 * on the first card.
 */
const RADIUS = 300;

export default function Capabilities() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const capIndexRef = useRef<HTMLElement>(null);
  const capTitleRef = useRef<HTMLSpanElement>(null);
  const capBodyRef = useRef<HTMLSpanElement>(null);

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
    let live = -1;

    const readOut = (i: number) => {
      const cap = CAPABILITIES[i];
      if (capIndexRef.current) capIndexRef.current.textContent = String(i + 1).padStart(2, "0");
      if (capTitleRef.current) capTitleRef.current.textContent = cap.title;
      if (capBodyRef.current) capBodyRef.current.textContent = cap.body;
    };

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
      const inside = px >= g.left - 60 && px <= g.right + 60 && py >= g.top - 60 && py <= g.bottom + 60;
      const idle = !inside || now - lastMove > 4000;
      let tx = px;
      let ty = py;
      if (idle) {
        if (reduced) {
          const r0 = cards[0].getBoundingClientRect();
          tx = r0.left + r0.width / 2;
          ty = r0.top + r0.height / 2;
        } else {
          // a slow lissajous over the bento, so every card gets its turn
          const t = now / 1000;
          tx = g.left + g.width * (0.5 + 0.44 * Math.sin(t * 0.23));
          ty = g.top + g.height * (0.5 + 0.36 * Math.sin(t * 0.37 + 0.8));
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

      let nearest = -1;
      let nearestD = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const lx = x - r.left;
        const ly = y - r.top;
        const ring = rings[i];
        const field = fields[i];
        if (ring) ring.style.clipPath = `circle(${RADIUS}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`;
        if (field) field.style.clipPath = `circle(${RADIUS - 50}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`;
        const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        if (d < nearestD) {
          nearestD = d;
          nearest = i;
        }
      });
      if (nearest !== live) {
        if (live >= 0) cards[live].removeAttribute("data-live");
        live = nearest;
        cards[live].setAttribute("data-live", "");
        readOut(live);
      }
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

  const total = String(CAPABILITIES.length).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      data-rail="Capabilities"
      aria-labelledby="ai-cap-title"
      className="ai-section ai-caps relative z-10"
    >
      <div className="ai-wrap">
        <div ref={gridRef} className="ai-bento">
          <header className="ai-glass ai-sheet ai-bento__head">
            <p className="ai-label">
              <b>02</b> / Capabilities
            </p>
            <h2 id="ai-cap-title" className="ai-h2 font-display font-semibold uppercase">
              {CAPABILITIES_INTRO.title}
            </h2>
            <p className="ai-body">{CAPABILITIES_INTRO.body}</p>
          </header>

          {CAPABILITIES.map((cap, i) => (
            <article key={cap.id} className="ai-card">
              <span aria-hidden="true" className="ai-card__ring" />
              <div className="ai-glass ai-card__panel">
                <span aria-hidden="true" className="ai-card__field" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--tl" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--tr" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--bl" />
                <span aria-hidden="true" className="ai-card__tick ai-card__tick--br" />

                <p className="ai-card__meta ai-label">
                  <span>
                    <b>{String(i + 1).padStart(2, "0")}</b> / {total}
                  </span>
                  <span aria-hidden="true" className="ai-card__status">
                    <i>Idle</i>
                    <i>Live</i>
                  </span>
                </p>
                <div className="ai-card__figure">
                  <CapabilityDiagram kind={cap.id} />
                </div>
                <h3 className="ai-h3 font-display font-semibold uppercase">{cap.title}</h3>
                {/* on pointer devices this is read out in the caption instead */}
                <p className="ai-body ai-card__body">{cap.body}</p>
              </div>
            </article>
          ))}
        </div>

        <p aria-hidden="true" className="ai-glass ai-bento__caption">
          <span className="ai-label">
            <b ref={capIndexRef}>01</b> / Live
          </span>
          <span className="ai-bento__read">
            <span ref={capTitleRef} className="ai-h3 font-display font-semibold uppercase">
              {CAPABILITIES[0].title}
            </span>
            <span ref={capBodyRef} className="ai-body">
              {CAPABILITIES[0].body}
            </span>
          </span>
        </p>
      </div>
    </section>
  );
}

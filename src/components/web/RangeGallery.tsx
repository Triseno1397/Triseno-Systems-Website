"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { RANGE } from "./RangeComps";

/**
 * Range — hover-swap gallery. Industries in display type; on a fine pointer a
 * framed preview panel trails the cursor and its reel of concept comps swaps
 * to the hovered row (one transform on the reel, one on the panel). Keyboard
 * focus docks the panel beside the focused row. On touch there is no panel:
 * tapping a row opens its comp inline beneath it.
 */

const PANEL_W = 440;
const PANEL_H = 330;

export default function RangeGallery() {
  const [active, setActiveRaw] = useState<number | null>(null);
  // The reel keeps showing the last comp while the panel closes.
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [fine, setFine] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const placed = useRef(false);
  const raf = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const activate = useCallback((i: number) => {
    setActiveRaw(i);
    setShown(i);
  }, []);
  const release = useCallback((i: number) => setActiveRaw((v) => (v === i ? null : v)), []);

  const aim = useCallback((x: number, y: number) => {
    const w = Math.min(PANEL_W, window.innerWidth * 0.34);
    const h = (w / PANEL_W) * PANEL_H;
    const tx = Math.min(Math.max(16, x + 28), window.innerWidth - w - 84);
    const ty = Math.min(Math.max(72, y - h * 0.5), window.innerHeight - h - 24);
    target.current = { x: tx, y: ty };
    if (!placed.current) {
      placed.current = true;
      current.current = { x: tx, y: ty };
    }
    if (raf.current) return;

    function step() {
      const panel = panelRef.current;
      if (!panel) {
        raf.current = 0;
        return;
      }
      const k = reduced.current ? 1 : 0.14;
      const c = current.current;
      c.x += (target.current.x - c.x) * k;
      c.y += (target.current.y - c.y) * k;
      panel.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
      const rest = Math.abs(target.current.x - c.x) + Math.abs(target.current.y - c.y);
      raf.current = rest > 0.3 ? requestAnimationFrame(step) : 0;
    }
    raf.current = requestAnimationFrame(step);
  }, []);

  const onListMove = (e: React.PointerEvent<HTMLOListElement>) => {
    if (e.pointerType === "touch" || !fine) return;
    aim(e.clientX, e.clientY);
  };

  const onRowFocus = (i: number, el: HTMLElement) => {
    activate(i);
    if (!fine) return;
    // Keyboard: dock the panel beside the focused row.
    if (el.matches(":focus-visible")) {
      const r = el.getBoundingClientRect();
      aim(r.left + r.width * 0.56, r.top + r.height * 0.5);
    }
  };

  const reelStyle = {
    transform: `translate3d(0, ${-shown * (100 / RANGE.length)}%, 0)`,
  } as CSSProperties;

  return (
    <section data-rail="Range" className="web-section web-range">
      <header className="web-range__head">
        <h2 className="web-eyebrow">
          <span className="web-sq" aria-hidden="true" />
          05 — Range — any industry, its own voice
        </h2>
        <p className="web-body">
          Eight concept directions, eight layouts, eight typographic voices.{" "}
          <span className="web-hover-only">Hover a row.</span>
          <span className="web-touch-only">Tap a row.</span> Fictional brands, labelled as concepts.
        </p>
      </header>

      <ol className="web-range__list" data-active={active !== null ? "" : undefined} onPointerMove={onListMove}>
        {RANGE.map((item, i) => {
          const isOpen = !fine && open === i;
          return (
            <li key={item.industry} className="web-range__item">
              <button
                type="button"
                className="web-range__row"
                data-lit={active === i || isOpen ? "" : undefined}
                aria-expanded={fine ? undefined : isOpen}
                onPointerEnter={(e) => {
                  if (e.pointerType === "touch") return;
                  activate(i);
                  aim(e.clientX, e.clientY);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== "touch") release(i);
                }}
                onFocus={(e) => onRowFocus(i, e.currentTarget)}
                onBlur={() => release(i)}
                onClick={() => {
                  if (!fine) setOpen((v) => (v === i ? null : i));
                }}
              >
                <span className="web-range__n">{String(i + 1).padStart(2, "0")}</span>
                <span className="web-range__word">{item.industry}</span>
                <span className="web-range__meta">
                  <span>{item.brand}</span>
                  <span>{item.note}</span>
                </span>
              </button>
              {isOpen ? (
                <div className="web-range__inline">
                  <span className="web-range__concept">Concept — {item.brand}</span>
                  <div className="web-range__comp">{item.comp}</div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {fine ? (
        <div
          ref={panelRef}
          aria-hidden="true"
          className="web-range__panel"
          data-on={active !== null ? "" : undefined}
        >
          <div className="web-range__panel-inner">
            <div className="web-range__reel" style={reelStyle}>
              {RANGE.map((item) => (
                <div key={item.industry} className="web-range__comp">
                  {item.comp}
                </div>
              ))}
            </div>
          </div>
          <span className="web-range__concept web-range__concept--panel">
            Concept {String(shown + 1).padStart(2, "0")}/{String(RANGE.length).padStart(2, "0")} —{" "}
            {RANGE[shown].brand}
          </span>
        </div>
      ) : null}
    </section>
  );
}

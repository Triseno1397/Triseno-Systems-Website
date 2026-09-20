"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { RANGE } from "./RangeComps";

/**
 * Range — hover-swap gallery, section 05, standing in the world.
 *
 * DESKTOP: industries in display type down the left, and a DOCKED browser
 * frame in its own column on the right. Hovering or focusing a row runs the
 * reel of concept sites to that industry (one transform on the reel). The
 * panel is docked rather than cursor-following on purpose: a panel that
 * follows the cursor lands on top of the very words it is illustrating.
 *
 * PHONE: there is no hover, so the concept sites are not hidden behind one —
 * they are the section. A full-width snap carousel of the eight sites sits
 * under the heading, and tapping an industry in the list below runs the
 * carousel to it. The argument of this section is the work, so on the device
 * most prospects use, the work is what is on screen.
 */

export default function RangeGallery() {
  const [active, setActiveRaw] = useState<number | null>(null);
  /** The reel keeps showing the last site while the panel settles. */
  const [shown, setShown] = useState(0);
  const [fine, setFine] = useState(true);

  const railRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    // Matches the CSS dock query exactly.
    const mq = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const activate = useCallback((i: number) => {
    setActiveRaw(i);
    setShown(i);
  }, []);
  const release = useCallback((i: number) => setActiveRaw((v) => (v === i ? null : v)), []);

  /** Phone: keep the list in step with whichever site the carousel has landed on. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || fine) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let idx = 0;
      slideRefs.current.forEach((slide, i) => {
        if (slide && slide.offsetLeft <= mid) idx = i;
      });
      setShown(idx);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => {
      rail.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [fine]);

  const runTo = (i: number) => {
    const rail = railRef.current;
    const slide = slideRefs.current[i];
    if (!rail || !slide) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left: slide.offsetLeft - rail.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  };

  const reelStyle = { transform: `translate3d(0, ${-shown * (100 / RANGE.length)}%, 0)` } as CSSProperties;
  const item = RANGE[shown];

  return (
    <section data-rail="Range" data-station="range" className="web-section web-range">
      <header className="web-range__head">
        <h2 className="web-eyebrow">
          <span className="web-sq" aria-hidden="true" />
          05 — Range — any industry, its own voice
        </h2>
        <p className="web-body">
          Eight concept directions, eight layouts, eight typographic voices.
          <span className="web-hover-only"> Hover a row to run the frame.</span>
          <span className="web-touch-only"> Swipe the frames, or tap an industry.</span> Fictional brands,
          labelled as concepts.
        </p>
      </header>

      {/* Phone: the work itself, full width and swipeable. */}
      <div className="web-range__rail" ref={railRef}>
        <ol className="web-range__slides">
          {RANGE.map((entry, i) => (
            <li
              key={entry.industry}
              className="web-range__slide"
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
            >
              <div className="web-browser web-browser--slide">
                <span className="web-browser__bar">
                  <span aria-hidden="true" className="web-browser__dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="web-browser__url">{slug(entry.brand)}</span>
                  <span className="web-browser__tag">Concept</span>
                </span>
                <div className="web-range__comp">{entry.comp}</div>
              </div>
              <p className="web-range__caption">
                <span>
                  {String(i + 1).padStart(2, "0")} / {String(RANGE.length).padStart(2, "0")} —{" "}
                  {entry.industry}
                </span>
                <span>{entry.note}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="web-range__main">
        <ol className="web-range__list" data-active={active !== null ? "" : undefined}>
          {RANGE.map((entry, i) => (
            <li key={entry.industry} className="web-range__item">
              <button
                type="button"
                className="web-range__row"
                data-lit={(fine ? active === i : shown === i) ? "" : undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType === "touch" || !fine) return;
                  activate(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== "touch" && fine) release(i);
                }}
                onFocus={() => fine && activate(i)}
                onBlur={() => fine && release(i)}
                onClick={() => {
                  if (!fine) runTo(i);
                }}
              >
                <span className="web-range__n">{String(i + 1).padStart(2, "0")}</span>
                <span className="web-range__word">{entry.industry}</span>
                <span className="web-range__meta">
                  <span>{entry.brand}</span>
                  <span>{entry.note}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* Desktop: the docked frame. Its own column, so it covers nothing. */}
        <div className="web-range__dock" aria-hidden="true">
          <div className="web-browser" data-on={active !== null ? "" : undefined}>
            <span className="web-browser__bar">
              <span aria-hidden="true" className="web-browser__dots">
                <i />
                <i />
                <i />
              </span>
              <span className="web-browser__url">{slug(item.brand)}</span>
              <span className="web-browser__tag">Concept</span>
            </span>
            <div className="web-range__window">
              <div className="web-range__reel" style={reelStyle}>
                {RANGE.map((entry) => (
                  <div key={entry.industry} className="web-range__comp">
                    {entry.comp}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="web-range__caption">
            <span>
              {String(shown + 1).padStart(2, "0")} / {String(RANGE.length).padStart(2, "0")} —{" "}
              {item.industry}
            </span>
            <span>{item.note}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Fictional brand → fictional address bar, so the frame reads as a browser. */
function slug(brand: string) {
  return `${brand.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
}

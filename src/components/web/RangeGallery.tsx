"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { RANGE, type RangeItem } from "./RangeComps";

/**
 * Range — hover-swap gallery, section 05, standing in the world.
 *
 * Presentation: STYLE TILES, not browser windows (the demo section already
 * owns the browser frame). Each concept is shown edge to edge as a design
 * board: the site, and under it a footer in the concept's own paper and ink
 * carrying its brand in its own display voice and its palette swatches — the
 * range is argued in type and colour, not in window chrome.
 *
 * DESKTOP: industries in display type down the left, and a DOCKED style
 * tile in its own column on the right. Hovering or focusing a row runs the
 * reel of concept sites to that industry (one transform on the reel). The
 * panel is docked rather than cursor-following on purpose: a panel that
 * follows the cursor lands on top of the very words it is illustrating.
 *
 * PHONE: there is no hover, so the concept sites are not hidden behind one —
 * they are the section. Every industry row carries its own style tile
 * directly beneath it, so wherever a phone stops in this section, concept
 * work is on screen.
 */

export default function RangeGallery() {
  const [active, setActiveRaw] = useState<number | null>(null);
  /** The reel keeps showing the last site while the panel settles. */
  const [shown, setShown] = useState(0);
  const [fine, setFine] = useState(true);

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
          <span className="web-touch-only"> Each industry, its own site.</span> Fictional brands,
          labelled as concepts.
        </p>
      </header>

      <div className="web-range__main">
        <ol className="web-range__list" data-active={active !== null ? "" : undefined}>
          {RANGE.map((entry, i) => (
            <li key={entry.industry} className="web-range__item">
              <button
                type="button"
                className="web-range__row"
                data-lit={fine && active === i ? "" : undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType === "touch" || !fine) return;
                  activate(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== "touch" && fine) release(i);
                }}
                onFocus={() => fine && activate(i)}
                onBlur={() => fine && release(i)}
              >
                <span className="web-range__n">{String(i + 1).padStart(2, "0")}</span>
                <span className="web-range__word">{entry.industry}</span>
                <span className="web-range__meta">
                  <span>{entry.brand}</span>
                  <span>{entry.note}</span>
                </span>
              </button>
              {/* Phone: the concept itself, directly under its industry (hidden
                  where the docked tile shows it instead). */}
              <figure className="web-tile web-range__inline" aria-label={`Concept site for ${entry.brand}`}>
                <div className="web-range__comp">{entry.comp}</div>
                <TileRail item={entry} />
              </figure>
            </li>
          ))}
        </ol>

        {/* Desktop: the docked frame. Its own column, so it covers nothing. */}
        <div className="web-range__dock" aria-hidden="true">
          <figure className="web-tile" data-on={active !== null ? "" : undefined}>
            <div className="web-range__window">
              <div className="web-range__reel" style={reelStyle}>
                {RANGE.map((entry) => (
                  <div key={entry.industry} className="web-range__comp">
                    {entry.comp}
                  </div>
                ))}
              </div>
            </div>
            <TileRail item={item} />
          </figure>
          <p className="web-range__caption">
            <span>
              Concept {String(shown + 1).padStart(2, "0")} / {String(RANGE.length).padStart(2, "0")} —{" "}
              {item.industry}
            </span>
            <span>{item.note}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The style tile's footer: depicted content in the concept's own paper and
 * ink — its brand in its display voice, and its palette.
 */
function TileRail({ item }: { item: RangeItem }) {
  const [paper, ink] = item.palette;
  return (
    <figcaption className="web-tile__rail" style={{ "--paper": paper, "--ink": ink } as CSSProperties}>
      <span className={`web-tile__face web-tile__face--${item.face}`}>{item.brand}</span>
      <span className="web-tile__sw" role="img" aria-label={`Palette: ${item.palette.join(", ")}`}>
        {item.palette.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
      </span>
    </figcaption>
  );
}

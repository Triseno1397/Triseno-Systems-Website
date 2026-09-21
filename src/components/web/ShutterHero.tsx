"use client";

import { useState, type CSSProperties } from "react";
import GhostButton from "@/components/ui/GhostButton";
import GlassPanel from "@/components/world/GlassPanel";
import { getLenis } from "@/components/world/SmoothScroll";

/**
 * Triseno shutter text — section 01, standing in the world.
 *
 * Mechanical starting point: 21st.dev "hero shutter text" (a word cut into
 * clip-path slices that slide). Everything else is this division's own:
 * - the WHOLE headline block is cut into nine horizontal bands, so the cut
 *   lines run across all three lines of type;
 * - at first paint the headline sits behind a CLOSED violet shutter — nine
 *   slats filling the block — which collapses band by band as the type slides
 *   in. Nothing is ever a blank hole waiting for JavaScript: the animation is
 *   CSS and is already running on the first painted frame;
 * - the same shutter runs over the hero's second object: a browser frame with
 *   a live concept site inside it, so the first screen of a page that sells
 *   websites shows a website;
 * - clicking either object re-runs the shutter.
 * Reduced motion and no-JS render the finished headline and the finished site.
 */

const LINES = ["Design that", "moves", "people."];
const BANDS = 9;
/** ms each band trails the one before — uneven on purpose (stepped front). */
const LAG = [0, 190, 70, 260, 120, 310, 30, 215, 150];

export default function ShutterHero() {
  // Remounting the shutter restarts the CSS animation — no JS timeline to sync.
  const [run, setRun] = useState(0);
  const replay = () => setRun((v) => v + 1);

  const toDemo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("web-demo");
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  };

  return (
    <section
      data-rail="Hero"
      data-station="hero"
      className="web-section web-hero"
    >
      <div className="web-hero__grid">
        <div className="web-hero__copy">
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            Triseno / Web Design Division — no templates
          </p>

          <div key={`t${run}`} className="web-shutter">
            <h1 className="web-shutter__text web-shutter__text--base">
              {LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            {Array.from({ length: BANDS }, (_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="web-shutter__band"
                style={
                  {
                    "--t": `${((i / BANDS) * 100).toFixed(4)}%`,
                    "--b": `${(100 - ((i + 1) / BANDS) * 100).toFixed(4)}%`,
                    "--lag": `${LAG[i % LAG.length]}ms`,
                    "--dx": i % 2 ? "40px" : "-40px",
                  } as CSSProperties
                }
              >
                <div className="web-shutter__text">
                  {LINES.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <span aria-hidden="true" className="web-shutter__slats">
              {Array.from({ length: BANDS }, (_, i) => (
                <i
                  key={i}
                  style={
                    { "--lag": `${LAG[i % LAG.length]}ms` } as CSSProperties
                  }
                />
              ))}
            </span>
          </div>

          <p className="web-lede">
            The web arm of Triseno Systems. Custom, motion-led websites
            engineered to convert. No templates: the page you are scrolling is
            the demo.
          </p>
          <div className="web-hero__actions">
            <GhostButton href="/contact">Start a Conversation</GhostButton>
            <a href="#web-demo" onClick={toDemo} className="web-subaction">
              <span className="web-subaction__rule" aria-hidden="true" />
              See the demo
            </a>
          </div>
        </div>

        <div className="web-hero__object">
          <GlassPanel world="web" className="web-bezel">
            <button
              type="button"
              key={`s${run}`}
              className="web-hero__site"
              onClick={replay}
              aria-label="Concept site for Vale and Hollis. Replay the shutter."
            >
              <span className="web-browser__bar">
                <span aria-hidden="true" className="web-browser__dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="web-browser__url">valeandhollis.example</span>
                <span className="web-browser__tag">Concept</span>
              </span>
              <span className="web-hero__site-view">
                <HeroSite />
                <span
                  aria-hidden="true"
                  className="web-shutter__slats web-shutter__slats--site"
                >
                  {Array.from({ length: BANDS }, (_, i) => (
                    <i
                      key={i}
                      style={
                        { "--lag": `${LAG[i % LAG.length]}ms` } as CSSProperties
                      }
                    />
                  ))}
                </span>
              </span>
            </button>
          </GlassPanel>
          <span aria-hidden="true" className="web-hero__mirror" />
        </div>
      </div>
    </section>
  );
}

/**
 * Concept site shown inside the hero's browser frame — fictional landscape
 * architecture practice. Live HTML/CSS in container units, so it stays crisp
 * at any frame size. Depicted content: it carries its own palette and serif
 * voice (design-system §2, mocks inside device frames are exempt).
 */
function HeroSite() {
  return (
    <span className="hs">
      <span className="hs-nav">
        <span className="hs-logo">Vale &amp; Hollis</span>
        <span className="hs-links">
          <span>Gardens</span>
          <span>Practice</span>
          <span>Journal</span>
        </span>
        <span className="hs-cta">Book a site visit</span>
      </span>
      <span className="hs-body">
        <span className="hs-copy">
          <span className="hs-kicker">Landscape architecture · Est. 2009</span>
          <span className="hs-h">
            Gardens that look <em>older</em> than the house.
          </span>
          <span className="hs-p">
            Planting plans, hard landscaping and ten-year maintenance, drawn for
            one plot at a time.
          </span>
        </span>
        <span className="hs-art" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="hs-facts">
        <span>
          <b>140</b>gardens built
        </span>
        <span>
          <b>3 wks</b>to first drawing
        </span>
        <span>
          <b>10 yr</b>planting plan
        </span>
      </span>
    </span>
  );
}

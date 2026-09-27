"use client";

import { useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GhostButton from "@/components/ui/GhostButton";
import GlassPanel from "@/components/world/GlassPanel";
import { getLenis } from "@/components/world/SmoothScroll";
import ConceptWheel from "./ConceptWheel";
import { SITE_TEMPLATES } from "./siteTemplates";
import CarbonForgeSite from "./CarbonForgeSite";

gsap.registerPlugin(ScrollTrigger);

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
 * - the hero's second object is a browser frame with a live concept site in
 *   it, readable from the first paint, so the first screen of a page that
 *   sells websites shows a website; clicking it re-runs the headline shutter.
 * Reduced motion and no-JS render the finished headline and the finished site.
 */

const LINES = ["Design that", "moves", "people."];
const BANDS = 9;
/**
 * ms each band trails the one before — uneven on purpose (stepped front), and
 * short: the whole reveal resolves in ~0.7s, so the headline is readable almost
 * at once.
 */
const LAG = [0, 76, 28, 104, 48, 124, 12, 86, 60];

export default function ShutterHero() {
  // Remounting the shutter restarts the CSS animation — no JS timeline to sync.
  const [run, setRun] = useState(0);
  const replay = () => setRun((v) => v + 1);
  const rootRef = useRef<HTMLElement>(null);
  // which concept site the browser shows: null = its own, Carbon Forge (the
  // live, moving one), which it opens on and returns to
  const [pick, setPick] = useState<number | null>(null);
  const picked = pick === null ? null : SITE_TEMPLATES[pick];
  const home = SITE_TEMPLATES.find((tpl) => tpl.live) ?? SITE_TEMPLATES[0];

  // Leaving: the whole hero fades and lifts away as it scrolls out, so no
  // part of it (the CTA row least of all) lingers under the lockup.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // On a phone the hero is taller than the screen and the concept wheel
        // is its last thing: fading from the first pixel of scroll meant the
        // wheel was half gone by the time it was in view. There the hero only
        // fades as its bottom leaves the top part of the screen.
        const phone = window.matchMedia("(max-width: 899px)").matches;
        gsap.fromTo(
          ".web-hero__grid",
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -48,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: phone ? "bottom 62%" : "top top-=40",
              end: phone ? "bottom 12%" : "bottom 55%",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: rootRef },
  );

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
      ref={rootRef}
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
            <GhostButton href="/contact?division=web">Start a Conversation</GhostButton>
            <a href="#web-demo" onClick={toDemo} className="web-subaction">
              <span className="web-subaction__rule" aria-hidden="true" />
              See the demo
            </a>
          </div>
        </div>

        <div className="web-hero__object">
          <ConceptWheel templates={SITE_TEMPLATES} sectionRef={rootRef} onPick={setPick}>
            <GlassPanel world="web" className="web-bezel">
              <button
                type="button"
                key={`s${run}`}
                className="web-hero__site"
                onClick={replay}
                aria-label={`Concept site for ${picked ? picked.name : home.name}. Replay the shutter.`}
              >
                <span className="web-browser__bar">
                  <span aria-hidden="true" className="web-browser__dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="web-browser__url">{picked ? picked.url : home.url}</span>
                  <span className="web-browser__tag">Concept</span>
                </span>
                <span className="web-hero__site-view">
                  {/* its own site: Carbon Forge, live */}
                  <span className="web-hero__home">
                    <CarbonForgeSite />
                  </span>
                  {/* the orbit's pick, laid over it */}
                  {SITE_TEMPLATES.filter((tpl) => !tpl.live).map((tpl) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={tpl.key}
                      src={picked?.key === tpl.key ? tpl.full : undefined}
                      alt=""
                      aria-hidden="true"
                      className="web-hero__pick"
                      data-on={picked?.key === tpl.key ? "" : undefined}
                    />
                  ))}
                </span>
              </button>
            </GlassPanel>
          </ConceptWheel>
          <span aria-hidden="true" className="web-hero__mirror" />
        </div>
      </div>
    </section>
  );
}

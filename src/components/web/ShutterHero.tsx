"use client";

import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import GhostButton from "@/components/ui/GhostButton";
import { getLenis } from "@/components/world/SmoothScroll";

/**
 * Triseno shutter text.
 *
 * Mechanical starting point: 21st.dev "hero shutter text"
 * (design-loop/21st/hero-shutter-text.json) — a word cut into clip-path slices
 * that slide. Everything else is this division's own:
 * - the WHOLE headline block is cut into nine horizontal bands (not three
 *   slices per letter), so the cut lines run across all three lines of type;
 * - the bands open out of the division glyph: a square frame whose slats flip
 *   open first, then release a violet hairline scan edge that crosses the
 *   headline; every band trails the edge by its own lag, so the reveal front
 *   is a stepped shutter, not a wipe;
 * - hovering / focusing / tapping the frame closes and re-opens the shutter
 *   (the stock demo needs a refresh button);
 * - a mono readout counts the scan; one decelerating ease, <= 2.5s (M3);
 * - reduced motion and no-JS render the finished headline.
 */

const LINES = ["Design that", "moves", "people."];
const BANDS = 9;
// Seconds each band trails the scan edge — uneven on purpose (stepped front).
const LAG = [0.0, 0.2, 0.07, 0.27, 0.12, 0.32, 0.03, 0.22, 0.15];

export default function ShutterHero() {
  const rootRef = useRef<HTMLElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = rootRef.current;
        if (!root) return;
        const bands = gsap.utils.toArray<HTMLElement>(".web-shutter__band", root);
        const slats = gsap.utils.toArray<HTMLElement>(".web-frame__slat", root);
        const scan = root.querySelector<HTMLElement>(".web-shutter__scan");
        const count = { v: 0 };
        const paint = () => {
          if (readoutRef.current) readoutRef.current.textContent = String(Math.round(count.v)).padStart(3, "0");
        };

        // Arriving through the warp: wait until the tunnel has thinned out.
        const viaWarp = document.documentElement.hasAttribute("data-warping");
        const tl = gsap.timeline({ delay: viaWarp ? 1.1 : 0.25, defaults: { ease: "power3.inOut" } });

        tl.fromTo(
          slats,
          { scaleY: 0.9 },
          { scaleY: 0.035, duration: 0.7, ease: "expo.out", stagger: 0.045 },
          0,
        );
        tl.fromTo(scan, { xPercent: 100, opacity: 1 }, { xPercent: 0, duration: 1.5 }, 0.2);
        tl.fromTo(count, { v: 0 }, { v: 100, duration: 1.5, onUpdate: paint }, 0.2);
        bands.forEach((band, i) => {
          tl.fromTo(
            band,
            { "--l": "100%", x: i % 2 ? 44 : -44 },
            { "--l": "0%", x: 0, duration: 1.5 },
            0.2 + LAG[i % LAG.length],
          );
        });
        tl.to(scan, { opacity: 0, duration: 0.45, ease: "power3.out" }, 1.75);
        tlRef.current = tl;
        return () => {
          tlRef.current = null;
        };
      });
    },
    { scope: rootRef },
  );

  const replay = () => {
    const tl = tlRef.current;
    if (!tl || tl.isActive()) return;
    tl.delay(0);
    tl.restart();
  };

  const toDemo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("web-demo");
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  };

  return (
    <section ref={rootRef} data-rail="Hero" className="web-section web-hero">
      <noscript>
        <style>{`.web-shutter__band{--l:0%!important}`}</style>
      </noscript>

      <div className="web-hero__grid">
        <div className="web-hero__copy">
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            Triseno / Web Design Division — no templates
          </p>

          <div className="web-shutter" data-state="pre">
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
            <div aria-hidden="true" className="web-shutter__scan">
              <i />
            </div>
          </div>

          <p className="web-lede">
            The web arm of Triseno Systems. Custom, motion-led websites engineered to convert. No templates:
            the page you are scrolling is the demo.
          </p>
          <div className="web-hero__actions">
            <GhostButton href="/contact">Start a Conversation</GhostButton>
            <a href="#web-demo" onClick={toDemo} className="web-textlink world-underline">
              See the demo
            </a>
          </div>
        </div>

        <div className="web-hero__object">
          <button
            type="button"
            className="web-frame"
            onPointerEnter={(e) => {
              if (e.pointerType !== "touch") replay();
            }}
            onFocus={replay}
            onClick={replay}
            aria-label="Replay the headline shutter"
          >
            <span aria-hidden="true" className="web-frame__slats">
              {Array.from({ length: BANDS }, (_, i) => (
                <i key={i} className="web-frame__slat" />
              ))}
            </span>
            <span aria-hidden="true" className="web-frame__tag web-frame__tag--tl">
              {String(BANDS).padStart(2, "0")} bands
            </span>
            <span aria-hidden="true" className="web-frame__tag web-frame__tag--br">
              scan <span ref={readoutRef}>100</span>%
            </span>
          </button>
          <span aria-hidden="true" className="web-frame__mirror" />
          <p aria-hidden="true" className="web-frame__hint">
            <span className="web-hover-only">Hover the frame</span>
            <span className="web-touch-only">Tap the frame</span> — re-shutter
          </p>
        </div>
      </div>

      <div aria-hidden="true" className="web-hero__tick scroll-tick">
        <span className="scroll-tick__line" />
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ConceptSite from "./ConceptSite";
import GlassPanel from "@/components/world/GlassPanel";

gsap.registerPlugin(ScrollTrigger);

/**
 * Triseno container scroll.
 *
 * Mechanical starting point: 21st.dev "container scroll animation" — a card
 * that un-tilts on scroll. Tailored:
 * - a 0-radius hairline browser frame with square-glyph window controls lies
 *   on the reflective floor and tilts up (perspective rotateX, scrubbed);
 * - once upright the scroll keeps going INSIDE the frame: the concept site
 *   travels through its viewport (the stock card is a still image);
 * - the site is live HTML/CSS sized in container units, so it is crisp at any
 *   frame size. Fictional brand, labelled as a concept.
 * Reduced motion: frame upright, its viewport scrolls natively, nothing pinned.
 */
export default function DemoFrame() {
  const rootRef = useRef<HTMLElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Reduced motion: the viewport scrolls natively, so make it keyboard-reachable.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        viewport.tabIndex = 0;
        return () => {
          viewport.tabIndex = -1;
        };
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = rootRef.current;
        const device = deviceRef.current;
        const viewport = viewportRef.current;
        const page = pageRef.current;
        if (!root || !device || !viewport || !page) return;

        const travel = () =>
          Math.max(0, page.scrollHeight - viewport.clientHeight);

        const small = window.matchMedia("(max-width: 767px)").matches;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        tl.fromTo(
          device,
          {
            // phones start less flat, so the lying-down frame never leaves
            // most of a small screen empty
            rotateX: small ? 34 : 64,
            yPercent: small ? 10 : 26,
            scale: small ? 0.9 : 0.78,
            transformOrigin: "50% 100%",
          },
          {
            rotateX: 0,
            yPercent: 0,
            scale: 1,
            duration: 0.36,
            ease: "power2.out",
          },
          0,
        );
        tl.fromTo(
          ".web-demo__mirror",
          { opacity: 0.1, scaleY: 0.4 },
          { opacity: 0.55, scaleY: 1, duration: 0.36 },
          0,
        );
        tl.fromTo(
          ".web-demo__shine",
          { opacity: 0.5 },
          { opacity: 0, duration: 0.36 },
          0,
        );
        tl.fromTo(page, { y: 0 }, { y: () => -travel(), duration: 0.6 }, 0.38);
        tl.to({}, { duration: 0.02 });
      });
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="web-demo"
      data-rail="Demo"
      data-station="demo"
      className="web-demo"
    >
      <div className="web-demo__stage">
        <header className="web-demo__head">
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            02 — Proof you can scroll
          </p>
          <h2 className="web-h2">The page is the demo</h2>
          <p className="web-body">
            Every section of this page runs a different motion system, built by
            hand. Keep scrolling: the frame stands up, then a concept site runs
            inside it.
          </p>
        </header>

        <div className="web-demo__rig">
          <div ref={deviceRef} className="web-demo__device">
            <GlassPanel world="web" className="web-bezel">
              <div className="web-browser__bar">
                <span aria-hidden="true" className="web-browser__dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="web-browser__url">hotelquillon.example</span>
                <span className="web-browser__tag">Concept</span>
              </div>
              <div
                ref={viewportRef}
                className="web-demo__viewport"
                data-lenis-prevent=""
                tabIndex={-1}
                aria-label="Concept site for a fictional hotel"
              >
                <div ref={pageRef} className="web-demo__page">
                  <ConceptSite />
                </div>
                <span aria-hidden="true" className="web-demo__shine" />
              </div>
            </GlassPanel>
          </div>
          <span aria-hidden="true" className="web-demo__mirror" />
        </div>
      </div>
    </section>
  );
}

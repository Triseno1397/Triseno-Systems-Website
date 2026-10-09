"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CREDITS, CREDITS_END, CREDITS_TITLE } from "./exit.content";
import "@/app/ai-credits.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * The credits — where a product film would cut to black, the build sheet
 * rolls: one mono column rising over the dark plate as you scroll, not names
 * but what each figure in the reel is made of, ending on END OF
 * SPECIFICATION as the giant hairline TS of the sign-off rises out of the
 * floor beneath it.
 *
 * CSS sticky, no pin plugin: a runway of at least 220svh (140svh on phones)
 * holds a 100svh view; one scrubbed ScrollTrigger translates the roll from
 * below the frame up through it across the runway's travel, its last row
 * resting in the upper half as the sticky lets go. The runway grows
 * with the roll so the lines never pass faster than ~1.3x the scroll. The
 * row crossing the frame's centre line is marked live (one attribute write
 * when it changes). Rows are static; the roll moves as one transform;
 * hovering does nothing on purpose. Reduced motion: the runway collapses and
 * the roll stands fully printed.
 */

/** the roll never moves faster than this many px per px of scroll */
const MAX_SPEED = 1.3;
/** where the roll's foot (END OF SPECIFICATION) rests when the runway ends: this fraction of the view from the top */
const END_REST = 0.42;

export default function Credits() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runway = runwayRef.current;
    const view = viewRef.current;
    const roll = rollRef.current;
    if (!runway || !view || !roll) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const rows = Array.from(roll.querySelectorAll<HTMLElement>("[data-row]"));

    let vh = 0;
    let rollH = 0;
    let tops: number[] = [];
    let heights: number[] = [];
    let live = -1;

    // one layout read per refresh; never per frame
    const measure = () => {
      vh = view.clientHeight || window.innerHeight;
      rollH = roll.offsetHeight;
      tops = rows.map((r) => r.offsetTop);
      heights = rows.map((r) => r.offsetHeight);
      const min = vh * (phone ? 1.4 : 2.2);
      runway.style.height = `${Math.round(Math.max(min, vh + (rollH + vh * (1 - END_REST)) / MAX_SPEED))}px`;
    };

    const setLive = (i: number) => {
      if (i === live) return;
      if (live >= 0) rows[live].removeAttribute("data-live");
      if (i >= 0) rows[i].setAttribute("data-live", "");
      live = i;
    };

    const ctx = gsap.context(() => {
      measure();
      gsap.fromTo(
        roll,
        { y: () => vh },
        {
          // the last words stay in frame as the runway ends; the sign-off's TS rises under them
          y: () => vh * END_REST - rollH,
          ease: "none",
          scrollTrigger: {
            trigger: runway,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            invalidateOnRefresh: true,
            onRefreshInit: measure,
          },
          onUpdate() {
            const y = Number(gsap.getProperty(roll, "y")) || 0;
            const c = vh / 2 - y;
            let i = -1;
            for (let k = 0; k < tops.length; k++) {
              if (c >= tops[k] && c < tops[k] + heights[k]) {
                i = k;
                break;
              }
            }
            setLive(i);
          },
        },
      );
    }, runway);

    // the roll's own height decides the runway: re-measure when type arrives or the frame changes
    let pending = 0;
    const refresh = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(roll);
    ro.observe(view);
    document.fonts?.ready.then(refresh).catch(() => {});

    return () => {
      cancelAnimationFrame(pending);
      ro.disconnect();
      ctx.revert();
      runway.style.height = "";
      setLive(-1);
    };
  }, []);

  return (
    <section className="ai-credits" aria-labelledby="ai-credits-title">
      <div ref={runwayRef} className="ai-credits__runway">
        <div ref={viewRef} className="ai-credits__view">
          <span aria-hidden="true" className="ai-credits__crop" data-c="tl" />
          <span aria-hidden="true" className="ai-credits__crop" data-c="tr" />
          <span aria-hidden="true" className="ai-credits__crop" data-c="bl" />
          <span aria-hidden="true" className="ai-credits__crop" data-c="br" />
          <div ref={rollRef} className="ai-credits__roll">
            <h2 id="ai-credits-title" className="ai-credits__title font-display">
              {CREDITS_TITLE}
            </h2>
            <ol className="ai-credits__list">
              {CREDITS.map((c) => (
                <li key={c.id} className="ai-credits__row" data-row="">
                  <span className="ai-credits__fig">{c.fig}</span>
                  <span className="ai-credits__line">{c.line}</span>
                </li>
              ))}
            </ol>
            <p className="ai-credits__end font-display">{CREDITS_END}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

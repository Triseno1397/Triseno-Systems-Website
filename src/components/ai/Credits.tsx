"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CREDITS, CREDITS_COPY, CREDITS_END, CREDITS_TITLE } from "./exit.content";
import "@/app/ai-credits.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * The credits. Where a product film would cut to black, the build sheet
 * rolls: one mono column rising over the dark plate as you scroll, not names
 * but what each figure in the reel is made of, ending on END OF
 * SPECIFICATION as the giant hairline TS of the sign-off rises out of the
 * floor beneath it.
 *
 * The rows are the build sheet (CREDITS in exit.content.ts), the same table
 * the SPEC margin notes read, so the roll and the notes can never disagree.
 *
 * CSS sticky, no pin plugin: a runway (220svh at least, 140svh on phones)
 * holds a 100svh view; one scrubbed ScrollTrigger translates the roll from
 * below the frame up through it, its last line resting in the upper half as
 * the sticky lets go and the sign-off rises under it. The runway grows with
 * the roll so lines never pass faster than 1.3 px per px of scroll. The row
 * on the frame's centre line is marked live and the sheet counter reads how
 * many rows have reached it (one attribute / one textContent write, only
 * when the value changes). Rows
 * are static; the roll moves as one transform; hovering does nothing on
 * purpose. Reduced motion: no runway, the sheet stands fully printed.
 *
 * Inside the Descent the roll would stretch the iris (its circle and its
 * plate are sized in % of the Descent). So the iris box is held to the
 * height it had without the credits (gate + sign-off, --ai-iris-h on the
 * Descent) and the rest of the Descent is plain black: the iris opens
 * exactly as before and the roll plays over the plate's dark foot, then over
 * black.
 */

/** the roll never moves faster than this many px per px of scroll */
const MAX_SPEED = 1.3;
/** where the roll's foot (END OF SPECIFICATION) rests when the runway ends: this fraction of the view from the top */
const END_REST = 0.42;

const ROWS = CREDITS.map((c) => ({ key: c.id, label: c.fig, line: c.line }));
const pad2 = (n: number) => String(n).padStart(2, "0");

/** a figure's count reads brighter than its words; "WebGL1" is a name, not a count */
const COUNT = /(?<![A-Za-z_])\d[\d,.]*(?:x|px|ms|deg|s)?(?![A-Za-z])/g;

function typeset(line: string): ReactNode {
  return line.split(" . ").map((seg, i) => {
    const parts: ReactNode[] = [];
    let last = 0;
    for (const m of seg.matchAll(COUNT)) {
      const at = m.index ?? 0;
      if (at > last) parts.push(seg.slice(last, at));
      parts.push(<b key={at}>{m[0]}</b>);
      last = at + m[0].length;
    }
    if (last < seg.length) parts.push(seg.slice(last));
    return (
      <Fragment key={i}>
        {i > 0 ? <span className="ai-credits__sep"> . </span> : null}
        {parts}
      </Fragment>
    );
  });
}

export default function Credits() {
  const sectionRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  // hold the Descent's iris to the box it had before the roll was added
  useEffect(() => {
    const section = sectionRef.current;
    const descent = section?.closest<HTMLElement>(".ai-descent");
    if (!section || !descent) return;
    const before = section.previousElementSibling as HTMLElement | null;
    const after = section.nextElementSibling as HTMLElement | null;
    const sync = () => {
      const h = (before?.offsetHeight ?? 0) + (after?.offsetHeight ?? 0);
      if (h <= 0) return;
      descent.style.setProperty("--ai-iris-h", `${h}px`);
      descent.setAttribute("data-credits", "");
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (before) ro.observe(before);
    if (after) ro.observe(after);
    return () => {
      ro.disconnect();
      descent.removeAttribute("data-credits");
      descent.style.removeProperty("--ai-iris-h");
    };
  }, []);

  // the roll
  useEffect(() => {
    const runway = runwayRef.current;
    const view = viewRef.current;
    const roll = rollRef.current;
    const count = countRef.current;
    if (!runway || !view || !roll) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const rows = Array.from(roll.querySelectorAll<HTMLElement>("[data-row]"));

    let vh = 0;
    let rollH = 0;
    let tops: number[] = [];
    let heights: number[] = [];
    let live = -1;
    let reached = -1;

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
    /** the counter reads how many rows have reached the centre line, so it holds 14 / 14 after the last */
    const setReached = (n: number) => {
      if (n === reached) return;
      reached = n;
      if (count) count.textContent = `${pad2(n)} / ${pad2(rows.length)}`;
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
            let n = 0;
            for (let k = 0; k < tops.length; k++) {
              if (c < tops[k]) break;
              n = k + 1;
              if (c < tops[k] + heights[k]) i = k;
            }
            setLive(i);
            setReached(n);
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
      setReached(0);
    };
  }, []);

  return (
    <section ref={sectionRef} className="ai-credits" aria-labelledby="ai-credits-title">
      <div ref={runwayRef} className="ai-credits__runway">
        <div ref={viewRef} className="ai-credits__view">
          <span aria-hidden="true" className="ai-credits__crop" data-c="tl" />
          <span aria-hidden="true" className="ai-credits__crop" data-c="tr" />
          <span aria-hidden="true" className="ai-credits__crop" data-c="bl" />
          <span aria-hidden="true" className="ai-credits__crop" data-c="br" />
          <span aria-hidden="true" className="ai-credits__count">
            {CREDITS_COPY.sheet} <span ref={countRef}>{`00 / ${pad2(ROWS.length)}`}</span>
          </span>
          <div ref={rollRef} className="ai-credits__roll">
            <h2 id="ai-credits-title" className="ai-credits__title font-display">
              {CREDITS_TITLE}
            </h2>
            <ol className="ai-credits__list">
              {ROWS.map((r) => (
                <li key={r.key} className="ai-credits__row" data-row="">
                  <span className="ai-credits__fig">{r.label}</span>
                  <span className="ai-credits__line">{typeset(r.line)}</span>
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

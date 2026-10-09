"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "@/app/ai-projection.css";
import { LOGLINES, chapterNumber, type ChapterName } from "./projection.content";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────────────────
   CHAPTER FRAME — a frame of air before a chapter, Apple-style: 44svh of
   paper (36svh on phones) carrying only the chapter mark and one logline.

   The logline arrives the way a title card does. Its glyphs start spread
   wide along their own line (each one 0.38em per glyph from that line's
   centre) and settle into words over 1.2 s, expo-out, with a 6 ms stagger
   from the centre outward, so each line contracts into itself; a 1px cyan
   rule draws under it. Once, at "top 65%". Reduced motion: set, rule drawn.

   No data-rail: the frame belongs to the chapter that follows it, so the
   rail and the slate attribute it to a neighbour, never to itself.

     <ChapterFrame title="Compression" />                 number + logline from content
     <ChapterFrame number="04" title="Compression" logline="..." />
   ───────────────────────────────────────────────────────────────────────── */

export type ChapterFrameProps = {
  /** "04" (or 4); defaults to CHAPTERS by title */
  number?: string | number;
  /** the chapter's rail name: "Intake", "Compression", "Scale", "Stack", "Night" */
  title: string;
  /** defaults to LOGLINES[title]; at most fourteen words */
  logline?: string;
  id?: string;
  className?: string;
};

export default function ChapterFrame({ number, title, logline, id, className }: ChapterFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);

  const num = number !== undefined && number !== null ? String(number).padStart(2, "0") : (chapterNumber(title) ?? "--");
  const line = logline ?? LOGLINES[title as ChapterName] ?? "";
  const words = line.split(" ").filter(Boolean);

  useEffect(() => {
    const root = rootRef.current;
    const lineEl = lineRef.current;
    const rule = ruleRef.current;
    if (!root || !lineEl || !rule) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.setAttribute("data-set", "");
      return;
    }
    const glyphs = Array.from(lineEl.querySelectorAll<HTMLElement>(".ai-frame-ch__g"));
    if (!glyphs.length) {
      root.setAttribute("data-set", "");
      return;
    }
    root.setAttribute("data-armed", "");
    let tl: gsap.core.Timeline | null = null;
    const st = ScrollTrigger.create({
      trigger: root,
      start: "top 65%",
      once: true,
      onEnter: () => {
        // one batched read: the em size and which line each glyph sits on
        const em = parseFloat(getComputedStyle(lineEl).fontSize) || 24;
        const tops = glyphs.map((g) => g.offsetTop);
        const lines: HTMLElement[][] = [];
        let cur: HTMLElement[] = [];
        let curTop = Number.NaN;
        glyphs.forEach((g, i) => {
          if (Number.isNaN(curTop) || Math.abs(tops[i] - curTop) > 2) {
            if (cur.length) lines.push(cur);
            cur = [];
            curTop = tops[i];
          }
          cur.push(g);
        });
        if (cur.length) lines.push(cur);

        tl = gsap.timeline({
          onComplete: () => {
            root.removeAttribute("data-armed");
            root.setAttribute("data-set", "");
            gsap.set(glyphs, { clearProps: "transform,opacity" });
            gsap.set(rule, { clearProps: "transform" });
          },
        });
        lines.forEach((ln, li) => {
          const n = ln.length;
          ln.forEach((g, i) => gsap.set(g, { x: (i - (n - 1) / 2) * 0.38 * em, opacity: 0 }));
          tl!.to(ln, { x: 0, opacity: 1, duration: 1.2, ease: "expo.out", stagger: { each: 0.006, from: "center" } }, li * 0.08);
        });
        tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "expo.out" }, 0.25);
      },
    });
    return () => {
      st.kill();
      tl?.kill();
    };
  }, []);

  return (
    <div id={id} ref={rootRef} className={`ai-frame-ch relative z-10${className ? ` ${className}` : ""}`} data-frame={num}>
      <div className="ai-wrap ai-frame-ch__wrap">
        <p className="ai-label ai-frame-ch__mark">
          <b>{num}</b> / {title}
        </p>
        <div className="ai-frame-ch__body">
          <p className="ai-frame-ch__line font-display">
            <span className="sr-only">{line}</span>
            <span ref={lineRef} aria-hidden="true" className="ai-frame-ch__glyphs">
              {words.map((word, w) => (
                <span key={`${w}-${word}`}>
                  <span className="ai-frame-ch__w">
                    {Array.from(word).map((c, i) => (
                      <span key={i} className="ai-frame-ch__g">
                        {c}
                      </span>
                    ))}
                  </span>
                  {w < words.length - 1 ? " " : null}
                </span>
              ))}
            </span>
          </p>
          <span ref={ruleRef} aria-hidden="true" className="ai-frame-ch__rule" />
        </div>
      </div>
    </div>
  );
}

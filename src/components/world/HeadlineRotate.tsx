"use client";

import { useEffect, useState } from "react";
import type { GlyphKind } from "@/lib/divisions";
import Glyph from "./Glyph";

/* ─────────────────────────────────────────────────────────────────────────
   The portal headline's rotating line — an odometer roll through one mask.

   The outgoing word and the incoming word move TOGETHER through a single
   clip box one line tall: the old word rises out of the top edge as the new
   word rises in from the bottom edge, letters staggered on the way in. They
   tile the box vertically and never share a pixel:
     · the old word travels as one block by exactly its own height;
     · every incoming letter starts a full line-and-a-bit below and is never
       ahead of the old block (same curve, equal or later start);
   so at every instant there is exactly one word on screen — never zero (the
   round-2 sequenced swap left the hero empty mid-change) and never two
   printed through each other (the round-1 cross-fade).

   The clip is vertical only (clip-path with a huge horizontal inset), so a
   longer outgoing word is never cut off at the right edge.

   On a narrow column the line may wrap between WORDS (never inside one):
   each word is its own unbreakable group.

   It stays CONTROLLED (`index`), so the headline word, the lit menu word, the
   counter and the 3D signature object always change together.
   ───────────────────────────────────────────────────────────────────────── */

export interface RotateWord {
  text: string;
  glyph: GlyphKind;
  hue: string;
}

/** must cover the longest animation in world.css (.hrotate out/in) */
const CLEAR_MS = 1100;

interface HeadlineRotateProps {
  words: RotateWord[];
  index: number;
  className?: string;
  /** draw the division glyph after the word (default true) */
  showGlyph?: boolean;
  /** draw the hairline rule under the word (default true) */
  showRule?: boolean;
}

function Line({
  text,
  showRule,
  phase,
}: {
  text: string;
  showRule: boolean;
  phase: "rest" | "in" | "out";
}) {
  let n = 0;
  return (
    <span className="hrotate__line" data-phase={phase}>
      {text.split(" ").map((w, wi) => (
        <span key={wi} className="hrotate__group">
          {wi > 0 ? <span className="hrotate__space" /> : null}
          {Array.from(w).map((ch) => {
            const i = n++;
            return (
              <span key={i} className="hrotate__char" style={{ ["--i" as string]: i }}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
      {showRule ? <span className="hrotate__rule" /> : null}
    </span>
  );
}

export function HeadlineRotate({
  words,
  index,
  className = "",
  showGlyph = true,
  showRule = true,
}: HeadlineRotateProps) {
  const at = Math.max(0, Math.min(words.length - 1, index));
  const [state, setState] = useState<{ cur: number; prev: number | null; swap: number }>({
    cur: at,
    prev: null,
    swap: 0,
  });
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // A new index starts a roll: the current word becomes the outgoing one.
  if (at !== state.cur) {
    setState((s) => ({ cur: at, prev: reduced ? null : s.cur, swap: s.swap + 1 }));
  }

  useEffect(() => {
    if (state.prev === null) return;
    const t = window.setTimeout(() => setState((s) => ({ ...s, prev: null })), CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [state.swap, state.prev]);

  const cur = words[state.cur];
  const prev = state.prev === null ? null : words[state.prev];
  const same = prev !== null && prev.text === cur.text;

  return (
    <span className={`hrotate ${className}`}>
      {/* assistive tech and copy/paste always read the word the page means */}
      <span className="sr-only">{cur.text}</span>

      <span aria-hidden="true" className="hrotate__word">
        {prev && !same ? (
          <span key={`o${state.swap}`} className="hrotate__out">
            <Line text={prev.text} showRule={showRule} phase="out" />
          </span>
        ) : null}
        <Line
          key={same ? "same" : `i${state.swap}`}
          text={cur.text}
          showRule={showRule}
          phase={state.swap === 0 || same ? "rest" : "in"}
        />
      </span>

      {showGlyph ? (
        <span aria-hidden="true" className="hrotate__glyph" data-phase={state.swap === 0 ? "rest" : "in"} key={cur.glyph}>
          <Glyph kind={cur.glyph} size="100%" color={cur.hue} strokeWidth={2.5} glow />
        </span>
      ) : null}
    </span>
  );
}

export default HeadlineRotate;

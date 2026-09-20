"use client";

import { useEffect, useRef, useState } from "react";
import type { GlyphKind } from "@/lib/divisions";
import Glyph from "./Glyph";

/* ─────────────────────────────────────────────────────────────────────────
   The portal headline's rotating line.

   Same mechanic as before — a per-character vertical swap through a hard
   0-radius mask, the division glyph turning into place beside it, and a 1px
   white hairline redrawing under every new word — but it is now SEQUENCED,
   not cross-faded: the outgoing word leaves completely before the incoming
   word is laid out, and only ever one word exists in the DOM.

   That is the fix for the narrow-width failure. A cross-fade puts two words of
   different lengths in the same box at the same time; at ~400px a word fills
   the column, so "WEBSITES" and "AI SYSTEMS" printed through each other. With
   one word in flow at a time, two lines cannot overlap at any width.

   It stays CONTROLLED (`index`), so the headline word, the lit menu word, the
   counter and the 3D signature object always change together.
   ───────────────────────────────────────────────────────────────────────── */

export interface RotateWord {
  text: string;
  glyph: GlyphKind;
  hue: string;
}

/** must match the animation durations in world.css */
const OUT_MS = 430;

interface HeadlineRotateProps {
  words: RotateWord[];
  index: number;
  className?: string;
  /** draw the division glyph after the word (default true) */
  showGlyph?: boolean;
  /** draw the hairline rule under the word (default true) */
  showRule?: boolean;
}

export function HeadlineRotate({
  words,
  index,
  className = "",
  showGlyph = true,
  showRule = true,
}: HeadlineRotateProps) {
  const clamp = (i: number) => Math.max(0, Math.min(words.length - 1, i));
  const [shown, setShown] = useState(() => clamp(index));
  const [phase, setPhase] = useState<"in" | "out">("in");
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const next = clamp(index);
    if (next === shown) return;
    if (reduced.current) {
      setShown(next);
      return;
    }
    setPhase("out");
    const t = window.setTimeout(() => {
      setShown(next);
      setPhase("in");
    }, OUT_MS);
    return () => window.clearTimeout(t);
    // `clamp` is derived from words.length and is stable enough for this guard
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, shown, words.length]);

  const word = words[shown];
  const target = words[clamp(index)];
  const chars = Array.from(word.text);

  return (
    <span className={`hrotate ${className}`}>
      {/* assistive tech and copy/paste always read the word the page means */}
      <span className="sr-only">{target.text}</span>

      <span aria-hidden="true" className="hrotate__word">
        <span className="hrotate__line" data-phase={phase}>
          {chars.map((char, i) =>
            char === " " ? (
              <span key={i} className="hrotate__space" />
            ) : (
              <span key={i} className="hrotate__mask">
                <span className="hrotate__char" style={{ ["--i" as string]: i }}>
                  {char}
                </span>
              </span>
            ),
          )}
          {showRule ? <span className="hrotate__rule" /> : null}
        </span>
      </span>

      {showGlyph ? (
        <span aria-hidden="true" className="hrotate__glyph" data-phase={phase} key={word.glyph}>
          <Glyph kind={word.glyph} size="100%" color={word.hue} strokeWidth={2.5} glow />
        </span>
      ) : null}
    </span>
  );
}

export default HeadlineRotate;

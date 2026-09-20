"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GlyphKind } from "@/lib/divisions";
import Glyph from "@/components/world/Glyph";

/**
 * Triseno text-rotate.
 *
 * Inspired by the 21st.dev "text-rotate" (design-loop/21st/text-rotate.json):
 * a per-character, staggered vertical swap inside AnimatePresence. Everything
 * else is Triseno's own:
 * - it is CONTROLLED (`index`), not timer-driven, so the headline word, the lit
 *   menu word and the 3D signature object always change together;
 * - each word carries its division glyph (circle / square / triangle), which
 *   turns into place in the division hue while the letters swap;
 * - letters rise through a hard 0-radius mask and a 1px white hairline redraws
 *   under every new word;
 * - one expo-out tween (design-system M3) instead of the stock spring.
 */

export interface RotateWord {
  text: string;
  glyph: GlyphKind;
  hue: string;
}

interface TextRotateProps {
  words: RotateWord[];
  index: number;
  className?: string;
  /** seconds between characters */
  stagger?: number;
}

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function TextRotate({ words, index, className = "", stagger = 0.024 }: TextRotateProps) {
  const reduced = useReducedMotion();
  const word = words[Math.max(0, Math.min(words.length - 1, index))];
  const chars = Array.from(word.text);
  const d = reduced ? 0.01 : 0.62;
  const step = reduced ? 0 : stagger;

  return (
    <span className={`text-rotate ${className}`}>
      <span className="sr-only">{word.text}</span>

      <span aria-hidden="true" className="text-rotate__word">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={index} className="text-rotate__line">
            {chars.map((char, i) =>
              char === " " ? (
                <span key={i} className="text-rotate__space" />
              ) : (
                <span key={i} className="text-rotate__mask">
                  <motion.span
                    className="text-rotate__char"
                    initial={{ y: "105%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-105%" }}
                    transition={{ duration: d, ease: EXPO, delay: i * step }}
                  >
                    {char}
                  </motion.span>
                </span>
              ),
            )}
            <motion.span
              className="text-rotate__rule"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0, originX: 1 }}
              transition={{ duration: reduced ? 0.01 : 0.9, ease: EXPO, delay: reduced ? 0 : 0.12 }}
            />
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.span
        aria-hidden="true"
        className="text-rotate__glyph"
        layout="position"
        transition={{ duration: reduced ? 0.01 : 0.9, ease: EXPO }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={index}
            className="text-rotate__glyph-inner"
            initial={{ opacity: 0, scale: 0.4, rotate: -120 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, rotate: 120 }}
            transition={{ duration: reduced ? 0.01 : 0.9, ease: EXPO }}
          >
            <Glyph kind={word.glyph} size="100%" color={word.hue} strokeWidth={2.5} glow />
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  );
}

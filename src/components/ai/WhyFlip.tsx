"use client";

import "@/app/ai-why.css";
import { useEffect, useRef, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { WHY } from "./content";
import MetallicMark from "./MetallicMark";

/**
 * 6. Why Triseno — four flip cards and a mark cast in liquid metal.
 *
 * Each card is one row of the comparison. Its face is what a typical AI
 * vendor sells — on grey hatched stock, the claim struck through — and its
 * back is what Triseno builds, in ink with a cyan label. The cards turn in 3D
 * (rotateY, preserve-3d, backfaces hidden) on one long expo deceleration,
 * shading as they turn away.
 *
 *   enter    the first time the deck is on screen, all four turn to Triseno
 *            in a left-to-right stagger, so a skimming reader lands on it;
 *   hover    (mouse) peeks at the other side while the pointer is on a card;
 *   click    commits a card to a side (aria-pressed = showing Triseno);
 *   switch   the master control turns all four in a stagger.
 *
 * Beside the heading, the section's emblem: the TS mark as liquid chrome
 * (MetallicMark), answering the chrome core in the page hero.
 *
 * Reduced motion: every turn is instant and the metal holds one frame.
 */

const COUNT = WHY.rows.length;

export default function WhyFlip() {
  const [pressed, setPressed] = useState<boolean[]>(() => Array(COUNT).fill(false));
  const [hover, setHover] = useState<number | null>(null);
  const [suppress, setSuppress] = useState<number | null>(null);
  const [cascade, setCascade] = useState(false);
  const deckRef = useRef<HTMLUListElement>(null);
  const touched = useRef(false);

  // the deck turns to Triseno once, the first time it is properly on screen
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => {
          if (touched.current) return;
          setCascade(true);
          setPressed(Array(COUNT).fill(true));
        }, 450);
      },
      { threshold: 0.45 },
    );
    io.observe(deck);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const all = pressed.every(Boolean) ? 1 : pressed.every((p) => !p) ? 0 : -1;

  const setAll = (v: boolean) => {
    touched.current = true;
    setCascade(true);
    setSuppress(null);
    setPressed(Array(COUNT).fill(v));
  };

  const flip = (i: number) => {
    touched.current = true;
    setCascade(false);
    setSuppress(i); // the committed side shows, even under the pointer
    setPressed((p) => p.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <section data-rail="Why" aria-labelledby="ai-why-title" className="ai-section wf relative z-10">
      <div className="ai-wrap">
        <div className="wf-head">
          <div className="wf-head__copy">
            <p className="ai-label">
              <b>06</b> / {WHY.label}
            </p>
            <h2 id="ai-why-title" className="ai-h2 font-display font-semibold uppercase">
              {WHY.title}
            </h2>
            <p className="ai-body wf-head__lead">{WHY.lead}</p>
            <div role="radiogroup" aria-label="Show every card as" className="wf-switch" data-state={all}>
              <span aria-hidden="true" className="wf-switch__thumb" />
              {WHY.states.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={all === i}
                  className="wf-switch__opt"
                  onClick={() => setAll(i === 1)}
                >
                  <span className="max-sm:hidden">{label}</span>
                  <span className="sm:hidden">{WHY.statesShort[i]}</span>
                </button>
              ))}
            </div>
          </div>

          <figure className="wf-emblem">
            <MetallicMark className="wf-emblem__mark" label="The Triseno mark, cast in liquid metal" />
            <figcaption className="wf-emblem__cap" aria-hidden="true">
              <span>Fig. 06</span>
              <span>Liquid alloy</span>
            </figcaption>
          </figure>
        </div>

        <ul ref={deckRef} className="wf-deck" data-cascade={cascade ? "1" : "0"}>
          {WHY.rows.map((row, i) => {
            const shown = hover === i && suppress !== i ? !pressed[i] : pressed[i];
            const n = String(i + 1).padStart(2, "0");
            return (
              <li key={row.topic} className="wf-cell" style={{ ["--i" as string]: i }}>
                <button
                  type="button"
                  className="wf-card"
                  aria-pressed={pressed[i]}
                  data-shown={shown ? "1" : "0"}
                  onClick={() => flip(i)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setHover(i);
                  }}
                  onPointerLeave={() => {
                    setHover((h) => (h === i ? null : h));
                    setSuppress((s) => (s === i ? null : s));
                  }}
                >
                  <span className="wf-card__inner">
                    <span className="wf-face wf-face--front" aria-hidden={pressed[i]}>
                      <span className="wf-face__top">
                        <span className="ai-label">
                          <b>{n}</b> / {row.topic}
                        </span>
                        <span className="wf-face__tag">Typical vendor</span>
                      </span>
                      <span className="wf-face__say">
                        <s>{row.vendor}</s>
                      </span>
                      <span className="ai-body wf-face__note">{row.vendorNote}</span>
                      <span className="wf-face__foot" aria-hidden="true">
                        <ArrowsClockwise size={16} weight="light" />
                        <span className="wf-hint--hover">Hover to peek, click to flip</span>
                        <span className="wf-hint--touch">Tap to flip</span>
                      </span>
                    </span>

                    <span className="wf-face wf-face--back" aria-hidden={!pressed[i]}>
                      <span className="wf-face__top">
                        <span className="wf-face__label">
                          <b>{n}</b> / {row.topic}
                        </span>
                        <span className="wf-face__tag">
                          <svg viewBox="0 0 12 11" width="11" height="10" aria-hidden="true">
                            <path d="M6 0.8 11.2 10.2H0.8Z" fill="none" stroke="currentColor" strokeWidth="1" />
                          </svg>
                          Triseno
                        </span>
                      </span>
                      <span className="wf-face__say">{row.triseno}</span>
                      <span className="ai-body wf-face__note">{row.trisenoNote}</span>
                      <span className="wf-face__foot" aria-hidden="true">
                        <ArrowsClockwise size={16} weight="light" />
                        <span className="wf-hint--hover">Click to flip back</span>
                        <span className="wf-hint--touch">Tap to flip back</span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

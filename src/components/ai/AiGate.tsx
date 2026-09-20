"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import GhostButton from "@/components/ui/GhostButton";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import { glyphPoints } from "@/lib/glyph-path";
import { GATE } from "./content";

/**
 * 7. Gate — the division glyph announces where the button goes. At rest it is
 * the cyan triangle. Hover or focus the diagnostic button and the same outline
 * (the foundation's coherent glyph sampling) morphs into the plus glyph of
 * Contact and drains to white, echoed by the hairline copies behind it.
 * Both CTAs travel by the foundation warp.
 */

const SAMPLES = 360;
const ECHOES = [1.5, 2.15, 3, 4.1];

function mix(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

export default function AiGate() {
  const shapeRef = useRef<SVGPolygonElement>(null);
  const figureRef = useRef<SVGSVGElement>(null);
  const ctaRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ m: 0 });

  const from = useMemo(() => glyphPoints("triangle", SAMPLES), []);
  const to = useMemo(() => glyphPoints("plus", SAMPLES), []);

  const points = useCallback(
    (m: number) => {
      let out = "";
      for (let i = 0; i < SAMPLES; i++) {
        out += `${mix(from[i * 2], to[i * 2], m).toFixed(3)},${(-mix(from[i * 2 + 1], to[i * 2 + 1], m)).toFixed(3)} `;
      }
      return out;
    },
    [from, to],
  );

  useEffect(() => {
    const s = state.current;
    const cta = ctaRef.current?.querySelector<HTMLElement>("a") ?? null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tween: gsap.core.Tween | null = null;

    const paint = () => {
      shapeRef.current?.setAttribute("points", points(s.m));
      figureRef.current?.style.setProperty(
        "--gate-ink",
        `rgb(${Math.round(mix(0, 255, s.m))}, ${Math.round(mix(180, 255, s.m))}, ${Math.round(mix(216, 255, s.m))})`,
      );
    };
    const go = (target: number) => {
      tween?.kill();
      if (reduced) {
        s.m = target;
        paint();
        return;
      }
      tween = gsap.to(s, { m: target, duration: 1.1, ease: "expo.out", onUpdate: paint });
    };
    const on = () => go(1);
    const off = () => go(0);
    cta?.addEventListener("pointerenter", on);
    cta?.addEventListener("pointerleave", off);
    cta?.addEventListener("focus", on);
    cta?.addEventListener("blur", off);
    return () => {
      tween?.kill();
      cta?.removeEventListener("pointerenter", on);
      cta?.removeEventListener("pointerleave", off);
      cta?.removeEventListener("focus", on);
      cta?.removeEventListener("blur", off);
    };
  }, [points]);

  return (
    <section
      data-rail="Gate"
      data-rail-next="Contact"
      aria-labelledby="ai-gate-title"
      className="ai-gate relative z-10 min-h-[100dvh] overflow-hidden"
    >
      <svg ref={figureRef} aria-hidden="true" className="ai-gate__figure" viewBox="-1.5 -1.75 3 3">
        <defs>
          <polygon id="ai-gate-shape" ref={shapeRef} points={points(0)} />
        </defs>
        {ECHOES.map((scale, i) => (
          <use
            key={scale}
            href="#ai-gate-shape"
            className="ai-gate__echo"
            transform={`scale(${scale})`}
            style={{ opacity: 0.3 - i * 0.065 }}
          />
        ))}
        <use href="#ai-gate-shape" className="ai-gate__glyph" />
      </svg>

      <div className="ai-wrap ai-gate__inner">
        <p className="ai-label">
          <b>07</b> / Next: Contact
        </p>
        <h2 id="ai-gate-title" className="ai-h2 mt-6 max-w-[18ch] font-display font-semibold uppercase">
          {GATE.title}
        </h2>
        <p className="ai-body mt-6 max-w-[54ch]">{GATE.body}</p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
          <span ref={ctaRef}>
            <GhostButton href="/contact">{GATE.primary}</GhostButton>
          </span>
          <WarpLink href="/contact" className="ai-textlink">
            <span>{GATE.secondary}</span>
          </WarpLink>
          <a href={`mailto:${GATE.email}`} className="ai-textlink ai-textlink--mono">
            <span>{GATE.email}</span>
          </a>
        </div>

        <nav aria-label="Other Triseno divisions" className="ai-gate__cross ai-label">
          <span>Other divisions</span>
          <WarpLink href={DIVISIONS.creative.route} className="ai-textlink ai-textlink--mono">
            <span>Creative</span>
          </WarpLink>
          <WarpLink href={DIVISIONS.web.route} className="ai-textlink ai-textlink--mono">
            <span>Web Design</span>
          </WarpLink>
        </nav>
      </div>
    </section>
  );
}

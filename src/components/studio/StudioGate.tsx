"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GhostButton from "@/components/ui/GhostButton";
import Glyph from "@/components/world/Glyph";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import Aperture, { aperturePath } from "./Aperture";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §5 — gate to Contact (bar.md rule 7: a world ends in a gate, never
   a footer). The aperture stops down around the single ghost button as the
   gate scrolls in: the iris path and one rotation are driven per frame.
   Cross-links to the other two divisions live here and in the menu only (D3);
   their glyphs stay white so no second hue enters the frame (D2).
   ───────────────────────────────────────────────────────────────────────── */

const STUDIO_EMAIL = "tristen@trisenosystems.com";
const INSTAGRAM_URL = "https://instagram.com/trisenosystems";

const OPEN_FROM = 1;
const OPEN_TO = 0.34;

export default function StudioGate() {
  const root = useRef<HTMLElement>(null);
  const iris = useRef<SVGPathElement>(null);
  const spin = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const tick = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const render = (p: number) => {
          // Weighted to the end of the range: the last screenful of scroll is
          // where the iris visibly shuts, so the page never ends on two
          // identical frames.
          const eased = Math.pow(p, 1.7);
          iris.current?.setAttribute("d", aperturePath(OPEN_FROM + (OPEN_TO - OPEN_FROM) * eased));
          if (spin.current)
            spin.current.style.transform = `rotate(${(-96 + eased * 96).toFixed(2)}deg) scale(${(1.55 - eased * 0.62).toFixed(3)})`;
          // The stop-down keeps running to the last pixel of the document, so
          // the final screen is never two identical frames.
          if (body.current) {
            const settle = Math.min(1, p / 0.72);
            body.current.style.transform = `translate3d(0, ${((1 - settle) * 40).toFixed(1)}px, 0)`;
            body.current.style.opacity = (0.15 + settle * 0.85).toFixed(3);
          }
          if (tick.current) tick.current.style.transform = `scaleX(${p.toFixed(4)})`;
        };
        render(0);
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom bottom",
          onRefresh: (self) => render(self.progress),
          onUpdate: (self) => render(self.progress),
        });
        return () => {
          st.kill();
          spin.current?.removeAttribute("style");
          body.current?.removeAttribute("style");
          tick.current?.removeAttribute("style");
        };
      });
    },
    { scope: root },
  );

  const others = [DIVISIONS.web, DIVISIONS.ai];

  return (
    <section
      ref={root}
      id="contact"
      data-rail="Gate"
      data-rail-next="Contact"
      className="sx-gate"
      aria-labelledby="sx-gate-title"
    >
      <div className="sx-gate__stage">
        <div aria-hidden="true" className="sx-gate__scene">
          <div ref={spin} className="sx-gate__iris">
            <Aperture size="100%" open={OPEN_TO} strokeWidth={1.5} glow pathRef={iris} />
          </div>
          <span className="sx-gate__floor" />
        </div>

        <div ref={body} className="sx-gate__body">
          <p className="sx-kicker font-mono">Next — Contact</p>
          <h2 id="sx-gate-title" className="sx-gate__title font-display font-bold uppercase">
            Let&apos;s make the ad that pays for itself.
          </h2>
          <p className="sx-gate__lead font-sans font-light">
            Tell us what you&apos;re selling and where it needs to run. We&apos;ll come back with concepts and a quote —
            no retainer required to start.
          </p>
          <GhostButton href="/contact">Start a Conversation</GhostButton>
          <p className="sx-gate__tick font-mono" aria-hidden="true">
            <span className="sx-gate__tick-rail">
              <span ref={tick} />
            </span>
            Scroll to close the iris
          </p>
          <p className="sx-gate__direct font-mono">
            <a href={`mailto:${STUDIO_EMAIL}`} className="world-underline">
              {STUDIO_EMAIL}
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="world-underline">
              Instagram @trisenosystems
            </a>
          </p>
        </div>

        <nav aria-label="Other Triseno divisions" className="sx-gate__cross font-mono">
          <span>Other divisions</span>
          {others.map((d) => (
            <WarpLink key={d.key} href={d.route} className="world-underline">
              <Glyph kind={d.glyph} size={12} strokeWidth={1.25} />
              {d.key === "web" ? "Web Design Division" : d.name}
            </WarpLink>
          ))}
        </nav>
      </div>
    </section>
  );
}

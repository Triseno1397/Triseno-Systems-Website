"use client";

import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GhostButton from "@/components/ui/GhostButton";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";

gsap.registerPlugin(ScrollTrigger);

const FRAMES = 6;

/**
 * Gate — the square glyph as a nest of frames standing on the floor. The
 * frames seat themselves one inside the other when the gate comes into view,
 * then the ghost button names the next stop. Cross-links to the other two
 * divisions live only here and in the menu (D3); they stay white (D2).
 */
export default function WebGate() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: rootRef.current, start: "top 55%", once: true },
        });
        tl.fromTo(
          ".web-gate__nest--main .web-gate__frame",
          { scale: 1.7, opacity: 0 },
          {
            scale: 1,
            opacity: (i: number) => 1 - i * 0.13,
            duration: 1.6,
            ease: "expo.out",
            stagger: { each: 0.11, from: "end" },
          },
          0,
        );
        // The threshold: the division's square turns on its corner and gives up
        // its hue, because the next room — Contact — is achromatic.
        tl.fromTo(
          ".web-gate__core",
          { rotate: 0, scale: 0.3, opacity: 0 },
          { rotate: 45, scale: 1, opacity: 1, duration: 1.5, ease: "expo.out" },
          0.7,
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      data-rail="Gate"
      data-rail-next="Contact"
      data-station="gate"
      className="web-section web-gate"
    >
      <div aria-hidden="true" className="web-gate__object">
        <div className="web-gate__nest web-gate__nest--main">
          {Array.from({ length: FRAMES }, (_, i) => (
            <span
              key={i}
              className="web-gate__frame"
              style={{ "--k": i, opacity: 1 - i * 0.13 } as CSSProperties}
            />
          ))}
          <span className="web-gate__core" />
        </div>
        <div className="web-gate__mirror">
          <div className="web-gate__nest">
            {Array.from({ length: FRAMES }, (_, i) => (
              <span
                key={i}
                className="web-gate__frame"
                style={{ "--k": i, opacity: 1 - i * 0.13 } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="web-gate__copy">
        <p className="web-eyebrow">
          <span className="web-sq" aria-hidden="true" />
          Next — Contact
        </p>
        <h2 className="web-gate__title">Let&apos;s build the page that sells it.</h2>
        <p className="web-body">
          Tell us what the site has to do. You get a plan, a fixed scope and a date — before any design work
          starts.
        </p>
        <div className="web-gate__actions">
          <GhostButton href="/contact">Start a Conversation</GhostButton>
          <span aria-hidden="true" className="web-gate__tick">
            <i />
            Threshold — Contact
          </span>
        </div>
        <nav aria-label="Other Triseno divisions" className="web-gate__cross">
          <span>Other divisions</span>
          <WarpLink href={DIVISIONS.creative.route} className="world-underline">
            Creative — ad creative
          </WarpLink>
          <WarpLink href={DIVISIONS.ai.route} className="world-underline">
            AI Infrastructure
          </WarpLink>
        </nav>
      </div>
    </section>
  );
}

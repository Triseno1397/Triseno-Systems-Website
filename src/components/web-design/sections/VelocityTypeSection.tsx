"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitText } from "@/lib/split-text";

export default function VelocityTypeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const headline = headlineRef.current;
      if (!section || !headline) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const split = splitText(headline, { mode: "both" });
      if (reduce) {
        gsap.set(split.chars, { y: 0, opacity: 1, skewX: 0, scaleX: 1 });
        return () => split.revert();
      }

      gsap.set(split.chars, { y: 110, opacity: 0 });

      let cleanup = () => {};

      const rafId = requestAnimationFrame(() => {
        const reveal = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            // Hold the pin far longer so the word-by-word reveal unfurls over
            // real scroll distance instead of resolving in under one screen.
            start: "top top",
            end: isMobile ? "+=160%" : "+=130%",
            scrub: isMobile ? 1.2 : 0.9,
            pin: true,
          },
        });
        split.words.forEach((word, wIdx) => {
          const wordChars = Array.from(
            word.querySelectorAll<HTMLElement>(".split-char")
          );
          reveal.to(
            wordChars,
            { y: 0, opacity: 1, ease: "expo.out", duration: 1, stagger: 0.04 },
            wIdx * 0.4
          );
        });

        let lastScroll = window.scrollY;
        let velocity = 0;
        let raf = 0;
        const decay = 0.85;

        const onScroll = () => {
          const cur = window.scrollY;
          velocity = (cur - lastScroll) * 0.6 + velocity * decay;
          lastScroll = cur;
        };

        const tick = () => {
          velocity *= decay;
          const clamped = Math.max(-25, Math.min(25, velocity));
          const skew = clamped * 0.6;
          const scale = 1 + clamped * 0.006;
          split.chars.forEach((c) => {
            gsap.to(c, {
              skewX: skew,
              scaleX: Math.max(0.85, Math.min(1.15, scale)),
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto",
            });
          });
          raf = requestAnimationFrame(tick);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        raf = requestAnimationFrame(tick);

        cleanup = () => {
          window.removeEventListener("scroll", onScroll);
          cancelAnimationFrame(raf);
          reveal.scrollTrigger?.kill();
          reveal.kill();
        };
      });

      return () => {
        cancelAnimationFrame(rafId);
        cleanup();
        split.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      data-wd-section="velocity"
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "#050810" }}
    >
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
        <div className="mx-auto w-full max-w-[1400px]">
          <h2
            ref={headlineRef}
            className="text-center font-bold leading-[0.9] text-white"
            style={{
              fontSize: "clamp(4rem, 12vw, 14rem)",
              letterSpacing: "-0.04em",
              textShadow: "0 0 60px rgba(0, 229, 255, 0.18)",
              willChange: "transform",
            }}
          >
            Designed for what&apos;s next.
          </h2>
          <p className="mt-12 text-center text-[11px] uppercase tracking-[0.3em] text-white/45">
            ↳ technique: scroll-velocity-reactive type
          </p>
        </div>
      </div>
    </section>
  );
}

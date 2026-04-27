"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useGSAP, gsap, SplitText, prefersReducedMotion } from "@/hooks/useGSAPScroll";

const HeroParticleNetwork = dynamic(
  () => import("@/components/web-design/webgl/HeroParticleNetwork"),
  { ssr: false },
);

export default function HeroSection({
  canvasOpacity = 1,
}: {
  canvasOpacity?: number;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const startDelay = 0.7; // sync with curtain finish (~0.66s)

      if (reduced) {
        gsap.set(
          [eyebrowRef.current, headlineRef.current, subRef.current, indicatorRef.current],
          { opacity: 1, y: 0 },
        );
        return;
      }

      gsap.set([eyebrowRef.current, subRef.current, indicatorRef.current], {
        opacity: 0,
        y: 16,
      });

      let split: SplitText | null = null;
      try {
        split = new SplitText(headlineRef.current, { type: "chars" });
      } catch {
        split = null;
      }

      const tl = gsap.timeline({ delay: startDelay });

      tl.from(
        eyebrowRef.current,
        { opacity: 0, y: 16, duration: 0.7, ease: "power2.out" },
        0,
      ).to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0);

      if (split && split.chars) {
        gsap.set(split.chars, { yPercent: 100, opacity: 0 });
        tl.to(
          split.chars,
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.4,
            ease: "expo.out",
            stagger: 0.018,
          },
          0.15,
        );
      } else {
        gsap.set(headlineRef.current, { opacity: 0, y: 30 });
        tl.to(
          headlineRef.current,
          { opacity: 1, y: 0, duration: 1.0, ease: "expo.out" },
          0.15,
        );
      }

      tl.to(
        subRef.current,
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        0.9,
      ).to(
        indicatorRef.current,
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        1.1,
      );

      return () => {
        if (split) split.revert();
      };
    },
    { scope: sectionRef },
  );

  // Pulsing scroll indicator
  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced || !indicatorRef.current) return;
    const line = indicatorRef.current.querySelector<HTMLElement>("[data-pulse]");
    if (!line) return;
    const tween = gsap.to(line, {
      scaleY: 1.6,
      opacity: 1,
      duration: 1.1,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      transformOrigin: "top",
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-section="hero"
      className="relative min-h-[100dvh] w-full overflow-hidden"
    >
      <div className="absolute inset-0">
        <HeroParticleNetwork fadeOpacity={canvasOpacity} />
      </div>

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-[1400px] mx-auto px-6 lg:px-10 w-full pt-40 pb-24">
          <div ref={eyebrowRef} className="mb-8 lg:mb-10">
            <span className="inline-flex items-center gap-3 text-[11px] tracking-[0.32em] uppercase text-white/55">
              <span className="w-8 h-px bg-white/30" />
              Web design division
            </span>
          </div>

          <h1
            ref={headlineRef}
            className="font-semibold text-white tracking-[-0.045em] leading-[0.95]"
            style={{
              fontSize: "clamp(56px, 11vw, 180px)",
              willChange: "transform",
            }}
          >
            This page is the demo.
          </h1>

          <p
            ref={subRef}
            className="mt-10 lg:mt-12 max-w-[560px] text-base lg:text-[17px] leading-[1.55] text-white/60"
          >
            Scroll. Every section is a feature you can ship on your site.
          </p>
        </div>

        <div
          ref={indicatorRef}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <span
            data-pulse
            className="w-px h-10 bg-white/40 origin-top"
            style={{ willChange: "transform" }}
          />
          <span className="text-[10px] tracking-[0.4em] uppercase text-white/40">
            Scroll
          </span>
        </div>
      </div>
    </section>
  );
}

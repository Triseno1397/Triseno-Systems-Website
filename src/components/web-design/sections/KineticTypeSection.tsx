"use client";

import { useRef } from "react";
import VelocityMarquee from "@/components/web-design/VelocityMarquee";
import {
  useGSAP,
  gsap,
  ScrollTrigger,
  SplitText,
  prefersReducedMotion,
} from "@/hooks/useGSAPScroll";

export default function KineticTypeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const secondaryRef = useRef<HTMLHeadingElement>(null);
  const wipeMaskRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const section = sectionRef.current;
      const sticky = stickyRef.current;
      const headline = headlineRef.current;
      const secondary = secondaryRef.current;
      const wipeMask = wipeMaskRef.current;
      if (!section || !sticky || !headline || !secondary || !wipeMask) return;

      // Initial state for clip-path on secondary headline
      gsap.set(secondary, {
        clipPath: "inset(0 100% 0 0)",
        opacity: reduced ? 1 : 0.9,
      });

      if (reduced) {
        gsap.set(headline, { opacity: 1 });
        gsap.set(secondary, { clipPath: "inset(0 0% 0 0)" });
        return;
      }

      let split: SplitText | null = null;
      try {
        split = new SplitText(headline, { type: "chars,words" });
      } catch {
        split = null;
      }

      if (split && split.chars) {
        gsap.set(split.chars, { yPercent: 100, opacity: 0 });
      } else {
        gsap.set(headline, { yPercent: 30, opacity: 0 });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=140%",
          pin: sticky,
          scrub: 0.6,
          anticipatePin: 1,
        },
      });

      if (split && split.chars) {
        tl.to(
          split.chars,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.5,
            ease: "expo.out",
            stagger: 0.012,
          },
          0,
        );
      } else {
        tl.to(
          headline,
          { yPercent: 0, opacity: 1, duration: 0.5, ease: "expo.out" },
          0,
        );
      }

      // Phase 2: shrink and pin headline up top, reveal secondary
      tl.to(
        headline,
        {
          fontSize: "clamp(2.5rem, 6vw, 5rem)",
          y: "-30vh",
          duration: 0.5,
          ease: "power2.inOut",
        },
        0.55,
      )
        .to(
          secondary,
          {
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          0.6,
        )
        .to(
          captionRef.current,
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
          0.85,
        );

      return () => {
        if (split) split.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      data-section="kinetic-typography"
      className="relative w-full"
      style={{ minHeight: "240vh" }}
    >
      {/* Sticky pinned content occupies one viewport */}
      <div
        ref={stickyRef}
        className="relative h-[100vh] w-full overflow-hidden"
        style={{ background: "linear-gradient(180deg, transparent 0%, #050810 25%, #050810 100%)" }}
      >
        {/* Top marquee */}
        <div className="absolute top-[18%] left-0 right-0">
          <VelocityMarquee
            text="SplitText · Variable fonts · Marquee · Mask reveal · Kinetic typography"
            baseSpeed={70}
            baseDirection={1}
            className="text-[clamp(1.6rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white/[0.08] uppercase"
          />
        </div>

        {/* Bottom marquee */}
        <div className="absolute bottom-[18%] left-0 right-0">
          <VelocityMarquee
            text="Scrub · GSAP · Clip-path · Velocity · Pinned section · ScrollTrigger"
            baseSpeed={55}
            baseDirection={-1}
            className="text-[clamp(1.4rem,3.4vw,2.6rem)] font-medium tracking-[-0.02em] text-white/[0.06] uppercase"
          />
        </div>

        {/* Centered headline stack */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
          <h2
            ref={headlineRef}
            className="text-white font-semibold text-center tracking-[-0.04em] leading-[0.9]"
            style={{
              fontSize: "clamp(4rem, 12vw, 14rem)",
              willChange: "transform, font-size",
            }}
          >
            Type that moves with intention.
          </h2>

          <div className="relative mt-8 w-full max-w-[1400px] mx-auto">
            <h3
              ref={secondaryRef}
              className="text-center text-white/90 font-medium tracking-[-0.03em] leading-[0.95]"
              style={{
                fontSize: "clamp(2rem, 6.5vw, 6rem)",
                willChange: "clip-path, opacity",
              }}
            >
              Built character by character.
            </h3>
            <div ref={wipeMaskRef} className="absolute inset-0 pointer-events-none" />
          </div>

          <div
            ref={captionRef}
            className="mt-8 text-[11px] tracking-[0.32em] uppercase text-white/40 opacity-0 translate-y-2"
            style={{ willChange: "transform, opacity" }}
          >
            ↳ SplitText, scroll-velocity marquee, clip-path reveal.
          </div>
        </div>
      </div>
    </section>
  );
}

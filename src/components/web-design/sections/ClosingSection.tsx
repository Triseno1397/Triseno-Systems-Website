"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useRef } from "react";
import { useGSAP, gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useGSAPScroll";
import type { MorphTarget } from "@/components/web-design/webgl/ClosingParticleMorph";

const ClosingParticleMorph = dynamic(
  () => import("@/components/web-design/webgl/ClosingParticleMorph"),
  { ssr: false },
);

export default function ClosingSection() {
  const [target, setTarget] = useState<MorphTarget>("cloud");
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const els = [headlineRef.current, subRef.current, ctasRef.current];
      if (reduced) {
        gsap.set(els, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(els, { opacity: 0, y: 30 });
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      data-section="closing"
      className="relative w-full min-h-[100vh] flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <ClosingParticleMorph target={target} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 w-full text-center pt-32 pb-24">
        <h2
          ref={headlineRef}
          className="text-white font-semibold tracking-[-0.045em] leading-[0.95] mx-auto max-w-[18ch]"
          style={{ fontSize: "clamp(48px, 8vw, 120px)", willChange: "transform" }}
        >
          Now imagine this on your site.
        </h2>

        <p
          ref={subRef}
          className="mt-8 text-base lg:text-[17px] text-white/60 max-w-md mx-auto"
        >
          Tell us what you're building.
        </p>

        <div
          ref={ctasRef}
          className="mt-14 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center"
        >
          <CTA
            primary
            href="mailto:Tristen@trisenosystems.com?subject=Web%20Design%20Inquiry"
            label="Start a project"
            onEnter={() => setTarget("send")}
            onLeave={() => setTarget("cloud")}
          />
          <CTA
            href="/web-design/pricing"
            label="See pricing"
            onEnter={() => setTarget("tag")}
            onLeave={() => setTarget("cloud")}
          />
        </div>
      </div>
    </section>
  );
}

function CTA({
  primary = false,
  href,
  label,
  onEnter,
  onLeave,
}: {
  primary?: boolean;
  href: string;
  label: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const isExternal = href.startsWith("mailto:") || href.startsWith("http");
  const cls = primary
    ? "group relative inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-medium tracking-wide bg-white text-black hover:bg-white/95 transition-colors"
    : "group relative inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-medium tracking-wide border border-white/20 text-white hover:border-white/50 hover:text-white transition-colors";

  const handlers = {
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onFocus: onEnter,
    onBlur: onLeave,
    onTouchStart: () => {
      onEnter();
      window.setTimeout(onLeave, 1400);
    },
  };

  if (isExternal) {
    return (
      <a href={href} className={cls} {...handlers}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...handlers}>
      {label}
    </Link>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  prefersReducedMotion,
  killAllScrollTriggers,
} from "@/hooks/useGSAPScroll";
import PageCurtain from "@/components/web-design/PageCurtain";
import HeroSection from "@/components/web-design/sections/HeroSection";
import KineticTypeSection from "@/components/web-design/sections/KineticTypeSection";
import PlaceholderSection from "@/components/web-design/sections/PlaceholderSection";
import ClosingSection from "@/components/web-design/sections/ClosingSection";
import Footer from "@/components/layout/Footer";

const PLACEHOLDERS = [
  { number: "03", dataSection: "horizontal-showcase", label: "Pinned horizontal showcase (Phase B)" },
  { number: "04", dataSection: "imagery-grid", label: "Imagery grid (Phase B)" },
  { number: "05", dataSection: "motion-physics", label: "Motion physics (Phase C)" },
  { number: "06", dataSection: "cursor-microinteractions", label: "Custom cursor & micro-interactions (Phase C)" },
  { number: "07", dataSection: "ai-chat", label: "AI chat integration (Phase D)" },
  { number: "08", dataSection: "performance", label: "Performance theater (Phase E)" },
  { number: "09", dataSection: "pricing", label: "Pricing tier showcase (Phase E)" },
];

export default function WebDesignPageShell() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [canvasOpacity, setCanvasOpacity] = useState(1);

  useEffect(() => {
    document.body.classList.add("web-design-active");

    const reduced = prefersReducedMotion();
    let smoother: ScrollSmoother | null = null;

    if (!reduced && wrapperRef.current && contentRef.current) {
      smoother = ScrollSmoother.create({
        wrapper: wrapperRef.current,
        content: contentRef.current,
        smooth: window.innerWidth <= 768 ? 0.6 : 1.5,
        effects: true,
        normalizeScroll: true,
      });
    }

    // Fade the hero canvas as Section 2 scrolls over it; unmount entirely past Section 2
    const heroCanvas = document.querySelector<HTMLElement>('[data-section="hero"]');
    const kinetic = document.querySelector<HTMLElement>('[data-section="kinetic-typography"]');

    let fadeTrigger: ScrollTrigger | null = null;
    let unmountTrigger: ScrollTrigger | null = null;

    if (heroCanvas && kinetic) {
      fadeTrigger = ScrollTrigger.create({
        trigger: kinetic,
        start: "top bottom",
        end: "top 30%",
        scrub: true,
        onUpdate: (self) => {
          // 1 → 0.2 across this range
          setCanvasOpacity(1 - self.progress * 0.8);
        },
      });
      unmountTrigger = ScrollTrigger.create({
        trigger: kinetic,
        start: "bottom top",
        onEnter: () => setCanvasOpacity(0),
        onLeaveBack: () => setCanvasOpacity(0.2),
      });
    }

    return () => {
      document.body.classList.remove("web-design-active");
      if (fadeTrigger) fadeTrigger.kill();
      if (unmountTrigger) unmountTrigger.kill();
      if (smoother) smoother.kill();
      killAllScrollTriggers();
    };
  }, []);

  return (
    <>
      <PageCurtain />
      <div
        id="smooth-wrapper"
        ref={wrapperRef}
        className="web-design-page"
        style={{ background: "#050810" }}
      >
        <div id="smooth-content" ref={contentRef}>
          <HeroSection canvasOpacity={canvasOpacity} />
          <KineticTypeSection />
          {PLACEHOLDERS.map((p) => (
            <PlaceholderSection
              key={p.dataSection}
              number={p.number}
              label={p.label}
              dataSection={p.dataSection}
            />
          ))}
          <ClosingSection />
          <Footer />
        </div>
      </div>
    </>
  );
}

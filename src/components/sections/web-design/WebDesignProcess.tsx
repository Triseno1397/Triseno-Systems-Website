"use client";

import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Discovery & Strategy",
    description:
      "We map your goals, audience, and competitive landscape. We define what success looks like before a single pixel gets placed.",
  },
  {
    number: "02",
    title: "Design & Prototype",
    description:
      "High-fidelity designs you can interact with. We iterate until every detail feels right — no guesswork, no surprises at launch.",
  },
  {
    number: "03",
    title: "Development & Integration",
    description:
      "Clean, performant code. AI integrations. Analytics. Everything built to scale and engineered to convert.",
  },
  {
    number: "04",
    title: "Launch & Optimize",
    description:
      "We don't disappear after launch. Ongoing performance monitoring, A/B testing, and optimization keep your site improving.",
  },
];

export default function WebDesignProcess() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useGSAP(
    () => {
      if (shouldReduceMotion || !containerRef.current) return;

      // On mobile: skip scrub-based ScrollTrigger (expensive), use simpler reveals
      const line = containerRef.current.querySelector(".timeline-line-fill");
      if (line) {
        if (isDesktop) {
          gsap.fromTo(
            line,
            { scaleY: 0, transformOrigin: "top center" },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: containerRef.current.querySelector(".timeline-track"),
                start: "top 70%",
                end: "bottom 60%",
                scrub: 1,
              },
            }
          );
        } else {
          // Simple one-shot reveal on mobile — no scrub
          gsap.fromTo(
            line,
            { scaleY: 0, transformOrigin: "top center" },
            {
              scaleY: 1,
              duration: 1.2,
              ease: "power2.out",
              scrollTrigger: {
                trigger: line,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      }

      const stepEls = containerRef.current.querySelectorAll(".process-step");
      stepEls.forEach((step, i) => {
        gsap.fromTo(
          step,
          { opacity: 0, x: isDesktop ? 40 : 20 },
          {
            opacity: 1,
            x: 0,
            duration: isDesktop ? 0.8 : 0.5,
            ease: "power3.out",
            delay: isDesktop ? 0 : i * 0.05,
            scrollTrigger: {
              trigger: step,
              start: isDesktop ? "top 80%" : "top 90%",
              toggleActions: "play none none none",
            },
          }
        );

        const dot = step.querySelector(".step-dot");
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0 },
            {
              scale: 1,
              duration: 0.4,
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: step,
                start: isDesktop ? "top 80%" : "top 90%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });
    },
    { scope: containerRef, dependencies: [shouldReduceMotion, isDesktop] }
  );

  return (
    <section id="wd-process" className="py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <SectionHeading
          eyebrow="Process"
          title="How we work."
          description="A streamlined, transparent process from first conversation to final launch."
        />

        <div ref={containerRef} className="relative pl-12 lg:pl-16 max-w-[700px]">
          {/* Timeline track */}
          <div className="timeline-track absolute left-[15px] lg:left-[19px] top-0 bottom-0 w-px">
            <div className="absolute inset-0 bg-white/[0.06]" />
            <div className="timeline-line-fill absolute inset-0 bg-gradient-to-b from-cyan-400 via-cyan-600 to-transparent" />
          </div>

          {/* Steps */}
          <div className="space-y-16">
            {steps.map((step) => (
              <div key={step.number} className="process-step relative">
                {/* Dot */}
                <div className="step-dot absolute -left-[calc(3rem-5px)] lg:-left-[calc(4rem-5px)] top-1.5 w-3 h-3 rounded-full border-2 border-cyan-400 bg-navy-950" />

                <span className="block font-mono text-[12px] font-bold text-cyan-400 tracking-[0.15em] mb-2.5">
                  STEP {step.number}
                </span>
                <h3 className="text-xl lg:text-[22px] font-bold text-text-primary mb-2.5 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-[15px] text-text-secondary leading-relaxed max-w-[480px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

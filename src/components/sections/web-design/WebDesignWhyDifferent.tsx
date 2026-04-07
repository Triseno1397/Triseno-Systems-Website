"use client";

import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "framer-motion";
import ScrollReveal from "@/components/animations/ScrollReveal";

export default function WebDesignWhyDifferent() {
  const shouldReduceMotion = useReducedMotion();
  const visualRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useGSAP(
    () => {
      if (shouldReduceMotion || !visualRef.current) return;

      const lines = visualRef.current.querySelectorAll(".wd-mock-line");
      gsap.fromTo(
        lines,
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: isMobile ? 0.4 : 0.6,
          ease: "power3.out",
          stagger: isMobile ? 0.04 : 0.08,
          scrollTrigger: {
            trigger: visualRef.current,
            start: isMobile ? "top 85%" : "top 75%",
            toggleActions: "play none none none",
          },
        }
      );

      const cards = visualRef.current.querySelectorAll(".wd-mock-card");
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: isMobile ? 0.35 : 0.5,
          ease: "power3.out",
          stagger: isMobile ? 0.04 : 0.08,
          scrollTrigger: {
            trigger: visualRef.current,
            start: isMobile ? "top 85%" : "top 70%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: visualRef, dependencies: [shouldReduceMotion, isMobile] }
  );

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Content */}
          <div>
            <ScrollReveal>
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
                The Difference
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold text-text-primary leading-tight tracking-tight mb-6">
                Built by AI engineers,
                <br />
                not just designers.
              </h2>
              <div className="h-px w-24 bg-gradient-to-r from-cyan-400 to-transparent" />
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="mt-6 text-base lg:text-[16px] text-text-secondary leading-relaxed mb-4">
                Most web agencies hand you a pretty site and walk away. We build
                sites that are structurally ready for conversational AI,
                automated lead capture, and intelligent user experiences.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="text-base lg:text-[16px] text-text-secondary leading-relaxed">
                Your website isn&apos;t just a brochure — it&apos;s the front
                door to your AI-powered business.
              </p>
            </ScrollReveal>
          </div>

          {/* Right — Browser visual */}
          <ScrollReveal direction="right" delay={0.2}>
            <div
              ref={visualRef}
              className="relative rounded-2xl border border-white/[0.04] bg-navy-800/40 p-6 lg:p-8 min-h-[360px] flex items-center justify-center"
            >
              {/* Browser mockup */}
              <div className="w-full max-w-[85%] rounded-xl overflow-hidden border border-white/[0.08] bg-navy-950">
                {/* Browser bar */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.02] border-b border-white/[0.04]">
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>

                {/* Content */}
                <div className="p-5 space-y-2.5">
                  <div className="wd-mock-line h-[3px] w-[40%] rounded bg-cyan-400/60" />
                  <div className="wd-mock-line h-[3px] w-[70%] rounded bg-white/[0.08]" />
                  <div className="wd-mock-line h-[3px] w-[55%] rounded bg-white/[0.06]" />
                  <div className="wd-mock-line h-[3px] w-[85%] rounded bg-white/[0.04]" />
                  <div className="wd-mock-line mt-5 h-2 w-[30%] rounded-md bg-gradient-to-r from-cyan-400 to-cyan-600" />

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="wd-mock-card h-12 rounded-md bg-white/[0.03] border border-white/[0.04]" />
                    <div className="wd-mock-card h-12 rounded-md bg-white/[0.03] border border-white/[0.04]" />
                    <div className="wd-mock-card h-12 rounded-md bg-white/[0.03] border border-white/[0.04]" />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-3 -right-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-navy-950 text-xs font-bold tracking-[0.1em] shadow-[0_8px_30px_rgba(0,180,216,0.3)]" style={{ animation: "badge-glow 2s ease-in-out infinite" }}>
                AI-READY
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

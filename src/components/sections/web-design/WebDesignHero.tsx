"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Button from "@/components/ui/Button";
import {
  fadeUp,
  staggerContainer,
  DURATIONS,
  EASINGS,
} from "@/lib/animations";

export default function WebDesignHero() {
  const shouldReduceMotion = useReducedMotion();
  const visualRef = useRef<HTMLDivElement>(null);
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
      // Skip GSAP entirely on mobile — the visual is hidden
      if (shouldReduceMotion || !isDesktop || !visualRef.current) return;

      const lines = visualRef.current.querySelectorAll(".mock-line");
      gsap.fromTo(
        lines,
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.8,
        }
      );

      const cards = visualRef.current.querySelectorAll(".mock-card");
      gsap.fromTo(
        cards,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.1,
          delay: 1.4,
        }
      );
    },
    { scope: visualRef, dependencies: [shouldReduceMotion, isDesktop] }
  );

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full bg-cyan-400/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/[0.03] blur-[100px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 w-full pt-32 pb-20 lg:pt-0 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.04] backdrop-blur-sm text-cyan-400 text-[13px] font-medium tracking-wide mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                AI-Native Web Design
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[clamp(40px,5.5vw,80px)] font-bold leading-[1.05] tracking-[-0.03em] mb-7"
            >
              Websites built
              <br />
              for the{" "}
              <span className="gradient-text">AI&nbsp;era.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-[500px] mb-10"
            >
              We don&apos;t just design websites — we build digital experiences
              engineered for intelligence, speed, and conversion from day one.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Button variant="primary" size="large" href="#wd-contact">
                Start a Project
              </Button>
              <Button variant="secondary" size="large" href="#wd-services">
                View Services
              </Button>
            </motion.div>
          </motion.div>

          {/* Right — Browser mockup visual */}
          <motion.div
            ref={visualRef}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: DURATIONS.slow,
              ease: EASINGS.smooth,
              delay: 0.3,
            }}
            className="relative hidden lg:block"
          >
            {/* Floating dots — CSS animated */}
            <div className="absolute top-8 right-12 w-2 h-2 rounded-full bg-cyan-400/40" style={{ animation: "float-y 3.5s ease-in-out infinite" }} />
            <div className="absolute top-1/3 right-4 w-1.5 h-1.5 rounded-full bg-cyan-400/30" style={{ animation: "float-y 4s ease-in-out infinite 0.4s" }} />
            <div className="absolute bottom-16 right-20 w-2.5 h-2.5 rounded-full bg-cyan-600/30" style={{ animation: "float-y 4.5s ease-in-out infinite 0.8s" }} />
            <div className="absolute top-12 left-8 w-1.5 h-1.5 rounded-full bg-cyan-400/20" style={{ animation: "float-y 3.8s ease-in-out infinite 1.2s" }} />
            <div className="absolute bottom-8 left-16 w-2 h-2 rounded-full bg-cyan-600/25" style={{ animation: "float-y 4.2s ease-in-out infinite 1.6s" }} />

            {/* Browser frame */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-navy-800/50 p-4 shadow-2xl">
              {/* Browser bar */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.04]">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="ml-4 h-6 flex-1 max-w-[260px] rounded-md bg-white/[0.03] border border-white/[0.04]" />
              </div>

              {/* Browser content */}
              <div className="space-y-3 p-4">
                <div className="mock-line h-1 w-[35%] rounded bg-cyan-400/60" />
                <div className="mock-line h-1 w-[65%] rounded bg-white/[0.08]" />
                <div className="mock-line h-1 w-[50%] rounded bg-white/[0.06]" />
                <div className="mock-line h-1 w-[80%] rounded bg-white/[0.04]" />
                <div className="mock-line mt-5 h-2.5 w-[28%] rounded-md bg-gradient-to-r from-cyan-400 to-cyan-600" />

                {/* Card grid */}
                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  <div className="mock-card h-14 rounded-lg bg-white/[0.03] border border-white/[0.04]" />
                  <div className="mock-card h-14 rounded-lg bg-white/[0.03] border border-white/[0.04]" />
                  <div className="mock-card h-14 rounded-lg bg-white/[0.03] border border-white/[0.04]" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-2">
                  <div className="mock-card h-20 rounded-lg bg-white/[0.02] border border-white/[0.04]" />
                  <div className="mock-card h-20 rounded-lg bg-white/[0.02] border border-white/[0.04]" />
                </div>
              </div>
            </div>

            {/* Floating AI badge */}
            <div className="absolute -bottom-4 -right-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-navy-950 text-xs font-bold tracking-[0.1em] shadow-[0_8px_30px_rgba(0,180,216,0.3)]" style={{ animation: "badge-glow 2s ease-in-out infinite" }}>
              AI-READY
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator — CSS-only infinite animation */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[fade-in_0.8s_ease_1.5s_both]"
      >
        <span className="text-[11px] tracking-[0.2em] uppercase text-text-tertiary font-mono">
          Explore
        </span>
        <div
          className="w-px h-10 bg-gradient-to-b from-cyan-400 to-transparent"
          style={{ animation: "scroll-pulse 2s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
}

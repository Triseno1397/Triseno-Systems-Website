"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

const stats = [
  { value: 50, suffix: "+", label: "AI Systems Architected", prefix: "" },
  { value: 3, suffix: "x", label: "Average Workflow Compression", prefix: "" },
  { label: "Autonomous Operations", display: "24/7" },
  { label: "Concept to Deployment", display: "<6 Weeks" },
];

export default function AuthorityStrip() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion || !sectionRef.current) return;

      // Animate the top line
      const line = sectionRef.current.querySelector(".strip-line");
      if (line) {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-24"
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #0d1224 50%, #0a0e1a 100%)" }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-px">
        <div
          className="strip-line w-full h-full origin-center"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(0, 180, 216, 0.4), transparent)",
          }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Tagline */}
        <p className="text-center font-mono text-xs tracking-[0.25em] uppercase text-cyan-400/50 mb-16">
          AI Infrastructure for Operations, Intelligence & Scale
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-0">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`relative text-center group ${
                i < stats.length - 1
                  ? "lg:border-r lg:border-white/[0.04]"
                  : ""
              }`}
            >
              {/* Subtle glow behind number */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-cyan-400/[0.03] blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary tracking-tight mb-3">
                  {stat.display ? (
                    <span className="text-glow-cyan">{stat.display}</span>
                  ) : (
                    <span className="text-glow-cyan">
                      <AnimatedCounter
                        target={stat.value!}
                        suffix={stat.suffix}
                        prefix={stat.prefix}
                      />
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary/80 font-mono tracking-wide uppercase">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0, 180, 216, 0.2), transparent)",
        }}
      />
    </section>
  );
}

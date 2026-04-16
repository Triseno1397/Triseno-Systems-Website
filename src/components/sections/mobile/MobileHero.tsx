"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const lineVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.9,
      ease: [0.33, 1, 0.68, 1] as [number, number, number, number],
      delay: 0.3 + i * 0.12,
    },
  }),
};

const fadeVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      delay: 0.7 + i * 0.15,
    },
  }),
};

/* ─── Animated Phone Mockup ─── */
function PhoneMockup() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 40, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 1.2, delay: 0.5, ease: [0.33, 1, 0.68, 1] }}
      style={{ perspective: 1000 }}
    >
      {/* Phone frame */}
      <div
        className="relative w-[260px] h-[520px] rounded-[40px] border-2 overflow-hidden"
        style={{
          borderColor: "rgba(99,145,255,0.2)",
          background: "linear-gradient(180deg, #0c0e18, #080a14)",
          boxShadow: "0 0 60px rgba(99,145,255,0.08), 0 25px 50px rgba(0,0,0,0.4), inset 0 0 30px rgba(99,145,255,0.03)",
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 rounded-b-2xl" style={{ background: "#06060a" }} />

        {/* Screen content */}
        <div className="relative mt-10 px-5 space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between px-1">
            <div className="w-10 h-1 rounded bg-white/20" />
            <div className="flex gap-1">
              <div className="w-3 h-1 rounded bg-white/15" />
              <div className="w-3 h-1 rounded bg-white/15" />
              <div className="w-3 h-1 rounded bg-white/15" />
            </div>
          </div>

          {/* App header */}
          <motion.div
            className="flex items-center gap-3"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="w-8 h-8 rounded-xl" style={{ background: "linear-gradient(135deg, #6391ff, #4169e1)" }} />
            <div className="space-y-1">
              <div className="w-16 h-1.5 rounded bg-white/20" />
              <div className="w-10 h-1 rounded bg-white/10" />
            </div>
          </motion.div>

          {/* Card elements */}
          <motion.div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(99,145,255,0.06)", border: "1px solid rgba(99,145,255,0.1)" }}
            animate={{ borderColor: ["rgba(99,145,255,0.1)", "rgba(99,145,255,0.25)", "rgba(99,145,255,0.1)"] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="w-[80%] h-2 rounded bg-white/12" />
            <div className="w-[60%] h-1.5 rounded bg-white/8" />
            <div className="flex gap-2 mt-2">
              <motion.div
                className="flex-1 h-20 rounded-xl"
                style={{ background: "linear-gradient(135deg, rgba(99,145,255,0.15), rgba(99,145,255,0.05))" }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="flex-1 h-20 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>

          {/* List items */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)" }}
              animate={{ x: [0, 3, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.6 }}
            >
              <div className="w-6 h-6 rounded-lg" style={{ background: `rgba(99,145,255,${0.15 + i * 0.05})` }} />
              <div className="flex-1 space-y-1">
                <div className="w-[70%] h-1.5 rounded bg-white/10" />
                <div className="w-[50%] h-1 rounded bg-white/6" />
              </div>
              <div className="w-4 h-4 rounded-full" style={{ background: "rgba(99,145,255,0.2)" }} />
            </motion.div>
          ))}

          {/* Bottom nav bar */}
          <div className="absolute bottom-6 left-5 right-5">
            <div className="flex items-center justify-around py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-5 h-5 rounded-lg"
                  style={{ background: i === 0 ? "rgba(99,145,255,0.4)" : "rgba(255,255,255,0.08)" }}
                  animate={i === 0 ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Screen glare effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* Floating notification */}
      <motion.div
        className="absolute -right-12 top-20 px-4 py-2.5 rounded-xl border"
        style={{
          background: "rgba(14,14,18,0.9)",
          borderColor: "rgba(99,145,255,0.15)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        animate={{ y: [0, -8, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400/70 animate-pulse" />
          <span className="font-mono text-[9px] tracking-wide" style={{ color: "var(--mob-text-secondary)" }}>Live update</span>
        </div>
      </motion.div>

      {/* Floating gesture indicator */}
      <motion.div
        className="absolute -left-8 bottom-32"
        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
          <path d="M12 4L12 28M12 28L6 22M12 28L18 22" stroke="rgba(99,145,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Glow behind phone */}
      <div
        className="absolute -inset-20 -z-10 rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(99,145,255,0.06), transparent 70%)",
        }}
      />
    </motion.div>
  );
}

/* ─── Floating Background Orbs ─── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{
          top: "10%",
          left: "60%",
          background: "radial-gradient(circle, #6391ff 0%, transparent 70%)",
          animation: "gradient-drift 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.025]"
        style={{
          bottom: "15%",
          left: "10%",
          background: "radial-gradient(circle, #4169e1 0%, transparent 70%)",
          animation: "gradient-drift-reverse 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ─── Tech Stack Badges ─── */
function TechBadges() {
  const techs = ["React Native", "Swift", "Kotlin", "Flutter", "Firebase"];

  return (
    <motion.div
      className="mt-12 lg:mt-16 flex flex-wrap gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.4 }}
    >
      {techs.map((tech, i) => (
        <motion.span
          key={tech}
          className="px-4 py-2 rounded-full text-[10px] font-mono tracking-[0.15em] uppercase border"
          style={{
            borderColor: "rgba(99,145,255,0.15)",
            color: "var(--mob-text-secondary)",
            background: "rgba(99,145,255,0.04)",
          }}
          animate={{ borderColor: ["rgba(99,145,255,0.1)", "rgba(99,145,255,0.25)", "rgba(99,145,255,0.1)"] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
          whileHover={{
            borderColor: "rgba(99,145,255,0.4)",
            background: "rgba(99,145,255,0.1)",
            scale: 1.05,
          }}
        >
          {tech}
        </motion.span>
      ))}
    </motion.div>
  );
}

export default function MobileHero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
      {!shouldReduceMotion && <FloatingOrbs />}

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <motion.div
              className="mb-10 lg:mb-14"
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={fadeVariants}
              custom={0}
            >
              <span
                className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase"
                style={{ color: "var(--mob-accent)" }}
              >
                <span className="w-8 h-px" style={{ background: "var(--mob-accent)" }} />
                <span className="relative">
                  Mobile Division
                  <motion.span
                    className="absolute bottom-[-3px] left-0 h-px"
                    style={{ background: "var(--mob-accent)" }}
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.2, delay: 1 }}
                  />
                </span>
              </span>
            </motion.div>

            <h1 className="mb-10 lg:mb-12">
              {["Apps built to", "feel native,"].map((text, i) => (
                <span key={text} className="block overflow-hidden">
                  <motion.span
                    className="block text-[clamp(40px,7vw,96px)] font-bold leading-[0.92] tracking-[-0.04em]"
                    style={{ color: "var(--mob-text)" }}
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate="visible"
                    variants={lineVariants}
                    custom={i}
                  >
                    {text}
                  </motion.span>
                </span>
              ))}
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-[clamp(40px,7vw,96px)] font-bold leading-[0.92] tracking-[-0.04em] gradient-text"
                  initial={shouldReduceMotion ? false : "hidden"}
                  animate="visible"
                  variants={lineVariants}
                  custom={2}
                >
                  perform flawlessly.
                </motion.span>
              </span>
            </h1>

            <motion.p
              className="text-lg md:text-xl leading-relaxed max-w-[460px]"
              style={{ color: "var(--mob-text-secondary)" }}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={fadeVariants}
              custom={1}
            >
              Cross-platform and native mobile experiences engineered for speed, reliability, and delight.
            </motion.p>

            {!shouldReduceMotion && <TechBadges />}
          </div>

          {/* Right — Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            {!shouldReduceMotion && <PhoneMockup />}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 1.5 }}
      >
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--mob-text-tertiary)" }}>
          Scroll
        </span>
        <div
          className="w-px h-10 origin-top"
          style={{
            background: "linear-gradient(180deg, var(--mob-accent), transparent)",
            animation: "scroll-pulse 2.5s ease-in-out infinite",
          }}
        />
      </motion.div>
    </section>
  );
}

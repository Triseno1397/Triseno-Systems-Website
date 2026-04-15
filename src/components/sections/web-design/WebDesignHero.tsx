"use client";

import { motion, useReducedMotion } from "framer-motion";

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

export default function WebDesignHero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden">
      {/* Subtle warm radial glow */}
      <div
        className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(ellipse, rgba(200, 184, 154, 0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 w-full relative z-10">
        {/* Eyebrow */}
        <motion.div
          className="mb-10 lg:mb-14"
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={fadeVariants}
          custom={0}
        >
          <span
            className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--wd-accent)" }}
          >
            <span
              className="w-8 h-px"
              style={{ background: "var(--wd-accent)" }}
            />
            Web Design Division
          </span>
        </motion.div>

        {/* Headline — massive, cinematic */}
        <h1 className="mb-12 lg:mb-16">
          {["We design", "experiences that"].map((text, i) => (
            <span key={text} className="block overflow-hidden">
              <motion.span
                className="block text-[clamp(44px,8vw,110px)] font-bold leading-[0.92] tracking-[-0.04em]"
                style={{ color: "var(--wd-text)" }}
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
              className="block text-[clamp(44px,8vw,110px)] font-bold leading-[0.92] tracking-[-0.04em] gradient-text"
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={lineVariants}
              custom={2}
            >
              command attention.
            </motion.span>
          </span>
        </h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl leading-relaxed max-w-[480px]"
          style={{ color: "var(--wd-text-secondary)" }}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={fadeVariants}
          custom={1}
        >
          Precision-engineered websites for brands that refuse to blend in.
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={fadeVariants}
        custom={2}
      >
        <div
          className="w-px h-10 origin-top"
          style={{
            background:
              "linear-gradient(180deg, var(--wd-accent), transparent)",
            animation: "scroll-pulse 2.5s ease-in-out infinite",
          }}
        />
      </motion.div>
    </section>
  );
}

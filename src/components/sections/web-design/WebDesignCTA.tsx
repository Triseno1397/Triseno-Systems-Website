"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";

const fadeUp = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

export default function WebDesignCTA() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-32 lg:py-44 overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 max-w-[1400px] mx-auto px-6 lg:px-8">
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--wd-border), transparent)",
          }}
        />
      </div>

      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(200, 184, 154, 0.03) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10 text-center"
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.h2
          className="text-[clamp(36px,7vw,80px)] font-bold leading-[0.92] tracking-[-0.04em] mb-6"
          style={{ color: "var(--wd-text)" }}
          variants={fadeUp}
        >
          Let&apos;s talk.
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl leading-relaxed max-w-[440px] mx-auto mb-10"
          style={{ color: "var(--wd-text-secondary)" }}
          variants={fadeUp}
        >
          Tell us about your project. We&apos;ll tell you exactly how we&apos;d
          build it.
        </motion.p>

        <motion.div variants={fadeUp}>
          <a
            href="mailto:Tristen@trisenosystems.com?subject=Web%20Design%20Inquiry"
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-400 hover:shadow-[0_8px_40px_rgba(200,184,154,0.25)]"
            style={{
              background: "var(--wd-accent)",
              color: "var(--wd-bg)",
            }}
          >
            <span>Start a Conversation</span>
            <ArrowRight
              size={18}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </a>
        </motion.div>

        <motion.p
          className="mt-8 font-mono text-[10px] tracking-[0.12em] uppercase"
          style={{ color: "var(--wd-text-tertiary)" }}
          variants={fadeUp}
        >
          No commitment &middot; No pricing pressure &middot; Just a
          conversation
        </motion.p>
      </motion.div>
    </section>
  );
}

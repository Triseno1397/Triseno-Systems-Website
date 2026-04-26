"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, PencilLine, Rocket } from "@phosphor-icons/react";

const fadeUp = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
};

const steps = [
  {
    num: "I",
    numeric: "01",
    title: "Strategy",
    desc: "We learn your market, audit your competitors, and define what success looks like before anything is designed.",
    icon: Compass,
    pullQuote: "Nothing is drawn before it's decided.",
  },
  {
    num: "II",
    numeric: "02",
    title: "Design & Build",
    desc: "High-fidelity design to production code. You see, approve, and experience every stage before we move forward.",
    icon: PencilLine,
    pullQuote: "Every pixel ships with a rationale.",
  },
  {
    num: "III",
    numeric: "03",
    title: "Launch & Evolve",
    desc: "We deploy, optimize, and refine. Your site gets better every week, not just on launch day.",
    icon: Rocket,
    pullQuote: "Launch is the beginning of the work, not the end.",
  },
];

function StepColumn({ step, index }: { step: typeof steps[0]; index: number }) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = step.icon;

  return (
    <motion.div variants={fadeUp} className="group relative flex flex-col">
      {/* Roman numeral marker */}
      <div className="flex items-baseline gap-3 mb-8">
        <span
          className="wd-serif leading-none tracking-[-0.04em]"
          style={{
            color: "var(--wd-accent)",
            fontSize: "clamp(64px, 8vw, 120px)",
            fontWeight: 500,
          }}
        >
          {step.num}
        </span>
        <div
          className="h-px flex-1 mb-4"
          style={{ background: "var(--wd-text)", opacity: 0.3 }}
        />
        <span
          className="font-mono text-[9px] tracking-[0.35em] uppercase mb-4"
          style={{ color: "var(--wd-text-tertiary)" }}
        >
          Ch. {step.numeric}
        </span>
      </div>

      {/* Icon */}
      <motion.div
        className="mb-6"
        animate={shouldReduceMotion ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center border-2 transition-all duration-500 group-hover:rotate-3"
          style={{
            borderColor: "var(--wd-text)",
            background: "var(--wd-paper)",
          }}
        >
          <Icon size={22} weight="regular" style={{ color: "var(--wd-accent)" }} />
        </div>
      </motion.div>

      <h3
        className="font-bold tracking-[-0.02em] mb-3"
        style={{
          color: "var(--wd-text)",
          fontSize: "clamp(24px, 2.5vw, 34px)",
          lineHeight: 1.05,
        }}
      >
        {step.title}
      </h3>

      <p
        className="text-[15px] leading-[1.65] mb-6"
        style={{ color: "var(--wd-text-secondary)" }}
      >
        {step.desc}
      </p>

      {/* Pull quote */}
      <div
        className="border-l-2 pl-4 py-1 mt-auto"
        style={{ borderColor: "var(--wd-accent)" }}
      >
        <span
          className="wd-serif text-base"
          style={{ color: "var(--wd-text)" }}
        >
          &ldquo;{step.pullQuote}&rdquo;
        </span>
      </div>
    </motion.div>
  );
}

export default function WebDesignProcess() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36">
      {/* Section top rule */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 mb-12 lg:mb-16">
        <div className="flex items-center gap-6">
          <span
            className="font-mono text-[10px] tracking-[0.35em] uppercase"
            style={{ color: "var(--wd-accent)" }}
          >
            The Method
          </span>
          <motion.div
            className="flex-1 h-px origin-left"
            style={{ background: "var(--wd-text)", opacity: 0.85 }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
          />
          <span
            className="font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--wd-text-tertiary)" }}
          >
            PP. 06
          </span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-20 lg:mb-28 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-end"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
        >
          <div>
            <h2
              className="font-bold leading-[0.88] tracking-[-0.04em]"
              style={{
                color: "var(--wd-text)",
                fontSize: "clamp(40px, 6vw, 96px)",
              }}
            >
              Three
              <br />
              <span className="wd-serif" style={{ color: "var(--wd-accent)", fontWeight: 500 }}>
                chapters.
              </span>
            </h2>
          </div>
          <div className="max-w-[460px]">
            <p
              className="text-lg leading-[1.55]"
              style={{ color: "var(--wd-text-secondary)" }}
            >
              Our process, set in three parts. Simple in outline,
              uncompromising in execution.
            </p>
          </div>
        </motion.div>

        {/* Three-column layout with gutter rules */}
        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`relative ${i > 0 ? "md:pl-10 md:border-l" : ""} ${
                i < steps.length - 1 ? "md:pr-10" : ""
              }`}
              style={i > 0 ? { borderColor: "var(--wd-border)" } : undefined}
            >
              <StepColumn step={step} index={i} />
            </div>
          ))}
        </motion.div>

        {/* Bottom rule with progression */}
        <motion.div
          className="mt-20 lg:mt-28 max-w-[900px] mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="relative flex items-center justify-between">
            {["Discovery", "Development", "Deployment"].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <motion.div
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: "var(--wd-accent)",
                    background: i === 0 ? "var(--wd-accent)" : "var(--wd-bg)",
                  }}
                  animate={
                    i === 1
                      ? { scale: [1, 1.3, 1], background: ["var(--wd-bg)", "var(--wd-accent)", "var(--wd-bg)"] }
                      : {}
                  }
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                />
                <span
                  className="font-mono text-[9px] tracking-[0.25em] uppercase"
                  style={{ color: "var(--wd-text-secondary)" }}
                >
                  {label}
                </span>
              </div>
            ))}
            <motion.div
              className="absolute left-0 right-0 top-1.5 h-px -z-10"
              style={{ background: "var(--wd-accent)", opacity: 0.4 }}
              initial={{ scaleX: 0, transformOrigin: "left" }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2, delay: 0.8, ease: [0.33, 1, 0.68, 1] }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

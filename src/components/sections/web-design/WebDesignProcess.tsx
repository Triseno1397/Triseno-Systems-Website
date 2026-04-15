"use client";

import { motion, useReducedMotion } from "framer-motion";

const fadeUp = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const steps = [
  {
    num: "01",
    title: "Strategy",
    desc: "We learn your market, audit your competitors, and define what success looks like before anything is designed.",
  },
  {
    num: "02",
    title: "Design & Build",
    desc: "High-fidelity design to production code. You see, approve, and experience every stage before we move forward.",
  },
  {
    num: "03",
    title: "Launch & Evolve",
    desc: "We deploy, optimize, and refine. Your site gets better every week, not just on launch day.",
  },
];

export default function WebDesignProcess() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36">
      {/* Subtle top divider */}
      <div className="absolute top-0 left-0 right-0 max-w-[1400px] mx-auto px-6 lg:px-8">
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--wd-border), transparent)",
          }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-16 lg:mb-24"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
        >
          <span
            className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase mb-6"
            style={{ color: "var(--wd-accent)" }}
          >
            <span
              className="w-8 h-px"
              style={{ background: "var(--wd-accent)" }}
            />
            Our Approach
          </span>
          <h2
            className="text-[clamp(32px,5vw,64px)] font-bold leading-[1] tracking-[-0.03em] max-w-[600px]"
            style={{ color: "var(--wd-text)" }}
          >
            Simple process.
            <br />
            <span className="gradient-text">Exceptional results.</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-0"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              className={`py-10 md:py-0 md:px-10 lg:px-14 ${
                i < steps.length - 1
                  ? "border-b md:border-b-0 md:border-r"
                  : ""
              }`}
              style={{ borderColor: "var(--wd-border)" }}
            >
              <span
                className="block text-[80px] lg:text-[100px] font-bold leading-none tracking-[-0.04em] select-none mb-4"
                style={{ color: "rgba(255,255,255,0.03)" }}
              >
                {step.num}
              </span>

              <h3
                className="text-xl lg:text-2xl font-bold tracking-[-0.02em] mb-4"
                style={{ color: "var(--wd-text)" }}
              >
                {step.title}
              </h3>

              <p
                className="text-[15px] leading-relaxed"
                style={{ color: "var(--wd-text-secondary)" }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

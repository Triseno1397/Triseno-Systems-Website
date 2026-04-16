"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Compass, PencilLine, Rocket } from "@phosphor-icons/react";

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
  visible: { transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
};

const steps = [
  {
    num: "01",
    title: "Strategy",
    desc: "We learn your market, audit your competitors, and define what success looks like before anything is designed.",
    icon: Compass,
    accent: "#c8b89a",
  },
  {
    num: "02",
    title: "Design & Build",
    desc: "High-fidelity design to production code. You see, approve, and experience every stage before we move forward.",
    icon: PencilLine,
    accent: "#e8d5b5",
  },
  {
    num: "03",
    title: "Launch & Evolve",
    desc: "We deploy, optimize, and refine. Your site gets better every week, not just on launch day.",
    icon: Rocket,
    accent: "#d4c4a8",
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = step.icon;

  return (
    <motion.div
      variants={fadeUp}
      className="group relative"
    >
      {/* Card */}
      <div
        className="relative rounded-2xl border p-8 lg:p-10 overflow-hidden transition-all duration-500 hover:border-[var(--wd-border-accent)]"
        style={{
          borderColor: "var(--wd-border)",
          background: "var(--wd-bg-elevated)",
        }}
      >
        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(300px circle at 50% 0%, rgba(200,184,154,0.06), transparent 70%)`,
          }}
        />

        {/* Top accent line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${step.accent}, transparent)`,
          }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 + index * 0.2 }}
        />

        {/* Icon */}
        <motion.div
          className="mb-6 relative"
          animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
            style={{
              background: `rgba(200,184,154,0.08)`,
              border: "1px solid rgba(200,184,154,0.1)",
            }}
          >
            <Icon
              size={22}
              weight="duotone"
              style={{ color: step.accent }}
              className="transition-transform duration-500 group-hover:rotate-12"
            />
          </div>
          {/* Glow behind icon */}
          <div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
            style={{ background: step.accent }}
          />
        </motion.div>

        {/* Step number */}
        <span
          className="block text-[64px] lg:text-[80px] font-bold leading-none tracking-[-0.04em] select-none mb-4 transition-all duration-500 group-hover:opacity-[0.08]"
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

        {/* Bottom corner accent */}
        <motion.div
          className="absolute bottom-4 right-4 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle, ${step.accent}15, transparent)` }}
          animate={shouldReduceMotion ? {} : { scale: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Animated Connection Line Between Steps ─── */
function ConnectorLine() {
  return (
    <div className="hidden md:flex items-center justify-center py-4">
      <motion.div
        className="flex items-center gap-2 w-full max-w-[200px]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div
          className="flex-1 h-px"
          style={{
            background: "linear-gradient(to right, var(--wd-border), var(--wd-accent), var(--wd-border))",
            animation: "wd-line-flow 3s ease-in-out infinite",
          }}
        />
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--wd-accent)", opacity: 0.4 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div
          className="flex-1 h-px"
          style={{
            background: "linear-gradient(to right, var(--wd-border), var(--wd-accent), var(--wd-border))",
            animation: "wd-line-flow 3s ease-in-out infinite reverse",
          }}
        />
      </motion.div>
    </div>
  );
}

export default function WebDesignProcess() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 max-w-[1400px] mx-auto px-6 lg:px-8">
        <div
          className="h-px"
          style={{
            background: "linear-gradient(to right, transparent, var(--wd-border), transparent)",
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
            <span className="w-8 h-px" style={{ background: "var(--wd-accent)" }} />
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

        {/* Steps — now as interactive cards with connectors */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {steps.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} />
          ))}
        </motion.div>

        {/* Animated progress bar below steps */}
        <motion.div
          className="mt-12 lg:mt-16 max-w-[800px] mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="relative h-px w-full" style={{ background: "var(--wd-border)" }}>
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: "var(--wd-accent)" }}
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 2, delay: 1, ease: [0.33, 1, 0.68, 1] }}
            />
            {/* Traveling glow dot */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{
                background: "var(--wd-accent)",
                boxShadow: "0 0 12px rgba(200,184,154,0.5)",
              }}
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {["Discovery", "Development", "Deployment"].map((label, i) => (
              <span
                key={label}
                className="font-mono text-[9px] tracking-[0.15em] uppercase"
                style={{ color: "var(--wd-text-tertiary)" }}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

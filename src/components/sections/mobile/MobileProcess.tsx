"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Strategy, Code, RocketLaunch } from "@phosphor-icons/react";

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
    title: "Blueprint",
    desc: "We define user journeys, architect the data model, and map every interaction before writing a single line of code.",
    icon: Strategy,
    accent: "#6391ff",
  },
  {
    num: "02",
    title: "Develop & Test",
    desc: "Agile sprints with continuous testing. You see working builds every week on real devices, not just mockups.",
    icon: Code,
    accent: "#7ba3ff",
  },
  {
    num: "03",
    title: "Ship & Scale",
    desc: "App Store submission, analytics integration, and post-launch iteration. We keep improving after day one.",
    icon: RocketLaunch,
    accent: "#94b5ff",
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = step.icon;

  return (
    <motion.div variants={fadeUp} className="group relative">
      <div
        className="relative rounded-2xl border p-8 lg:p-10 overflow-hidden transition-all duration-500 hover:border-[rgba(99,145,255,0.15)]"
        style={{ borderColor: "var(--mob-border)", background: "var(--mob-bg-elevated)" }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: "radial-gradient(300px circle at 50% 0%, rgba(99,145,255,0.05), transparent 70%)" }} />

        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${step.accent}, transparent)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 + index * 0.2 }}
        />

        <motion.div
          className="mb-6 relative"
          animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
            style={{ background: "rgba(99,145,255,0.08)", border: "1px solid rgba(99,145,255,0.1)" }}
          >
            <Icon size={22} weight="duotone" style={{ color: step.accent }} className="transition-transform duration-500 group-hover:rotate-12" />
          </div>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" style={{ background: step.accent }} />
        </motion.div>

        <span className="block text-[64px] lg:text-[80px] font-bold leading-none tracking-[-0.04em] select-none mb-4 transition-all duration-500 group-hover:opacity-[0.08]" style={{ color: "rgba(255,255,255,0.03)" }}>
          {step.num}
        </span>

        <h3 className="text-xl lg:text-2xl font-bold tracking-[-0.02em] mb-4" style={{ color: "var(--mob-text)" }}>{step.title}</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--mob-text-secondary)" }}>{step.desc}</p>

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

export default function MobileProcess() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36">
      <div className="absolute top-0 left-0 right-0 max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="h-px" style={{ background: "linear-gradient(to right, transparent, var(--mob-border), transparent)" }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <motion.div
          className="mb-16 lg:mb-24"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
        >
          <span className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: "var(--mob-accent)" }}>
            <span className="w-8 h-px" style={{ background: "var(--mob-accent)" }} />
            Our Approach
          </span>
          <h2 className="text-[clamp(32px,5vw,64px)] font-bold leading-[1] tracking-[-0.03em] max-w-[600px]" style={{ color: "var(--mob-text)" }}>
            Agile delivery.
            <br />
            <span className="gradient-text">Relentless quality.</span>
          </h2>
        </motion.div>

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

        {/* Progress bar */}
        <motion.div
          className="mt-12 lg:mt-16 max-w-[800px] mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="relative h-px w-full" style={{ background: "var(--mob-border)" }}>
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: "var(--mob-accent)" }}
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 2, delay: 1, ease: [0.33, 1, 0.68, 1] }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{ background: "var(--mob-accent)", boxShadow: "0 0 12px rgba(99,145,255,0.5)" }}
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {["Planning", "Development", "Deployment"].map((label) => (
              <span key={label} className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: "var(--mob-text-tertiary)" }}>{label}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

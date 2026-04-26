"use client";

import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { useCallback, useRef } from "react";

const fadeUp = {
  hidden: { y: 24, opacity: 0 },
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

/* ─── Editorial Magnetic Button ─── */
function MagneticCTA() {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.25);
    y.set((e.clientY - centerY) * 0.25);
  }, [x, y]);

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.a
      ref={ref}
      href="mailto:Tristen@trisenosystems.com?subject=Web%20Design%20Inquiry"
      className="group relative inline-flex items-center gap-4 px-10 py-5 font-mono text-[11px] tracking-[0.35em] uppercase overflow-hidden"
      style={{
        background: "var(--wd-text)",
        color: "var(--wd-paper)",
        x: springX,
        y: springY,
      }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Accent bar that sweeps in on hover */}
      <div
        className="absolute inset-0 origin-left transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-x-100 scale-x-0"
        style={{ background: "var(--wd-accent)" }}
      />
      <span className="relative z-10">Start a Conversation</span>
      <ArrowUpRight
        size={16}
        weight="bold"
        className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
      />
    </motion.a>
  );
}

/* ─── Postmark Stamp ─── */
function Postmark() {
  return (
    <motion.div
      className="absolute top-10 right-10 lg:top-16 lg:right-16 pointer-events-none"
      initial={{ opacity: 0, rotate: -20, scale: 0.6 }}
      whileInView={{ opacity: 1, rotate: -12, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.6 }}
      style={{ transformOrigin: "center" }}
    >
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="56" stroke="var(--wd-accent)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="48" stroke="var(--wd-accent)" strokeWidth="0.8" strokeDasharray="2 3" />
        <text
          x="60"
          y="48"
          textAnchor="middle"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="7"
          letterSpacing="0.25em"
          fill="var(--wd-accent)"
        >
          TRISENO
        </text>
        <text
          x="60"
          y="66"
          textAnchor="middle"
          fontFamily="serif"
          fontStyle="italic"
          fontSize="14"
          fill="var(--wd-accent)"
          fontWeight="500"
        >
          Studio
        </text>
        <text
          x="60"
          y="82"
          textAnchor="middle"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="7"
          letterSpacing="0.25em"
          fill="var(--wd-accent)"
        >
          MMXXVI
        </text>
        <line x1="22" y1="60" x2="30" y2="60" stroke="var(--wd-accent)" strokeWidth="1" />
        <line x1="90" y1="60" x2="98" y2="60" stroke="var(--wd-accent)" strokeWidth="1" />
      </svg>
    </motion.div>
  );
}

/* ─── Hand-signature squiggle ─── */
function Signature() {
  return (
    <svg width="180" height="50" viewBox="0 0 180 50" fill="none" className="ml-1">
      <motion.path
        d="M4 30 Q 14 10, 24 25 T 46 28 Q 60 10, 74 30 T 100 28 Q 114 12, 128 28 T 156 26 L 172 24"
        stroke="var(--wd-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="260"
        initial={{ strokeDashoffset: 260 }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 2, delay: 0.8, ease: [0.33, 1, 0.68, 1] }}
      />
      <motion.path
        d="M175 24 L 170 40"
        stroke="var(--wd-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="30"
        initial={{ strokeDashoffset: 30 }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 2.6 }}
      />
    </svg>
  );
}

export default function WebDesignCTA() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36 overflow-hidden">
      {/* Section top rule */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 mb-16 lg:mb-24">
        <div className="flex items-center gap-6">
          <span
            className="font-mono text-[10px] tracking-[0.35em] uppercase"
            style={{ color: "var(--wd-accent)" }}
          >
            Correspondence
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
            PP. 07 — Fin.
          </span>
        </div>
      </div>

      <motion.div
        className="relative max-w-[1100px] mx-auto px-6 lg:px-8"
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        {/* Letter paper — the whole section reads as a letter */}
        <div
          className="relative border p-8 md:p-14 lg:p-20"
          style={{
            background: "var(--wd-paper)",
            borderColor: "var(--wd-text)",
            boxShadow: "8px 8px 0 var(--wd-accent-dim)",
          }}
        >
          {!shouldReduceMotion && <Postmark />}

          {/* Salutation */}
          <motion.div variants={fadeUp} className="mb-10">
            <span
              className="font-mono text-[10px] tracking-[0.35em] uppercase mb-2 block"
              style={{ color: "var(--wd-text-tertiary)" }}
            >
              From the desk of Triseno Studio
            </span>
            <p
              className="wd-serif text-2xl md:text-3xl"
              style={{ color: "var(--wd-text-secondary)", fontWeight: 400 }}
            >
              To our future client —
            </p>
          </motion.div>

          {/* Giant headline */}
          <motion.h2
            variants={fadeUp}
            className="font-bold leading-[0.88] tracking-[-0.05em] mb-10"
            style={{
              color: "var(--wd-text)",
              fontSize: "clamp(56px, 10vw, 160px)",
            }}
          >
            Let&apos;s
            <br />
            <span className="wd-serif" style={{ color: "var(--wd-accent)", fontWeight: 500 }}>
              talk.
            </span>
          </motion.h2>

          {/* Body paragraphs — two-column editorial */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 max-w-[820px]"
          >
            <p
              className="text-base md:text-[17px] leading-[1.75]"
              style={{ color: "var(--wd-text-secondary)" }}
            >
              <span
                className="wd-serif float-left text-[64px] leading-[0.8] mr-2 mt-1"
                style={{ color: "var(--wd-accent)", fontWeight: 500 }}
              >
                T
              </span>
              ell us about your project. Send a few paragraphs, a link to
              a reference site, or just a list of rough ambitions. No
              brief required.
            </p>
            <p
              className="text-base md:text-[17px] leading-[1.75]"
              style={{ color: "var(--wd-text-secondary)" }}
            >
              We&apos;ll write back with exactly how we&apos;d build it —
              timeline, approach, investment. <em className="wd-serif">No commitment. No pricing pressure.</em> Just a conversation about the work.
            </p>
          </motion.div>

          {/* Rule */}
          <motion.div
            className="h-px w-full mb-10 origin-left"
            style={{ background: "var(--wd-text)", opacity: 0.3 }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4 }}
          />

          {/* CTA + signature */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
          >
            <div>
              <MagneticCTA />
              <p
                className="mt-6 font-mono text-[10px] tracking-[0.25em] uppercase"
                style={{ color: "var(--wd-text-tertiary)" }}
              >
                Or write to{" "}
                <a
                  href="mailto:Tristen@trisenosystems.com"
                  className="underline underline-offset-4 transition-colors duration-300"
                  style={{ color: "var(--wd-accent)" }}
                >
                  Tristen@trisenosystems.com
                </a>
              </p>
            </div>

            {/* Signature block */}
            <div className="flex flex-col items-start md:items-end">
              <span
                className="wd-serif text-lg mb-1"
                style={{ color: "var(--wd-text-secondary)" }}
              >
                Warmly,
              </span>
              <Signature />
              <span
                className="font-mono text-[10px] tracking-[0.3em] uppercase mt-1"
                style={{ color: "var(--wd-text-tertiary)" }}
              >
                The Studio
              </span>
            </div>
          </motion.div>
        </div>

        {/* Colophon */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div
            className="inline-flex items-center gap-3 font-mono text-[9px] tracking-[0.35em] uppercase"
            style={{ color: "var(--wd-text-tertiary)" }}
          >
            <span>—</span>
            <span>End of Feature</span>
            <span>—</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

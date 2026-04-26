"use client";

import { motion, useReducedMotion } from "framer-motion";

/* ─── Animation Variants ─── */
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
  hidden: { y: 12, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      delay: 0.6 + i * 0.12,
    },
  }),
};

/* ─── Hand-drawn underline SVG ─── */
function HandUnderline() {
  return (
    <svg
      viewBox="0 0 400 20"
      fill="none"
      className="absolute left-0 -bottom-4 w-full h-5"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M4 14 Q 80 4, 160 10 T 320 8 T 396 12"
        stroke="var(--wd-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="400"
        initial={{ strokeDashoffset: 400 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.6, delay: 1.4, ease: [0.33, 1, 0.68, 1] }}
      />
    </svg>
  );
}

/* ─── Large folio numeral ─── */
function Folio() {
  return (
    <motion.div
      className="hidden lg:block absolute top-[12%] right-[6%] pointer-events-none select-none"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex flex-col items-end gap-4">
        <span
          className="font-mono text-[10px] tracking-[0.4em] uppercase"
          style={{ color: "var(--wd-text-tertiary)" }}
        >
          Issue 01 &middot; Spring MMXXVI
        </span>
        <div className="relative">
          <span
            className="wd-serif block leading-[0.8] tracking-[-0.08em]"
            style={{
              fontSize: "clamp(180px, 22vw, 340px)",
              color: "var(--wd-accent)",
              animation: "wd-folio-pulse 6s ease-in-out infinite",
            }}
          >
            01
          </span>
          <span
            className="absolute -bottom-2 right-2 font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--wd-text-secondary)" }}
          >
            The Studio
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Corner masthead marks ─── */
function Masthead() {
  return (
    <>
      {/* Top rule */}
      <motion.div
        className="absolute top-[11rem] left-6 lg:left-8 right-6 lg:right-8 h-px origin-left"
        style={{ background: "var(--wd-text)", opacity: 0.85 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
      />
      {/* Thin rule below top rule for double-rule effect */}
      <motion.div
        className="absolute top-[11.4rem] left-6 lg:left-8 right-6 lg:right-8 h-px origin-left"
        style={{ background: "var(--wd-text)", opacity: 0.4 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 0.4, ease: [0.33, 1, 0.68, 1] }}
      />
      {/* Masthead labels */}
      <motion.div
        className="absolute top-[11.9rem] left-6 lg:left-8 right-6 lg:right-8 flex justify-between font-mono text-[9px] tracking-[0.3em] uppercase"
        style={{ color: "var(--wd-text-secondary)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <span>Triseno / Studio Edition</span>
        <span className="hidden md:inline">Vol. I · The Craft Issue</span>
        <span>Price: On Inquiry</span>
      </motion.div>
    </>
  );
}

/* ─── Ornamental corner mark ─── */
function OrnamentMark() {
  return (
    <motion.div
      className="absolute bottom-12 right-8 lg:right-14 pointer-events-none"
      initial={{ opacity: 0, rotate: -10 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 1, delay: 1.6 }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="var(--wd-accent)"
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity="0.6"
        />
        <circle
          cx="32"
          cy="32"
          r="20"
          stroke="var(--wd-text)"
          strokeWidth="0.6"
          opacity="0.5"
        />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="7"
          letterSpacing="0.2em"
          fill="var(--wd-accent)"
        >
          TS
        </text>
      </svg>
    </motion.div>
  );
}

/* ─── Main Hero Component ─── */
export default function WebDesignHero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden pt-56 pb-20">
      {!shouldReduceMotion && <Masthead />}
      {!shouldReduceMotion && <Folio />}
      {!shouldReduceMotion && <OrnamentMark />}

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
            className="inline-flex items-center gap-4 font-mono text-[10px] tracking-[0.35em] uppercase"
            style={{ color: "var(--wd-accent)" }}
          >
            <span
              className="w-10 h-px"
              style={{ background: "var(--wd-accent)" }}
            />
            Feature — Web Design Division
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="mb-14 lg:mb-16 max-w-[1100px]">
          <span className="block overflow-hidden">
            <motion.span
              className="block font-bold leading-[0.88] tracking-[-0.045em]"
              style={{
                color: "var(--wd-text)",
                fontSize: "clamp(48px, 9vw, 140px)",
              }}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={lineVariants}
              custom={0}
            >
              Websites,
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              className="block font-bold leading-[0.88] tracking-[-0.045em]"
              style={{
                color: "var(--wd-text)",
                fontSize: "clamp(48px, 9vw, 140px)",
              }}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={lineVariants}
              custom={1}
            >
              crafted with
            </motion.span>
          </span>
          <span className="block overflow-hidden relative">
            <motion.span
              className="wd-serif block leading-[0.88] tracking-[-0.04em]"
              style={{
                color: "var(--wd-accent)",
                fontSize: "clamp(48px, 9vw, 140px)",
                fontWeight: 500,
              }}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={lineVariants}
              custom={2}
            >
              intention.
              <HandUnderline />
            </motion.span>
          </span>
        </h1>

        {/* Two-column editorial body */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-8 md:gap-16 items-start max-w-[1100px]">
          <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={fadeVariants}
            custom={1}
          >
            <div
              className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3"
              style={{ color: "var(--wd-text-tertiary)" }}
            >
              Column A
            </div>
            <p
              className="text-base md:text-[17px] leading-[1.6]"
              style={{ color: "var(--wd-text-secondary)" }}
            >
              Precision-engineered digital presences for brands that
              refuse to blend in. Every detail considered, nothing left to
              default.
            </p>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={fadeVariants}
            custom={2}
          >
            <div
              className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3"
              style={{ color: "var(--wd-text-tertiary)" }}
            >
              Column B
            </div>
            <p
              className="text-base md:text-[17px] leading-[1.6]"
              style={{ color: "var(--wd-text-secondary)" }}
            >
              <em className="wd-serif">Four disciplines.</em> One
              standard. From brand sites to full-stack platforms — built
              to be seen, built to last.
            </p>
          </motion.div>

          {/* Stamp / seal */}
          <motion.div
            className="hidden md:flex flex-col items-center justify-center"
            initial={{ opacity: 0, rotate: -8, scale: 0.6 }}
            animate={{ opacity: 1, rotate: -4, scale: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
          >
            <div
              className="w-24 h-24 rounded-full border-[1.5px] flex items-center justify-center relative"
              style={{
                borderColor: "var(--wd-accent)",
                color: "var(--wd-accent)",
              }}
            >
              <div
                className="absolute inset-1 rounded-full border"
                style={{ borderColor: "var(--wd-accent)", opacity: 0.4 }}
              />
              <div className="text-center leading-tight">
                <div className="font-mono text-[7px] tracking-[0.2em] uppercase opacity-80">
                  Est.
                </div>
                <div className="wd-serif text-2xl font-semibold">
                  2024
                </div>
                <div className="font-mono text-[7px] tracking-[0.2em] uppercase opacity-80">
                  Studio
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lower rule + folio footer */}
        <motion.div
          className="mt-16 lg:mt-24 flex items-center gap-6"
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={fadeVariants}
          custom={3}
        >
          <span
            className="font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--wd-text-tertiary)" }}
          >
            Continue Reading
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "var(--wd-border)" }}
          />
          <span
            className="font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--wd-text-tertiary)" }}
          >
            PP. 02 – 05
          </span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-6 lg:left-8 flex flex-col items-start gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.8 }}
      >
        <span
          className="font-mono text-[9px] tracking-[0.3em] uppercase"
          style={{ color: "var(--wd-text-tertiary)" }}
        >
          Turn the page ↓
        </span>
      </motion.div>
    </section>
  );
}

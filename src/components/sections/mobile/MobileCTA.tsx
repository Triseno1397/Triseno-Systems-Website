"use client";

import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { useCallback, useRef } from "react";

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

function MagneticCTA() {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.3);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.3);
  }, [x, y]);

  return (
    <motion.a
      ref={ref}
      href="mailto:Tristen@trisenosystems.com?subject=Mobile%20Development%20Inquiry"
      className="group relative inline-flex items-center gap-3 px-12 py-6 rounded-xl font-semibold text-sm tracking-wide overflow-hidden"
      style={{
        background: "var(--mob-accent)",
        color: "#06060a",
        x: springX,
        y: springY,
      }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)", animation: "wd-shimmer 2.5s ease-in-out infinite" }} />
      <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: "0 0 30px rgba(99,145,255,0.3), 0 0 60px rgba(99,145,255,0.1)" }} />
      <span className="relative z-10">Start a Conversation</span>
      <ArrowRight size={18} weight="bold" className="relative z-10 transition-transform duration-300 group-hover:translate-x-1.5" />
    </motion.a>
  );
}

function AmbientParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: "var(--mob-accent)" }}
          animate={{ y: [0, -40, 0], x: [0, Math.random() > 0.5 ? 20 : -20, 0], opacity: [0, 0.3, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function MobileCTA() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-32 lg:py-44 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="h-px" style={{ background: "linear-gradient(to right, transparent, var(--mob-border), transparent)" }} />
      </div>

      {!shouldReduceMotion && <AmbientParticles />}

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(99,145,255,0.04) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[200, 350, 500].map((size, i) => (
          <motion.div
            key={size}
            className="absolute rounded-full border"
            style={{
              width: size, height: size, top: -size / 2, left: -size / 2,
              borderColor: `rgba(99,145,255,${0.04 - i * 0.01})`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      <motion.div
        className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10 text-center"
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <motion.div className="mx-auto mb-8 w-px h-16" style={{ background: "linear-gradient(180deg, transparent, var(--mob-accent), transparent)" }} variants={fadeUp} />

        <motion.h2 className="text-[clamp(36px,7vw,80px)] font-bold leading-[0.92] tracking-[-0.04em] mb-6" style={{ color: "var(--mob-text)" }} variants={fadeUp}>
          Let&apos;s build it.
        </motion.h2>

        <motion.p className="text-lg md:text-xl leading-relaxed max-w-[440px] mx-auto mb-12" style={{ color: "var(--mob-text-secondary)" }} variants={fadeUp}>
          Tell us your mobile vision. We&apos;ll show you exactly how to make it real.
        </motion.p>

        <motion.div variants={fadeUp}>
          <MagneticCTA />
        </motion.div>

        <motion.p className="mt-10 font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--mob-text-tertiary)" }} variants={fadeUp}>
          No commitment &middot; No pricing pressure &middot; Just a conversation
        </motion.p>
      </motion.div>
    </section>
  );
}

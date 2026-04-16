"use client";

import { motion, useReducedMotion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState, useCallback } from "react";

const fadeUp = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
};

const offerings = [
  {
    label: "01",
    title: "Custom Websites",
    subtitle: "Corporate & Brand Experiences",
    desc: "Hand-crafted digital presences for brands that demand perfection. Every interaction considered, every detail intentional.",
    tags: ["Brand Sites", "Corporate", "Portfolios", "Multi-page"],
    visual: "corporate",
  },
  {
    label: "02",
    title: "Web Applications",
    subtitle: "Platforms & Dashboards",
    desc: "Full-stack applications with real-time data, intelligent interfaces, and architecture that scales with your ambition.",
    tags: ["SaaS", "Dashboards", "Portals", "Internal Tools"],
    visual: "app",
  },
  {
    label: "03",
    title: "E-Commerce",
    subtitle: "Storefronts & Marketplaces",
    desc: "Shopping experiences engineered to convert. AI-powered recommendations, seamless checkout, and revenue optimization built in.",
    tags: ["Shopify", "Custom Stores", "Marketplaces"],
    visual: "ecommerce",
  },
  {
    label: "04",
    title: "Landing Pages",
    subtitle: "Campaigns & Launch Pages",
    desc: "Single-page conversion machines. Designed for impact, optimized for action, delivered in days.",
    tags: ["Launches", "Campaigns", "Lead Gen"],
    visual: "landing",
  },
];

/* ─── 3D Tilt Card Wrapper ─── */
function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 150, damping: 20 });

  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rotateX.set((y - 0.5) * -8);
    rotateY.set((x - 0.5) * 8);
    glowX.set(x * 100);
    glowY.set(y * 100);
  }, [rotateX, rotateY, glowX, glowY]);

  const handleLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  }, [rotateX, rotateY]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        perspective: 1000,
        transformStyle: "preserve-3d",
        rotateX: springX,
        rotateY: springY,
      }}
      onMouseMove={(e) => { handleMouse(e); setIsHovered(true); }}
      onMouseLeave={handleLeave}
    >
      {/* Mouse-follow glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${glowX.get()}% ${glowY.get()}%, rgba(200,184,154,0.06), transparent 60%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

/* ─── Animated Visual: Corporate Website ─── */
function CorporateVisual() {
  return (
    <div className="w-full h-full flex flex-col p-6 gap-4 relative overflow-hidden">
      {/* Animated scan line */}
      <div className="absolute inset-0 pointer-events-none" style={{ animation: "wd-scan 4s linear infinite" }}>
        <div className="w-full h-px" style={{ background: "linear-gradient(to right, transparent, rgba(200,184,154,0.15), transparent)" }} />
      </div>

      <div className="flex items-center justify-between">
        <motion.div
          className="w-16 h-1.5 rounded-full"
          style={{ background: "var(--wd-accent)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex gap-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-8 h-1 rounded bg-white/10"
              whileHover={{ scaleX: 1.3, backgroundColor: "rgba(200,184,154,0.3)" }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        <motion.div
          className="w-[80%] h-3 rounded bg-white/15"
          animate={{ width: ["60%", "80%", "70%", "80%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-3 rounded bg-white/15"
          animate={{ width: ["40%", "55%", "50%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <div className="w-[40%] h-1.5 rounded bg-white/6 mt-2" />
        <motion.div
          className="w-20 h-5 rounded mt-3"
          style={{ background: "linear-gradient(135deg, var(--wd-accent), #e8d5b5)" }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-8 rounded bg-white/[0.03] border border-white/[0.04]"
            animate={{ borderColor: ["rgba(255,255,255,0.04)", "rgba(200,184,154,0.15)", "rgba(255,255,255,0.04)"] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Animated Visual: App Dashboard ─── */
function AppVisual() {
  const barHeights = [30, 50, 35, 65, 45, 80, 55, 70, 60, 85, 50, 75];

  return (
    <div className="w-full h-full grid grid-cols-[0.25fr_1fr] gap-0">
      <div className="border-r border-white/[0.04] p-4 flex flex-col gap-2">
        <motion.div
          className="w-6 h-6 rounded"
          style={{ background: "var(--wd-accent)" }}
          animate={{ opacity: [0.3, 0.6, 0.3], rotate: [0, 90, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="mt-3 space-y-2">
          {[100, 80, 70, 90].map((w, i) => (
            <motion.div
              key={i}
              className="h-1 rounded"
              style={{ width: `${w}%` }}
              animate={{
                backgroundColor: [
                  "rgba(255,255,255,0.06)",
                  i === 1 ? "rgba(200,184,154,0.3)" : "rgba(255,255,255,0.1)",
                  "rgba(255,255,255,0.06)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <motion.div
            className="w-20 h-2 rounded bg-white/12"
            animate={{ width: ["5rem", "6rem", "5rem"] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="w-12 h-4 rounded"
            style={{ background: "var(--wd-accent)" }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <div className="flex-1 flex items-end gap-[3px] p-2 rounded bg-white/[0.02]">
          {barHeights.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                background: "linear-gradient(180deg, var(--wd-accent), rgba(200,184,154,0.2))",
              }}
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: `${h}%`, opacity: 0.5 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.33, 1, 0.68, 1] }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-6 rounded bg-white/[0.02] border border-white/[0.03] flex items-center justify-center"
              animate={{ borderColor: ["rgba(255,255,255,0.03)", "rgba(200,184,154,0.12)", "rgba(255,255,255,0.03)"] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.6 }}
            >
              <motion.div
                className="w-[60%] h-1 rounded bg-white/[0.06]"
                animate={{ width: ["50%", "70%", "50%"] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Animated Visual: E-Commerce ─── */
function EcommerceVisual() {
  return (
    <div className="w-full h-full flex flex-col p-5 gap-3 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <motion.div
          className="w-14 h-1.5 rounded-full"
          style={{ background: "var(--wd-accent)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="flex gap-3 items-center">
          <div className="w-6 h-1 rounded bg-white/8" />
          <div className="w-6 h-1 rounded bg-white/8" />
          <motion.div
            className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center"
            animate={{ borderColor: ["rgba(255,255,255,0.1)", "rgba(200,184,154,0.4)", "rgba(255,255,255,0.1)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--wd-accent)" }}
              animate={{ scale: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-2.5 mt-2">
        {[1, 2, 3, 4, 5, 6].map((n, i) => (
          <motion.div
            key={n}
            className="flex flex-col gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <motion.div
              className="aspect-square rounded bg-white/[0.04] border border-white/[0.03] overflow-hidden relative"
              whileHover={{ borderColor: "rgba(200,184,154,0.2)", scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              {/* Shimmer loading effect */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(200,184,154,0.05) 50%, transparent 100%)",
                  animation: `wd-shimmer-sweep 3s ease-in-out infinite ${i * 0.4}s`,
                }}
              />
            </motion.div>
            <div className="w-[70%] h-1 rounded bg-white/8" />
            <motion.div
              className="h-1 rounded"
              style={{ background: "var(--wd-accent)", opacity: 0.4 }}
              animate={{ width: ["30%", "45%", "35%", "40%"] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Animated Visual: Landing Page ─── */
function LandingVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4 text-center relative overflow-hidden">
      {/* Radial pulse behind CTA */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,184,154,0.08), transparent 70%)" }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="w-[60%] h-3.5 rounded bg-white/15"
        animate={{ width: ["55%", "65%", "55%"] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className="w-[45%] h-2 rounded bg-white/8"
        animate={{ width: ["40%", "50%", "40%"] }}
        transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
      />
      <div className="w-[30%] h-1.5 rounded bg-white/5 mt-1" />

      <div className="flex gap-3 mt-3">
        <motion.div
          className="w-16 h-5 rounded"
          style={{ background: "linear-gradient(135deg, var(--wd-accent), #e8d5b5)" }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="w-16 h-5 rounded border border-white/10"
          animate={{ borderColor: ["rgba(255,255,255,0.1)", "rgba(200,184,154,0.3)", "rgba(255,255,255,0.1)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <div className="w-[80%] grid grid-cols-3 gap-3 mt-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-12 rounded bg-white/[0.02] border border-white/[0.03] flex items-center justify-center"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
          >
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ background: "var(--wd-accent)", opacity: 0.2 }}
              animate={{ opacity: [0.15, 0.4, 0.15] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const visualMap: Record<string, () => React.ReactElement> = {
  corporate: CorporateVisual,
  app: AppVisual,
  ecommerce: EcommerceVisual,
  landing: LandingVisual,
};

export default function WebDesignShowcase() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Section header */}
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
            What We Build
          </span>
          <h2
            className="text-[clamp(32px,5vw,64px)] font-bold leading-[1] tracking-[-0.03em] max-w-[700px]"
            style={{ color: "var(--wd-text)" }}
          >
            Four disciplines.
            <br />
            <span className="gradient-text">One standard.</span>
          </h2>
        </motion.div>

        {/* Showcase cards */}
        <motion.div
          className="flex flex-col gap-6 lg:gap-8"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          {offerings.map((item, i) => {
            const Visual = visualMap[item.visual];
            const isReversed = i % 2 !== 0;

            return (
              <motion.div key={item.label} variants={fadeUp}>
                <TiltCard
                  className="group rounded-2xl border overflow-hidden transition-all duration-700 hover:border-[var(--wd-border-accent)] relative"
                  style={{
                    borderColor: "var(--wd-border)",
                    background: "var(--wd-bg-elevated)",
                  }}
                >
                  {/* Top accent line */}
                  <div
                    className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: "linear-gradient(to right, transparent, var(--wd-accent), transparent)",
                    }}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Content side */}
                    <div
                      className={`p-8 lg:p-12 xl:p-16 flex flex-col justify-center ${
                        isReversed ? "lg:order-2" : ""
                      }`}
                    >
                      <motion.span
                        className="font-mono text-[10px] tracking-[0.25em] uppercase mb-4"
                        style={{ color: "var(--wd-accent)" }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      >
                        {item.label}
                      </motion.span>

                      <h3
                        className="text-2xl lg:text-3xl xl:text-4xl font-bold tracking-[-0.02em] leading-[1.1] mb-2"
                        style={{ color: "var(--wd-text)" }}
                      >
                        {item.title}
                      </h3>

                      <span
                        className="text-sm font-medium mb-5"
                        style={{ color: "var(--wd-text-secondary)" }}
                      >
                        {item.subtitle}
                      </span>

                      <p
                        className="text-[15px] leading-relaxed mb-8 max-w-[420px]"
                        style={{ color: "var(--wd-text-secondary)" }}
                      >
                        {item.desc}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag, ti) => (
                          <motion.span
                            key={tag}
                            className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.1em] transition-all duration-300 group-hover:border-[var(--wd-border-accent)]"
                            style={{
                              background: "var(--wd-accent-dim)",
                              color: "var(--wd-text-secondary)",
                              border: "1px solid var(--wd-border)",
                            }}
                            whileHover={{
                              scale: 1.05,
                              borderColor: "rgba(200,184,154,0.3)",
                              backgroundColor: "rgba(200,184,154,0.2)",
                            }}
                          >
                            {tag}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    {/* Visual side */}
                    <div
                      className={`relative aspect-[4/3] lg:aspect-auto min-h-[280px] ${
                        isReversed ? "lg:order-1" : ""
                      }`}
                      style={{ background: "var(--wd-bg)" }}
                    >
                      <div
                        className="absolute inset-4 lg:inset-8 rounded-xl border overflow-hidden transition-all duration-700 group-hover:scale-[1.02] group-hover:border-[var(--wd-border-accent)]"
                        style={{
                          borderColor: "var(--wd-border)",
                          background: "var(--wd-bg-elevated)",
                        }}
                      >
                        <Visual />
                      </div>

                      {/* Corner accent dots */}
                      <motion.div
                        className="absolute top-3 right-3 w-1 h-1 rounded-full"
                        style={{ background: "var(--wd-accent)" }}
                        animate={{ opacity: [0, 0.6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                      />
                      <motion.div
                        className="absolute bottom-3 left-3 w-1 h-1 rounded-full"
                        style={{ background: "var(--wd-accent)" }}
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 + 1 }}
                      />
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

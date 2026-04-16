"use client";

import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
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
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const offerings = [
  {
    label: "01",
    title: "iOS & Android Apps",
    subtitle: "Native Experiences",
    desc: "Purpose-built applications for each platform. Leveraging native APIs, gestures, and performance capabilities for the best possible user experience.",
    tags: ["Swift", "Kotlin", "Native APIs", "App Store"],
    visual: "native",
  },
  {
    label: "02",
    title: "Cross-Platform",
    subtitle: "React Native & Flutter",
    desc: "One codebase, two platforms, zero compromises. We build cross-platform apps that feel indistinguishable from native on every device.",
    tags: ["React Native", "Flutter", "Shared Logic", "Hot Reload"],
    visual: "crossplatform",
  },
  {
    label: "03",
    title: "App Redesigns",
    subtitle: "Modernization & Migration",
    desc: "Transform legacy applications into modern, performant mobile experiences. We migrate, redesign, and re-engineer from the ground up.",
    tags: ["UI/UX Overhaul", "Performance", "Migration", "Refresh"],
    visual: "redesign",
  },
  {
    label: "04",
    title: "Backend & APIs",
    subtitle: "Mobile Infrastructure",
    desc: "Scalable backends purpose-built for mobile. Real-time sync, push notifications, offline-first architecture, and API optimization.",
    tags: ["Firebase", "REST/GraphQL", "Real-time", "Push"],
    visual: "backend",
  },
];

/* ─── 3D Tilt Card ─── */
function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 150, damping: 20 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rotateX.set((y - 0.5) * -6);
    rotateY.set((x - 0.5) * 6);
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
      onMouseLeave={() => { rotateX.set(0); rotateY.set(0); setIsHovered(false); }}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{ opacity: isHovered ? 1 : 0, background: "radial-gradient(600px circle at 50% 50%, rgba(99,145,255,0.05), transparent 60%)" }}
      />
      {children}
    </motion.div>
  );
}

/* ─── Animated Visuals ─── */
function NativeVisual() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 gap-6">
      {/* iOS phone */}
      <motion.div
        className="w-[90px] h-[180px] rounded-[20px] border overflow-hidden relative"
        style={{ borderColor: "rgba(99,145,255,0.15)", background: "#0a0c14" }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-3 rounded-b-lg" style={{ background: "#06060a" }} />
        <div className="mt-6 px-2 space-y-2">
          <motion.div className="h-1.5 rounded bg-white/10 w-[80%]" animate={{ width: ["60%", "80%", "60%"] }} transition={{ duration: 3, repeat: Infinity }} />
          <div className="h-1 rounded bg-white/6 w-[60%]" />
          <motion.div className="h-10 rounded-lg mt-2" style={{ background: "linear-gradient(135deg, rgba(99,145,255,0.2), rgba(99,145,255,0.05))" }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <div className="flex gap-1 mt-1">
            <div className="flex-1 h-6 rounded bg-white/[0.03]" />
            <div className="flex-1 h-6 rounded bg-white/[0.03]" />
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded bg-white/10" />
      </motion.div>

      {/* Android phone */}
      <motion.div
        className="w-[90px] h-[180px] rounded-[16px] border overflow-hidden relative"
        style={{ borderColor: "rgba(99,145,255,0.1)", background: "#0a0c14" }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="mt-3 px-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <motion.div className="w-4 h-4 rounded-full" style={{ background: "rgba(99,145,255,0.25)" }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <div className="w-10 h-1.5 rounded bg-white/10" />
          </div>
          <motion.div className="h-12 rounded-lg" style={{ background: "rgba(99,145,255,0.08)", border: "1px solid rgba(99,145,255,0.08)" }} animate={{ borderColor: ["rgba(99,145,255,0.08)", "rgba(99,145,255,0.2)", "rgba(99,145,255,0.08)"] }} transition={{ duration: 3, repeat: Infinity }} />
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-4 rounded bg-white/[0.03] flex items-center px-2" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}>
              <div className="w-2 h-2 rounded-sm bg-white/8" />
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="w-3 h-3 rounded-sm border border-white/8" />
          <div className="w-3 h-3 rounded-full border border-white/8" />
          <div className="w-3 h-0.5 rounded bg-white/8 self-end" />
        </div>
      </motion.div>
    </div>
  );
}

function CrossPlatformVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4 relative">
      {/* Central shared codebase icon */}
      <motion.div
        className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
        style={{ background: "rgba(99,145,255,0.1)", border: "1px solid rgba(99,145,255,0.15)" }}
        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        <span className="font-mono text-[10px] font-bold" style={{ color: "rgba(99,145,255,0.6)" }}>{"{ }"}</span>
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border"
          style={{ borderColor: "rgba(99,145,255,0.2)" }}
          animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Connection lines to platforms */}
      <div className="flex items-center gap-8">
        {["iOS", "Web", "Android"].map((platform, i) => (
          <motion.div
            key={platform}
            className="flex flex-col items-center gap-2"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          >
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,145,255,0.06)", border: "1px solid rgba(99,145,255,0.1)" }}
              animate={{ borderColor: ["rgba(99,145,255,0.1)", "rgba(99,145,255,0.3)", "rgba(99,145,255,0.1)"] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
            >
              <span className="font-mono text-[8px]" style={{ color: "rgba(99,145,255,0.5)" }}>{platform}</span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Performance metrics */}
      <div className="flex gap-4 mt-2">
        {[{ label: "Shared", val: "95%" }, { label: "Native", val: "60fps" }].map((m, i) => (
          <motion.div key={m.label} className="text-center" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}>
            <div className="font-mono text-[11px] font-bold" style={{ color: "var(--mob-accent)" }}>{m.val}</div>
            <div className="font-mono text-[8px]" style={{ color: "var(--mob-text-tertiary)" }}>{m.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RedesignVisual() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 gap-8">
      {/* Before */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--mob-text-tertiary)" }}>Before</span>
        <motion.div
          className="w-[70px] h-[130px] rounded-[12px] border p-2 space-y-1.5"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <div className="h-1.5 rounded bg-white/8 w-full" />
          <div className="h-1 rounded bg-white/5 w-[80%]" />
          <div className="h-8 rounded bg-white/[0.03] mt-1" />
          <div className="h-1 rounded bg-white/4 w-[60%]" />
          <div className="h-1 rounded bg-white/4 w-[70%]" />
        </motion.div>
      </div>

      {/* Arrow */}
      <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <path d="M0 6H22M22 6L17 1M22 6L17 11" stroke="rgba(99,145,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* After */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--mob-accent)" }}>After</span>
        <motion.div
          className="w-[70px] h-[130px] rounded-[16px] border p-2 space-y-1.5 relative overflow-hidden"
          style={{ borderColor: "rgba(99,145,255,0.2)", background: "rgba(99,145,255,0.04)" }}
          animate={{ borderColor: ["rgba(99,145,255,0.15)", "rgba(99,145,255,0.3)", "rgba(99,145,255,0.15)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <motion.div className="h-1.5 rounded bg-white/15 w-[90%]" animate={{ width: ["70%", "90%", "70%"] }} transition={{ duration: 4, repeat: Infinity }} />
          <div className="h-1 rounded bg-white/10 w-[70%]" />
          <motion.div className="h-10 rounded-lg mt-1" style={{ background: "linear-gradient(135deg, rgba(99,145,255,0.15), rgba(99,145,255,0.05))" }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }} />
          <div className="flex gap-1">
            <div className="flex-1 h-4 rounded bg-white/[0.06]" />
            <div className="flex-1 h-4 rounded bg-white/[0.06]" />
          </div>
          {/* Shimmer */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent 40%, rgba(99,145,255,0.05) 50%, transparent 60%)", animation: "wd-shimmer-sweep 4s ease-in-out infinite" }} />
        </motion.div>
      </div>
    </div>
  );
}

function BackendVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-5 gap-3">
      {/* Server nodes */}
      <div className="flex gap-4 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(99,145,255,0.08)", border: "1px solid rgba(99,145,255,0.1)" }}
            animate={{
              scale: [1, 1.1, 1],
              borderColor: ["rgba(99,145,255,0.1)", "rgba(99,145,255,0.3)", "rgba(99,145,255,0.1)"],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: `rgba(99,145,255,${0.3 + i * 0.1})` }} />
          </motion.div>
        ))}
      </div>

      {/* Connection animation */}
      <motion.div className="w-full h-px" style={{ background: "linear-gradient(to right, transparent, rgba(99,145,255,0.2), transparent)" }} animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />

      {/* Data flow packets */}
      <div className="relative w-full h-8 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--mob-accent)", top: "50%", left: 0 }}
            animate={{ left: ["0%", "100%"], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* API response mockup */}
      <motion.div
        className="w-full rounded-lg p-3 font-mono text-[8px] leading-relaxed"
        style={{ background: "rgba(99,145,255,0.04)", border: "1px solid rgba(99,145,255,0.08)", color: "rgba(99,145,255,0.4)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <div>{"{ status: 200 }"}</div>
        <div style={{ color: "rgba(99,145,255,0.25)" }}>{"  data: [...]"}</div>
        <div style={{ color: "rgba(99,145,255,0.2)" }}>{"  latency: 12ms"}</div>
      </motion.div>
    </div>
  );
}

const visualMap: Record<string, () => React.ReactElement> = {
  native: NativeVisual,
  crossplatform: CrossPlatformVisual,
  redesign: RedesignVisual,
  backend: BackendVisual,
};

export default function MobileShowcase() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 lg:py-36">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <motion.div
          className="mb-16 lg:mb-24"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
        >
          <span
            className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase mb-6"
            style={{ color: "var(--mob-accent)" }}
          >
            <span className="w-8 h-px" style={{ background: "var(--mob-accent)" }} />
            What We Build
          </span>
          <h2
            className="text-[clamp(32px,5vw,64px)] font-bold leading-[1] tracking-[-0.03em] max-w-[700px]"
            style={{ color: "var(--mob-text)" }}
          >
            Four capabilities.
            <br />
            <span className="gradient-text">Full spectrum.</span>
          </h2>
        </motion.div>

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
                  className="group rounded-2xl border overflow-hidden transition-all duration-700 hover:border-[rgba(99,145,255,0.2)] relative"
                  style={{
                    borderColor: "var(--mob-border)",
                    background: "var(--mob-bg-elevated)",
                  }}
                >
                  <div className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "linear-gradient(to right, transparent, var(--mob-accent), transparent)" }} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <div className={`p-8 lg:p-12 xl:p-16 flex flex-col justify-center ${isReversed ? "lg:order-2" : ""}`}>
                      <motion.span
                        className="font-mono text-[10px] tracking-[0.25em] uppercase mb-4"
                        style={{ color: "var(--mob-accent)" }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      >
                        {item.label}
                      </motion.span>

                      <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold tracking-[-0.02em] leading-[1.1] mb-2" style={{ color: "var(--mob-text)" }}>
                        {item.title}
                      </h3>
                      <span className="text-sm font-medium mb-5" style={{ color: "var(--mob-text-secondary)" }}>{item.subtitle}</span>
                      <p className="text-[15px] leading-relaxed mb-8 max-w-[420px]" style={{ color: "var(--mob-text-secondary)" }}>{item.desc}</p>

                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <motion.span
                            key={tag}
                            className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.1em] transition-all duration-300"
                            style={{
                              background: "rgba(99,145,255,0.06)",
                              color: "var(--mob-text-secondary)",
                              border: "1px solid var(--mob-border)",
                            }}
                            whileHover={{ scale: 1.05, borderColor: "rgba(99,145,255,0.3)", backgroundColor: "rgba(99,145,255,0.12)" }}
                          >
                            {tag}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    <div className={`relative aspect-[4/3] lg:aspect-auto min-h-[280px] ${isReversed ? "lg:order-1" : ""}`} style={{ background: "var(--mob-bg)" }}>
                      <div
                        className="absolute inset-4 lg:inset-8 rounded-xl border overflow-hidden transition-all duration-700 group-hover:scale-[1.02] group-hover:border-[rgba(99,145,255,0.15)]"
                        style={{ borderColor: "var(--mob-border)", background: "var(--mob-bg-elevated)" }}
                      >
                        <Visual />
                      </div>
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

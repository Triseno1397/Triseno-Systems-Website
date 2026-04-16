"use client";

import { motion, useReducedMotion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
  hidden: { y: 15, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      delay: 0.7 + i * 0.15,
    },
  }),
};

/* ─── Floating Orbs ─── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary warm orb */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.035]"
        style={{
          top: "15%",
          right: "10%",
          background: "radial-gradient(circle, #c8b89a 0%, transparent 70%)",
          animation: "gradient-drift 20s ease-in-out infinite",
        }}
      />
      {/* Secondary orb */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full opacity-[0.025]"
        style={{
          bottom: "20%",
          left: "5%",
          background: "radial-gradient(circle, #e8d5b5 0%, transparent 70%)",
          animation: "gradient-drift-reverse 25s ease-in-out infinite",
        }}
      />
      {/* Accent micro-orb */}
      <div
        className="absolute w-[200px] h-[200px] rounded-full opacity-[0.04]"
        style={{
          top: "60%",
          right: "30%",
          background: "radial-gradient(circle, #c8b89a 0%, transparent 70%)",
          animation: "gradient-drift 15s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

/* ─── Animated Grid Lines (design-feel background) ─── */
function DesignGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Horizontal lines */}
      {[20, 40, 60, 80].map((top) => (
        <div
          key={`h-${top}`}
          className="absolute left-0 right-0 h-px"
          style={{
            top: `${top}%`,
            background: "linear-gradient(to right, transparent, rgba(200,184,154,0.04), transparent)",
            animation: `wd-grid-pulse ${6 + top * 0.05}s ease-in-out infinite`,
          }}
        />
      ))}
      {/* Vertical lines */}
      {[25, 50, 75].map((left) => (
        <div
          key={`v-${left}`}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${left}%`,
            background: "linear-gradient(to bottom, transparent, rgba(200,184,154,0.03), transparent)",
            animation: `wd-grid-pulse ${7 + left * 0.03}s ease-in-out infinite reverse`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Floating Design Elements (browser windows, code brackets, etc.) ─── */
function FloatingElements({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const elements = [
    { x: 75, y: 20, size: 120, delay: 0, content: "browser" },
    { x: 85, y: 55, size: 80, delay: 0.5, content: "code" },
    { x: 70, y: 75, size: 100, delay: 1, content: "palette" },
    { x: 90, y: 35, size: 60, delay: 1.5, content: "cursor" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {elements.map((el, i) => {
        const parallaxX = (mouseX - 0.5) * (15 + i * 5);
        const parallaxY = (mouseY - 0.5) * (15 + i * 5);

        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: el.size,
              height: el.size,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: parallaxX,
              y: parallaxY,
            }}
            transition={{
              opacity: { duration: 1, delay: 1.2 + el.delay },
              scale: { duration: 1, delay: 1.2 + el.delay },
              x: { type: "spring", stiffness: 50, damping: 30 },
              y: { type: "spring", stiffness: 50, damping: 30 },
            }}
          >
            {el.content === "browser" && <BrowserElement size={el.size} />}
            {el.content === "code" && <CodeElement size={el.size} />}
            {el.content === "palette" && <PaletteElement size={el.size} />}
            {el.content === "cursor" && <CursorElement size={el.size} />}
          </motion.div>
        );
      })}
    </div>
  );
}

function BrowserElement({ size }: { size: number }) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        width: size,
        height: size * 0.75,
        borderColor: "rgba(200,184,154,0.15)",
        background: "rgba(14,14,18,0.8)",
        backdropFilter: "blur(8px)",
        animation: "float-y 6s ease-in-out infinite",
      }}
    >
      {/* Browser bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "rgba(200,184,154,0.1)" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-red-400/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-400/40" />
        <div className="ml-2 flex-1 h-2 rounded bg-white/[0.06]" />
      </div>
      {/* Content lines with typing animation */}
      <div className="p-3 space-y-1.5">
        <div className="h-1 rounded bg-white/[0.08] w-[80%]" style={{ animation: "wd-line-grow 3s ease-in-out infinite" }} />
        <div className="h-1 rounded bg-white/[0.05] w-[60%]" style={{ animation: "wd-line-grow 3s ease-in-out infinite 0.2s" }} />
        <div className="h-1 rounded bg-white/[0.03] w-[70%]" style={{ animation: "wd-line-grow 3s ease-in-out infinite 0.4s" }} />
        <div className="mt-2 w-8 h-3 rounded" style={{ background: "rgba(200,184,154,0.2)" }} />
      </div>
    </div>
  );
}

function CodeElement({ size }: { size: number }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        width: size,
        height: size,
        borderColor: "rgba(200,184,154,0.1)",
        background: "rgba(14,14,18,0.7)",
        backdropFilter: "blur(8px)",
        animation: "float-y 7s ease-in-out infinite 1s",
      }}
    >
      <div className="font-mono text-[8px] leading-relaxed" style={{ color: "rgba(200,184,154,0.4)" }}>
        <div><span style={{ color: "rgba(200,184,154,0.6)" }}>{"<"}</span>div<span style={{ color: "rgba(200,184,154,0.6)" }}>{">"}</span></div>
        <div className="pl-2" style={{ animation: "wd-code-blink 2s step-end infinite" }}>{"  _"}</div>
        <div><span style={{ color: "rgba(200,184,154,0.6)" }}>{"</"}</span>div<span style={{ color: "rgba(200,184,154,0.6)" }}>{">"}</span></div>
      </div>
    </div>
  );
}

function PaletteElement({ size }: { size: number }) {
  return (
    <div
      className="rounded-lg border p-3 flex flex-wrap gap-1.5"
      style={{
        width: size,
        height: size * 0.5,
        borderColor: "rgba(200,184,154,0.1)",
        background: "rgba(14,14,18,0.7)",
        backdropFilter: "blur(8px)",
        animation: "float-y 8s ease-in-out infinite 0.5s",
      }}
    >
      {["#c8b89a", "#e8d5b5", "#9a958c", "#f0ece4", "#5a564e"].map((color, i) => (
        <div
          key={color}
          className="w-4 h-4 rounded-full transition-transform duration-300"
          style={{
            background: color,
            opacity: 0.6,
            animation: `wd-swatch-pop 4s ease-in-out infinite ${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

function CursorElement({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size * 0.4,
        height: size * 0.6,
        animation: "float-y 5s ease-in-out infinite 2s",
      }}
    >
      <svg viewBox="0 0 24 36" fill="none" className="w-full h-full">
        <path
          d="M2 2L2 28L8 22L14 34L18 32L12 20L20 20L2 2Z"
          fill="rgba(200,184,154,0.15)"
          stroke="rgba(200,184,154,0.3)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/* ─── Animated Metrics Strip ─── */
function MetricsStrip() {
  const metrics = [
    { label: "Performance", value: "98" },
    { label: "Accessibility", value: "100" },
    { label: "Best Practices", value: "95" },
  ];

  return (
    <motion.div
      className="mt-14 lg:mt-20 flex items-center gap-8 lg:gap-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {metrics.map((m, i) => (
        <div key={m.label} className="flex items-center gap-3">
          <span
            className="text-2xl lg:text-3xl font-bold tracking-tight"
            style={{ color: "var(--wd-accent)" }}
          >
            {m.value}
          </span>
          <span
            className="text-[10px] font-mono tracking-[0.1em] uppercase"
            style={{ color: "var(--wd-text-tertiary)" }}
          >
            {m.label}
          </span>
          {i < metrics.length - 1 && (
            <div
              className="w-px h-6 ml-5 lg:ml-8"
              style={{ background: "var(--wd-border)" }}
            />
          )}
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Main Hero Component ─── */
export default function WebDesignHero() {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (shouldReduceMotion) return;
    const handler = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [shouldReduceMotion]);

  return (
    <section ref={sectionRef} className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden">
      {/* Background layers */}
      {!shouldReduceMotion && <DesignGrid />}
      {!shouldReduceMotion && <FloatingOrbs />}
      {!shouldReduceMotion && <FloatingElements mouseX={mousePos.x} mouseY={mousePos.y} />}

      {/* Warm radial glow (enhanced) */}
      <div
        className="absolute top-[30%] left-[40%] w-[1000px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(200, 184, 154, 0.05) 0%, transparent 70%)",
          transform: `translate(${(mousePos.x - 0.5) * -30}px, ${(mousePos.y - 0.5) * -30}px)`,
          transition: "transform 0.5s ease-out",
        }}
      />

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
            className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--wd-accent)" }}
          >
            <span
              className="w-8 h-px"
              style={{ background: "var(--wd-accent)" }}
            />
            <span className="relative">
              Web Design Division
              {/* Animated underline sweep */}
              <motion.span
                className="absolute bottom-[-3px] left-0 h-px"
                style={{ background: "var(--wd-accent)" }}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, delay: 1, ease: [0.33, 1, 0.68, 1] }}
              />
            </span>
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="mb-12 lg:mb-16">
          {["We design", "experiences that"].map((text, i) => (
            <span key={text} className="block overflow-hidden">
              <motion.span
                className="block text-[clamp(44px,8vw,110px)] font-bold leading-[0.92] tracking-[-0.04em]"
                style={{ color: "var(--wd-text)" }}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
                variants={lineVariants}
                custom={i}
              >
                {text}
              </motion.span>
            </span>
          ))}
          <span className="block overflow-hidden">
            <motion.span
              className="block text-[clamp(44px,8vw,110px)] font-bold leading-[0.92] tracking-[-0.04em] gradient-text"
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={lineVariants}
              custom={2}
            >
              command attention.
            </motion.span>
          </span>
        </h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl leading-relaxed max-w-[480px]"
          style={{ color: "var(--wd-text-secondary)" }}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          variants={fadeVariants}
          custom={1}
        >
          Precision-engineered websites for brands that refuse to blend in.
        </motion.p>

        {/* Metrics strip */}
        {!shouldReduceMotion && <MetricsStrip />}
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={fadeVariants}
        custom={2}
      >
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--wd-text-tertiary)" }}>
          Scroll
        </span>
        <div
          className="w-px h-10 origin-top"
          style={{
            background: "linear-gradient(180deg, var(--wd-accent), transparent)",
            animation: "scroll-pulse 2.5s ease-in-out infinite",
          }}
        />
      </motion.div>
    </section>
  );
}

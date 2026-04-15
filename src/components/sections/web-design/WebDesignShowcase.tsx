"use client";

import { motion, useReducedMotion } from "framer-motion";

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

function CorporateVisual() {
  return (
    <div className="w-full h-full flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div
          className="w-16 h-1.5 rounded-full"
          style={{ background: "var(--wd-accent)" }}
        />
        <div className="flex gap-4">
          <div className="w-8 h-1 rounded bg-white/10" />
          <div className="w-8 h-1 rounded bg-white/10" />
          <div className="w-8 h-1 rounded bg-white/10" />
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="w-[70%] h-3 rounded bg-white/15" />
        <div className="w-[50%] h-3 rounded bg-white/15" />
        <div className="w-[40%] h-1.5 rounded bg-white/6 mt-2" />
        <div
          className="w-20 h-5 rounded mt-3"
          style={{
            background: "linear-gradient(135deg, var(--wd-accent), #e8d5b5)",
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-8 rounded bg-white/[0.03] border border-white/[0.04]" />
        <div className="h-8 rounded bg-white/[0.03] border border-white/[0.04]" />
        <div className="h-8 rounded bg-white/[0.03] border border-white/[0.04]" />
      </div>
    </div>
  );
}

function AppVisual() {
  return (
    <div className="w-full h-full grid grid-cols-[0.25fr_1fr] gap-0">
      <div className="border-r border-white/[0.04] p-4 flex flex-col gap-2">
        <div
          className="w-6 h-6 rounded"
          style={{ background: "var(--wd-accent)", opacity: 0.3 }}
        />
        <div className="mt-3 space-y-2">
          <div className="w-full h-1 rounded bg-white/10" />
          <div className="w-[80%] h-1 rounded bg-white/6" />
          <div className="w-[70%] h-1 rounded bg-white/6" />
          <div className="w-[90%] h-1 rounded bg-white/6" />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="w-20 h-2 rounded bg-white/12" />
          <div
            className="w-12 h-4 rounded"
            style={{ background: "var(--wd-accent)", color: "var(--wd-bg)" }}
          />
        </div>
        <div className="flex-1 flex items-end gap-[3px] p-2 rounded bg-white/[0.02]">
          {[30, 50, 35, 65, 45, 80, 55, 70, 60, 85, 50, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                background:
                  "linear-gradient(180deg, var(--wd-accent), rgba(200,184,154,0.2))",
                opacity: 0.4,
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-6 rounded bg-white/[0.02] border border-white/[0.03]" />
          <div className="h-6 rounded bg-white/[0.02] border border-white/[0.03]" />
          <div className="h-6 rounded bg-white/[0.02] border border-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}

function EcommerceVisual() {
  return (
    <div className="w-full h-full flex flex-col p-5 gap-3">
      <div className="flex items-center justify-between">
        <div
          className="w-14 h-1.5 rounded-full"
          style={{ background: "var(--wd-accent)" }}
        />
        <div className="flex gap-3">
          <div className="w-6 h-1 rounded bg-white/8" />
          <div className="w-6 h-1 rounded bg-white/8" />
          <div className="w-4 h-4 rounded-full border border-white/10" />
        </div>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2.5 mt-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="flex flex-col gap-1.5">
            <div className="aspect-square rounded bg-white/[0.04] border border-white/[0.03]" />
            <div className="w-[70%] h-1 rounded bg-white/8" />
            <div
              className="w-[40%] h-1 rounded"
              style={{ background: "var(--wd-accent)", opacity: 0.4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4 text-center">
      <div className="w-[60%] h-3.5 rounded bg-white/15" />
      <div className="w-[45%] h-2 rounded bg-white/8" />
      <div className="w-[30%] h-1.5 rounded bg-white/5 mt-1" />
      <div className="flex gap-3 mt-3">
        <div
          className="w-16 h-5 rounded"
          style={{
            background: "linear-gradient(135deg, var(--wd-accent), #e8d5b5)",
          }}
        />
        <div className="w-16 h-5 rounded border border-white/10" />
      </div>
      <div className="w-[80%] grid grid-cols-3 gap-3 mt-auto">
        <div className="h-12 rounded bg-white/[0.02] border border-white/[0.03]" />
        <div className="h-12 rounded bg-white/[0.02] border border-white/[0.03]" />
        <div className="h-12 rounded bg-white/[0.02] border border-white/[0.03]" />
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
            <span
              className="w-8 h-px"
              style={{ background: "var(--wd-accent)" }}
            />
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
                <div
                  className="group rounded-2xl border overflow-hidden transition-all duration-700 hover:border-[var(--wd-border-accent)]"
                  style={{
                    borderColor: "var(--wd-border)",
                    background: "var(--wd-bg-elevated)",
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Content side */}
                    <div
                      className={`p-8 lg:p-12 xl:p-16 flex flex-col justify-center ${
                        isReversed ? "lg:order-2" : ""
                      }`}
                    >
                      <span
                        className="font-mono text-[10px] tracking-[0.25em] uppercase mb-4"
                        style={{ color: "var(--wd-accent)" }}
                      >
                        {item.label}
                      </span>

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
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.1em] transition-all duration-300 group-hover:border-[var(--wd-border-accent)]"
                            style={{
                              background: "var(--wd-accent-dim)",
                              color: "var(--wd-text-secondary)",
                              border: "1px solid var(--wd-border)",
                            }}
                          >
                            {tag}
                          </span>
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
                        className="absolute inset-4 lg:inset-8 rounded-xl border overflow-hidden transition-transform duration-700 group-hover:scale-[1.02]"
                        style={{
                          borderColor: "var(--wd-border)",
                          background: "var(--wd-bg-elevated)",
                        }}
                      >
                        <Visual />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

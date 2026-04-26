"use client";

import { motion, useReducedMotion } from "framer-motion";

const fadeUp = {
  hidden: { y: 40, opacity: 0 },
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
    label: "02",
    kicker: "Feature Story",
    title: "Custom Websites",
    subtitle: "Brand & Corporate Editions",
    desc: "Hand-crafted digital presences for brands that demand perfection. Every interaction considered, every detail intentional — like setting type by hand.",
    tags: ["Brand Sites", "Corporate", "Portfolios", "Multi-page"],
    visual: "corporate",
  },
  {
    label: "03",
    kicker: "Feature Story",
    title: "Web Applications",
    subtitle: "Platforms & Dashboards",
    desc: "Full-stack applications with real-time data, intelligent interfaces, and architecture that scales with your ambition — engineered like a precision watch.",
    tags: ["SaaS", "Dashboards", "Portals", "Internal Tools"],
    visual: "app",
  },
  {
    label: "04",
    kicker: "Feature Story",
    title: "E-Commerce",
    subtitle: "Storefronts & Marketplaces",
    desc: "Shopping experiences engineered to convert. AI-powered recommendations, seamless checkout, and revenue optimization — merchandised with an editor's eye.",
    tags: ["Shopify", "Custom Stores", "Marketplaces"],
    visual: "ecommerce",
  },
  {
    label: "05",
    kicker: "Feature Story",
    title: "Landing Pages",
    subtitle: "Campaigns & Launch Pages",
    desc: "Single-page conversion machines. Designed for impact, optimized for action, delivered in days — the front-page spread of your next launch.",
    tags: ["Launches", "Campaigns", "Lead Gen"],
    visual: "landing",
  },
];

/* ─── Blueprint-style visuals ─── */
function CorporateVisual() {
  return (
    <div className="relative w-full h-full p-6 flex flex-col gap-4 overflow-hidden">
      {/* paper header bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--wd-accent)" }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--wd-text-tertiary)", opacity: 0.5 }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--wd-text-tertiary)", opacity: 0.5 }} />
        </div>
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-8 h-[2px]"
              style={{ background: "var(--wd-text)", opacity: 0.4 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        <motion.div
          className="h-3"
          style={{ background: "var(--wd-text)", opacity: 0.85 }}
          animate={{ width: ["55%", "75%", "65%", "80%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-3"
          style={{ background: "var(--wd-text)", opacity: 0.5 }}
          animate={{ width: ["35%", "55%", "45%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <div className="h-1.5 w-[40%] mt-2" style={{ background: "var(--wd-text)", opacity: 0.25 }} />
        <motion.div
          className="w-24 h-7 mt-3 flex items-center justify-center"
          style={{ background: "var(--wd-accent)" }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: "var(--wd-paper)" }}>
            Read More
          </span>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-10 border"
            style={{ borderColor: "var(--wd-border)" }}
            animate={{ borderColor: [
              "rgba(26,20,16,0.12)",
              "rgba(196,74,40,0.4)",
              "rgba(26,20,16,0.12)",
            ] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}

function AppVisual() {
  const barHeights = [30, 50, 35, 65, 45, 80, 55, 70, 60, 85, 50, 75];
  return (
    <div className="w-full h-full grid grid-cols-[0.25fr_1fr] gap-0">
      <div
        className="border-r p-4 flex flex-col gap-2"
        style={{ borderColor: "var(--wd-border)" }}
      >
        <motion.div
          className="w-6 h-6"
          style={{ background: "var(--wd-accent)" }}
          animate={{ opacity: [0.6, 1, 0.6], rotate: [0, 90, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="mt-3 space-y-2">
          {[100, 80, 70, 90].map((w, i) => (
            <motion.div
              key={i}
              className="h-1.5"
              style={{ width: `${w}%`, background: "var(--wd-text)", opacity: 0.35 }}
              animate={{
                opacity: [0.25, i === 1 ? 0.8 : 0.45, 0.25],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <motion.div
            className="h-2"
            style={{ background: "var(--wd-text)", opacity: 0.5 }}
            animate={{ width: ["4rem", "5rem", "4rem"] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="w-12 h-4"
            style={{ background: "var(--wd-accent)" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </div>

        <div
          className="flex-1 flex items-end gap-[3px] p-2 border"
          style={{ borderColor: "var(--wd-border)" }}
        >
          {barHeights.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1"
              style={{
                background: "var(--wd-accent)",
                opacity: 0.7,
              }}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.33, 1, 0.68, 1] }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-6 border flex items-center justify-center"
              style={{ borderColor: "var(--wd-border)" }}
              animate={{
                borderColor: [
                  "rgba(26,20,16,0.12)",
                  "rgba(196,74,40,0.35)",
                  "rgba(26,20,16,0.12)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.6 }}
            >
              <div
                className="w-[60%] h-[2px]"
                style={{ background: "var(--wd-text)", opacity: 0.3 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EcommerceVisual() {
  return (
    <div className="w-full h-full flex flex-col p-5 gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <motion.div
          className="w-16 h-[2px]"
          style={{ background: "var(--wd-accent)" }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="flex gap-3 items-center">
          <div className="w-6 h-[2px]" style={{ background: "var(--wd-text)", opacity: 0.35 }} />
          <div className="w-6 h-[2px]" style={{ background: "var(--wd-text)", opacity: 0.35 }} />
          <motion.div
            className="w-4 h-4 rounded-full border"
            style={{ borderColor: "var(--wd-accent)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mx-auto mt-[5px]"
              style={{ background: "var(--wd-accent)" }}
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
              className="aspect-square border relative overflow-hidden"
              style={{ borderColor: "var(--wd-border)", background: "var(--wd-bg)" }}
              whileHover={{ borderColor: "var(--wd-accent)", scale: 1.04 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(196,74,40,0.1) 50%, transparent 100%)",
                  animation: `wd-shimmer-sweep 3s ease-in-out infinite ${i * 0.4}s`,
                }}
              />
              <div
                className="absolute top-1 right-1 font-mono text-[6px] tracking-[0.2em] uppercase"
                style={{ color: "var(--wd-accent)" }}
              >
                0{n}
              </div>
            </motion.div>
            <div className="w-[70%] h-1" style={{ background: "var(--wd-text)", opacity: 0.4 }} />
            <motion.div
              className="h-1"
              style={{ background: "var(--wd-accent)" }}
              animate={{ width: ["28%", "44%", "32%"] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LandingVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4 text-center relative overflow-hidden">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(196,74,40,0.15), transparent 70%)",
        }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="h-3.5"
        style={{ background: "var(--wd-text)", opacity: 0.8 }}
        animate={{ width: ["55%", "65%", "55%"] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className="h-2"
        style={{ background: "var(--wd-text)", opacity: 0.4 }}
        animate={{ width: ["40%", "50%", "40%"] }}
        transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
      />
      <div className="h-1.5 w-[30%] mt-1" style={{ background: "var(--wd-text)", opacity: 0.25 }} />

      <div className="flex gap-3 mt-3">
        <motion.div
          className="w-20 h-6 flex items-center justify-center"
          style={{ background: "var(--wd-accent)" }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="font-mono text-[7px] tracking-[0.2em] uppercase" style={{ color: "var(--wd-paper)" }}>
            Get Started
          </span>
        </motion.div>
        <motion.div
          className="w-20 h-6 border flex items-center justify-center"
          style={{ borderColor: "var(--wd-text)" }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span className="font-mono text-[7px] tracking-[0.2em] uppercase" style={{ color: "var(--wd-text)" }}>
            Learn More
          </span>
        </motion.div>
      </div>

      <div className="w-[80%] grid grid-cols-3 gap-3 mt-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-10 border flex items-center justify-center"
            style={{ borderColor: "var(--wd-border)" }}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--wd-accent)", opacity: 0.6 }}
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
      {/* Section top rule */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 mb-12 lg:mb-16">
        <div className="flex items-center gap-6">
          <span
            className="font-mono text-[10px] tracking-[0.35em] uppercase"
            style={{ color: "var(--wd-accent)" }}
          >
            Table of Contents
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
            PP. 02 – 05
          </span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="mb-16 lg:mb-24 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-end"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
        >
          <div>
            <h2
              className="font-bold leading-[0.88] tracking-[-0.04em]"
              style={{
                color: "var(--wd-text)",
                fontSize: "clamp(40px, 6vw, 96px)",
              }}
            >
              Four
              <br />
              <span className="wd-serif" style={{ color: "var(--wd-accent)", fontWeight: 500 }}>
                disciplines.
              </span>
            </h2>
          </div>
          <div className="max-w-[460px]">
            <p
              className="text-lg leading-[1.55]"
              style={{ color: "var(--wd-text-secondary)" }}
            >
              Four ways we build on the web — each with the same standard
              of craft. Selected features, annotated for the reader.
            </p>
          </div>
        </motion.div>

        {/* Editorial feature stack */}
        <motion.div
          className="flex flex-col"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          {offerings.map((item, i) => {
            const Visual = visualMap[item.visual];
            const isReversed = i % 2 !== 0;

            return (
              <motion.article
                key={item.label}
                variants={fadeUp}
                className="group relative border-t py-14 lg:py-20 first:border-t-0"
                style={{ borderColor: "var(--wd-text)" }}
              >
                {/* Top folio line (visible on each feature) */}
                <div className="absolute top-0 left-0 right-0 flex justify-between items-center pt-2">
                  <span
                    className="font-mono text-[9px] tracking-[0.35em] uppercase"
                    style={{ color: "var(--wd-text-tertiary)" }}
                  >
                    {item.kicker}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-[0.35em] uppercase"
                    style={{ color: "var(--wd-text-tertiary)" }}
                  >
                    No. {item.label}
                  </span>
                </div>

                <div
                  className={`grid grid-cols-1 lg:grid-cols-[auto_1fr_1.2fr] gap-10 lg:gap-16 items-start ${
                    isReversed ? "lg:grid-cols-[1.2fr_1fr_auto]" : ""
                  }`}
                >
                  {/* Giant folio numeral */}
                  {!isReversed && (
                    <div className="hidden lg:block">
                      <span
                        className="wd-serif block leading-[0.8] tracking-[-0.08em] transition-colors duration-500"
                        style={{
                          color: "var(--wd-accent)",
                          fontSize: "clamp(120px, 14vw, 220px)",
                          fontWeight: 500,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}

                  {/* Text column */}
                  <div className={`flex flex-col max-w-[480px] ${isReversed ? "lg:order-2" : ""}`}>
                    {/* Mobile numeral */}
                    <span
                      className="wd-serif block lg:hidden leading-[0.8] tracking-[-0.06em] mb-6"
                      style={{
                        color: "var(--wd-accent)",
                        fontSize: "clamp(80px, 18vw, 140px)",
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </span>

                    <h3
                      className="font-bold leading-[1.02] tracking-[-0.03em] mb-2"
                      style={{
                        color: "var(--wd-text)",
                        fontSize: "clamp(28px, 3.5vw, 48px)",
                      }}
                    >
                      {item.title}
                    </h3>

                    <span
                      className="wd-serif text-xl mb-5"
                      style={{ color: "var(--wd-text-secondary)" }}
                    >
                      {item.subtitle}
                    </span>

                    {/* Drop cap paragraph */}
                    <p
                      className="text-[16px] leading-[1.65] mb-6"
                      style={{ color: "var(--wd-text-secondary)" }}
                    >
                      <span
                        className="wd-serif float-left text-[56px] leading-[0.85] mr-2 mt-1"
                        style={{
                          color: "var(--wd-accent)",
                          fontWeight: 500,
                        }}
                      >
                        {item.desc.charAt(0)}
                      </span>
                      {item.desc.slice(1)}
                    </p>

                    {/* Small rule before tags */}
                    <div
                      className="w-8 h-px mb-4"
                      style={{ background: "var(--wd-accent)" }}
                    />

                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {item.tags.map((tag, ti) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] tracking-[0.2em] uppercase"
                          style={{ color: "var(--wd-text-tertiary)" }}
                        >
                          {ti > 0 && <span className="mr-4" style={{ color: "var(--wd-accent)" }}>·</span>}
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Visual column */}
                  <div className={`relative w-full ${isReversed ? "lg:order-1" : ""}`}>
                    <div
                      className="relative aspect-[4/3] border overflow-hidden transition-all duration-500 group-hover:border-[var(--wd-accent)]"
                      style={{
                        borderColor: "var(--wd-text)",
                        background: "var(--wd-paper)",
                        boxShadow: "4px 4px 0 var(--wd-accent-dim)",
                      }}
                    >
                      {/* Caption strip */}
                      <div
                        className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-1.5 border-b font-mono text-[8px] tracking-[0.25em] uppercase"
                        style={{
                          borderColor: "var(--wd-border)",
                          color: "var(--wd-text-tertiary)",
                          background: "var(--wd-bg-elevated)",
                        }}
                      >
                        <span>Fig. {item.label}</span>
                        <span>{item.title}</span>
                      </div>
                      <div className="absolute inset-0 pt-6">
                        <Visual />
                      </div>
                    </div>

                    {/* Caption below */}
                    <div className="mt-3 flex items-start gap-3">
                      <span
                        className="font-mono text-[9px] tracking-[0.25em] uppercase mt-0.5"
                        style={{ color: "var(--wd-accent)" }}
                      >
                        Fig. {item.label} —
                      </span>
                      <span
                        className="wd-serif text-sm leading-snug"
                        style={{ color: "var(--wd-text-secondary)" }}
                      >
                        A study in the {item.title.toLowerCase()} discipline.
                      </span>
                    </div>
                  </div>

                  {/* Giant folio numeral (reversed side) */}
                  {isReversed && (
                    <div className="hidden lg:block lg:order-3">
                      <span
                        className="wd-serif block leading-[0.8] tracking-[-0.08em] text-right"
                        style={{
                          color: "var(--wd-accent)",
                          fontSize: "clamp(120px, 14vw, 220px)",
                          fontWeight: 500,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

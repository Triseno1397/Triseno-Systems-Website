"use client";

import { useState, useEffect } from "react";

const PROJECTS = [
  {
    id: "google",
    company: "Google",
    event: "Google I/O",
    description:
      "Provided AI-driven production systems for Google's annual I/O developer conference — powering real-time content orchestration, automated show sequencing, and intelligent stage production workflows across their flagship keynote and breakout sessions.",
    tags: ["Live Production AI", "Content Orchestration", "Show Automation"],
    accent: "#4285F4",
  },
  {
    id: "meta",
    company: "Meta",
    event: "AI & AR Hardware Reveal",
    description:
      "Deployed intelligent production infrastructure for Meta's AI and AR glasses unveiling — integrating automated demo sequencing, real-time audience engagement systems, and AI-assisted stage management for one of the most anticipated hardware launches in recent years.",
    tags: ["Product Launch AI", "Demo Automation", "Live Systems"],
    accent: "#0668E1",
  },
  {
    id: "spotify",
    company: "Spotify",
    event: "Upfronts & Artist Showcases",
    description:
      "Built AI-powered production systems for Spotify's annual upfronts — enabling intelligent artist showcase sequencing, automated content delivery, and real-time collaboration tools that brought major artist partnerships to life on stage.",
    tags: ["Event Production AI", "Content Delivery", "Artist Showcases"],
    accent: "#1DB954",
  },
  {
    id: "epic",
    company: "Epic Games",
    event: "Unreal Engine Upfronts",
    description:
      "Engineered AI-assisted production pipelines for Epic's annual Unreal Engine showcase — powering real-time demo orchestration, automated rendering workflows, and intelligent stage systems for their flagship developer and creator event.",
    tags: ["Real-Time Production", "Rendering Automation", "Developer Events"],
    accent: "#00D1FF",
  },
  {
    id: "apple",
    company: "Apple",
    event: "Live Production & Events",
    description:
      "Provided AI-integrated production support for select Apple live experiences — delivering intelligent automation systems, streamlined show operations, and precision-timed content delivery behind the scenes.",
    tags: ["Show Automation", "Production Intelligence"],
    accent: "#A1A1A6",
  },
  {
    id: "linkedin",
    company: "LinkedIn",
    event: "Corporate Events & Showcases",
    description:
      "Delivered AI-powered event production systems for LinkedIn corporate showcases — enabling automated content sequencing, intelligent audience engagement tools, and seamless live production workflows.",
    tags: ["Corporate Events", "Engagement Systems"],
    accent: "#0A66C2",
  },
];

interface Project {
  id: string;
  company: string;
  event: string;
  description: string;
  tags: string[];
  accent: string;
}

function PortfolioCard({ project, index }: { project: Project; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-sm overflow-hidden cursor-pointer transition-all duration-500"
      style={{
        background: "var(--bg-primary, #0a0e1a)",
        border: `1px solid ${hovered ? "rgba(0,229,255,0.14)" : "rgba(0,229,255,0.08)"}`,
        padding: "clamp(28px, 5vw, 52px)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 24px 80px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "0 2px 16px -6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute inset-0 transition-all duration-600"
        style={{
          background: `radial-gradient(ellipse at ${index % 2 === 0 ? "100% 0%" : "0% 100%"}, ${project.accent}${hovered ? "24" : "0a"} 0%, transparent 55%)`,
        }}
      />

      <div className="relative z-10 flex flex-col gap-[clamp(16px,3vw,24px)]">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-1.5 h-1.5 rounded-full transition-all duration-400"
              style={{
                background: project.accent,
                boxShadow: `0 0 8px ${project.accent}44`,
                opacity: hovered ? 1 : 0.6,
              }}
            />
            <span
              className="text-[clamp(11px,1.5vw,12px)] font-semibold tracking-[0.14em] uppercase opacity-85"
              style={{ color: project.accent }}
            >
              {project.company}
            </span>
          </div>
          <div
            className="transition-all duration-400"
            style={{
              opacity: hovered ? 0.7 : 0.2,
              transform: hovered ? "translate(2px,-2px)" : "translate(0,0)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 12L12 4M12 4H6M12 4V10" stroke="var(--accent-primary, #00b4d8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Event title */}
        <h3 className="text-[clamp(24px,4vw,32px)] font-semibold text-text-primary leading-[1.2] tracking-tight m-0">
          {project.event}
        </h3>

        {/* Description */}
        <p className="text-[clamp(14px,2vw,15px)] leading-[1.75] text-text-secondary m-0 max-w-[680px]">
          {project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-[clamp(10px,1.2vw,11px)] font-medium tracking-[0.06em] uppercase px-3.5 py-1.5 rounded-sm"
              style={{
                background: "rgba(0,229,255,0.04)",
                border: "1px solid rgba(0,229,255,0.08)",
                color: "rgba(0,180,216,0.6)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);

  return (
    <div className="min-h-[100dvh] pt-20">
      {/* Hero */}
      <section
        className="max-w-[1400px] mx-auto transition-all duration-800"
        style={{
          padding: "clamp(60px, 10vw, 100px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 60px)",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <div className="flex items-center gap-3 mb-[clamp(16px,3vw,24px)]">
          <div className="w-7 h-px bg-accent-primary" />
          <span className="text-[clamp(10px,1.5vw,11px)] font-semibold tracking-[0.2em] uppercase text-accent-primary">
            Portfolio
          </span>
        </div>

        <h1 className="text-[clamp(32px,7vw,64px)] font-semibold leading-[1.08] tracking-tight mb-[clamp(16px,3vw,24px)] text-text-primary">
          What We&apos;ve Built for{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 bg-clip-text text-transparent">
            the Industry&apos;s Biggest Stages
          </span>
        </h1>

        <p className="text-[clamp(15px,2.2vw,17px)] leading-[1.7] text-text-secondary max-w-[560px]">
          AI-powered production systems behind flagship launches, developer conferences,
          and live experiences for the world&apos;s most recognized brands.
        </p>
      </section>

      {/* Credibility bar */}
      <section className="max-w-[1400px] mx-auto px-[clamp(20px,5vw,48px)]">
        <div className="flex items-center justify-center gap-[clamp(16px,4vw,40px)] flex-wrap py-[clamp(24px,4vw,36px)] border-t border-b border-white/[0.06]">
          {["Apple", "Meta", "Google", "LinkedIn", "Spotify", "Epic Games"].map((name, i, arr) => (
            <span
              key={name}
              className="text-[clamp(10px,1.5vw,12px)] font-medium tracking-[0.14em] uppercase text-text-secondary/50 flex items-center gap-[clamp(16px,4vw,40px)]"
            >
              {name}
              {i < arr.length - 1 && (
                <span className="text-cyan-400/15 text-[5px]">&#9670;</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Project cards */}
      <section className="max-w-[1400px] mx-auto px-[clamp(20px,5vw,48px)] py-[clamp(40px,7vw,72px)] pb-[clamp(60px,10vw,120px)] flex flex-col gap-[clamp(16px,3vw,24px)]">
        {PROJECTS.map((project, i) => (
          <div
            key={project.id}
            className="transition-all duration-700"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(24px)",
              transitionDelay: `${100 + i * 70}ms`,
            }}
          >
            <PortfolioCard project={project} index={i} />
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] text-center py-[clamp(60px,10vw,100px)] px-[clamp(20px,5vw,48px)]">
        <h2 className="text-[clamp(26px,5vw,44px)] font-semibold leading-[1.15] tracking-tight mb-[clamp(12px,2vw,20px)] text-text-primary">
          Ready to Build{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            What&apos;s Next?
          </span>
        </h2>
        <p className="text-[clamp(14px,2vw,15px)] text-text-secondary mb-[clamp(24px,4vw,36px)]">
          Limited engagements. Enterprise-grade AI production systems.
        </p>
        <a
          href="/#contact"
          className="inline-flex items-center gap-2.5 px-9 py-3.5 rounded-sm text-xs font-semibold tracking-[0.1em] uppercase text-accent-primary border border-accent-primary/20 bg-accent-primary/[0.06] hover:bg-accent-primary/[0.12] hover:border-accent-primary/40 transition-all duration-400 no-underline"
        >
          Start a Conversation
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </section>
    </div>
  );
}

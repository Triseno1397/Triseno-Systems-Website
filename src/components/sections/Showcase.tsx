"use client";

import { useRef } from "react";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import { useReducedMotion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import ScrollReveal from "@/components/animations/ScrollReveal";

const projects = [
  {
    title: "Multi-Agent Orchestration Pipeline",
    category: "Agent Architecture",
    problem:
      "Complex workflows that require research, analysis, generation, and validation — running sequentially through human teams, creating bottlenecks at every handoff.",
    architecture:
      "Coordinated AI agents operating in parallel execution paths. A research agent pulls context, an analysis agent evaluates against criteria, a generation agent produces outputs, and a validation agent checks accuracy and compliance — all orchestrated through a central decision layer.",
    outcome:
      "Deterministic, parallel execution replacing sequential human workflows. Modular agents that can be reconfigured, swapped, or scaled independently.",
    nodes: [
      { x: 80, y: 80, label: "INPUT", size: 5 },
      { x: 200, y: 40, label: "RESEARCH", size: 4 },
      { x: 200, y: 120, label: "ANALYSIS", size: 4 },
      { x: 340, y: 80, label: "ORCHESTRATE", size: 7 },
      { x: 460, y: 40, label: "GENERATE", size: 4 },
      { x: 460, y: 120, label: "VALIDATE", size: 4 },
      { x: 580, y: 80, label: "OUTPUT", size: 5 },
    ],
    edges: [
      [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6],
    ],
  },
  {
    title: "Broadcast Metadata Intelligence",
    category: "Broadcast & Media AI",
    problem:
      "Real-time production environments generating massive volumes of media assets with manual metadata tagging, content routing, and compliance review creating critical bottlenecks.",
    architecture:
      "A production-grade metadata intelligence system designed for broadcast control room environments. Real-time extraction, intelligent tagging, automated compliance checks, and content routing logic operating at broadcast speed with zero-tolerance for errors.",
    outcome:
      "Production-speed metadata management with automated compliance monitoring. Content routing decisions made in real-time, eliminating manual bottlenecks in live production workflows.",
    nodes: [
      { x: 80, y: 80, label: "INGEST", size: 5 },
      { x: 200, y: 30, label: "EXTRACT", size: 4 },
      { x: 200, y: 80, label: "TAG", size: 4 },
      { x: 200, y: 130, label: "COMPLY", size: 4 },
      { x: 370, y: 80, label: "DECISION", size: 6 },
      { x: 500, y: 40, label: "ROUTE", size: 4 },
      { x: 500, y: 120, label: "ARCHIVE", size: 4 },
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 5], [4, 6],
    ],
  },
];

/* ─── Animated Architecture Diagram ─── */
function ArchitectureDiagram({
  nodes,
  edges,
}: {
  nodes: { x: number; y: number; label: string; size: number }[];
  edges: number[][];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion || !svgRef.current) return;

      // Draw connection lines
      const lines = svgRef.current.querySelectorAll(".arch-edge");
      lines.forEach((line, i) => {
        gsap.fromTo(
          line,
          { strokeDashoffset: 300 },
          {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: svgRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
            },
            delay: i * 0.1,
          }
        );
      });

      // Light up nodes
      const nodeEls = svgRef.current.querySelectorAll(".arch-node");
      nodeEls.forEach((node, i) => {
        gsap.fromTo(
          node,
          { opacity: 0, scale: 0 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "back.out(2)",
            scrollTrigger: {
              trigger: svgRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
            },
            delay: 0.3 + i * 0.12,
          }
        );
      });

      // Rings now use CSS animation instead of GSAP repeat:-1

      // Labels fade in
      const labels = svgRef.current.querySelectorAll(".arch-label");
      labels.forEach((label, i) => {
        gsap.fromTo(
          label,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.4,
            scrollTrigger: {
              trigger: svgRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
            },
            delay: 0.8 + i * 0.12,
          }
        );
      });
    },
    { scope: svgRef }
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 640 160"
      fill="none"
      className="w-full h-full"
      aria-hidden="true"
    >
      {/* Grid dots (reduced for performance) */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <circle
            key={`gd-${row}-${col}`}
            cx={40 + col * 80}
            cy={20 + row * 40}
            r="0.5"
            fill="rgba(0, 180, 216, 0.08)"
          />
        ))
      )}

      {/* Edges */}
      {edges.map(([from, to], i) => (
        <line
          key={`edge-${i}`}
          className="arch-edge"
          x1={nodes[from].x}
          y1={nodes[from].y}
          x2={nodes[to].x}
          y2={nodes[to].y}
          stroke="rgba(0, 180, 216, 0.25)"
          strokeWidth="1"
          strokeDasharray="300"
        />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size * 2}
            stroke="rgba(0, 180, 216, 0.2)"
            strokeWidth="0.5"
            fill="none"
            style={{
              animation: `ring-pulse 2s ease-out infinite ${2 + i * 0.6}s`,
              transformOrigin: `${node.x}px ${node.y}px`,
            }}
          />
          <circle
            className="arch-node"
            cx={node.x}
            cy={node.y}
            r={node.size}
            fill="#00b4d8"
            opacity="0"
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          />
          <circle
            className="arch-node"
            cx={node.x}
            cy={node.y}
            r={node.size * 0.4}
            fill="#fff"
            opacity="0"
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          />
          <text
            className="arch-label"
            x={node.x}
            y={node.y + node.size + 12}
            textAnchor="middle"
            fill="rgba(0, 180, 216, 0.5)"
            fontSize="7"
            fontFamily="monospace"
            opacity="0"
          >
            {node.label}
          </text>
        </g>
      ))}

      {/* Edge gradients */}
      <defs>
        <linearGradient id="archFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0e1a" stopOpacity="1" />
          <stop offset="8%" stopColor="#0a0e1a" stopOpacity="0" />
          <stop offset="92%" stopColor="#0a0e1a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="640" height="160" fill="url(#archFade)" />
    </svg>
  );
}

export default function Showcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion || !sectionRef.current) return;

      const cards = sectionRef.current.querySelectorAll(".showcase-card");
      cards.forEach((card) => {
        gsap.from(card, {
          y: 80,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative py-24 md:py-32 lg:py-40"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <SectionHeading
          eyebrow="Proof of Architecture"
          title="What We Build in Practice"
          description="System architecture patterns we design and deploy. Not concepts — production-grade infrastructure built for real operational environments."
        />

        <div className="space-y-20 md:space-y-32">
          {projects.map((project, i) => (
            <div
              key={i}
              className="showcase-card relative"
            >
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                  i % 2 === 1 ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Architecture diagram side */}
                <div className={`${i % 2 === 1 ? "lg:order-2" : ""}`}>
                  <div className="relative p-8 md:p-12 rounded-2xl bg-navy-800/30 border border-white/[0.06] overflow-hidden">
                    {/* Left accent border */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-cyan-600" />

                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.03] to-transparent pointer-events-none" />

                    <div className="relative">
                      <span className="font-mono text-sm text-cyan-400/60 tracking-wider uppercase">
                        {project.category}
                      </span>
                      <div className="mt-4 h-[140px] md:h-[160px]">
                        <ArchitectureDiagram
                          nodes={project.nodes}
                          edges={project.edges}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content side */}
                <div className={`space-y-6 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                  <ScrollReveal delay={0.1}>
                    <h3 className="text-2xl md:text-3xl font-bold text-text-primary">
                      {project.title}
                    </h3>
                  </ScrollReveal>

                  <ScrollReveal delay={0.2}>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-mono text-cyan-400/80 uppercase tracking-wider">
                          The Problem
                        </span>
                        <p className="mt-1 text-text-secondary leading-relaxed">
                          {project.problem}
                        </p>
                      </div>

                      <div>
                        <span className="text-sm font-mono text-cyan-400/80 uppercase tracking-wider">
                          The Architecture
                        </span>
                        <p className="mt-1 text-text-secondary leading-relaxed">
                          {project.architecture}
                        </p>
                      </div>

                      <div>
                        <span className="text-sm font-mono text-cyan-400/80 uppercase tracking-wider">
                          The Result
                        </span>
                        <p className="mt-1 text-text-primary font-medium">
                          {project.outcome}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

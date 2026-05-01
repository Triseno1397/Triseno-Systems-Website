"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface Milestone {
  num: string;
  title: string;
  body: string;
  pos: number; // 0..1 along the path
}

const MILESTONES: Milestone[] = [
  {
    num: "01",
    title: "Strategy",
    body: "We start by understanding what you actually need to win — not what every other agency would propose.",
    pos: 0.15,
  },
  {
    num: "02",
    title: "Design & build",
    body: "Bespoke layouts, motion, and engineering — assembled like product, not like a template.",
    pos: 0.5,
  },
  {
    num: "03",
    title: "Launch & evolve",
    body: "Ship fast, then keep tuning. Performance, conversion, and ideas you didn't think of yet.",
    pos: 0.85,
  },
];

const PATH_LENGTH = 1000;

function StrategyMini({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden="true">
      <g
        stroke="#00e5ff"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      >
        <circle
          cx="30"
          cy="30"
          r="18"
          opacity={active ? 1 : 0.25}
          style={{
            transition: "opacity 600ms ease, stroke-dashoffset 800ms ease",
            strokeDasharray: 120,
            strokeDashoffset: active ? 0 : 120,
          }}
        />
        <line
          x1="30"
          y1="12"
          x2="30"
          y2="48"
          opacity={active ? 1 : 0}
          style={{ transition: "opacity 700ms ease 200ms" }}
        />
        <line
          x1="12"
          y1="30"
          x2="48"
          y2="30"
          opacity={active ? 1 : 0}
          style={{ transition: "opacity 700ms ease 350ms" }}
        />
        <circle
          cx="30"
          cy="30"
          r="2"
          fill="#00e5ff"
          stroke="none"
          opacity={active ? 1 : 0}
          style={{ transition: "opacity 600ms ease 500ms" }}
        />
        <text
          x="30"
          y="36"
          fill="rgba(255,255,255,0.55)"
          stroke="none"
          textAnchor="middle"
          fontSize="22"
          fontWeight="600"
          opacity={active ? 0 : 0.7}
          style={{ transition: "opacity 500ms ease" }}
        >
          ?
        </text>
      </g>
    </svg>
  );
}

function DesignMini({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden="true">
      <rect
        x="6"
        y="10"
        width="48"
        height="40"
        rx={active ? 4 : 0}
        fill={active ? "rgba(0,229,255,0.06)" : "transparent"}
        stroke={active ? "#00e5ff" : "rgba(255,255,255,0.45)"}
        strokeWidth="1.2"
        strokeDasharray={active ? "0" : "3 3"}
        style={{ transition: "all 700ms ease" }}
      />
      <line
        x1="10"
        y1="18"
        x2={active ? 32 : 50}
        y2="18"
        stroke={active ? "#00e5ff" : "rgba(255,255,255,0.4)"}
        strokeWidth="1.2"
        style={{ transition: "all 700ms ease" }}
      />
      <line
        x1="10"
        y1="24"
        x2={active ? 26 : 44}
        y2="24"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        style={{ transition: "all 700ms ease" }}
      />
      <rect
        x="10"
        y="30"
        width="40"
        height="10"
        rx="1.5"
        fill={active ? "rgba(0,229,255,0.18)" : "rgba(255,255,255,0.05)"}
        stroke="rgba(255,255,255,0.15)"
        style={{ transition: "all 800ms ease" }}
      />
      <rect
        x="10"
        y="42"
        width={active ? 16 : 8}
        height="5"
        rx="2.5"
        fill={active ? "#00e5ff" : "rgba(255,255,255,0.2)"}
        style={{ transition: "all 700ms ease 250ms" }}
      />
    </svg>
  );
}

function LaunchMini({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 60 80" className="h-full w-full" aria-hidden="true">
      <g stroke="#00e5ff" strokeLinecap="round">
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={30 + (i - 2) * 6}
            y1={28 + i * 4}
            x2={30 + (i - 2) * 6}
            y2={active ? 78 : 32 + i * 4}
            strokeWidth={i === 2 ? 1.5 : 0.8}
            opacity={active ? 0.7 - i * 0.1 : 0}
            style={{ transition: `all ${700 + i * 100}ms ease ${i * 80}ms` }}
          />
        ))}
        <circle
          cx="30"
          cy="20"
          r="6"
          fill={active ? "#00e5ff" : "transparent"}
          stroke="#00e5ff"
          strokeWidth="1.4"
          style={{ transition: "fill 600ms ease" }}
        />
      </g>
    </svg>
  );
}

const MINIS = [StrategyMini, DesignMini, LaunchMini];

export default function BuildPipelineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const lightRef = useRef<SVGStopElement>(null);
  const [activeMap, setActiveMap] = useState<boolean[]>(() =>
    MILESTONES.map(() => false)
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      const path = pathRef.current;
      if (!section || !path) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        setActiveMap(MILESTONES.map(() => true));
        gsap.set(path, { strokeDashoffset: 0 });
        return;
      }

      gsap.set(path, { strokeDasharray: PATH_LENGTH, strokeDashoffset: PATH_LENGTH });

      let tl: gsap.core.Timeline | null = null;
      const rafId = requestAnimationFrame(() => {
        tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=200%",
            scrub: 0.5,
            pin: true,
          },
        });

        tl.to(path, { strokeDashoffset: 0, duration: 1, ease: "none" }, 0);

        if (lightRef.current) {
          gsap.set(lightRef.current, { attr: { offset: 0 } });
          tl.to(
            lightRef.current,
            { attr: { offset: 1 }, duration: 1, ease: "none" },
            0
          );
        }

        MILESTONES.forEach((m, i) => {
          tl!.call(
            () =>
              setActiveMap((prev) => {
                if (prev[i]) return prev;
                const next = [...prev];
                next[i] = true;
                return next;
              }),
            [],
            m.pos
          );
        });
      });

      return () => {
        cancelAnimationFrame(rafId);
        tl?.scrollTrigger?.kill();
        tl?.kill();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      data-wd-section="pipeline"
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "#050810" }}
    >
      <div className="sticky top-0 flex min-h-[100dvh] items-stretch px-4 md:px-6">
        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col">
          <div className="flex items-center justify-between pt-10 text-[11px] uppercase tracking-[0.22em] text-white/45">
            <span>The build pipeline</span>
            <span className="hidden md:inline">Three phases · one momentum</span>
          </div>

          <div className="relative flex-1">
            <svg
              className="absolute left-1/2 top-1/2 h-[80vh] w-[120px] -translate-x-1/2 -translate-y-1/2"
              viewBox="0 0 120 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="pipeline-light"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0" stopColor="#00e5ff" stopOpacity="0" />
                  <stop ref={lightRef} offset="0" stopColor="#00e5ff" stopOpacity="1" />
                  <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 60 0 C 60 250, 60 250, 60 500 C 60 750, 60 750, 60 1000"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              <path
                ref={pathRef}
                d="M 60 0 C 60 250, 60 250, 60 500 C 60 750, 60 750, 60 1000"
                fill="none"
                stroke="url(#pipeline-light)"
                strokeWidth="1.8"
                style={{ filter: "drop-shadow(0 0 6px rgba(0,229,255,0.55))" }}
              />
            </svg>

            {MILESTONES.map((m, i) => {
              const isLeft = i % 2 === 0;
              const active = activeMap[i];
              const Mini = MINIS[i];
              return (
                <div
                  key={m.num}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: `calc(10% + ${m.pos} * 80vh)`,
                    width: "min(880px, 92vw)",
                  }}
                >
                  <div
                    className={`flex w-full ${
                      isLeft ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`flex max-w-[360px] flex-col gap-3 ${
                        isLeft ? "pr-[80px] text-right" : "pl-[80px] text-left"
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em]"
                        style={{
                          color: active ? "#00e5ff" : "rgba(255,255,255,0.45)",
                          transition: "color 500ms ease",
                          flexDirection: isLeft ? "row-reverse" : "row",
                        }}
                      >
                        <span className="font-mono">{m.num}</span>
                        <span
                          className="h-px w-8"
                          style={{
                            background: active
                              ? "rgba(0,229,255,0.7)"
                              : "rgba(255,255,255,0.15)",
                            transition: "background 500ms ease",
                          }}
                        />
                      </div>
                      <h3
                        className="text-2xl font-semibold tracking-tight text-white md:text-3xl"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {m.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-white/55">
                        {m.body}
                      </p>
                    </div>
                  </div>

                  {/* Node anchored on the path */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        border: `1px solid ${active ? "#00e5ff" : "rgba(255,255,255,0.2)"}`,
                        background: "#050810",
                        boxShadow: active
                          ? "0 0 28px rgba(0,229,255,0.45)"
                          : "0 0 0 0 rgba(0,229,255,0)",
                        transition: "all 500ms ease",
                      }}
                    >
                      <span
                        className="block h-2.5 w-2.5 rounded-full"
                        style={{
                          background: active
                            ? "#00e5ff"
                            : "rgba(255,255,255,0.3)",
                          boxShadow: active
                            ? "0 0 14px rgba(0,229,255,0.8)"
                            : "none",
                          transition: "all 500ms ease",
                        }}
                      />
                    </div>

                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${
                        isLeft ? "left-[60px]" : "right-[60px]"
                      } h-16 w-16 md:h-20 md:w-20`}
                      style={{ pointerEvents: "none" }}
                    >
                      <Mini active={active} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="pb-8 text-center text-[11px] uppercase tracking-[0.3em] text-white/45">
            ↳ technique: scroll-scrubbed SVG path with milestone activation
          </p>
        </div>
      </div>
    </section>
  );
}

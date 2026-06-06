"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Ribbon from "@/components/web-design/webgl/Ribbon";
import {
  CustomSiteArtifact,
  WebAppArtifact,
  EcommerceArtifact,
  LandingPageArtifact,
  HairlineFloor,
} from "@/components/web-design/webgl/ServiceArtifacts";

interface Service {
  num: string;
  title: string;
  body: string;
  tag: string;
  z: number;
}

const SERVICES: Service[] = [
  {
    num: "01",
    title: "Custom sites",
    body: "Brand-defining sites for companies that refuse to look like everyone else.",
    tag: "↳ strategy · design system · custom build",
    z: 0,
  },
  {
    num: "02",
    title: "Web apps",
    body: "Interactive products and dashboards built with the same craft as a marketing site.",
    tag: "↳ product design · front-end · data viz",
    z: -16,
  },
  {
    num: "03",
    title: "E-commerce",
    body: "Storefronts engineered for conversion, speed, and brand premium.",
    tag: "↳ headless · conversion · performance",
    z: -32,
  },
  {
    num: "04",
    title: "Landing pages",
    body: "Surgical, high-performance pages built around a single moment of decision.",
    tag: "↳ message · design · build · launch",
    z: -48,
  },
];

function CameraRig({
  scrollRef,
  setActiveIdx,
}: {
  scrollRef: React.MutableRefObject<number>;
  setActiveIdx: (i: number) => void;
}) {
  const { camera } = useThree();
  const lastIdx = useRef(0);

  useFrame(() => {
    const p = scrollRef.current;
    const totalRange = SERVICES[SERVICES.length - 1].z - SERVICES[0].z;
    const z = SERVICES[0].z + p * totalRange + 6;
    camera.position.set(0, 0.3, z);
    camera.lookAt(0, 0, z - 4);

    const segs = SERVICES.length - 1;
    const idx = Math.round(p * segs);
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      setActiveIdx(idx);
    }
  });
  return null;
}

function ServicesScene({
  scrollRef,
  setActiveIdx,
  isMobile,
}: {
  scrollRef: React.MutableRefObject<number>;
  setActiveIdx: (i: number) => void;
  isMobile: boolean;
}) {
  // Ribbon threads through all rooms. Memoized so the TubeGeometry inside
  // <Ribbon> isn't rebuilt on every render of this scene.
  const ribbonPoints = useMemo(
    () => [
      new THREE.Vector3(-3, 1.6, 6),
      new THREE.Vector3(2, -1.4, -4),
      new THREE.Vector3(-2.5, 1.2, -14),
      new THREE.Vector3(2.6, -1.2, -22),
      new THREE.Vector3(-2.2, 1.4, -30),
      new THREE.Vector3(2.4, -1, -38),
      new THREE.Vector3(-2.8, 1.6, -46),
      new THREE.Vector3(2, -1.5, -54),
    ],
    []
  );

  return (
    <>
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 8, 30]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, SERVICES[0].z + 3]} intensity={1.2} color="#00e5ff" />
      <pointLight position={[-3, 2, SERVICES[1].z + 3]} intensity={1.0} color="#9d5cff" />
      <pointLight position={[3, 3, SERVICES[2].z + 3]} intensity={1.0} color="#0077ff" />
      <pointLight position={[-3, 2, SERVICES[3].z + 3]} intensity={1.2} color="#00e5ff" />

      <CameraRig scrollRef={scrollRef} setActiveIdx={setActiveIdx} />

      <Ribbon
        curvePoints={ribbonPoints}
        position={[0, 0, 0]}
        scale={1}
        spin={0.02}
        segments={isMobile ? 240 : 480}
        tubeRadius={0.1}
      />

      <CustomSiteArtifact position={[0, 0, SERVICES[0].z]} />
      <WebAppArtifact position={[0, 0, SERVICES[1].z]} />
      <EcommerceArtifact position={[0, 0, SERVICES[2].z]} />
      <LandingPageArtifact position={[0, 0, SERVICES[3].z]} />

      <HairlineFloor />
    </>
  );
}

const MOBILE_ACCENTS = ["#00e5ff", "#0077ff", "#9d5cff", "#00e5ff"];

function MobileServiceMockup({ idx, color }: { idx: number; color: string }) {
  const dim = "rgba(255,255,255,0.08)";
  const dim2 = "rgba(255,255,255,0.16)";
  if (idx === 0) {
    // Custom sites — hero block + headline + CTA
    return (
      <svg viewBox="0 0 200 110" className="block h-full w-full" aria-hidden="true">
        <rect x="6" y="6" width="188" height="98" rx="6" fill="rgba(13,20,40,0.85)" stroke={dim} />
        <rect x="14" y="14" width="172" height="14" rx="2" fill="rgba(10,14,26,0.9)" />
        <circle cx="22" cy="21" r="2" fill={dim2} />
        <circle cx="30" cy="21" r="2" fill={dim2} />
        <circle cx="38" cy="21" r="2" fill={dim2} />
        <rect x="14" y="34" width="172" height="40" rx="3" fill={`${color}22`} stroke={`${color}55`} />
        <rect x="14" y="80" width="100" height="6" rx="2" fill={dim2} />
        <rect x="14" y="90" width="64" height="4" rx="2" fill={dim} />
        <rect x="148" y="86" width="38" height="12" rx="6" fill={color} opacity="0.85" />
      </svg>
    );
  }
  if (idx === 1) {
    // Web apps — sidebar + chart line
    return (
      <svg viewBox="0 0 200 110" className="block h-full w-full" aria-hidden="true">
        <rect x="6" y="6" width="188" height="98" rx="6" fill="rgba(13,20,40,0.85)" stroke={dim} />
        <rect x="6" y="6" width="42" height="98" rx="6" fill="rgba(8,12,22,0.9)" />
        <rect x="14" y="18" width="26" height="3" rx="1.5" fill={dim2} />
        <rect x="14" y="26" width="20" height="3" rx="1.5" fill={dim} />
        <rect x="14" y="34" width="22" height="3" rx="1.5" fill={dim} />
        <rect x="56" y="14" width="132" height="38" rx="3" fill="rgba(10,14,26,0.85)" />
        <polyline
          points="60,42 80,30 100,38 120,22 140,32 160,18 180,28"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="56" y="60" width="62" height="38" rx="3" fill="rgba(10,14,26,0.7)" />
        <rect x="124" y="60" width="62" height="38" rx="3" fill="rgba(10,14,26,0.7)" />
      </svg>
    );
  }
  if (idx === 2) {
    // E-commerce — product card + price + cart
    return (
      <svg viewBox="0 0 200 110" className="block h-full w-full" aria-hidden="true">
        <rect x="6" y="6" width="188" height="98" rx="6" fill="rgba(13,20,40,0.85)" stroke={dim} />
        <rect x="14" y="14" width="80" height="60" rx="3" fill={`${color}1f`} stroke={`${color}55`} />
        <rect x="104" y="18" width="80" height="6" rx="2" fill={dim2} />
        <rect x="104" y="30" width="60" height="4" rx="2" fill={dim} />
        <rect x="104" y="40" width="40" height="8" rx="2" fill={color} opacity="0.85" />
        <rect x="104" y="56" width="80" height="14" rx="7" fill={color} opacity="0.9" />
        <rect x="14" y="82" width="36" height="20" rx="3" fill="rgba(10,14,26,0.7)" />
        <rect x="56" y="82" width="36" height="20" rx="3" fill="rgba(10,14,26,0.7)" />
        <rect x="98" y="82" width="36" height="20" rx="3" fill="rgba(10,14,26,0.7)" />
      </svg>
    );
  }
  // Landing pages — vertical stack of section blocks
  return (
    <svg viewBox="0 0 200 110" className="block h-full w-full" aria-hidden="true">
      <rect x="6" y="6" width="188" height="98" rx="6" fill="rgba(13,20,40,0.85)" stroke={dim} />
      <rect x="60" y="14" width="80" height="22" rx="3" fill={`${color}1f`} stroke={`${color}55`} />
      <rect x="78" y="42" width="44" height="4" rx="2" fill={dim2} />
      <rect x="86" y="50" width="28" height="3" rx="1.5" fill={dim} />
      <rect x="60" y="60" width="80" height="14" rx="3" fill="rgba(10,14,26,0.85)" />
      <rect x="60" y="78" width="80" height="14" rx="3" fill="rgba(10,14,26,0.85)" />
      <rect x="80" y="96" width="40" height="6" rx="3" fill={color} opacity="0.85" />
    </svg>
  );
}

function MobileFlatStack() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll("[data-wd-mobile-card]");
    if (!cards || cards.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.wdActive = "true";
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="px-5 py-20">
      <div className="mb-10 text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">
          Web design division
        </div>
        <h2
          className="mt-3 text-3xl font-semibold tracking-tight text-white"
          style={{ letterSpacing: "-0.025em" }}
        >
          What we build.
        </h2>
      </div>
      <div className="space-y-5">
        {SERVICES.map((s, i) => {
          const color = MOBILE_ACCENTS[i];
          return (
            <article
              key={s.num}
              data-wd-mobile-card
              className="wd-mobile-card relative overflow-hidden rounded-2xl border"
              style={{
                background: "rgba(10,14,26,0.7)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 20px 40px -24px ${color}40`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
                  opacity: 0.7,
                }}
              />
              <div className="aspect-[200/110] w-full">
                <MobileServiceMockup idx={i} color={color} />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/45">
                  <span className="font-mono" style={{ color }}>
                    {s.num}
                  </span>
                  <span className="h-px w-8" style={{ background: `${color}66` }} />
                  <span>Service</span>
                </div>
                <h3
                  className="mt-3 text-xl font-semibold tracking-tight text-white"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-white/60">{s.body}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-white/35">
                  {s.tag}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ServiceScenesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // Mount the canvas once it's near the viewport, then keep it mounted and
  // pause the render loop off-screen (frameloop). Recreating the WebGL context
  // on every scroll trips Chromium's context-loss guard and blanks the scenes.
  useEffect(() => {
    if (!mounted) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const vis = entry.isIntersecting;
        setInView(vis);
        if (vis) setShouldRender(true); // latch: never unmount once shown
      },
      { rootMargin: "100% 0px 100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted]);

  // Pin + scroll progress
  useGSAP(
    () => {
      if (!mounted) return;
      if (reduceMotion || isMobile) return;

      const section = sectionRef.current;
      if (!section) return;

      let st: ScrollTrigger | null = null;
      const rafId = requestAnimationFrame(() => {
        st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: true,
          onUpdate: (self) => {
            scrollRef.current = self.progress;
          },
        });
      });

      return () => {
        cancelAnimationFrame(rafId);
        st?.kill();
      };
    },
    { scope: sectionRef, dependencies: [mounted, reduceMotion, isMobile] }
  );

  const jumpToService = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const segs = SERVICES.length - 1;
    const targetProgress = i / segs;
    const top = section.offsetTop;
    const totalScroll = window.innerHeight * 3; // matches end "+=300%"
    window.scrollTo({ top: top + totalScroll * targetProgress, behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      data-wd-section="services"
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "#050810" }}
      role="img"
      aria-label="Services scenes — four 3D rooms representing custom sites, web apps, e-commerce, and landing pages"
    >
      {isMobile || reduceMotion ? (
        <MobileFlatStack />
      ) : (
        <>
          <div className="absolute inset-0 z-0">
            {mounted && shouldRender && (
              <Canvas
                dpr={[1, 1.75]}
                frameloop={inView ? "always" : "never"}
                camera={{ position: [0, 0.3, 6], fov: 42 }}
                gl={{ antialias: true, powerPreference: "high-performance" }}
              >
                <ServicesScene
                  scrollRef={scrollRef}
                  setActiveIdx={setActiveIdx}
                  isMobile={isMobile}
                />
              </Canvas>
            )}
          </div>

          {/* Sticky overlay: title + nav */}
          <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-[1400px] px-6">
            {/* Title overlay (left) */}
            <div className="flex flex-1 items-end pb-24">
              <div key={activeIdx} className="max-w-[420px]" style={{ animation: "wd-fade-in 600ms ease both" }}>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                  Service {SERVICES[activeIdx].num}
                </div>
                <h3
                  className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  {SERVICES[activeIdx].title}
                </h3>
                <p className="mt-3 text-sm text-white/60 md:text-base">
                  {SERVICES[activeIdx].body}
                </p>
                <p className="mt-12 text-[11px] uppercase tracking-[0.3em] text-white/35">
                  {SERVICES[activeIdx].tag}
                </p>
              </div>
            </div>

            {/* Service navigator (right) */}
            <div className="hidden md:flex w-[220px] flex-col justify-center">
              <ul className="space-y-3">
                {SERVICES.map((s, i) => {
                  const active = i === activeIdx;
                  return (
                    <li key={s.num}>
                      <button
                        type="button"
                        onClick={() => jumpToService(i)}
                        className="group flex w-full items-center justify-between gap-3 py-2 text-left"
                      >
                        <span
                          className="font-mono text-[11px] uppercase tracking-[0.3em]"
                          style={{
                            color: active ? "#00e5ff" : "rgba(255,255,255,0.4)",
                            transition: "color 400ms ease",
                          }}
                        >
                          {s.num}
                        </span>
                        <span
                          className="flex-1 text-sm font-medium tracking-tight"
                          style={{
                            color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
                            transition: "color 400ms ease",
                          }}
                        >
                          {s.title}
                        </span>
                        <span
                          className="block h-px w-6"
                          style={{
                            background: active
                              ? "#00e5ff"
                              : "rgba(255,255,255,0.18)",
                            transition: "background 400ms ease",
                          }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <style jsx>{`
            @keyframes wd-fade-in {
              from {
                opacity: 0;
                transform: translateY(8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}
    </section>
  );
}

"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
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
  z: number;
}

const SERVICES: Service[] = [
  {
    num: "01",
    title: "Custom sites",
    body: "Brand-defining sites for companies that refuse to look like everyone else.",
    z: 0,
  },
  {
    num: "02",
    title: "Web apps",
    body: "Interactive products and dashboards built with the same craft as a marketing site.",
    z: -16,
  },
  {
    num: "03",
    title: "E-commerce",
    body: "Storefronts engineered for conversion, speed, and brand premium.",
    z: -32,
  },
  {
    num: "04",
    title: "Landing pages",
    body: "Surgical, high-performance pages built around a single moment of decision.",
    z: -48,
  },
];

interface AberrationHandle {
  offset: THREE.Vector2;
}

function CameraRig({
  scrollRef,
  aberrationRef,
  setActiveIdx,
}: {
  scrollRef: React.MutableRefObject<number>;
  aberrationRef: React.MutableRefObject<AberrationHandle | null>;
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
    const pos = p * segs;
    const idx = Math.round(pos);
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      setActiveIdx(idx);
    }

    const handle = aberrationRef.current;
    if (handle && handle.offset) {
      const local = Math.abs(pos - Math.round(pos));
      const intensity = local * 2;
      handle.offset.set(
        0.0015 + intensity * 0.006,
        0.002 + intensity * 0.008
      );
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
  const aberrationRef = useRef<AberrationHandle | null>(null);

  // Ribbon threads through all rooms
  const ribbonPoints = [
    new THREE.Vector3(-3, 1.6, 6),
    new THREE.Vector3(2, -1.4, -4),
    new THREE.Vector3(-2.5, 1.2, -14),
    new THREE.Vector3(2.6, -1.2, -22),
    new THREE.Vector3(-2.2, 1.4, -30),
    new THREE.Vector3(2.4, -1, -38),
    new THREE.Vector3(-2.8, 1.6, -46),
    new THREE.Vector3(2, -1.5, -54),
  ];

  return (
    <>
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 8, 30]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, SERVICES[0].z + 3]} intensity={1.2} color="#00e5ff" />
      <pointLight position={[-3, 2, SERVICES[1].z + 3]} intensity={1.0} color="#9d5cff" />
      <pointLight position={[3, 3, SERVICES[2].z + 3]} intensity={1.0} color="#0077ff" />
      <pointLight position={[-3, 2, SERVICES[3].z + 3]} intensity={1.2} color="#00e5ff" />

      <CameraRig
        scrollRef={scrollRef}
        aberrationRef={aberrationRef}
        setActiveIdx={setActiveIdx}
      />

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

      <EffectComposer>
        <ChromaticAberration
          ref={aberrationRef as never}
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.002, 0.0025)}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </>
  );
}

function MobileFlatStack() {
  return (
    <div className="space-y-8 px-6 py-20">
      {SERVICES.map((s) => (
        <div
          key={s.num}
          className="rounded-2xl border p-6"
          style={{
            background: "rgba(13,20,40,0.6)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/45">
            <span className="font-mono">Service {s.num}</span>
            <span className="h-px w-8 bg-white/15" />
          </div>
          <h3
            className="mt-3 text-2xl font-semibold tracking-tight text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            {s.title}
          </h3>
          <p className="mt-2 text-sm text-white/55">{s.body}</p>
        </div>
      ))}
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

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // Mount/unmount the canvas based on viewport proximity
  useEffect(() => {
    if (!mounted) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShouldRender(entry.isIntersecting),
      { rootMargin: "200% 0px 200% 0px" }
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
                  ↳ technique: 3D camera dolly · multi-scene · chromatic aberration
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

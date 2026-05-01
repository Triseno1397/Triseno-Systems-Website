"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Ribbon from "@/components/web-design/webgl/Ribbon";
import BrowserMockup from "@/components/web-design/webgl/BrowserMockup";
import { splitText } from "@/lib/split-text";

function CameraDolly({
  scrollProgressRef,
}: {
  scrollProgressRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const wobbleRef = useRef({ t: 0 });
  const startZ = 8;
  const endZ = 0.4;

  useFrame((_, delta) => {
    wobbleRef.current.t += delta;
    const p = scrollProgressRef.current;
    const z = THREE.MathUtils.lerp(startZ, endZ, p);
    const wob = Math.sin(wobbleRef.current.t * 0.6) * 0.0035;
    camera.position.set(wob * 8, wob * 4, z);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function HeroScene({
  scrollProgressRef,
  reduceMotion,
  isMobile,
}: {
  scrollProgressRef: React.MutableRefObject<number>;
  reduceMotion: boolean;
  isMobile: boolean;
}) {
  return (
    <>
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 6, 18]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 2, 4]} intensity={1.4} color="#00e5ff" />
      <pointLight position={[-4, -2, 3]} intensity={0.8} color="#9d5cff" />

      {!reduceMotion && <CameraDolly scrollProgressRef={scrollProgressRef} />}

      {/* Ribbon behind browser */}
      <Ribbon
        position={[0, 0, -1.2]}
        scale={0.85}
        spin={reduceMotion ? 0 : 0.05}
        segments={isMobile ? 200 : 360}
        tubeRadius={isMobile ? 0.16 : 0.18}
      />

      {/* Browser mockup */}
      <BrowserMockup width={isMobile ? 4.6 : 6.4} height={isMobile ? 2.9 : 4} />

      {!isMobile && (
        <EffectComposer>
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0018, 0.0024)}
            radialModulation={false}
            modulationOffset={0}
          />
        </EffectComposer>
      )}
    </>
  );
}

function HeroMobileVisual() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,229,255,0.08) 0%, rgba(157,92,255,0.05) 35%, transparent 70%)",
      }}
    >
      {/* Static ribbon behind the browser */}
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full opacity-70"
        preserveAspectRatio="xMidYMid slice"
        style={{
          animation: "wd-glow-breathe 6s ease-in-out infinite",
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <linearGradient id="wd-hero-ribbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.0" />
            <stop offset="35%" stopColor="#00e5ff" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#9d5cff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0077ff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M -20 240 C 80 80, 180 360, 280 180 S 460 100, 520 260"
          fill="none"
          stroke="url(#wd-hero-ribbon)"
          strokeWidth="22"
          strokeLinecap="round"
          style={{ filter: "blur(2px)" }}
        />
        <path
          d="M -20 240 C 80 80, 180 360, 280 180 S 460 100, 520 260"
          fill="none"
          stroke="url(#wd-hero-ribbon)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Static browser mockup */}
      <svg
        viewBox="0 0 300 200"
        className="relative w-[78%] max-w-[420px]"
        style={{
          filter: "drop-shadow(0 24px 40px rgba(0,229,255,0.18))",
        }}
        aria-hidden="true"
      >
        <rect x="2" y="2" width="296" height="196" rx="8" fill="rgba(13,20,40,0.92)" stroke="rgba(255,255,255,0.1)" />
        <rect x="2" y="2" width="296" height="22" rx="8" fill="rgba(8,12,22,0.95)" />
        <circle cx="14" cy="13" r="3" fill="#ff5f57" opacity="0.85" />
        <circle cx="24" cy="13" r="3" fill="#febc2e" opacity="0.85" />
        <circle cx="34" cy="13" r="3" fill="#28c840" opacity="0.85" />
        <rect x="80" y="7" width="160" height="11" rx="5" fill="rgba(8,12,22,0.95)" stroke="rgba(255,255,255,0.06)" />
        <rect x="14" y="34" width="272" height="92" rx="3" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.25)" />
        <rect x="14" y="138" width="170" height="6" rx="3" fill="rgba(255,255,255,0.16)" />
        <rect x="14" y="150" width="120" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="14" y="172" width="64" height="16" rx="8" fill="#00e5ff" opacity="0.9" />
      </svg>
    </div>
  );
}

export default function HeroBrowserDollySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const scrollProgressRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);

    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height;
      const passed = Math.max(0, -rect.top);
      const p = Math.min(1, Math.max(0, passed / total));
      scrollProgressRef.current = p;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Unmount the Canvas once the user has scrolled well past the hero so the
  // WebGL context isn't running while they read the rest of the page.
  useEffect(() => {
    if (!mounted) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShouldRender(entry.isIntersecting),
      { rootMargin: "50% 0px 50% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted]);

  // Headline reveal
  useGSAP(
    () => {
      if (!mounted) return;
      const el = headlineRef.current;
      if (!el) return;

      if (reduceMotion) {
        el.style.opacity = "1";
        return;
      }

      const split = splitText(el, { mode: "chars" });
      gsap.set(split.chars, { y: 60, opacity: 0 });
      // Wait for the page curtain to lift (~600ms) before revealing the headline.
      gsap.to(split.chars, {
        y: 0,
        opacity: 1,
        stagger: 0.025,
        duration: 1.4,
        ease: "expo.out",
        delay: 0.65,
      });
      return () => {
        split.revert();
      };
    },
    { scope: sectionRef, dependencies: [mounted, reduceMotion] }
  );

  return (
    <section
      ref={sectionRef}
      data-wd-section="hero"
      className="relative isolate min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "#050810" }}
      role="img"
      aria-label="Web design division — animated 3D browser window with sweeping color ribbon"
    >
      {/* WebGL canvas — desktop only. Mobile uses a static SVG visual to
          avoid GPU pressure from mount/unmount cycles. */}
      <div className="absolute inset-0 z-0">
        {mounted && !isMobile && shouldRender && (
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 8], fov: 38 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <HeroScene
              scrollProgressRef={scrollProgressRef}
              reduceMotion={reduceMotion}
              isMobile={isMobile}
            />
          </Canvas>
        )}
        {mounted && isMobile && <HeroMobileVisual />}
      </div>

      {/* Foreground HTML */}
      <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col px-6 pt-8 md:pt-12">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-white/50">
          <span>Web design division</span>
          <span className="hidden md:inline">Phase A — page is the demo</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1
            ref={headlineRef}
            className="font-semibold leading-[0.95] tracking-tight text-white"
            style={{
              fontSize: "clamp(3rem, 8vw, 9rem)",
              letterSpacing: "-0.03em",
              opacity: reduceMotion ? 1 : 0,
            }}
          >
            This page is the demo.
          </h1>
          <p
            className="mt-6 max-w-[36ch] text-base text-white/55 md:text-lg"
            style={{ letterSpacing: "-0.005em" }}
          >
            Scroll. Every section is a feature you can ship.
          </p>
        </div>

        <div className="flex flex-col items-center pb-8 md:pb-12">
          <div className="flex flex-col items-center gap-3">
            <span
              className="block h-12 w-px"
              style={{
                background: "#00e5ff",
                animation: reduceMotion
                  ? "none"
                  : "wd-scroll-pulse 1.6s ease-in-out infinite",
                transformOrigin: "top",
                boxShadow: "0 0 12px rgba(0,229,255,0.6)",
              }}
            />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">
              Scroll
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, FormEvent, useMemo } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Ribbon from "@/components/web-design/webgl/Ribbon";
import { ArrowRight } from "@phosphor-icons/react";

function Particles({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      drift[i * 3] = (Math.random() - 0.5) * 0.02;
      drift[i * 3 + 1] = Math.random() * 0.04 + 0.005;
      drift[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    return { positions, drift };
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const geom = ref.current.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += data.drift[i * 3] * delta;
      arr[i * 3 + 1] += data.drift[i * 3 + 1] * delta;
      arr[i * 3 + 2] += data.drift[i * 3 + 2] * delta;
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = -4;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#ffffff"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function ClosingScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      <color attach="background" args={["#050810"]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 2, 4]} intensity={1} color="#00e5ff" />
      <pointLight position={[-3, -2, 3]} intensity={0.6} color="#9d5cff" />

      <Ribbon
        position={[0, 0, -2]}
        scale={1.1}
        spin={reduceMotion ? 0 : 0.04}
        segments={300}
        tubeRadius={0.13}
      />

      {!reduceMotion && <Particles count={70} />}
    </>
  );
}

function ClosingMobileVisual() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 30% 30%, rgba(0,229,255,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 75% 70%, rgba(157,92,255,0.10) 0%, transparent 60%)",
      }}
    >
      <svg
        viewBox="0 0 400 600"
        className="absolute inset-0 h-full w-full opacity-60"
        preserveAspectRatio="xMidYMid slice"
        style={{
          animation: "wd-glow-breathe 7s ease-in-out infinite",
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <linearGradient id="wd-closing-ribbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.0" />
            <stop offset="40%" stopColor="#00e5ff" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#9d5cff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0077ff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M -40 360 C 100 200, 200 520, 320 320 S 460 200, 520 380"
          fill="none"
          stroke="url(#wd-closing-ribbon)"
          strokeWidth="28"
          strokeLinecap="round"
          style={{ filter: "blur(3px)" }}
        />
        <path
          d="M -40 360 C 100 200, 200 520, 320 320 S 460 200, 520 380"
          fill="none"
          stroke="url(#wd-closing-ribbon)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function ClosingArchitectSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);
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

  // Mount the Canvas once the closing section is near the viewport, then keep
  // it mounted and pause the render loop off-screen (frameloop). Recreating the
  // WebGL context on every scroll trips Chromium's context-loss guard.
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

  useGSAP(
    () => {
      if (!mounted) return;
      const section = sectionRef.current;
      const form = formRef.current;
      if (!section || !form) return;
      if (reduceMotion) {
        gsap.set(form, { y: 0, opacity: 1 });
        return;
      }
      gsap.set(form, { y: 30, opacity: 0 });

      let st: ScrollTrigger | null = null;
      const rafId = requestAnimationFrame(() => {
        st = ScrollTrigger.create({
          trigger: section,
          start: "top 70%",
          onEnter: () =>
            gsap.to(form, {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: "expo.out",
            }),
        });
      });

      return () => {
        cancelAnimationFrame(rafId);
        st?.kill();
      };
    },
    { scope: sectionRef, dependencies: [mounted, reduceMotion] }
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section
      ref={sectionRef}
      data-wd-section="closing"
      className="relative isolate min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "#050810" }}
    >
      {/* WebGL canvas — desktop only. Mobile gets a static ambient backdrop. */}
      <div className="absolute inset-0 z-0">
        {mounted && !isMobile && shouldRender && (
          <Canvas
            dpr={[1, 1.5]}
            frameloop={inView ? "always" : "never"}
            camera={{ position: [0, 0, 6], fov: 42 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <ClosingScene reduceMotion={reduceMotion} />
          </Canvas>
        )}
        {mounted && isMobile && <ClosingMobileVisual />}
      </div>

      <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-[1100px] flex-col items-center justify-center px-6 text-center">
        <h2
          className="font-semibold leading-[0.95] tracking-tight text-white"
          style={{
            fontSize: "clamp(2.6rem, 7vw, 6.5rem)",
            letterSpacing: "-0.03em",
          }}
        >
          Tell me what you&apos;re building.
        </h2>
        <p
          className="mt-6 max-w-[52ch] text-base text-white/60 md:text-lg"
          style={{ letterSpacing: "-0.005em" }}
        >
          I&apos;ll tell you how we&apos;d build it, what it costs, and how
          long it takes.
        </p>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          data-placeholder="architect"
          className="mt-12 flex w-full max-w-[720px] items-center gap-3 rounded-full border px-5 py-3"
          style={{
            background: "rgba(10,14,26,0.7)",
            borderColor: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <input
            type="text"
            placeholder="e.g. I run a 12-room boutique hotel and I need a booking site"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/35 outline-none md:text-base"
            aria-label="Describe what you're building"
          />
          <button
            type="submit"
            aria-label="Submit"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105"
            style={{
              background: "#00e5ff",
              color: "#050810",
              boxShadow: "0 0 28px rgba(0,229,255,0.45)",
            }}
          >
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>

        {submitted && (
          <p className="mt-5 text-sm text-white/55">
            Architect is being trained. For now,{" "}
            <a
              href="mailto:Tristen@trisenosystems.com?subject=Web%20Design%20Inquiry"
              className="font-medium text-[#00e5ff] underline-offset-4 hover:underline"
            >
              start a project →
            </a>
          </p>
        )}

        <p className="mt-16 text-[11px] uppercase tracking-[0.3em] text-white/35">
          ↳ Triseno Systems · Web Design Division
        </p>
      </div>
    </section>
  );
}

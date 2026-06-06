"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useGSAP, gsap } from "@/hooks/useGSAPSetup";
import Button from "@/components/ui/Button";
import HyperspeedField from "@/components/sections/HyperspeedField";

/* ─── Hero Section ─── */
export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const warpProgressRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Seamless cross-fade loop: when the active video nears its end,
  // start the inactive one from frame 0 and fade between them.
  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    const FADE = 0.8; // seconds of cross-fade
    let active: HTMLVideoElement = a;
    let inactive: HTMLVideoElement = b;
    let swapping = false;

    a.style.opacity = "1";
    b.style.opacity = "0";

    const onTimeUpdate = () => {
      if (swapping) return;
      const remaining = active.duration - active.currentTime;
      if (!isFinite(remaining)) return;
      if (remaining <= FADE) {
        swapping = true;
        inactive.currentTime = 0;
        const playPromise = inactive.play();
        if (playPromise) playPromise.catch(() => {});
        // Trigger CSS transition to swap opacities
        requestAnimationFrame(() => {
          inactive.style.opacity = "1";
          active.style.opacity = "0";
        });
      }
    };

    const onEnded = () => {
      // After the previous active finishes, flip roles for the next cycle
      const prev = active;
      active = inactive;
      inactive = prev;
      inactive.pause();
      swapping = false;
    };

    a.addEventListener("timeupdate", onTimeUpdate);
    b.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);
    b.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("timeupdate", onTimeUpdate);
      b.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended", onEnded);
      b.removeEventListener("ended", onEnded);
    };
  }, [mounted]);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const words = containerRef.current.querySelectorAll(".hero-word");
      const sub = containerRef.current.querySelector(".hero-sub");
      const ctas = containerRef.current.querySelector(".hero-ctas");

      if (!sub || !ctas || words.length === 0) return;

      if (shouldReduceMotion) {
        // Ensure everything is visible even with reduced motion
        gsap.set([words, sub, ctas], { opacity: 1, y: 0, scale: 1 });
        return;
      }

      // Set initial state explicitly so elements are controlled by GSAP
      gsap.set(words, { opacity: 0, y: "100%" });
      gsap.set(sub, { opacity: 0, y: 20 });
      gsap.set(ctas, { opacity: 0, y: 20, scale: 0.95 });

      const tl = gsap.timeline({ delay: 0.3 });

      tl.to(words, {
        y: "0%",
        opacity: 1,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
      })
        .to(
          sub,
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
          },
          "-=0.2"
        )
        .to(
          ctas,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.3"
        );

      // ── Hyperspeed warp on scroll ──
      // The hero is a 200dvh section; the visual layer is sticky for the
      // first 100vh of scroll. As the user scrolls through the second 100vh,
      // a single scroll-tied timeline drives:
      //   - warpProgressRef (0..1) which the HyperspeedField canvas reads
      //   - tunnel video stack: scales up, gains brightness/blur, fades
      //   - foreground content: drifts up and fades out fast
      //   - scroll indicator: fades almost immediately
      //   - final flash: peaks at ~90% scroll for the warp-snap handoff
      const section = containerRef.current;
      const videoStack = section.querySelector<HTMLDivElement>(
        ".hero-video-stack"
      );
      const heroContent = section.querySelector<HTMLDivElement>(".hero-content");
      const flash = section.querySelector<HTMLDivElement>(".hero-flash");
      const scrollIndicator =
        section.querySelector<HTMLDivElement>(".hero-scroll");

      const warpTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => {
            warpProgressRef.current = self.progress;
          },
        },
      });

      if (videoStack) {
        warpTl.to(
          videoStack,
          {
            scale: 1.55,
            filter: "brightness(1.45) saturate(1.5) contrast(1.1) blur(5px)",
            ease: "none",
            duration: 1,
          },
          0
        );
        warpTl.to(
          videoStack,
          { opacity: 0.18, ease: "none", duration: 0.7 },
          0.25
        );
      }

      if (heroContent) {
        // Hold the text in place at the start of the scroll, then let it
        // drift up and fade on an ease-in curve so it lingers instead of
        // vanishing the instant you scroll.
        warpTl.to(
          heroContent,
          { y: -110, opacity: 0, ease: "power2.in", duration: 0.55 },
          0.2
        );
      }

      if (scrollIndicator) {
        warpTl.to(
          scrollIndicator,
          { opacity: 0, ease: "power1.in", duration: 0.22 },
          0
        );
      }

      if (flash) {
        warpTl.to(
          flash,
          { opacity: 1, ease: "power3.in", duration: 0.18 },
          0.82
        );
      }
    },
    { scope: containerRef, dependencies: [shouldReduceMotion, mounted] }
  );

  const headlineLine1 = "We Build the Intelligence Layer";
  const headlineLine2 = "Your Business Runs On";

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative"
      style={{
        minHeight: "200dvh",
        background: "var(--gradient-hero)",
      }}
    >
      {/* Sticky visual layer — pinned for the first 100vh of scroll while
          the warp ramps up across the second 100vh. */}
      <div
        className="sticky top-0 h-[100dvh] overflow-hidden flex items-center"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Background looping video — two stacked videos cross-fade for a
            seamless loop. Wrapped in .hero-video-stack so the GSAP
            ScrollTrigger can scrub scale + filter + opacity on both at once. */}
        <div
          className="hero-video-stack absolute inset-0 pointer-events-none"
          style={{
            willChange: "transform, filter, opacity",
            transformOrigin: "center center",
          }}
        >
          <video
            ref={videoARef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: 1,
              transition: "opacity 0.8s linear",
              filter: "brightness(1.18) saturate(1.18) contrast(1.05)",
            }}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src="/videos/tunnel.mp4" type="video/mp4" />
          </video>
          <video
            ref={videoBRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: 0,
              transition: "opacity 0.8s linear",
              filter: "brightness(1.18) saturate(1.18) contrast(1.05)",
            }}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src="/videos/tunnel.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Hyperspeed warp — canvas reads warpProgressRef every frame and
            ramps from "ambient stars" to "full Star Trek snap" as you scroll. */}
        {mounted && !shouldReduceMotion && (
          <HyperspeedField progressRef={warpProgressRef} />
        )}

        {/* Readability overlay — desktop: horizontal fade so text reads on
            the left and the tunnel shows on the right. */}
        <div
          className="hidden md:block absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,14,26,0.78) 0%, rgba(10,14,26,0.4) 55%, rgba(10,14,26,0.1) 100%)",
          }}
        />
        {/* Readability overlay — mobile: keep the tunnel as the hero and
            darken only enough to keep type readable. */}
        <div
          className="md:hidden absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,14,26,0.6) 0%, rgba(10,14,26,0.18) 32%, rgba(10,14,26,0.04) 60%, rgba(10,14,26,0.32) 100%)",
          }}
        />

        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "var(--gradient-radial)" }}
        />

        <div
          className="hero-content relative z-10 max-w-[1400px] mx-auto px-6 lg:px-8 w-full py-32 lg:py-0"
          style={{ willChange: "transform, opacity" }}
        >
          <div className="max-w-3xl space-y-8">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
              style={{
                textShadow:
                  "0 2px 14px rgba(5,8,16,0.55), 0 1px 4px rgba(5,8,16,0.4)",
              }}
            >
              <span className="block">
                {headlineLine1.split(" ").map((word, i) => (
                  <span
                    key={i}
                    className="inline-block overflow-hidden"
                    style={{ marginRight: "0.25em" }}
                  >
                    <span className="hero-word inline-block text-text-primary">
                      {word}
                    </span>
                  </span>
                ))}
              </span>
              <span className="block mt-2">
                {headlineLine2.split(" ").map((word, i) => (
                  <span
                    key={i}
                    className="inline-block overflow-hidden"
                    style={{ marginRight: "0.25em" }}
                  >
                    <span className="hero-word inline-block gradient-text">
                      {word}
                    </span>
                  </span>
                ))}
              </span>
            </h1>

            <p className="hero-sub max-w-xl text-lg md:text-xl text-text-secondary leading-relaxed">
              Triseno Systems designs and deploys AI infrastructure — multi-agent
              orchestration, workflow compression engines, and decision-layer
              automation for organizations that need systems, not features.
            </p>

            <div className="hero-ctas flex flex-col sm:flex-row gap-4">
              <Button variant="primary" size="large" href="/capabilities">
                Explore Capabilities
              </Button>
              <Button variant="secondary" size="large" href="/contact">
                Start a Conversation
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator — fades out almost immediately once the warp begins */}
        <motion.div
          className="hero-scroll absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-cyan-400/50" />
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Final warp-snap flash — invisible until the GSAP timeline fades it
            in around 80–100% scroll progress. Hands off cleanly to the next
            section, which slides up underneath as the section ends. */}
        <div
          className="hero-flash pointer-events-none absolute inset-0 z-20"
          style={{
            opacity: 0,
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.92) 0%, rgba(180,235,255,0.6) 22%, rgba(0,229,255,0.35) 42%, rgba(157,92,255,0.18) 60%, rgba(5,8,16,0) 80%)",
            mixBlendMode: "screen",
          }}
        />
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitText } from "@/lib/split-text";

// Register once (idempotent — the page shell registers too, but a section
// should never assume another module ran first).
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const SUBLINE = "Scroll. Every section is a feature you can ship.";
// Terminal-flavoured glyph pool for the compile/scramble effect.
const SCRAMBLE_GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789/<>{}[]#%&$*=+-—·";

/**
 * Web-design division hero — "OS Window" macro-Z dolly.
 *
 * A dark browser/OS window floats in space between two depth layers of neon
 * fluid shapes. As the pinned section is scrubbed:
 *   Phase A — the window tilts on a 3D axis (rotateX/rotateY) like a physical
 *             object, while the subline scrambles/recompiles like terminal code.
 *   Phase B — the window scales up exponentially with transform-origin on the
 *             green inner canvas, so the camera "flies into" the screen. The
 *             frame and the two neon layers blow outward past the viewport at
 *             different speeds (layered parallax).
 *   Phase C — a full-bleed teal-green canvas takes over (the infinite morph)
 *             and settles to the navy of the next section for a seamless handoff.
 *
 * Everything animates transform/opacity only, on hardware-accelerated layers,
 * and every ScrollTrigger / listener / quickTo is torn down on unmount.
 */
export default function HeroBrowserDollySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Mouse-parallax wrappers (outer) — kept separate from the scroll-driven
  // inner wrappers so cursor transforms and scroll transforms never fight.
  const backTiltRef = useRef<HTMLDivElement>(null);
  const windowTiltRef = useRef<HTMLDivElement>(null);
  const frontTiltRef = useRef<HTMLDivElement>(null);

  // Scroll-driven inner wrappers.
  const backShapesRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const frontShapesRef = useRef<HTMLDivElement>(null);

  const copyRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const sublineRef = useRef<HTMLParagraphElement>(null);

  const morphRef = useRef<HTMLDivElement>(null);
  const morphGlowRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);

  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // Headline character reveal on arrival (independent of the scroll timeline).
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
      gsap.set(split.chars, { yPercent: 110, opacity: 0 });
      gsap.set(el, { opacity: 1 });
      // Wait for the page curtain (~600ms) to lift before the headline lands.
      gsap.to(split.chars, {
        yPercent: 0,
        opacity: 1,
        stagger: 0.025,
        duration: 1.4,
        ease: "expo.out",
        delay: 0.65,
        force3D: true,
      });
      return () => split.revert();
    },
    { scope: sectionRef, dependencies: [mounted, reduceMotion] }
  );

  // The cinematic scroll sequence + mouse parallax.
  useGSAP(
    () => {
      if (!mounted) return;

      const section = sectionRef.current;
      const win = windowRef.current;
      const back = backShapesRef.current;
      const front = frontShapesRef.current;
      const copy = copyRef.current;
      const headline = headlineRef.current;
      const subline = sublineRef.current;
      const morph = morphRef.current;
      const morphGlow = morphGlowRef.current;
      if (!section || !win || !back || !front || !copy || !morph || !morphGlow) {
        return;
      }

      // Reduced motion: hold the static composed frame, no pin, no scrub.
      if (reduceMotion) {
        gsap.set([back, front], { opacity: 1 });
        gsap.set(win, { rotateX: 0, rotateY: 0, scale: 1 });
        gsap.set(copy, { opacity: 1 });
        gsap.set(morph, { opacity: 0 });
        if (subline) subline.textContent = SUBLINE;
        return;
      }

      // Tuned intensities — mobile keeps the same choreography but pulls the
      // exponential scale and parallax spread in so GPU load stays light.
      const winScale = isMobile ? 11 : 19;
      const backScale = isMobile ? 2.0 : 2.6;
      const frontScale = isMobile ? 3.6 : 5.6;

      // ── Terminal scramble for the subline ────────────────────────────────
      // Driven by a proxy value on the timeline: n=0 → clean, n=1 → full noise.
      // Scrubbing forward glitches it apart; scrubbing back recompiles it.
      const scramble = { n: 0 };
      const renderScramble = () => {
        if (!subline) return;
        const n = scramble.n;
        if (n <= 0.001) {
          subline.textContent = SUBLINE;
          return;
        }
        let out = "";
        for (let i = 0; i < SUBLINE.length; i++) {
          const ch = SUBLINE[i];
          if (ch === " ") {
            out += " ";
          } else if (Math.random() < n) {
            out +=
              SCRAMBLE_GLYPHS[
                Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)
              ];
          } else {
            out += ch;
          }
        }
        subline.textContent = out;
      };

      // Resting states.
      // 3D depth comes from the stage's `perspective`; the window only owns its
      // own rotate/scale so the mouse-tilt wrapper and the scroll-rotate
      // compose in a single perspective space.
      gsap.set(win, {
        transformOrigin: "50% 56%",
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        scale: 1,
        yPercent: 0,
        force3D: true,
      });
      gsap.set([back, front], { transformOrigin: "50% 50%", force3D: true });
      gsap.set(morph, { opacity: 0 });
      gsap.set(morphGlow, { opacity: 1 });

      let tl: gsap.core.Timeline | null = null;
      let quickFns: Array<gsap.QuickToFunc> = [];
      let onMove: ((e: PointerEvent) => void) | null = null;

      // Defer until layout settles so pin spacing is measured correctly.
      const rafId = requestAnimationFrame(() => {
        // Spread the dolly over more scroll — extra on mobile, where the
        // shorter dvh otherwise compresses the whole sequence into too few
        // pixels — and lean on a slightly heavier scrub so it glides.
        const heroEnd = isMobile ? "+=320%" : "+=260%";
        const heroScrub = isMobile ? 1.4 : 1.2;

        tl = gsap.timeline({
          defaults: { ease: "none", force3D: true },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: heroEnd,
            pin: true,
            scrub: heroScrub,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              progressRef.current = self.progress;
            },
          },
        });

        // ── Phase A — perspective warp (the window becomes a physical object)
        tl.to(
          win,
          {
            rotateX: 10,
            rotateY: -6,
            rotateZ: 1.2,
            yPercent: -2,
            duration: 0.18,
            ease: "power2.out",
          },
          0
        );

        // Subline compiles/scrambles, then the whole copy block lifts away.
        tl.to(
          scramble,
          { n: 1, duration: 0.16, ease: "power1.in", onUpdate: renderScramble },
          0.05
        );
        tl.to(
          headline,
          { scale: 1.35, ease: "power2.in", duration: 0.32 },
          0.1
        );
        tl.to(
          copy,
          { opacity: 0, yPercent: -8, duration: 0.2, ease: "power2.in" },
          0.12
        );

        // ── Phase B — macro fly-through. Window scales exponentially into the
        // green canvas; the tilt straightens as the "camera" aligns with it.
        tl.to(
          win,
          {
            scale: winScale,
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            yPercent: 0,
            duration: 0.66,
            ease: "power3.in",
          },
          0.18
        );

        // Layered parallax: the back layer drifts out slowly, the front layer
        // rushes past the camera much faster — both fade as they pass.
        tl.to(
          back,
          { scale: backScale, rotate: 8, opacity: 0, duration: 0.62, ease: "power2.in" },
          0.16
        );
        tl.to(
          front,
          { scale: frontScale, rotate: -12, opacity: 0, duration: 0.5, ease: "power3.in" },
          0.16
        );

        // ── Phase C — the infinite morph. A crisp full-bleed canvas takes over
        // (hiding the now-giant blurred window), then settles to navy so it
        // hands off seamlessly into the next section's background.
        tl.to(
          morph,
          { opacity: 1, duration: 0.16, ease: "power2.out" },
          0.72
        );
        tl.to(
          morphGlow,
          { opacity: 0, duration: 0.14, ease: "power2.in" },
          0.9
        );
      });

      // ── Mouse-track parallax (premium quickTo interpolation) ──────────────
      // Only meaningful at the top of the page; the contribution is gated to
      // zero as soon as the dolly engages so it never fights the timeline.
      const enableMouse = !isMobile && window.matchMedia("(pointer: fine)").matches;
      if (enableMouse) {
        const qBackX = gsap.quickTo(backTiltRef.current, "x", { duration: 0.8, ease: "power3" });
        const qBackY = gsap.quickTo(backTiltRef.current, "y", { duration: 0.8, ease: "power3" });
        const qWinX = gsap.quickTo(windowTiltRef.current, "x", { duration: 0.7, ease: "power3" });
        const qWinY = gsap.quickTo(windowTiltRef.current, "y", { duration: 0.7, ease: "power3" });
        const qWinRY = gsap.quickTo(windowTiltRef.current, "rotationY", { duration: 0.9, ease: "power3" });
        const qWinRX = gsap.quickTo(windowTiltRef.current, "rotationX", { duration: 0.9, ease: "power3" });
        const qFrontX = gsap.quickTo(frontTiltRef.current, "x", { duration: 0.6, ease: "power3" });
        const qFrontY = gsap.quickTo(frontTiltRef.current, "y", { duration: 0.6, ease: "power3" });
        quickFns = [qBackX, qBackY, qWinX, qWinY, qWinRY, qWinRX, qFrontX, qFrontY];

        onMove = (e: PointerEvent) => {
          const gate = Math.max(0, 1 - progressRef.current * 6);
          if (gate <= 0) return;
          const nx = (e.clientX / window.innerWidth - 0.5) * gate;
          const ny = (e.clientY / window.innerHeight - 0.5) * gate;
          // Depth: background moves least, foreground most.
          qBackX(nx * 14);
          qBackY(ny * 10);
          qWinX(nx * 26);
          qWinY(ny * 18);
          qWinRY(nx * 6);
          qWinRX(-ny * 5);
          qFrontX(nx * 52);
          qFrontY(ny * 36);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
      }

      return () => {
        cancelAnimationFrame(rafId);
        if (onMove) window.removeEventListener("pointermove", onMove);
        quickFns.forEach((fn) => fn.tween?.kill());
        tl?.scrollTrigger?.kill();
        tl?.kill();
        if (subline) subline.textContent = SUBLINE;
      };
    },
    { scope: sectionRef, dependencies: [mounted, reduceMotion, isMobile] }
  );

  return (
    <section
      ref={sectionRef}
      data-wd-section="hero"
      className="relative isolate min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "var(--wd-bg, #050810)" }}
    >
      <div
        ref={stageRef}
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 46%" }}
      >
        {/* ── BACK neon depth layer (behind the window) ── */}
        <div ref={backTiltRef} className="absolute inset-0">
          <div ref={backShapesRef} className="absolute inset-0">
            <span
              data-anim
              className="wd-blob"
              style={{
                top: "8%",
                left: "-6%",
                width: "46vw",
                height: "46vw",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(0,229,255,0.55) 0%, rgba(0,119,255,0.22) 40%, transparent 70%)",
                animation: "wd-glow-breathe 8s ease-in-out infinite",
              }}
            />
            <span
              data-anim
              className="wd-blob"
              style={{
                bottom: "2%",
                right: "-10%",
                width: "52vw",
                height: "52vw",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(157,92,255,0.5) 0%, rgba(157,92,255,0.18) 42%, transparent 70%)",
                animation: "wd-glow-breathe 9.5s ease-in-out infinite 1.2s",
              }}
            />
          </div>
        </div>

        {/* ── The OS / browser window ── */}
        <div
          ref={windowTiltRef}
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            ref={windowRef}
            className="wd-window relative w-full max-w-[860px]"
            style={{
              aspectRatio: "16 / 10",
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            {/* Chrome bar */}
            <div className="wd-window-chrome">
              <span className="flex items-center gap-2">
                <i className="wd-dot" style={{ background: "#ff5f57" }} />
                <i className="wd-dot" style={{ background: "#febc2e" }} />
                <i className="wd-dot" style={{ background: "#28c840" }} />
              </span>
              <span className="wd-addressbar">trisenosystems.com</span>
              <span className="flex items-center gap-2 opacity-40">
                <i className="wd-ctl" />
                <i className="wd-ctl" />
                <i className="wd-ctl" />
              </span>
            </div>

            {/* Body — the central placeholder canvas (the green inner block) */}
            <div className="wd-window-body">
              <div className="wd-canvas">
                <div className="wd-canvas-grid" />
                <div className="wd-canvas-content">
                  <span className="wd-canvas-bar" style={{ width: "58%" }} />
                  <span className="wd-canvas-bar wd-canvas-bar--dim" style={{ width: "40%" }} />
                  <span className="wd-canvas-cta" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FRONT neon depth layer (in front of the window) ── */}
        <div ref={frontTiltRef} className="absolute inset-0">
          <div ref={frontShapesRef} className="absolute inset-0">
            <span
              data-anim
              className="wd-blob"
              style={{
                top: "32%",
                left: "-12%",
                width: "30vw",
                height: "30vw",
                mixBlendMode: "screen",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(0,229,255,0.7) 0%, rgba(0,229,255,0.25) 38%, transparent 66%)",
                animation: "wd-glow-breathe 6.5s ease-in-out infinite 0.4s",
              }}
            />
            <span
              data-anim
              className="wd-ring"
              style={{
                top: "16%",
                right: "4%",
                width: "min(24vw, 280px)",
                height: "min(24vw, 280px)",
                animation: "wd-glow-breathe 7.5s ease-in-out infinite 0.8s",
              }}
            />
            <span
              data-anim
              className="wd-blob"
              style={{
                bottom: "6%",
                right: "-8%",
                width: "26vw",
                height: "26vw",
                mixBlendMode: "screen",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(157,92,255,0.7) 0%, rgba(157,92,255,0.22) 40%, transparent 68%)",
                animation: "wd-glow-breathe 8.5s ease-in-out infinite 1.6s",
              }}
            />
          </div>
        </div>

        {/* ── Phase C morph layer — full-bleed canvas → navy handoff ── */}
        <div
          ref={morphRef}
          className="absolute inset-0"
          style={{ background: "var(--wd-bg, #050810)", opacity: 0, willChange: "opacity" }}
        >
          <div
            ref={morphGlowRef}
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 52%, rgba(28,255,196,0.9) 0%, rgba(0,229,255,0.5) 28%, rgba(10,40,36,0.85) 60%, var(--wd-bg, #050810) 100%)",
              willChange: "opacity",
            }}
          />
        </div>
      </div>

      {/* ── Foreground copy ── */}
      <div
        ref={copyRef}
        className="relative z-[3] mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col px-6 pt-8 md:pt-12"
        style={{ willChange: "transform, opacity" }}
      >
        {/* Division branding now lives in the navbar lockup; this row keeps a
            right-aligned HUD status so it never collides with the logo. */}
        <div className="flex items-center justify-end text-[11px] uppercase tracking-[0.22em] text-white/50">
          <span className="hidden md:inline">Phase A — page is the demo</span>
        </div>

        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center text-center">
          <h1
            ref={headlineRef}
            className="font-semibold leading-[0.95] tracking-tight text-white"
            style={{
              fontSize: "clamp(3rem, 8vw, 9rem)",
              letterSpacing: "-0.03em",
              opacity: reduceMotion ? 1 : 0,
              willChange: "transform",
            }}
          >
            This page is the demo.
          </h1>
          <p
            ref={sublineRef}
            className="mt-6 max-w-[42ch] text-base text-white/55 md:text-lg"
            style={{
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              letterSpacing: "0.01em",
            }}
          >
            {SUBLINE}
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

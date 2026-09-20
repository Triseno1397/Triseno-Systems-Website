"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextRotate, type RotateWord } from "@/components/ui/TextRotate";
import GhostButton from "@/components/ui/GhostButton";
import BeamsCollision from "@/components/ui/BeamsCollision";
import Glyph from "@/components/world/Glyph";
import Loader from "@/components/world/Loader";
import { useWarp } from "@/components/world/WarpProvider";
import { DIVISIONS, MENU_LABEL } from "@/lib/divisions";
import { DOOR_ITEMS, MENU_ITEMS, cardVisible, dollyZ, portalState } from "./portalState";

gsap.registerPlugin(ScrollTrigger);

// 3D is never in the server HTML or the first bundle: the LCP element is the headline.
const PortalScene = dynamic(() => import("./PortalScene"), { ssr: false });

type Mode = "pending" | "full" | "lite";

// WE BUILD [ ... ] — one word per division, each carrying that division's glyph and hue.
const ROTATE_WORDS: RotateWord[] = [
  { text: "AD CREATIVE", glyph: DIVISIONS.creative.glyph, hue: DIVISIONS.creative.hue },
  { text: "WEBSITES", glyph: DIVISIONS.web.glyph, hue: DIVISIONS.web.hue },
  { text: "AI SYSTEMS", glyph: DIVISIONS.ai.glyph, hue: DIVISIONS.ai.hue },
];

const DOOR_COPY = [
  {
    title: "Ad creative for paid social",
    body: "Triseno Studio makes product video built for the feed: UGC, product demos, direct response, ASMR and brand films, cut for Instagram, TikTok and YouTube.",
    cta: "Enter Creative",
  },
  {
    title: "The page is the demo",
    body: "Custom, conversion-built websites. Every section of this site runs a different motion system, so what you are scrolling right now is the sample.",
    cta: "Enter Web Design",
  },
  {
    title: "The intelligence layer",
    body: "We build the intelligence layer your business runs on. Consulting, architecture and implementation, from diagnosing the workflow to deploying the system.",
    cta: "Enter AI Infrastructure",
  },
];

function canRunWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function PortalPage() {
  const { travel } = useWarp();
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  // Arriving through the warp: the tunnel is already covering the screen, so it
  // holds until the world is drawn instead of handing over to a second loader.
  const [viaWarp] = useState(
    () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-warping"),
  );
  const [active, setActive] = useState(0);
  // The headline only names the three divisions; WORK / CONTACT keep the last word.
  const [wordIndex, setWordIndex] = useState(0);

  const heroRef = useRef<HTMLElement>(null);
  const heroInnerRef = useRef<HTMLDivElement>(null);
  const doorsRef = useRef<HTMLElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const interacting = useRef(false);
  const resumeTimer = useRef(0);

  /* ── pick the world: full 3D, or the lite fallback (M5) ── */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const lite = reduced || small || !canRunWebGL();
    setMode(lite ? "lite" : "full");
    if (lite) {
      const done = () => setReady(true);
      (document.fonts?.ready ?? Promise.resolve()).then(done, done);
    }
    portalState.active = 0;
    portalState.hero = 0;
    portalState.doors = 0;
    portalState.gate = 0;
    portalState.hoverDoor = -1;
  }, []);

  useEffect(() => {
    if (!viaWarp) return;
    const root = document.documentElement;
    if (ready) root.removeAttribute("data-world-loading");
    else root.setAttribute("data-world-loading", "");
    return () => root.removeAttribute("data-world-loading");
  }, [viaWarp, ready]);

  // Never trap the visitor behind the loader if WebGL stalls.
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 8000);
    return () => window.clearTimeout(id);
  }, []);

  /* ── lit word -> object glyph/hue + headline word ── */
  const select = useCallback((index: number) => {
    portalState.active = index;
    setActive(index);
    if (index < ROTATE_WORDS.length) setWordIndex(index);
  }, []);

  const hold = useCallback(
    (index: number) => {
      interacting.current = true;
      window.clearTimeout(resumeTimer.current);
      select(index);
    },
    [select],
  );
  const release = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => (interacting.current = false), 5000);
  }, []);

  // Idle: cycle through the three divisions so the mechanism shows without a hover.
  useEffect(() => {
    if (mode === "pending" || !ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (interacting.current || document.hidden || portalState.hero > 0.35) return;
      select((portalState.active + 1) % 3);
    }, 3600);
    return () => window.clearInterval(id);
  }, [mode, ready, select]);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  /* ── pointer parallax ── */
  useEffect(() => {
    if (mode !== "full") return;
    const onMove = (e: PointerEvent) => {
      portalState.px = (e.clientX / window.innerWidth) * 2 - 1;
      portalState.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mode]);

  /* ── scroll -> camera (full mode) ── */
  useEffect(() => {
    if (mode !== "full") return;
    const ctx = gsap.context(() => {
      const heroInner = heroInnerRef.current;
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          portalState.hero = self.progress;
          if (heroInner) {
            const o = 1 - Math.min(1, self.progress / 0.45);
            heroInner.style.opacity = o.toFixed(3);
            heroInner.style.visibility = o <= 0.01 ? "hidden" : "visible";
            heroInner.style.transform = `translate3d(0, ${(-self.progress * 60).toFixed(1)}px, 0)`;
          }
        },
      });
      ScrollTrigger.create({
        trigger: doorsRef.current,
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          portalState.doors = self.progress;
          const z = dollyZ(self.progress);
          cardRefs.current.forEach((card, i) => {
            if (!card) return;
            const v = cardVisible(i, z);
            card.style.opacity = v.toFixed(3);
            card.style.visibility = v <= 0.01 ? "hidden" : "visible";
            card.style.transform = `translate3d(0, ${((1 - v) * 40).toFixed(1)}px, 0)`;
          });
        },
        onLeaveBack: () => {
          portalState.doors = 0;
        },
      });
      ScrollTrigger.create({
        trigger: gateRef.current,
        start: "top bottom",
        end: "top top",
        onUpdate: (self) => {
          portalState.gate = self.progress;
        },
      });
    });
    return () => ctx.revert();
  }, [mode]);

  /* ── lite mode: a door takes its hue only while it owns the viewport (D2) ── */
  useEffect(() => {
    if (mode !== "lite") return;
    const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-lite-door]"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.toggleAttribute("data-lit", e.intersectionRatio > 0.6)),
      { threshold: [0, 0.6, 1] },
    );
    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [mode]);

  const full = mode !== "lite";
  const current = MENU_ITEMS[active];

  return (
    <main className="portal-world relative bg-black text-white" data-mode={mode}>
      {viaWarp ? null : <Loader ready={ready} />}

      {/* The world: one fixed canvas behind every section. */}
      {mode === "full" ? (
        <div className="fixed inset-0 z-0">
          <PortalScene onReady={() => setReady(true)} onEnter={travel} />
        </div>
      ) : null}

      {/* ── 1. Signature object menu ─────────────────────────────────── */}
      <section
        ref={heroRef}
        data-rail="Menu"
        aria-label="Triseno Systems"
        className={full ? "relative z-10 h-[200dvh]" : "relative z-10 min-h-[100dvh] overflow-hidden"}
      >
        {mode === "lite" ? <LiteBackdrop active={active} /> : null}

        <div
          ref={heroInnerRef}
          className={`${
            full ? "pointer-events-none fixed inset-0" : "relative min-h-[100dvh]"
          } mx-auto flex max-w-[1400px] flex-col justify-between px-[var(--gutter)] pb-[calc(var(--gutter-y)+72px)] pt-[clamp(112px,17dvh,176px)]`}
        >
          <h1 className="portal-headline pointer-events-none font-display font-bold uppercase">
            <span className="sr-only">We build ad creative, websites and AI systems.</span>
            <span aria-hidden="true" className="block">
              We build
            </span>
            <span aria-hidden="true" className="block">
              <TextRotate words={ROTATE_WORDS} index={wordIndex} />
            </span>
          </h1>

          <nav aria-label="Divisions" className="pointer-events-auto mt-10 w-fit max-w-full">
            <p className="mb-5 font-mono text-[12px] uppercase tracking-[0.2em] text-white" aria-live="off">
              {active + 1}/{MENU_ITEMS.length} — {current.name}
            </p>
            <ul className="flex flex-col gap-[0.35em] text-[length:var(--fs-mid)]" onMouseLeave={release}>
              {MENU_ITEMS.map((item, i) => (
                <li key={item.key}>
                  <a
                    href={item.route}
                    className="portal-word font-display font-semibold uppercase"
                    data-lit={i === active ? "" : undefined}
                    onMouseEnter={() => hold(i)}
                    onFocus={() => hold(i)}
                    onBlur={release}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      travel(item.route);
                    }}
                  >
                    {MENU_LABEL[item.key]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p
            aria-hidden="true"
            className="scroll-tick pointer-events-none absolute bottom-[var(--gutter-y)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-white"
          >
            <span>Scroll to explore</span>
            <span className="scroll-tick__line" />
          </p>
        </div>
      </section>

      {/* ── 2. Three doors ───────────────────────────────────────────── */}
      {full ? (
        <section ref={doorsRef} data-rail="Doors" aria-label="Three divisions" className="relative z-10 h-[440dvh]">
          <div className="pointer-events-none fixed inset-0 mx-auto max-w-[1400px] px-[var(--gutter)]">
            {DOOR_ITEMS.map((door, i) => (
              <div
                key={door.key}
                className={`absolute top-1/2 w-[min(440px,42vw)] -translate-y-1/2 ${
                  i % 2 === 0 ? "right-[calc(var(--gutter)+72px)]" : "left-[var(--gutter)]"
                }`}
              >
                <div
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="door-card pointer-events-auto"
                  style={{ opacity: 0, visibility: "hidden" }}
                >
                  <DoorCardBody index={i} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section data-rail="Doors" aria-label="Three divisions" className="relative z-10">
          {DOOR_ITEMS.map((door, i) => (
            <div
              key={door.key}
              data-lite-door=""
              className="lite-door relative flex min-h-[100dvh] flex-col justify-end overflow-hidden px-[var(--gutter)] pb-[calc(var(--gutter-y)+80px)] pt-[120px]"
              style={{ ["--hue" as string]: door.hue }}
            >
              <div aria-hidden="true" className="lite-door__glyph">
                <span className="lite-door__stack">
                  <Glyph kind={door.glyph} size={260} color="#8a8a8a" strokeWidth={1.5} />
                  <Glyph kind={door.glyph} size={260} color={door.hue} strokeWidth={2} glow className="lite-door__hue" />
                </span>
                <span className="lite-door__stack lite-door__mirror">
                  <Glyph kind={door.glyph} size={260} color="#8a8a8a" strokeWidth={1.5} />
                  <Glyph kind={door.glyph} size={260} color={door.hue} strokeWidth={2} glow className="lite-door__hue" />
                </span>
              </div>
              <div className="door-card door-card--static relative w-full max-w-[520px]">
                <DoorCardBody index={i} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── 3. Gate ──────────────────────────────────────────────────── */}
      <section
        ref={gateRef}
        data-rail="Gate"
        data-rail-next="Contact"
        aria-label="Start a conversation"
        className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-[var(--gutter)] text-center"
      >
        <div aria-hidden="true" className="gate-veil absolute inset-0" />
        <BeamsCollision floor={0.82} />
        <div className="relative flex max-w-[900px] flex-col items-center pb-[12dvh]">
          <p className="mb-8 font-mono text-[12px] uppercase tracking-[0.2em] text-white">Next — Contact</p>
          <h2 className="gate-title font-display font-bold uppercase">Tell us what you need built</h2>
          <p className="mt-8 max-w-[52ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
            One conversation to work out which division fits: ad creative, a website, or AI infrastructure.
            You talk to the person who builds it.
          </p>
          <GhostButton href="/contact" className="mt-12">
            Start a Conversation
          </GhostButton>
        </div>
      </section>
    </main>
  );
}

function DoorCardBody({ index }: { index: number }) {
  const door = DOOR_ITEMS[index];
  const copy = DOOR_COPY[index];
  return (
    <>
      <p className="mb-6 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-white">
        <Glyph kind={door.glyph} size={14} color={door.hue} strokeWidth={1.25} glow />
        <span>
          0{index + 1}/03 — {door.name}
        </span>
      </p>
      <h2 className="font-display text-[length:var(--fs-mid)] font-semibold uppercase leading-[1.12] tracking-[0.06em]">
        {copy.title}
      </h2>
      <p className="mt-5 max-w-[62ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
        {copy.body}
      </p>
      <GhostButton href={door.route} className="mt-8">
        {copy.cta}
      </GhostButton>
    </>
  );
}

/* Lite hero backdrop (mobile / reduced motion / no WebGL): poster + muted
   tunnel footage, desaturated so the portal stays achromatic, with the
   signature glyph drawn in SVG over a mirrored floor. */
function LiteBackdrop({ active }: { active: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (motionOk) videoRef.current?.play().catch(() => {});
  }, [motionOk]);

  return (
    <div aria-hidden="true" className="lite-backdrop absolute inset-0">
      {motionOk ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/tunnel.mp4"
          poster="/images/portal-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/images/portal-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="lite-backdrop__shade absolute inset-0" />
      <div className="lite-object">
        {MENU_ITEMS.map((item, i) => (
          <span key={item.key} className="lite-object__glyph" data-on={i === active ? "" : undefined}>
            <Glyph kind={item.glyph} size={200} color={item.hue} strokeWidth={2} glow />
          </span>
        ))}
      </div>
    </div>
  );
}

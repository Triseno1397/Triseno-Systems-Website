"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeadlineRotate, { type RotateWord } from "@/components/world/HeadlineRotate";
import GhostButton from "@/components/ui/GhostButton";
import BeamsCollision from "@/components/ui/BeamsCollision";
import Glyph from "@/components/world/Glyph";
import Loader from "@/components/world/Loader";
import WorldAtmosphere from "@/components/world/WorldAtmosphere";
import { WARP_EVENT, useWarp } from "@/components/world/WarpProvider";
import { MENU_LABEL } from "@/lib/divisions";
import {
  DOOR_ITEMS,
  DOOR_Z,
  MENU_ITEMS,
  cardVisible,
  dollyZ,
  doorSide,
  portalState,
} from "./portalState";

gsap.registerPlugin(ScrollTrigger);

// 3D is never in the server HTML or the first bundle: the LCP element is the headline.
const PortalScene = dynamic(() => import("./PortalScene"), { ssr: false });

type Mode = "pending" | "full" | "lite";

const WHITE = "#ffffff";

// Headline, per menu word. The three divisions read WE BUILD […]; WORK and
// CONTACT get their own neutral line so headline, glyph, counter and object
// always say the same thing.
const LINE_ONE = ["WE BUILD", "WE BUILD", "WE BUILD", "SEE", "OPEN A"];
const LINE_TWO = ["AD CREATIVE", "WEBSITES", "AI SYSTEMS", "THE WORK", "CHANNEL"];

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

/** Scroll progress at which the camera frames door `i` (used by poster capture). */
function progressForDoor(i: number, ahead: number): number {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 40; n++) {
    const mid = (lo + hi) / 2;
    if (dollyZ(mid) - DOOR_Z[i] > ahead) lo = mid;
    else hi = mid;
  }
  return lo;
}

export default function PortalPage() {
  const { travel } = useWarp();
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  // which glyph/headline is showing (cycles 0..2 at rest) and whether a word is
  // actually hovered/focused. Hue only ever appears while `hot`.
  const [active, setActive] = useState(0);
  const [hot, setHot] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [capture, setCapture] = useState(false);
  // Arriving through the warp: the tunnel is already covering the screen, so it
  // holds until the world is drawn instead of handing over to a second loader.
  const [viaWarp] = useState(
    () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-warping"),
  );

  const heroRef = useRef<HTMLElement>(null);
  const heroInnerRef = useRef<HTMLDivElement>(null);
  const doorsRef = useRef<HTMLElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const beamsRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const interacting = useRef(false);
  const resumeTimer = useRef(0);

  /* ── pick the world: full 3D, or the lite fallback (M5) ── */
  useEffect(() => {
    portalState.active = 0;
    portalState.hot = false;
    portalState.hero = 0;
    portalState.doors = 0;
    portalState.gate = 0;
    portalState.hoverDoor = -1;
    portalState.warpAt = 0;
    portalState.capture = "";

    // Poster capture (?capture=hero-1 / door-2): the bare scene, square-on, for the lite posters.
    const cap = new URLSearchParams(window.location.search).get("capture");
    const m = cap?.match(/^(hero|door|gate)-(\d)$/);
    if (m) {
      const i = Number(m[2]);
      portalState.capture = m[1] as "hero" | "door" | "gate";
      if (m[1] === "hero") portalState.active = i;
      else {
        portalState.hero = 1;
        portalState.doors = m[1] === "gate" ? 1 : progressForDoor(i, 9.4);
        portalState.gate = m[1] === "gate" ? 1 : 0;
      }
      setActive(portalState.active);
      setCapture(true);
      setMode("full");
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const lite = reduced || small || !canRunWebGL();
    setMode(lite ? "lite" : "full");
    if (lite) {
      const done = () => setReady(true);
      (document.fonts?.ready ?? Promise.resolve()).then(done, done);
    }
    return () => {
      portalState.warpAt = 0;
    };
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

  /* ── menu word -> object glyph + headline; hue only while hovered/focused ── */
  const show = useCallback((index: number, isHot: boolean) => {
    portalState.active = index;
    portalState.hot = isHot;
    setActive(index);
    setHot(isHot);
  }, []);

  const hold = useCallback(
    (index: number) => {
      interacting.current = true;
      window.clearTimeout(resumeTimer.current);
      show(index, true);
    },
    [show],
  );
  const release = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    // back to rest: achromatic. WORK/CONTACT are not part of the resting rotation.
    show(portalState.active < 3 ? portalState.active : 0, false);
    resumeTimer.current = window.setTimeout(() => (interacting.current = false), 2500);
  }, [show]);

  // Rest: the headline rotates through the three divisions and the object morphs
  // with it — in white. Nothing is preselected and nothing is coloured.
  useEffect(() => {
    if (mode === "pending" || !ready || capture) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (interacting.current || document.hidden || portalState.hero > 0.35 || portalState.warpAt) return;
      show((portalState.active + 1) % 3, false);
    }, 3600);
    return () => window.clearInterval(id);
  }, [mode, ready, capture, show]);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  /* ── warp out of the portal: the object centres and takes the destination, the menu fades ── */
  useEffect(() => {
    const onWarp = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      const index = MENU_ITEMS.findIndex((m) => m.key === key);
      interacting.current = true;
      if (index >= 0) show(index, true);
      portalState.warpAt = performance.now();
      setLeaving(true);
    };
    window.addEventListener(WARP_EVENT, onWarp);
    return () => window.removeEventListener(WARP_EVENT, onWarp);
  }, [show]);

  /* ── pointer parallax ── */
  useEffect(() => {
    if (mode !== "full" || capture) return;
    const onMove = (e: PointerEvent) => {
      portalState.px = (e.clientX / window.innerWidth) * 2 - 1;
      portalState.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mode, capture]);

  /* ── scroll -> camera (full mode) ── */
  useEffect(() => {
    if (mode !== "full" || capture) return;
    const ctx = gsap.context(() => {
      const heroInner = heroInnerRef.current;
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          portalState.hero = self.progress;
          if (heroInner) {
            const o = 1 - Math.min(1, self.progress / 0.4);
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
          if (beamsRef.current) {
            const o = Math.min(1, Math.max(0, (self.progress - 0.55) / 0.4));
            beamsRef.current.style.opacity = o.toFixed(3);
            beamsRef.current.style.visibility = o <= 0.01 ? "hidden" : "visible";
          }
        },
      });
    });
    return () => ctx.revert();
  }, [mode, capture]);

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
  const hue = hot ? current.hue : WHITE;
  const lineOne = useMemo<RotateWord[]>(() => LINE_ONE.map((text) => ({ text, glyph: "circle", hue: WHITE })), []);
  const lineTwo = useMemo<RotateWord[]>(
    () => LINE_TWO.map((text, i) => ({ text, glyph: MENU_ITEMS[i].glyph, hue: i === active ? hue : WHITE })),
    [active, hue],
  );
  const getFloor = useCallback(() => portalState.gateFloorY, []);

  const menuLink = (i: number) => {
    const item = MENU_ITEMS[i];
    const lit = hot && i === active;
    return (
      <li key={item.key}>
        <a
          href={item.route}
          className="portal-word font-display font-semibold uppercase"
          data-lit={lit ? "" : undefined}
          onMouseEnter={() => hold(i)}
          onFocus={() => hold(i)}
          onBlur={release}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            travel(item.route);
          }}
        >
          {i < 3 ? (
            <span aria-hidden="true" className="portal-word__glyph">
              <Glyph kind={item.glyph} size="100%" color={lit ? item.hue : WHITE} strokeWidth={1.5} glow={lit} />
            </span>
          ) : null}
          {MENU_LABEL[item.key]}
        </a>
      </li>
    );
  };

  return (
    <main
      className="portal-world relative bg-black text-white"
      data-mode={mode}
      data-hot={hot ? "" : undefined}
      data-capture={capture ? "" : undefined}
    >
      {viaWarp || capture ? null : <Loader ready={ready} />}

      {/* The world: one fixed canvas behind every section. */}
      {mode === "full" ? (
        <div className="fixed inset-0 z-0" data-scene-ready={ready ? "" : undefined}>
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
        {mode === "lite" ? <LiteHeroBackdrop /> : null}

        <div
          ref={heroInnerRef}
          data-leaving={leaving ? "" : undefined}
          className={`portal-hero ${
            full ? "pointer-events-none fixed inset-0" : "relative min-h-[100dvh]"
          } mx-auto flex max-w-[1400px] flex-col justify-between px-[var(--gutter)] pb-[calc(var(--gutter-y)+64px)] pt-[clamp(104px,15dvh,160px)]`}
        >
          <div className="pointer-events-none">
            <h1 className="portal-headline font-display font-bold uppercase">
              <span className="sr-only">
                We build ad creative, websites and AI systems. Three divisions: Creative, Web Design, AI
                Infrastructure.
              </span>
              <span aria-hidden="true" className="block">
                <HeadlineRotate words={lineOne} index={active} showGlyph={false} showRule={false} />
              </span>
              <span aria-hidden="true" className="block">
                <HeadlineRotate words={lineTwo} index={active} />
              </span>
            </h1>
            <p className="portal-sub mt-6 max-w-[46ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
              Three divisions. Ad creative · Websites · AI infrastructure.
            </p>
          </div>

          <nav aria-label="Divisions" className="portal-menu pointer-events-auto mt-8 w-fit max-w-full" onMouseLeave={release}>
            <p className="chrome-label mb-5 font-mono text-white" aria-live="off">
              {hot ? `${active + 1}/${MENU_ITEMS.length} — ${current.name}` : `0/${MENU_ITEMS.length} — Three divisions`}
            </p>
            <ul className="portal-menu__group text-[length:var(--fs-mid)]">{[0, 1, 2].map(menuLink)}</ul>
            <span aria-hidden="true" className="portal-menu__rule" />
            <ul className="portal-menu__group text-[length:var(--fs-mid)]">{[3, 4].map(menuLink)}</ul>
          </nav>

          <p
            aria-hidden="true"
            className="scroll-tick chrome-label pointer-events-none absolute bottom-[var(--gutter-y)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 font-mono text-white"
          >
            <span>Scroll to explore</span>
            <span className="scroll-tick__line" />
          </p>
        </div>
      </section>

      {/* ── 2. Three doors ───────────────────────────────────────────── */}
      {full ? (
        <section ref={doorsRef} data-rail="Doors" aria-label="Three divisions" className="relative z-10 h-[460dvh]">
          <div className="pointer-events-none fixed inset-0 mx-auto max-w-[1400px] px-[var(--gutter)]">
            {DOOR_ITEMS.map((door, i) => (
              <div
                key={door.key}
                className={`absolute top-1/2 w-[min(440px,40vw)] -translate-y-1/2 ${
                  doorSide(i) < 0 ? "right-[calc(var(--gutter)+72px)]" : "left-[var(--gutter)]"
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
          {DOOR_ITEMS.map((door) => (
            <div key={door.key} data-lite-door="" className="lite-door relative flex min-h-[100dvh] flex-col justify-end overflow-hidden">
              {/* the lit place, composited in CSS — it takes the door's hue only
                  while that door owns the viewport (D2) */}
              <WorldAtmosphere hue={door.hue} />
              <div aria-hidden="true" className="lite-door__shade absolute inset-0" />
              <div className="door-card door-card--static relative">
                <DoorCardBody index={DOOR_ITEMS.indexOf(door)} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── 3. Gate ──────────────────────────────────────────────────── */}
      {full ? (
        <div ref={beamsRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5]" style={{ opacity: 0, visibility: "hidden" }}>
          {/* light raining onto the wet floor around the gate object; never over the copy column or the rail */}
          <BeamsCollision getFloor={getFloor} xRange={[0.5, 0.9]} floorLine={false} />
        </div>
      ) : null}
      <section
        ref={gateRef}
        data-rail="Gate"
        data-rail-next="Contact"
        aria-label="Start a conversation"
        className="portal-gate relative z-10 mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center overflow-hidden px-[var(--gutter)]"
      >
        {mode === "lite" ? (
          <>
            <WorldAtmosphere />
            <div aria-hidden="true" className="lite-door__shade absolute inset-0" />
            <div aria-hidden="true" className="portal-gate__rain absolute inset-x-0 bottom-0">
              <BeamsCollision floor={0.78} xRange={[0.06, 0.8]} />
            </div>
          </>
        ) : null}
        <div className="portal-gate__copy relative flex flex-col items-start">
          <p className="chrome-label mb-7 font-mono text-white">Next — Contact</p>
          <h2 className="gate-title font-display font-bold uppercase">Tell us what you need built</h2>
          <p className="mt-7 max-w-[44ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
            One conversation to work out which division fits: ad creative, a website, or AI infrastructure. You
            talk to the person who builds it.
          </p>
          <GhostButton href="/contact" className="mt-10">
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
      <p className="chrome-label mb-6 flex items-center gap-3 font-mono text-white">
        <Glyph kind={door.glyph} size={14} color={door.hue} strokeWidth={1.25} glow />
        <span>
          0{index + 1}/03 — {door.name}
        </span>
      </p>
      <h2 className="door-card__title font-display text-[length:var(--fs-mid)] font-semibold uppercase">{copy.title}</h2>
      <p className="mt-5 max-w-[62ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
        {copy.body}
      </p>
      <GhostButton href={door.route} className="mt-8">
        {copy.cta}
      </GhostButton>
    </>
  );
}

/* Lite hero backdrop (mobile / reduced motion / no WebGL): the same place the
   3D world renders, composited in CSS. Achromatic at rest (design-system §1) —
   the portal has no hue of its own — so nothing here is preselected. */
function LiteHeroBackdrop() {
  return (
    <div aria-hidden="true" className="lite-backdrop absolute inset-0">
      <WorldAtmosphere />
      <div className="lite-backdrop__shade absolute inset-0" />
    </div>
  );
}

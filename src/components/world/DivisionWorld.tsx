"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";
import WorldAtmosphere from "./WorldAtmosphere";
import { plateForDivision } from "./plates";
import { onWorldProgress, setWorldProgress, worldState } from "./scene/worldState";

/* ─────────────────────────────────────────────────────────────────────────
   DivisionWorld — one continuous lit 3D world behind a whole division page.

   Adoption (see design-loop/division-world.md):

     <main className="relative bg-black text-white">
       <DivisionWorld division="ai" />
       <WorldSection rail="Hero"> … </WorldSection>
       <WorldSection rail="Offer"><WorldCard> … </WorldCard></WorldSection>
     </main>

   The world is a fixed layer at z-0; page sections sit above it at z-10, which
   `WorldSection` already does. Copy that sits over the scene belongs in a
   `WorldCard` (frosted glass, 1px white, radius 0) so it is always readable.
   ───────────────────────────────────────────────────────────────────────── */

// three / R3F never reach the server HTML or the first bundle: the LCP element
// is the page's own headline, and the world arrives behind it.
const DivisionWorldScene = dynamic(() => import("./DivisionWorldScene"), { ssr: false });

type Mode = "pending" | "full" | "lite";

/** one seed per division so no two worlds are the same place */
const SEED: Partial<Record<DivisionKey, number>> = {
  creative: 7,
  web: 4133,
  ai: 91027,
  work: 55,
  contact: 611,
};

function canRunWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface DivisionWorldProps {
  /** which world this is: picks the single hue and the glyph (design-system §1) */
  division: DivisionKey;
  /**
   * Scroll progress source. By default the whole document drives the camera.
   * Pass a ref to drive it from one element's own scroll range instead.
   */
  scrollRef?: React.RefObject<HTMLElement | null>;
  /**
   * Stand in this division's generated world plate (/worlds/{division}-*.webp;
   * Work and Contact use the achromatic portal plate). The plate is the deep
   * background, the 3D is lit foreground over it. Default false while division
   * pages adopt plates in their own world components.
   */
  plate?: boolean;
  /** called once the canvas has drawn its first frames */
  onReady?: () => void;
  className?: string;
}

export default function DivisionWorld({
  division,
  scrollRef,
  onReady,
  plate = false,
  className = "",
}: DivisionWorldProps) {
  const plateWorld = plate ? plateForDivision(division) : undefined;
  // a division plate is painted in its hue already; the portal plate stays
  // colourless for Work and Contact
  const grade = 0;
  const d = DIVISIONS[division];
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);

  /* full 3D, or the composited atmosphere (M5: mobile, reduced motion, no WebGL) */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const small = window.matchMedia("(max-width: 767px)");
    const decide = () => {
      const lite = reduced.matches || small.matches || !canRunWebGL();
      worldState.still = reduced.matches;
      setMode(lite ? "lite" : "full");
    };
    decide();
    reduced.addEventListener("change", decide);
    small.addEventListener("change", decide);
    return () => {
      reduced.removeEventListener("change", decide);
      small.removeEventListener("change", decide);
    };
  }, []);

  /* scroll -> camera. One monotonic progress value for the whole page. */
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = scrollRef?.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = Math.max(1, r.height - window.innerHeight);
        setWorldProgress(-r.top / span);
      } else {
        const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setWorldProgress(window.scrollY / span);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  /* pointer parallax (full mode only, pointer devices only) */
  useEffect(() => {
    if (mode !== "full") return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      worldState.px = (e.clientX / window.innerWidth) * 2 - 1;
      worldState.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mode]);

  return (
    <div
      aria-hidden="true"
      data-world-layer=""
      data-division={division}
      data-mode={mode}
      className={`division-world ${className}`}
      style={{ ["--hue" as string]: d.hue } as CSSProperties}
    >
      {/* Always present: the instant, never-empty backdrop. The canvas is opaque
          and covers it once it is up; on lite / low-end it IS the world. */}
      <WorldAtmosphere hue={plateWorld ? "#ffffff" : d.hue} plate={plateWorld} />
      {mode === "full" ? (
        <div className="division-world__canvas" data-on={ready ? "" : undefined}>
          <DivisionWorldScene
            hue={d.hue}
            glyph={d.glyph}
            seed={SEED[division] ?? 7}
            plate={plateWorld}
            grade={grade}
            onReady={() => {
              setReady(true);
              onReady?.();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ── what pages use to sit on top of the world ─────────────────────────── */

export interface WorldSectionProps {
  /** label the right-edge progress rail shows for this section */
  rail: string;
  /** label the rail shows as "next" when this is the last section */
  railNext?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A full-viewport section that sits above the world and inside the chrome's
 * safe zone, so no fixed chrome element can ever land on its content.
 */
export function WorldSection({ rail, railNext, id, className = "", children }: WorldSectionProps) {
  return (
    <section
      id={id}
      data-rail={rail}
      data-rail-next={railNext}
      className={`world-section ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Frosted-glass substrate for copy that sits over the scene. 0 radius, 1px
 * white line-work, no drop shadow — the blur is what makes the type readable,
 * never an opaque black rectangle.
 */
export function WorldCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`world-card ${className}`}>{children}</div>;
}

/* ── reading the camera from the DOM ───────────────────────────────────── */

/**
 * Subscribe to the world's scroll progress (0..1) without re-rendering on every
 * scroll tick: the callback runs on a rAF-throttled scroll listener.
 *
 *   useWorldProgress((p) => { el.current.style.opacity = String(p); });
 */
export function useWorldProgress(fn: (progress: number) => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => onWorldProgress((p) => ref.current(p)), []);
}

/** The live progress value, for anything that needs to read it imperatively. */
export { worldState } from "./scene/worldState";

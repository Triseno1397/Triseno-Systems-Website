"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { plate as plateFor, type PlateWorld } from "./plates";
import { platePose, plateTransform, type PlatePose } from "./plateMotion";

/* ─────────────────────────────────────────────────────────────────────────
   GlassPanel — real frosted glass that still works inside content faded by
   ContentFade.

   Why it exists: a masked element is a backdrop root, so `backdrop-filter`
   on anything inside a masked section can only blur that section's own
   content, never the world layer behind it — every "frosted" card rendered as
   clear glass. GlassPanel needs no backdrop-filter: it paints a pre-blurred
   copy of the world plate (/worlds/{world}-{desktop|mobile}-glass.webp, a few
   KB) inside itself, positioned every frame so that it lines up exactly with
   the fixed plate behind it — same pose model and same clock as WorldPlate
   (plateMotion.ts). The result is indistinguishable from blurred glass over
   the plate, costs one small image and one transform per panel per frame, and
   is immune to masks, opacity and filters on its ancestors.

   Styling: 1px white hairline, radius 0, a neutral darkening veil so type on
   it always reads (design-system §2: frosted cards allowed; no painted hue).
   ───────────────────────────────────────────────────────────────────────── */

export interface GlassPanelProps {
  /** which world plate is behind this page (portal for Work / Contact) */
  world: PlateWorld;
  as?: "div" | "article" | "aside" | "section" | "li";
  className?: string;
  style?: CSSProperties;
  /** 0..1 darkening of the glass so copy on it reads; default 0.5 */
  veil?: number;
  children?: ReactNode;
}

export default function GlassPanel({
  world,
  as = "div",
  className = "",
  style,
  veil = 0.5,
  children,
}: GlassPanelProps) {
  // every allowed tag is a plain block element; typed as div for the ref
  const Tag = as as "div";
  const panelRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
  const p = plateFor(world);

  useEffect(() => {
    const panel = panelRef.current;
    const copy = plateRef.current;
    if (!panel || !copy) return;
    const pose: PlatePose = { tx: 0, ty: 0, s: 1 };
    let visible = true;
    let last = "";
    const io = new IntersectionObserver((e) => (visible = e[0]?.isIntersecting ?? true), { rootMargin: "20%" });
    io.observe(panel);
    const tick = () => {
      if (!visible) return;
      const r = panel.getBoundingClientRect();
      // the copy is a viewport-sized plate; move it so its (0,0) sits on the
      // viewport's (0,0), then apply the plate's own pose
      const t = plateTransform(platePose(pose), -r.left - 1, -r.top - 1);
      if (t !== last) {
        last = t;
        copy.style.transform = t;
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, []);

  const vars = {
    ...style,
    ["--glass-d" as string]: `url("${p.desktopGlass}")`,
    ["--glass-m" as string]: `url("${p.mobileGlass}")`,
    ["--glass-h-d" as string]: `${p.horizon.desktop * 100}%`,
    ["--glass-h-m" as string]: `${p.horizon.mobile * 100}%`,
    ["--glass-veil" as string]: String(veil),
  } as CSSProperties;

  return (
    <Tag ref={panelRef} className={`glass-panel ${className}`} style={vars}>
      <span aria-hidden="true" className="glass-panel__world">
        <span ref={plateRef} className="glass-panel__plate" />
      </span>
      <span aria-hidden="true" className="glass-panel__veil" />
      <div className="glass-panel__body">{children}</div>
    </Tag>
  );
}

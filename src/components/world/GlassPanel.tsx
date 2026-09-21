"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { plate as plateFor, stationPlates, type PlateWorld } from "./plates";
import { stationFrames } from "./stations";
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
  const copyRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const p = plateFor(world);
  const stations = stationPlates(world);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const pose: PlatePose = { tx: 0, ty: 0, s: 1 };
    let visible = true;
    const last: string[] = [];
    const painted: boolean[] = [];
    const io = new IntersectionObserver((e) => (visible = e[0]?.isIntersecting ?? true), { rootMargin: "20%" });
    io.observe(panel);
    const tick = () => {
      if (!visible) return;
      const r = panel.getBoundingClientRect();
      // each copy is a viewport-sized plate; move it so its (0,0) sits on the
      // viewport's (0,0), then apply the plate's pose and, per station, the
      // same push-in and dissolve as WorldPlate — so the glass always shows
      // the room the camera is actually in
      const base = plateTransform(platePose(pose), -r.left - 1, -r.top - 1);
      const frames = stationFrames(world);
      copyRefs.current.forEach((copy, i) => {
        if (!copy) return;
        const f = frames[i] ?? { alpha: 0, scale: 1, near: false };
        if (f.near && !painted[i]) {
          painted[i] = true;
          copy.style.backgroundImage = `var(--glass-img-${i})`;
        }
        const t = `${base} scale(${f.scale.toFixed(4)})|${f.alpha.toFixed(3)}`;
        if (t !== last[i]) {
          last[i] = t;
          copy.style.transform = `${base} scale(${f.scale.toFixed(4)})`;
          copy.style.opacity = f.alpha.toFixed(3);
          copy.style.visibility = f.alpha <= 0.001 ? "hidden" : "visible";
        }
      });
    };
    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, [world]);

  const vars = {
    ...style,
    ...Object.fromEntries(
      stations.flatMap((st, i) => [
        [`--glass-d-${i}`, `url("${st.desktopGlass}")`],
        [`--glass-m-${i}`, `url("${st.mobileGlass}")`],
      ]),
    ),
    ["--glass-h-d" as string]: `${p.horizon.desktop * 100}%`,
    ["--glass-h-m" as string]: `${p.horizon.mobile * 100}%`,
    ["--glass-veil" as string]: String(veil),
  } as CSSProperties;

  return (
    <Tag ref={panelRef} className={`glass-panel ${className}`} style={vars}>
      <span aria-hidden="true" className="glass-panel__world">
        {stations.map((st, i) => (
          <span
            key={st.desktopGlass}
            ref={(el) => {
              copyRefs.current[i] = el;
            }}
            className="glass-panel__plate"
            style={i === 0 ? undefined : { opacity: 0, visibility: "hidden", backgroundImage: "none" }}
          />
        ))}
      </span>
      <span aria-hidden="true" className="glass-panel__veil" />
      <div className="glass-panel__body">{children}</div>
    </Tag>
  );
}

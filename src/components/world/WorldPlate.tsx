"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { plate as plateFor, type PlateWorld } from "./plates";

/* ─────────────────────────────────────────────────────────────────────────
   A world plate in the DOM — the lit place behind a page on a phone, under
   reduced motion, without WebGL, and wherever a page wants the plate without
   a 3D foreground (see design-loop/world-plates.md).

   Brought to life with transform / opacity only:
   · a slow scroll-driven push-in (scale 1.00 → 1.12 about the vanishing
     point) with a few pixels of vertical drift;
   · a few pixels of pointer parallax and a soft light following the pointer;
   · the light shaft breathing, low haze drifting, dust;
   · a colour grade — `mix-blend-mode: color` keeps the plate's light and
     takes the division hue — plus a hue spill on the floor. White = none: the
     plate stays colourless. Hue swaps dip through no-tint, never blend.
   The blur placeholder paints first; the real plate fades in when decoded.
   ───────────────────────────────────────────────────────────────────────── */

export interface WorldPlateProps {
  world: PlateWorld;
  /** the one hue this surface may carry right now; white (default) = colourless */
  hue?: string;
  /** how strongly the hue grades the plate, 0..1 */
  tint?: number;
  className?: string;
}

const WHITE = "#ffffff";

export default function WorldPlate({ world, hue = WHITE, tint = 0.78, className = "" }: WorldPlateProps) {
  const p = plateFor(world);
  const camRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);

  // hue swaps dip through colourless: the old grade fades out before the new
  // one fades in, so two division hues never mix
  const [shown, setShown] = useState(hue);
  const on = shown === hue && hue.toLowerCase() !== WHITE;
  useEffect(() => {
    if (hue === shown) return;
    const t = window.setTimeout(() => setShown(hue), 260);
    return () => window.clearTimeout(t);
  }, [hue, shown]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cam = camRef.current;
    const light = lightRef.current;
    if (!cam) return;
    let prog = 0;
    let px = 0;
    let py = 0;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const s = 1 + 0.12 * prog;
      cam.style.transform = `translate3d(${(-px * 6).toFixed(2)}px, ${(-py * 4 - prog * 10).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      prog = Math.min(1, Math.max(0, window.scrollY / max));
      queue();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      if (light) {
        light.style.opacity = "1";
        light.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      queue();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const style = {
    ["--plate-hue" as string]: shown,
    ["--plate-tint" as string]: String(tint),
    ["--plate-h-d" as string]: `${p.horizon.desktop * 100}%`,
    ["--plate-h-m" as string]: `${p.horizon.mobile * 100}%`,
    ["--plate-blur-d" as string]: p.desktopBlur ? `url("${p.desktopBlur}")` : "none",
    ["--plate-blur-m" as string]: p.mobileBlur ? `url("${p.mobileBlur}")` : "none",
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      data-world-layer=""
      data-tinted={on ? "" : undefined}
      className={`world-plate ${className}`}
      style={style}
    >
      <div ref={camRef} className="world-plate__cam">
        <picture>
          <source media="(max-width: 767px)" srcSet={p.mobile} />
          <img
            src={p.desktop}
            alt=""
            decoding="async"
            fetchPriority="low"
            className="world-plate__img"
            data-loaded={loaded ? "" : undefined}
            onLoad={() => setLoaded(true)}
          />
        </picture>
        <span className="world-plate__shaft" />
        <span className="world-plate__haze" />
      </div>
      <span className="world-plate__tint" />
      <span className="world-plate__spill" />
      <span ref={lightRef} className="world-plate__light" />
      <span className="world-plate__dust" />
      <span className="world-plate__vignette" />
    </div>
  );
}

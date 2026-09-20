"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ~40px glass orb that lenses what is under it (design-system §4).
 * - Chromium: real refraction through an SVG displacement map used as a
 *   backdrop-filter. Other engines keep the brightness/blur glass fallback.
 * - Over interactive elements the orb grows and inverts what it covers.
 * - Pointer devices only; touch keeps the native cursor. Transform-only motion.
 */

const SIZE = 40;
const MAP = 80;

function buildLensMap(): string {
  const c = document.createElement("canvas");
  c.width = MAP;
  c.height = MAP;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(MAP, MAP);
  const half = MAP / 2;
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const dx = (x - half + 0.5) / half;
      const dy = (y - half + 0.5) / half;
      const r = Math.min(1, Math.hypot(dx, dy));
      // Strong pull toward the centre near the rim, flat in the middle —
      // the profile of a glass ball.
      const k = Math.pow(r, 2.4);
      const i = (y * MAP + x) * 4;
      img.data[i] = 128 + dx * k * 127;
      img.data[i + 1] = 128 + dy * k * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label, [data-cursor='hover']";

export default function OrbCursor() {
  const orbRef = useRef<HTMLDivElement>(null);
  const invertRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setEnabled(fine.matches);
    apply();
    fine.addEventListener("change", apply);
    return () => fine.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setMapUrl(buildLensMap());
    const root = document.documentElement;
    root.classList.add("has-orb");

    const orb = orbRef.current;
    const invert = invertRef.current;
    if (!orb || !invert) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        x = tx;
        y = ty;
        orb.style.opacity = "1";
        invert.style.opacity = "1";
      }
      const el = e.target as Element | null;
      const hot = !!el?.closest?.(INTERACTIVE) || root.hasAttribute("data-cursor-hot");
      targetScale = hot ? 1.7 : 1;
      orb.toggleAttribute("data-hot", hot);
      invert.toggleAttribute("data-hot", hot);
    };
    const onLeave = () => {
      visible = false;
      orb.style.opacity = "0";
      invert.style.opacity = "0";
    };
    const onDown = () => (targetScale *= 0.8);
    const onUp = () => (targetScale = orb.hasAttribute("data-hot") ? 1.7 : 1);

    const loop = () => {
      const k = reduced ? 1 : 0.22;
      x += (tx - x) * k;
      y += (ty - y) * k;
      scale += (targetScale - scale) * (reduced ? 1 : 0.16);
      const tf = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0) scale(${scale.toFixed(3)})`;
      orb.style.transform = tf;
      invert.style.transform = tf;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-orb");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
        <defs>
          <filter
            id="orb-lens"
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
            primitiveUnits="userSpaceOnUse"
          >
            {mapUrl ? (
              <>
                <feImage href={mapUrl} x="0" y="0" width={SIZE} height={SIZE} result="map" preserveAspectRatio="none" />
                <feDisplacementMap in="SourceGraphic" in2="map" scale="-26" xChannelSelector="R" yChannelSelector="G" />
              </>
            ) : null}
          </filter>
        </defs>
      </svg>
      {/* The inverter is its own root-level layer: mix-blend-mode only reaches the
          page when the element is not trapped inside the orb's stacking context. */}
      <div ref={invertRef} aria-hidden="true" className="orb-cursor orb-cursor--invert" style={{ opacity: 0 }}>
        <span className="orb-cursor__invert" />
      </div>
      <div ref={orbRef} aria-hidden="true" className="orb-cursor" style={{ opacity: 0 }}>
        <span className="orb-cursor__glass" />
        <span className="orb-cursor__spec" />
      </div>
    </>
  );
}

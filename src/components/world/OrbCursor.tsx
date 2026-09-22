"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ~40px glass orb cursor (design-system §4).
 * - It IS the pointer: its centre is always exactly where the mouse is (no
 *   easing on position), so it never trails, and never leaves a target the
 *   visitor is pointing at.
 * - Over an interactive target it opens into a hollow 1px ring centred on the
 *   pointer — the letters underneath stay whole and readable.
 * - While the page scrolls under a still mouse, the target under the pointer is
 *   re-checked a few times a second and once at rest, so the hover state is
 *   never stale (a per-frame hit test forced a full layout every frame).
 * - No backdrop-filter: a live blur on a moving element re-rasterises the page
 *   behind it every frame. Pointer devices only; touch keeps the native cursor.
 */

const SIZE = 40;
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label, [data-cursor='hover']";

export default function OrbCursor() {
  const orbRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setEnabled(fine.matches);
    apply();
    fine.addEventListener("change", apply);
    return () => fine.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const orb = orbRef.current;
    if (!orb) return;
    root.classList.add("has-orb");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let x = -100;
    let y = -100;
    let scale = 1;
    let targetScale = 1;
    let pressed = false;
    let hot = false;
    let visible = false;
    let raf = 0;
    let recheck = false;
    let prev = performance.now();

    const setHot = (el: Element | null) => {
      const next = !!el?.closest?.(INTERACTIVE) || root.hasAttribute("data-cursor-hot");
      if (next === hot) return;
      hot = next;
      orb.toggleAttribute("data-hot", hot);
    };
    const place = () => {
      orb.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0) scale(${scale.toFixed(3)})`;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        orb.style.opacity = "1";
      }
      setHot(e.target as Element | null);
      place();
      kick();
    };
    // the page moves under a still mouse: re-test what is under it — but a hit
    // test forces a full style + layout pass, so only ~8 times a second while
    // scrolling, and once more when the scroll comes to rest
    let lastCheck = 0;
    let settle = 0;
    const onScroll = () => {
      const now = performance.now();
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        recheck = true;
        kick();
      }, 140);
      if (now - lastCheck > 120) {
        lastCheck = now;
        recheck = true;
        kick();
      }
    };
    const onLeave = () => {
      visible = false;
      orb.style.opacity = "0";
    };
    const onDown = () => {
      pressed = true;
      kick();
    };
    const onUp = () => {
      pressed = false;
      kick();
    };

    // The loop only runs while something is still changing (scale easing or a
    // scroll re-check), then parks itself — no idle 60fps work.
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, Math.max(0, (now - prev) / 1000));
      prev = now;
      if (recheck && visible) {
        recheck = false;
        setHot(document.elementFromPoint(x, y));
      }
      targetScale = (hot ? 1.5 : 1) * (pressed ? 0.85 : 1);
      const ks = reduced ? 1 : 1 - Math.exp(-dt * 18);
      scale += (targetScale - scale) * ks;
      if (Math.abs(targetScale - scale) < 0.002) scale = targetScale;
      place();
      if (scale !== targetScale || recheck) kick();
    };
    const kick = () => {
      if (!raf) {
        prev = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-orb");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settle);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={orbRef} aria-hidden="true" className="orb-cursor" style={{ opacity: 0 }}>
      <span className="orb-cursor__glass" />
      <span className="orb-cursor__spec" />
    </div>
  );
}

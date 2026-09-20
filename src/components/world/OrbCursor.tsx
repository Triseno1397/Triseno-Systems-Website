"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ~40px glass orb that lenses what is under it (design-system §4).
 * - It is clear white glass: the backdrop is desaturated inside it, so it can
 *   never read as a solid fill of the scene's hue.
 * - It never sits on a word: over a text target it docks beside it as a small
 *   ring (see onMove), so the hovered word's letters stay whole.
 * - Pointer devices only; touch keeps the native cursor. Transform-only motion.
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
    root.classList.add("has-orb");

    const orb = orbRef.current;
    if (!orb) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let raf = 0;
    let dock: { x: number; y: number } | null = null;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        x = tx;
        y = ty;
        orb.style.opacity = "1";
      }
      const el = e.target as Element | null;
      const hit = el?.closest?.(INTERACTIVE) as HTMLElement | null;
      // Over a word-sized target (menu word, button, link) the orb DOCKS beside
      // it instead of sitting on its letters: it shrinks to a small ring just
      // left of the target (right, if there is no room), centred on its line.
      dock = null;
      if (hit && (hit.textContent ?? "").trim()) {
        const r = hit.getBoundingClientRect();
        if (r.height <= 160 && r.width <= 900) {
          const leftX = r.left - 26;
          dock = { x: leftX >= 12 ? leftX : r.right + 26, y: r.top + r.height / 2 };
        }
      }
      const hot = !!hit || root.hasAttribute("data-cursor-hot");
      targetScale = dock ? 0.45 : hot ? 1.12 : 1;
      orb.toggleAttribute("data-hot", hot);
      orb.toggleAttribute("data-docked", !!dock);
    };
    const onLeave = () => {
      visible = false;
      orb.style.opacity = "0";
    };
    const onDown = () => (targetScale *= 0.8);
    const onUp = () => (targetScale = dock ? 0.45 : orb.hasAttribute("data-hot") ? 1.12 : 1);

    let prev = performance.now();
    const loop = (now: number) => {
      // time-based easing: the orb arrives on wall-clock time even when the
      // page can only draw a few frames a second, so a docked ring is always
      // beside the word, never caught half-way across its letters
      const dt = Math.min(0.25, Math.max(0, (now - prev) / 1000));
      prev = now;
      const k = reduced ? 1 : 1 - Math.exp(-dt * 16);
      const ks = reduced ? 1 : 1 - Math.exp(-dt * 11);
      const gx = dock ? dock.x : tx;
      const gy = dock ? dock.y : ty;
      x += (gx - x) * k;
      y += (gy - y) * k;
      scale += (targetScale - scale) * ks;
      const tf = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0) scale(${scale.toFixed(3)})`;
      orb.style.transform = tf;
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
      <div ref={orbRef} aria-hidden="true" className="orb-cursor" style={{ opacity: 0 }}>
        <span className="orb-cursor__glass" />
        <span className="orb-cursor__spec" />
      </div>
    </>
  );
}

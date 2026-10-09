"use client";

import { useEffect, useRef } from "react";
import Glyph from "@/components/world/Glyph";
import { HERO } from "./content";

/**
 * A band of ink across the sheet: the division's offer on a slow, endless
 * belt (CSS only: one translate, two copies of the run). Hovering it slows
 * the belt, and the pointer leaves a trail of cyan pixels in the ink that
 * light up cell by cell and fade (one small 2D canvas, drawn only while a
 * trail is alive). Reduced motion stops the belt and drops the trail.
 */
const RUN = [...HERO.offers, "Reports on autopilot", "Fixed price", "Owned by you"];
const CELL = 12;
const LIFE = 700; // ms a pixel stays lit

export default function SignalTicker() {
  const bandRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!band || !canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lit = new Map<number, number>(); // cell key -> time lit
    let cols = 1;
    let dpr = 1;
    let raf = 0;
    let last: { x: number; y: number } | null = null;

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = band.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      cols = Math.ceil(r.width / CELL) + 1;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(band);

    const light = (x: number, y: number, now: number) => {
      lit.set(Math.floor(y / CELL) * cols + Math.floor(x / CELL), now);
    };
    const onMove = (e: PointerEvent) => {
      const r = band.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const now = performance.now();
      // fill the gap since the last event so fast strokes stay continuous
      if (last) {
        const steps = Math.ceil(Math.hypot(x - last.x, y - last.y) / (CELL * 0.6));
        for (let i = 1; i < steps; i++) light(last.x + ((x - last.x) * i) / steps, last.y + ((y - last.y) * i) / steps, now);
      }
      light(x, y, now);
      last = { x, y };
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onLeave = () => {
      last = null;
    };
    const draw = (now: number) => {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const [key, t] of lit) {
        const age = (now - t) / LIFE;
        if (age >= 1) {
          lit.delete(key);
          continue;
        }
        const cx = (key % cols) * CELL;
        const cy = Math.floor(key / cols) * CELL;
        const a = 1 - age;
        ctx.fillStyle = `rgba(0, 180, 216, ${(a * a * 0.95).toFixed(3)})`;
        const inset = age * CELL * 0.35;
        ctx.fillRect(cx + 1 + inset, cy + 1 + inset, CELL - 2 - inset * 2, CELL - 2 - inset * 2);
      }
      if (lit.size) raf = requestAnimationFrame(draw);
    };
    band.addEventListener("pointermove", onMove);
    band.addEventListener("pointerleave", onLeave);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      band.removeEventListener("pointermove", onMove);
      band.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const run = (hidden: boolean) => (
    <span className="ai-ticker__run" aria-hidden={hidden || undefined}>
      {RUN.map((item) => (
        <span key={item} className="ai-ticker__item">
          <Glyph kind="triangle" size={10} color="#00b4d8" strokeWidth={1.6} />
          {item}
        </span>
      ))}
    </span>
  );
  return (
    <div ref={bandRef} className="ai-ticker relative z-10" role="note" aria-label={RUN.join(", ")}>
      <canvas ref={canvasRef} aria-hidden="true" className="ai-ticker__trail" />
      <div className="ai-ticker__belt" aria-hidden="true">
        {run(true)}
        {run(true)}
      </div>
    </div>
  );
}

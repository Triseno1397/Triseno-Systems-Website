"use client";

import { useEffect, useRef, useState } from "react";
import { glyphPoints } from "@/lib/glyph-path";
import type { GlyphKind } from "@/lib/divisions";

/**
 * Loader = wireframe of the signature object + one progress bar
 * (design-system §4). The wireframe is the same loop geometry the 3D scene
 * uses, drawn as 1px white lines on a 2D canvas so it costs nothing to boot.
 */

const N = 72;
const SEQUENCE: GlyphKind[] = ["circle", "square", "triangle"];
const TUBE = 0.13;

interface LoaderProps {
  /** true once the world behind it can be shown. */
  ready: boolean;
}

export default function Loader({ ready }: LoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const readyRef = useRef(ready);
  const [phase, setPhase] = useState<"loading" | "leaving" | "gone">("loading");
  // The component stays mounted once it is gone (it renders null), so its
  // effect is never cleaned up: without this the draw loop kept running into
  // a detached canvas for as long as the page was open — a wasted frame of
  // canvas work on every tick of every visit.
  const goneRef = useRef(false);
  useEffect(() => {
    goneRef.current = phase === "gone";
  }, [phase]);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const shapes = SEQUENCE.map((k) => glyphPoints(k, N));
    const start = performance.now();
    let progress = 0;
    let raf = 0;
    let left = false;
    let last = start;

    const draw = (now: number) => {
      if (goneRef.current) return; // the loader has left: the loop ends here
      // rAF timestamps can predate performance.now() taken in the effect — clamp.
      const t = Math.max(0, (now - start) / 1000);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;

      // Progress: eases toward 0.9 while waiting, then runs to 1 once ready.
      const target = readyRef.current && t > 0.9 ? 1 : 0.9 * (1 - Math.exp(-t / 1.6));
      // frame-rate independent approach, so a slow GPU does not stretch the wait
      progress += (target - progress) * (1 - Math.exp(-dt * (target === 1 ? 9 : 5)));
      if (target === 1 && progress > 0.985) progress = 1;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      if (countRef.current) countRef.current.textContent = String(Math.round(progress * 100)).padStart(3, "0");
      if (progress >= 1 && !left) {
        left = true;
        setPhase("leaving");
      }

      // Morph through the three division glyphs.
      const cycle = reduced ? 0 : t / 1.3;
      const ia = Math.floor(cycle) % shapes.length;
      const ib = (ia + 1) % shapes.length;
      const f = cycle - Math.floor(cycle);
      const m = f < 0.55 ? 0 : 1 - Math.pow(1 - (f - 0.55) / 0.45, 3);
      const A = shapes[ia];
      const B = shapes[ib];

      const ry = reduced ? 0.5 : t * 0.9;
      const rx = 0.32;
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);

      const project = (x: number, y: number, z: number): [number, number] => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const p = 3.4 / (3.4 - z2);
        return [size / 2 + x1 * p * 62, size / 2 - y1 * p * 62];
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;

      // Four longitudinal edges of a square-section tube + cross-section frames.
      const corners: Array<[number, number]> = [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ];
      const pts: Array<Array<[number, number]>> = [[], [], [], []];
      for (let i = 0; i < N; i++) {
        const px = A[i * 2] + (B[i * 2] - A[i * 2]) * m;
        const py = A[i * 2 + 1] + (B[i * 2 + 1] - A[i * 2 + 1]) * m;
        const len = Math.hypot(px, py) || 1;
        const nx = px / len;
        const ny = py / len;
        corners.forEach(([a, b], c) => {
          pts[c].push(project(px + nx * TUBE * a, py + ny * TUBE * a, TUBE * b));
        });
      }
      ctx.globalAlpha = 0.9;
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        pts[c].forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < N; i += 3) {
        ctx.beginPath();
        for (let c = 0; c < 4; c++) {
          const [x, y] = pts[c][i];
          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Wall-clock guarantee: once the world is ready the loader leaves within
  // 1.4s even if its own animation frames are throttled, and it unmounts
  // (canvas and rAF loop included) 0.9s after that — nothing lingers.
  useEffect(() => {
    if (!ready) return;
    // the world is drawn: half a second for the count to land on 100, then go
    const id = window.setTimeout(() => setPhase((p) => (p === "loading" ? "leaving" : p)), 500);
    return () => window.clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const id = window.setTimeout(() => setPhase("gone"), 600);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      className="world-loader fixed inset-0 z-[900] flex flex-col items-center justify-center bg-black"
      data-leaving={phase === "leaving" ? "" : undefined}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={{ width: 220, height: 220 }} />
      <div className="mt-8 w-[min(240px,60vw)]">
        <div className="relative h-px w-full bg-white/25">
          <span ref={barRef} className="absolute inset-0 origin-left bg-white" style={{ transform: "scaleX(0)" }} />
        </div>
        <div className="mt-4 flex items-center justify-between font-mono text-[12px] uppercase tracking-[0.2em] text-white">
          <span>Triseno Systems</span>
          <span ref={countRef}>000</span>
        </div>
      </div>
    </div>
  );
}

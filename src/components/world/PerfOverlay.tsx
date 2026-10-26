"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * ?perf=1 — a frame-rate readout for testing on a real phone.
 *
 * A small panel in the top corner, kept while you scroll: the frame rate
 * over the last second, the worst frame in it, the share of frames that
 * stuttered (over 33 ms) since the page loaded, the section under the
 * middle of the screen, and the device's own numbers (pixel ratio, cores,
 * memory). Tap it to copy a report of every section's worst stretch, so the
 * numbers can be pasted back. Nothing here runs unless the query is set, and
 * it sticks for the session so it survives moving between pages.
 */

const KEY = "triseno:perf";

interface Bucket {
  frames: number;
  slow: number;
  worst: number;
}

export default function PerfOverlay() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const boxRef = useRef<HTMLButtonElement>(null);
  const linesRef = useRef<HTMLSpanElement>(null);
  const buckets = useRef(new Map<string, Bucket>());

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("perf");
      if (q === "0") window.sessionStorage.removeItem(KEY);
      else if (q) window.sessionStorage.setItem(KEY, "1");
      setOn(!!window.sessionStorage.getItem(KEY));
    } catch {
      setOn(new URLSearchParams(window.location.search).has("perf"));
    }
  }, [pathname]);

  useEffect(() => {
    if (!on) return;
    const lines = linesRef.current;
    if (!lines) return;
    buckets.current.clear();
    let last = performance.now();
    let raf = 0;
    let frames = 0;
    let slow = 0;
    let worst = 0;
    let winFrames = 0;
    let winWorst = 0;
    let winStart = last;
    let section = "-";
    let sectionAt = 0;
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };
    const device = `${window.devicePixelRatio.toFixed(1)}x · ${navigator.hardwareConcurrency || "?"} cores${nav.deviceMemory ? ` · ${nav.deviceMemory} GB` : ""}${nav.connection?.effectiveType ? ` · ${nav.connection.effectiveType}` : ""}`;
    const tick = (now: number) => {
      const d = now - last;
      last = now;
      frames++;
      winFrames++;
      if (d > 33) slow++;
      if (d > worst) worst = d;
      if (d > winWorst) winWorst = d;
      // which section is under the middle of the screen (a cheap read, five times a second)
      if (now - sectionAt > 200) {
        sectionAt = now;
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest("[data-rail]");
        section = el?.getAttribute("data-rail") || "-";
      }
      const b = buckets.current.get(section) ?? { frames: 0, slow: 0, worst: 0 };
      b.frames++;
      if (d > 33) b.slow++;
      if (d > b.worst) b.worst = d;
      buckets.current.set(section, b);
      if (now - winStart >= 1000) {
        const fps = Math.round((winFrames * 1000) / (now - winStart));
        lines.textContent = `${fps} fps · worst ${Math.round(winWorst)} ms\n${((slow / frames) * 100).toFixed(1)}% stuttered · ${Math.round(worst)} ms max\n${section}\n${device}`;
        boxRef.current?.setAttribute("data-grade", fps >= 50 ? "good" : fps >= 30 ? "ok" : "bad");
        winStart = now;
        winFrames = 0;
        winWorst = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, pathname]);

  const copy = () => {
    const rows = [...buckets.current.entries()]
      .filter(([k]) => k !== "-")
      .map(([k, b]) => `${k}: ${((b.slow / b.frames) * 100).toFixed(0)}% stuttered, worst ${Math.round(b.worst)} ms, ${b.frames} frames`);
    const text = `${pathname} · ${navigator.userAgent}\n${rows.join("\n")}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    const box = boxRef.current;
    box?.setAttribute("data-copied", "");
    window.setTimeout(() => box?.removeAttribute("data-copied"), 1200);
  };

  if (!on) return null;
  return (
    <button
      ref={boxRef}
      type="button"
      className="perf-overlay font-mono"
      onClick={copy}
      aria-label="Frame-rate readout. Tap to copy a report for this page."
    >
      <span ref={linesRef}>measuring…</span>
      <i aria-hidden="true">tap to copy report</i>
    </button>
  );
}

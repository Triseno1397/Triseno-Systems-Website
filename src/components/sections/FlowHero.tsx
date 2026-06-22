"use client";

/**
 * Triseno Systems — FlowHero
 * Full-bleed particle flow-field hero with a working speed throttle.
 * Drop-in replacement for the old Hero + HyperspeedField + WarpThrottle + tunnel video.
 *
 * Smooth-by-design: ONE requestAnimationFrame loop, devicePixelRatio capped at 1.5,
 * particle count scaled to viewport, pauses when offscreen (IntersectionObserver) or
 * the tab is hidden, calm static field under prefers-reduced-motion. No dependencies.
 */

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";

function FlowCanvas({ throttleRef }: { throttleRef: React.MutableRefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1, t = 0;
    type P = { x: number; y: number; life: number };
    let parts: P[] = [];
    let speed = 1.0;
    let raf = 0, last = 0, visible = true;

    const spawn = (): P => ({ x: Math.random() * w, y: Math.random() * h, life: Math.random() * 200 });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const r = canvas!.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(950, Math.max(320, Math.floor((w * h) / 1650)));
      parts = new Array(count).fill(0).map(spawn);
      ctx!.fillStyle = "#0a0e1a"; ctx!.fillRect(0, 0, w, h);
    }

    const field = (x: number, y: number, time: number) =>
      (Math.sin(x * 0.0016 + time * 0.0003) +
        Math.cos(y * 0.0015 - time * 0.00022) +
        Math.sin((x + y) * 0.0011 + time * 0.00015)) * 1.15;

    function draw(dt: number) {
      t += dt;
      const target = 0.35 + (throttleRef.current || 0) * 3.3;
      speed += (target - speed) * Math.min(1, dt * 0.004);
      ctx!.fillStyle = "rgba(10,14,26,0.058)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.lineWidth = 1.1;
      ctx!.lineCap = "round";
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const a = field(p.x, p.y, t);
        const nx = p.x + Math.cos(a) * speed, ny = p.y + Math.sin(a) * speed;
        const hue = 188 + Math.sin(a * 1.7) * 14;
        ctx!.strokeStyle = `hsla(${hue},92%,${58 + (throttleRef.current || 0) * 9}%,0.5)`;
        ctx!.beginPath(); ctx!.moveTo(p.x, p.y); ctx!.lineTo(nx, ny); ctx!.stroke();
        p.x = nx; p.y = ny; p.life -= dt * 0.06;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || p.life < 0) parts[i] = spawn();
      }
    }

    function frame(ts: number) {
      const dt = Math.min(48, ts - last || 16); last = ts;
      if (visible) draw(dt);
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(canvas);
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    if (reduce) { for (let i = 0; i < 60; i++) draw(16); }
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, [throttleRef]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />;
}

function Throttle({ throttleRef }: { throttleRef: React.MutableRefObject<number> }) {
  const [val, setVal] = useState(0.42);
  useEffect(() => { throttleRef.current = val; }, [val, throttleRef]);
  return (
    <div
      className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 z-[3] flex flex-col items-center gap-3.5 rounded-2xl px-4 py-5"
      style={{ background: "rgba(13,18,36,0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 0 40px rgba(0,229,255,0.1)" }}
    >
      <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-cyan-400">Flow</span>
      <input
        type="range" min={0} max={1} step={0.01} value={val}
        onChange={(e) => setVal(parseFloat(e.target.value))}
        aria-label="Flow speed"
        className="warp-slider"
        style={{ writingMode: "vertical-lr", direction: "rtl", width: 6, height: 150, accentColor: "#00b4d8", cursor: "ns-resize" }}
      />
      <span className="font-mono text-[13px] font-semibold text-[#e8edf5] tabular-nums">
        {Math.round(val * 100)}<span className="text-[#4a5568] text-[9px]">%</span>
      </span>
    </div>
  );
}

export default function FlowHero() {
  const throttleRef = useRef(0.42);
  return (
    <section className="relative overflow-hidden bg-[#0a0e1a] min-h-[calc(100dvh-112px)] flex items-center">
      <FlowCanvas throttleRef={throttleRef} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(10,14,26,0.94) 0%, rgba(10,14,26,0.62) 48%, rgba(10,14,26,0.12) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(10,14,26,0.5) 0%, transparent 22%, transparent 76%, rgba(10,14,26,0.6) 100%)" }} />
      <Throttle throttleRef={throttleRef} />
      <div className="relative z-[2] max-w-[1400px] mx-auto px-6 lg:px-8 w-full py-20">
        <div className="flex flex-col gap-7 max-w-3xl">
          <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-cyan-400">
            <span aria-hidden className="w-7 h-px bg-current opacity-70" /> AI Infrastructure
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-[#e8edf5]" style={{ textShadow: "0 2px 18px rgba(5,8,16,0.6)" }}>
            We Build the Intelligence Layer{" "}
            <span style={{ background: "linear-gradient(135deg,#00b4d8,#0077b6)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Business Runs On</span>
          </h1>
          <p className="max-w-xl text-lg md:text-xl leading-relaxed text-[#8892a8]">
            AI infrastructure — multi-agent orchestration, workflow compression, and decision-layer automation for organizations that need systems, not features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" size="large" href="/portfolio">Explore Capabilities</Button>
            <Button variant="secondary" size="large" href="/contact">Start a Conversation</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";

function WarpCanvas({ throttleRef }: { throttleRef: React.MutableRefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, cx = 0, cy = 0, dpr = 1;
    type Star = { x: number; y: number; z: number; pz: number };
    let stars: Star[] = [];
    let speed = 0.0008;
    let raf = 0, last = 0, visible = true;

    const spawn = (): Star => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), pz: 0 });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const r = canvas!.getBoundingClientRect();
      w = r.width; h = r.height; cx = w / 2; cy = h / 2;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(520, Math.max(180, Math.floor((w * h) / 2600)));
      stars = new Array(count).fill(0).map(spawn);
    }

    function draw(dt: number) {
      const target = 0.0006 + (throttleRef.current || 0) * 0.0125;
      speed += (target - speed) * Math.min(1, dt * 0.004);
      ctx!.fillStyle = "rgba(10,14,26,0.34)";
      ctx!.fillRect(0, 0, w, h);
      const scale = Math.min(w, h) * 0.9;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.02) { stars[i] = spawn(); stars[i].z = 1; continue; }
        const sx = cx + (s.x / s.z) * scale;
        const sy = cy + (s.y / s.z) * scale;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) { stars[i] = spawn(); stars[i].z = 1; continue; }
        const px = cx + (s.x / s.pz) * scale;
        const py = cy + (s.y / s.pz) * scale;
        const depth = 1 - s.z;
        const size = Math.max(0.4, depth * 2.2);
        const whiteness = Math.min(1, depth * 1.3);
        const r = Math.floor(80 + whiteness * 175);
        const g = Math.floor(200 + whiteness * 55);
        const alpha = 0.15 + depth * 0.75;
        ctx!.strokeStyle = `rgba(${r},${g},255,${alpha})`;
        ctx!.lineWidth = size;
        ctx!.beginPath();
        ctx!.moveTo(px, py);
        ctx!.lineTo(sx, sy);
        ctx!.stroke();
      }
    }

    function frame(t: number) {
      const dt = Math.min(48, t - last || 16);
      last = t;
      if (visible) draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function staticField() {
      ctx!.fillStyle = "rgba(10,14,26,1)";
      ctx!.fillRect(0, 0, w, h);
      const scale = Math.min(w, h) * 0.9;
      for (const s of stars) {
        const sx = cx + (s.x / s.z) * scale;
        const sy = cy + (s.y / s.z) * scale;
        const depth = 1 - s.z;
        ctx!.fillStyle = `rgba(${80 + depth * 175},${200 + depth * 55},255,${0.2 + depth * 0.6})`;
        ctx!.beginPath();
        ctx!.arc(sx, sy, Math.max(0.5, depth * 2), 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    resize();
    window.addEventListener("resize", resize);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(canvas);
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    if (reduce) staticField();
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
  const [val, setVal] = useState(0.06);
  useEffect(() => { throttleRef.current = val; }, [val, throttleRef]);
  return (
    <div
      className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 z-[3] flex flex-col items-center gap-3.5 rounded-2xl px-4 py-5"
      style={{ background: "rgba(13,18,36,0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 0 40px rgba(0,229,255,0.1)" }}
    >
      <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-cyan-400">Warp</span>
      <input
        type="range" min={0} max={1} step={0.01} value={val}
        onChange={(e) => setVal(parseFloat(e.target.value))}
        aria-label="Warp speed"
        className="warp-slider"
        style={{ writingMode: "vertical-lr", direction: "rtl", width: 6, height: 150, accentColor: "#00b4d8", cursor: "ns-resize" }}
      />
      <span className="font-mono text-[13px] font-semibold text-[#e8edf5] tabular-nums">
        {Math.round(val * 100)}<span className="text-[#4a5568] text-[9px]">%</span>
      </span>
    </div>
  );
}

export default function WarpHero() {
  const throttleRef = useRef(0.06);
  return (
    <section className="relative overflow-hidden bg-[#0a0e1a] min-h-[calc(100dvh-112px)] flex items-center">
      <WarpCanvas throttleRef={throttleRef} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(10,14,26,0.92) 0%, rgba(10,14,26,0.6) 48%, rgba(10,14,26,0.08) 100%)" }} />
      <Throttle throttleRef={throttleRef} />
      <div className="relative z-[2] max-w-[1400px] mx-auto px-6 lg:px-8 w-full py-20">
        <div className="flex flex-col gap-7 max-w-3xl">
          <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-cyan-400">
            <span aria-hidden className="w-7 h-px bg-current opacity-70" /> AI Infrastructure
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-[#e8edf5]" style={{ textShadow: "0 2px 14px rgba(5,8,16,0.55)" }}>
            We Build the Intelligence Layer{" "}
            <span style={{ background: "linear-gradient(135deg,#00b4d8,#0077b6)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Business Runs On</span>
          </h1>
          <p className="max-w-xl text-lg md:text-xl leading-relaxed text-[#8892a8]">
            AI infrastructure — multi-agent orchestration, workflow compression, and decision-layer automation for organizations that need systems, not features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" size="large" href="/capabilities">Explore Capabilities</Button>
            <Button variant="secondary" size="large" href="/contact">Start a Conversation</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

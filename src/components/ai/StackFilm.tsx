"use client";

import { useEffect, useRef, useState } from "react";
import "@/app/ai-stackfilm.css";

/**
 * Fig. 03 — the stack, as film. A full-bleed dark plate: a rendered AI
 * infrastructure core (four floating layers, light rising through them; a
 * Kling 3.0 loop from a GPT Image 2.5 still) with a heads-up display drawn
 * over it. Each layer carries a live hotspot pinned to where it sits in the
 * frame; hover previews it, click or tap opens its readout, and the rest of
 * the frame dims around the open layer.
 *
 * The stage keeps the film's own aspect (16:9; 4:5 on phones, cropped to the
 * centre) so the hotspots stay registered to the layers at every width. The
 * loop plays only while on screen; reduced motion and data-saver keep the
 * still.
 */

type Layer = { n: string; name: string; sub: string; body: string; spec: [string, string][]; y: number };

/** bottom to top; y = the layer's height in the frame (0 top, 1 bottom) */
const LAYERS: Layer[] = [
  {
    n: "01",
    name: "Your Data",
    sub: "What you already have",
    body: "Your inbox, your spreadsheets, your store, your files. We connect to what you already use; nothing has to move.",
    spec: [
      ["Connects to", "What you use"],
      ["Moves", "Nothing"],
      ["Stays", "Yours"],
    ],
    y: 0.81,
  },
  {
    n: "02",
    name: "The AI",
    sub: "The part that reads and decides",
    body: "The right AI for the job, taught on your own information so it answers about your business, not the internet.",
    spec: [
      ["Knows", "Your business"],
      ["Checked", "Before launch"],
      ["Unsure?", "Asks a person"],
    ],
    y: 0.59,
  },
  {
    n: "03",
    name: "The Tool",
    sub: "What we build for you",
    body: "The finder, the inbox handler, the report, the app: the piece that does the work, built around how your team works.",
    spec: [
      ["Built in", "Weeks"],
      ["Price", "Fixed"],
      ["Owned by", "You"],
    ],
    y: 0.39,
  },
  {
    n: "04",
    name: "Your Team",
    sub: "Where the results land",
    body: "Answers and updates show up where people already work: email, text, chat or one simple screen. Nothing new to learn.",
    spec: [
      ["Lands in", "Email · text · chat"],
      ["Training", "One short call"],
      ["Support", "A real person"],
    ],
    y: 0.22,
  },
];

/** the stack's centre line in the source frame, and where the labels hang */
const CX = 0.49;
const LABEL_X = 0.79;
const SRC_AR = 16 / 9;

export default function StackFilm() {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [ar, setAr] = useState(SRC_AR);
  const shown = hover ?? open;

  // the stage's aspect decides how much of the frame is cropped at the sides
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    const ro = new ResizeObserver(() => {
      const r = st.getBoundingClientRect();
      if (r.width && r.height) setAr(r.width / r.height);
    });
    ro.observe(st);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conn?.saveData) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // source x -> stage x under object-fit: cover (the frame is cropped at the
  // sides when the stage is narrower than 16:9)
  const sx = (x: number) => (ar >= SRC_AR ? x : 0.5 + (x - 0.5) * (SRC_AR / ar));
  const labelX = Math.min(sx(LABEL_X), 0.94);
  const layer = open !== null ? LAYERS[open] : null;

  return (
    <section data-rail="Stack" aria-labelledby="ai-stackfilm-title" className="ai-sf relative z-10">
      <div className="ai-sf__head">
          <p className="ai-sf__eyebrow font-mono">How it fits</p>
          <h2 id="ai-stackfilm-title" className="ai-sf__title font-display">
            Four layers.
            <br />
            One system.
          </h2>
          <p className="ai-sf__lede">Every tool we build sits on the same four layers. Tap one to see what it does.</p>
        </div>
      <div ref={stageRef} className="ai-sf__stage" data-dim={shown !== null ? "" : undefined}>
        <video
          ref={videoRef}
          className="ai-sf__film"
          src="/videos/ai-stack.mp4"
          poster="/worlds/ai-stack.webp"
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <span aria-hidden="true" className="ai-sf__veil" />
        {shown !== null ? (
          <span
            aria-hidden="true"
            className="ai-sf__focus"
            style={{ left: `${sx(CX) * 100}%`, top: `${LAYERS[shown].y * 100}%` }}
          />
        ) : null}
        <span aria-hidden="true" className="ai-sf__scan" />

        {/* HUD frame */}
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--tl" />
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--tr" />
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--bl" />
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--br" />
        <span aria-hidden="true" className="ai-sf__hud ai-sf__hud--tr font-mono">
          <i className="ai-sf__live" /> Your business · 4 layers
        </span>


        {/* hotspots: a pulse on the layer, a leader out to its label */}
        {LAYERS.map((l, i) => {
          const x = sx(CX);
          const on = shown === i;
          return (
            <div
              key={l.n}
              className="ai-sf__spot"
              data-on={on ? "" : undefined}
              data-open={open === i ? "" : undefined}
              style={{ ["--x" as string]: `${x * 100}%`, ["--y" as string]: `${l.y * 100}%`, ["--lx" as string]: `${labelX * 100}%` }}
            >
              <span aria-hidden="true" className="ai-sf__pulse" />
              <span aria-hidden="true" className="ai-sf__leader" />
              <button
                type="button"
                className="ai-sf__tag font-mono"
                aria-expanded={open === i}
                aria-controls="ai-sf-panel"
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setOpen((o) => (o === i ? null : i))}
              >
                <b>{l.n}</b>
                <span>{l.name}</span>
              </button>
            </div>
          );
        })}

        <div id="ai-sf-panel" className="ai-sf__panel" data-show={layer ? "" : undefined} aria-live="polite">
          {layer ? (
            <div key={layer.n} className="ai-sf__panel-in">
              <p className="ai-sf__panel-n font-mono">
                Layer {layer.n} / 04
                <button type="button" className="ai-sf__close" onClick={() => setOpen(null)} aria-label="Close layer">
                  ×
                </button>
              </p>
              <h3 className="ai-sf__panel-title font-display">{layer.name}</h3>
              <p className="ai-sf__panel-sub font-mono">{layer.sub}</p>
              <p className="ai-sf__panel-body">{layer.body}</p>
              <dl className="ai-sf__spec font-mono">
                {layer.spec.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>

        <p aria-hidden="true" className="ai-sf__hud ai-sf__hud--bl font-mono">
          Your data in · finished work out
        </p>
      </div>
    </section>
  );
}

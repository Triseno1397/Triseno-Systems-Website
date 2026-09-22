"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { addFrameJob } from "@/components/world/frameLoop";
import { DIVISIONS } from "@/lib/divisions";
import type { WorkItem } from "./content";

/* ─────────────────────────────────────────────────────────────────────────
   The cursor-follow preview of the Work index (desktop, pointer devices).

   One media frame rides BEHIND the list type (the words stay whole and on
   top; the media is dimmed so white display type always reads over it). It
   trails the pointer on a spring and distorts with its own velocity:
     · the frame leans into the direction of travel (rotate) and swells a
       little with speed (scale);
     · a clip-path quad shears — the trailing edge lags, the leading edge
       leads — so the image stretches like a sheet being pulled;
     · an SVG turbulence displacement (filter) ripples the media in
       proportion to speed, and settles to nothing at rest.
   Switching entries wipes the new media in with a clip-path in the
   direction the pointer travelled down (or up) the list.
   Only transform / clip-path / filter / opacity change, on the GSAP ticker.
   Keyboard focus docks the frame beside the focused row, undistorted.
   ───────────────────────────────────────────────────────────────────────── */

interface Layer {
  n: number;
  item: WorkItem;
  dir: 1 | -1;
}

export interface PreviewTarget {
  /** stage-relative point the frame should travel to, or null = follow pointer */
  dock: { x: number; y: number } | null;
}

interface WorkPreviewProps {
  stageRef: RefObject<HTMLDivElement | null>;
  item: WorkItem | null;
  /** index of the active entry in the visible list — sets the wipe direction */
  order: number;
  targetRef: RefObject<PreviewTarget>;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function WorkPreview({ stageRef, item, order, targetRef }: WorkPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const counter = useRef(0);
  const lastOrder = useRef(order);

  // a new entry becomes the top layer; older layers are trimmed once it has wiped in
  useEffect(() => {
    if (!item) return;
    const dir: 1 | -1 = order >= lastOrder.current ? 1 : -1;
    lastOrder.current = order;
    setLayers((ls) => {
      if (ls.length && ls[ls.length - 1].item.id === item.id) return ls;
      return [...ls.slice(-2), { n: ++counter.current, item, dir }];
    });
    const t = window.setTimeout(() => setLayers((ls) => ls.slice(-1)), 900);
    return () => window.clearTimeout(t);
  }, [item, order]);

  useEffect(() => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    const stage = stageRef.current;
    if (!frame || !media || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // WebKit (not Chromium) renders url() filters on HTML poorly: skip the ripple there
    const ua = navigator.userAgent;
    const rippleOk = !(/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg/.test(ua));

    let cx = -1; // last pointer, client coords
    let cy = -1;
    let x = 0;
    let y = 0;
    let started = false;
    let svx = 0;
    let svy = 0;
    let lastKey = "";
    let lastDisp = -1;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cx = e.clientX;
      cy = e.clientY;
    };

    // sizes are measured in the frame loop's read phase; the tick only writes
    let r = stage.getBoundingClientRect();
    let w = frame.offsetWidth;
    let h = frame.offsetHeight;
    const read = () => {
      r = stage.getBoundingClientRect();
      w = frame.offsetWidth;
      h = frame.offsetHeight;
    };
    const tick = (_t: number, dt: number) => {
      const dock = targetRef.current?.dock ?? null;
      let tx: number;
      let ty: number;
      if (dock) {
        tx = dock.x;
        ty = dock.y;
      } else if (cx >= 0) {
        tx = cx - r.left;
        ty = cy - r.top;
      } else return;
      if (!started || reduced) {
        started = true;
        x = tx;
        y = ty;
      }
      // frame-rate independent spring toward the target
      const k = 1 - Math.pow(1 - 0.14, Math.min(4, dt / 16.67));
      const px = x;
      const py = y;
      x += (tx - x) * k;
      y += (ty - y) * k;
      const f = 16.67 / Math.max(1, dt);
      svx = svx * 0.78 + (x - px) * f * 0.22;
      svy = svy * 0.78 + (y - py) * f * 0.22;
      if (reduced || dock) {
        svx = 0;
        svy = 0;
      }
      const speed = Math.hypot(svx, svy);

      const rot = clamp(svx * 0.32, -9, 9);
      const sc = 1 + Math.min(speed, 70) * 0.0022;
      // the sheet shears: trailing edge lags behind, leading edge pulls ahead
      const ax = clamp(-svx * 0.18, -7, 7); // top edge, % of width
      const bx = clamp(svx * 0.1, -5, 5); // bottom edge
      const ly = clamp(-svy * 0.16, -7, 7); // left edge, % of height
      const ry = clamp(svy * 0.1, -5, 5); // right edge
      const clip = `polygon(${(6 + ax).toFixed(2)}% ${(6 + ly).toFixed(2)}%, ${(94 + ax).toFixed(2)}% ${(6 + ry).toFixed(2)}%, ${(94 + bx).toFixed(2)}% ${(94 + ry).toFixed(2)}%, ${(6 + bx).toFixed(2)}% ${(94 + ly).toFixed(2)}%)`;
      const transform = `translate3d(${(x - w * 0.36).toFixed(1)}px, ${(y - h * 0.5).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      const key = transform + clip;
      if (key !== lastKey) {
        lastKey = key;
        frame.style.transform = transform;
        media.style.clipPath = clip;
      }
      // the ripple is an SVG displacement filter, rasterised on the CPU over a
      // playing video: it runs only on a real flick of the cursor, and never
      // while the page is scrolling (the sheet still leans and shears then)
      const scrolling = document.documentElement.classList.contains("lenis-scrolling");
      const disp = rippleOk && !scrolling && speed > 10 ? Math.round(Math.min(46, (speed - 10) * 1.3)) : 0;
      if (disp !== lastDisp) {
        lastDisp = disp;
        dispRef.current?.setAttribute("scale", String(disp));
        media.style.filter = disp > 0 ? "url(#work-ripple)" : "";
      }
    };

    let lastT = performance.now();
    const stop = addFrameJob({
      read,
      write: () => {
        const now = performance.now();
        const dt = now - lastT;
        lastT = now;
        tick(0, dt);
      },
    });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
    };
  }, [stageRef, targetRef]);

  const hue = item ? DIVISIONS[item.division].hue : "#ffffff";

  return (
    <div
      ref={frameRef}
      aria-hidden="true"
      className="work-preview"
      data-on={item ? "" : undefined}
      style={{ ["--row-hue" as string]: hue }}
    >
      <svg className="work-preview__defs" width="0" height="0" focusable="false">
        <filter id="work-ripple" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="7" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div ref={mediaRef} className="work-preview__media">
        {layers.map((l) => (
          <div key={l.n} className="work-preview__layer" data-dir={l.dir > 0 ? "down" : "up"}>
            {l.item.media.kind === "video" ? (
              <video
                src={l.item.media.src}
                poster={l.item.media.poster}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
                style={{ objectPosition: l.item.media.position }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.item.media.src} alt="" decoding="async" style={{ objectPosition: l.item.media.position }} />
            )}
          </div>
        ))}
      </div>
      {item ? (
        <span className="work-preview__caption">
          <b>{DIVISIONS[item.division].name}</b> — {item.kind}
        </span>
      ) : null}
    </div>
  );
}

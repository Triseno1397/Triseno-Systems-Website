"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GlassPanel from "@/components/world/GlassPanel";
import { addFrameJob } from "@/components/world/frameLoop";
import { deviceClass, gpuClass } from "@/lib/device";
import { MARGIN, TUNING, createDepthCard, type CardTuning, type DepthCard } from "./depthCard";

gsap.registerPlugin(ScrollTrigger);

/** the frame's chrome around its viewport, CSS pixels (web.css: .web-bezel, .web-browser__bar) */
const PAD = 9;
const BAR = 32;
/** seconds for one flight into the canyon */
const PERIOD = 26;
/** where a flight is once it has come out of the light: where it waits to begin */
const CLEAR = 0.09;
/** how much faster it travels while the card is held */
const DIVE = 7;
/** the card's own lean toward the pointer, degrees */
const LEAN_Y = 8;
const LEAN_X = 5.5;

/**
 * The page is the demo: a large 3D card.
 *
 * Mechanical starting points: 21st.dev "container scroll animation" (the frame
 * lies on the floor and stands up as the page scrolls: the section's one
 * scroll moment, unchanged) and a 3D card effect (it leans toward the
 * pointer). Tailored: the card is one window onto a canyon with real depth,
 * flown into for good, with the nearest ferns and rocks standing out of the
 * frame (depthCard.ts). Moving across it looks around; holding it dives.
 *
 * Nothing the card does is driven by scroll. It runs from the page's shared
 * frame loop, only while it is on screen.
 * Reduced motion: the frame upright, the card drawn once, still.
 */
export default function DemoFrame() {
  const rootRef = useRef<HTMLElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uprightRef = useRef(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = rootRef.current;
        const device = deviceRef.current;
        if (!root || !device) return;

        const small = window.matchMedia("(max-width: 767px)").matches;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            invalidateOnRefresh: true,
            // the flight waits for the frame to stand (a gate, not a drive)
            onUpdate: (self) => {
              if (self.progress > 0.42) uprightRef.current = true;
            },
          },
        });

        tl.fromTo(
          device,
          {
            // phones start less flat, so the lying-down frame never leaves
            // most of a small screen empty
            rotateX: small ? 38 : 64,
            yPercent: small ? 4 : 6,
            scale: small ? 0.8 : 0.62,
            transformOrigin: "50% 100%",
          },
          {
            rotateX: 0,
            yPercent: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          0,
        );
        tl.fromTo(
          ".web-demo__mirror",
          { opacity: 0.1, scaleY: 0.4 },
          { opacity: 0.55, scaleY: 1, duration: 0.5 },
          0,
        );
        tl.fromTo(
          ".web-demo__shine",
          { opacity: 0.5 },
          { opacity: 0, duration: 0.5 },
          0,
        );
        // the heading gives the stage to the card as it stands
        tl.fromTo(".web-demo__head", { autoAlpha: 1, yPercent: 0 }, { autoAlpha: 0, yPercent: -18, duration: 0.16, ease: "power1.in" }, 0.05);
        // upright, it holds: the rest of the section is the visitor's
        tl.to({}, { duration: 0.5 });
      });
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const root = rootRef.current;
    const rig = rigRef.current;
    const tiltEl = tiltRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!root || !rig || !tiltEl || !viewport || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cls = deviceClass();
    const u = new URLSearchParams(window.location.search);
    // ?card=vx,vy,travel,lean,glass tunes it; ?cardf=0.5 holds the flight
    // at a point; ?cardt=0.6,-0.3 holds a tilt
    const tune: CardTuning = { ...TUNING };
    (u.get("card") ?? "").split(",").forEach((v, i) => {
      const key = (["vx", "vy", "travel", "lean", "glass"] as const)[i];
      if (key && v !== "" && !Number.isNaN(Number(v))) tune[key] = Number(v);
    });
    const holdFrac = u.has("cardf") ? Number(u.get("cardf")) : -1;
    const holdTilt = u.has("cardt") ? (u.get("cardt") ?? "").split(",").map(Number) : null;

    let card: DepthCard | null = null;
    let alive = true;
    let started = false;
    let inView = false;
    const s = {
      w: 0,
      h: 0,
      px: 0,
      py: 0,
      moved: false,
      lastMove: -1e9,
      // the rig's box, measured in the read phase: the card is centred in it
      rx: 0,
      ry: 0,
      rw: 0,
      measured: false,
      tx: 0,
      ty: 0,
      frac: CLEAR,
      speed: 1,
      held: false,
      last: -1,
      still: true, // reduced motion: one frame is owed
    };

    // ?cardr=0.5 scales the canvas, ?cardx=nodraw|notilt drops one cost: for measuring
    const resScale = u.has("cardr") ? Number(u.get("cardr")) : 1;
    const drop = u.get("cardx") ?? "";
    // Sharp where the machine can afford it. Integrated graphics draw the card
    // at three quarters of the size and let the browser scale it: it is a
    // photograph in motion, and the frame time matters more than the pixels.
    let weak = false;
    const dpr = () => Math.min(window.devicePixelRatio || 1, cls === "high" ? 2 : cls === "mid" ? 1.5 : 1) * (weak ? 0.75 : 1) * resScale;
    const size = () => {
      if (!card || s.w < 2 || s.h < 2) return;
      // the canvas is larger than the window: it overhangs the bezel
      canvas.style.left = `${PAD - s.w * MARGIN}px`;
      canvas.style.top = `${PAD + BAR - s.h * MARGIN}px`;
      canvas.style.width = `${s.w * (1 + MARGIN * 2)}px`;
      canvas.style.height = `${s.h * (1 + MARGIN * 2)}px`;
      card.resize({ width: s.w, height: s.h, dpr: dpr() });
      s.still = true;
    };

    const start = async () => {
      if (started) return;
      started = true;
      const cs = getComputedStyle(root);
      const fonts = {
        sans: `${cs.getPropertyValue("--font-geist-sans").trim() || "system-ui"}, system-ui, sans-serif`,
        mono: `${cs.getPropertyValue("--font-geist-mono").trim() || "ui-monospace"}, ui-monospace, monospace`,
      };
      // the type is drawn to a canvas: its fonts have to be in before it is
      try {
        await Promise.all([`500 16px ${fonts.sans}`, `600 16px ${fonts.sans}`, `400 16px ${fonts.mono}`].map((f) => document.fonts.load(f)));
      } catch {
        /* the fallbacks draw instead */
      }
      if (!alive) return;
      const large = !window.matchMedia("(max-width: 767px)").matches && cls !== "low";
      card = createDepthCard(canvas, fonts, large, tune);
      if (!card) {
        // no WebGL2: the landscape, still
        viewport.setAttribute("data-still", "");
        return;
      }
      weak = gpuClass(card.gpu) !== "ok";
      card.quality(u.has("cardq") ? Number(u.get("cardq")) : weak || cls === "low" ? 0.65 : 1);
      size();
      card.ready.then(
        () => {
          if (!alive) return;
          s.still = true;
          canvas.setAttribute("data-on", "");
        },
        () => viewport.setAttribute("data-still", ""),
      );
    };

    // the card's size, without reading layout: the observer hands it over
    let resizeT = 0;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      s.w = r.width;
      s.h = r.height;
      s.measured = false;
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(size, card ? 160 : 0);
    });
    ro.observe(viewport);

    // its files load as the section comes near; it only draws while on screen
    const near = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && start(), { rootMargin: "150% 0px" });
    near.observe(root);
    const seen = new IntersectionObserver((e) => {
      inView = e[e.length - 1].isIntersecting;
      if (!inView) s.held = false;
    });
    seen.observe(root);

    const onMove = (e: PointerEvent) => {
      s.px = e.clientX;
      s.py = e.clientY;
      s.moved = true;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      s.held = true;
      onMove(e);
      root.setAttribute("data-used", "");
    };
    const onUp = () => (s.held = false);
    const hot = () => document.documentElement.setAttribute("data-cursor-hot", "");
    const cold = () => document.documentElement.removeAttribute("data-cursor-hot");
    if (!reduce) {
      root.addEventListener("pointermove", onMove, { passive: true });
      viewport.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      viewport.addEventListener("pointerenter", hot);
      viewport.addEventListener("pointerleave", cold);
    }

    const stop = addFrameJob({
      read() {
        if (reduce || !inView || s.measured || !s.moved) return;
        const r = rig.getBoundingClientRect();
        s.rx = r.left;
        s.ry = r.top;
        s.rw = r.width;
        s.measured = true;
      },
      write(time) {
        const dt = s.last < 0 ? 0 : Math.min(0.05, time - s.last);
        s.last = time;
        if (!card || !inView || document.hidden) return;
        if (reduce) {
          if (s.still) card.draw(0, 0, CLEAR, 0, false);
          s.still = false;
          return;
        }
        if (s.moved) {
          s.moved = false;
          s.lastMove = time;
        }
        // where the pointer is on the card; left alone, it sways on its own
        const idle = time - s.lastMove > 2.4 || !s.measured;
        let gx: number;
        let gy: number;
        if (holdTilt) {
          gx = holdTilt[0] || 0;
          gy = holdTilt[1] || 0;
        } else if (idle) {
          gx = Math.sin(time * 0.31) * 0.36;
          gy = Math.sin(time * 0.23 + 1) * 0.24;
        } else {
          const cardH = s.h + BAR + PAD * 2;
          gx = Math.max(-1, Math.min(1, (s.px - (s.rx + s.rw / 2)) / (s.w * 0.5 + 1)));
          gy = Math.max(-1, Math.min(1, (s.py - (s.ry + cardH / 2)) / (cardH * 0.5 + 1)));
        }
        const k = 1 - Math.exp(-dt * (idle ? 1.4 : 5));
        s.tx += (gx - s.tx) * k;
        s.ty += (gy - s.ty) * k;
        s.speed += ((s.held ? DIVE : 1) - s.speed) * (1 - Math.exp(-dt * 2.6));
        if (uprightRef.current || holdFrac >= 0) s.frac = (s.frac + (dt * s.speed) / PERIOD) % 1;
        if (drop !== "notilt") tiltEl.style.transform = `rotateY(${(s.tx * LEAN_Y).toFixed(3)}deg) rotateX(${(-s.ty * LEAN_X).toFixed(3)}deg)`;
        if (drop !== "nodraw") card.draw(s.tx, s.ty, holdFrac >= 0 ? holdFrac : s.frac, time, cls !== "low");
      },
    });

    return () => {
      alive = false;
      stop();
      ro.disconnect();
      near.disconnect();
      seen.disconnect();
      window.clearTimeout(resizeT);
      root.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      viewport.removeEventListener("pointerenter", hot);
      viewport.removeEventListener("pointerleave", cold);
      cold();
      card?.dispose();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="web-demo"
      data-rail="Demo"
      data-station="demo"
      className="web-demo"
    >
      <div className="web-demo__stage">
        <header className="web-demo__head">
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            02 — Proof you can step into
          </p>
          <h2 className="web-h2">The page is the demo</h2>
          <p className="web-body">
            Keep scrolling and the frame stands up. Then it is yours: a window
            you can lean into. Move across it to look around, hold it to fly
            on in.
          </p>
        </header>

        <div ref={rigRef} className="web-demo__rig">
          <div ref={deviceRef} className="web-demo__device">
            <div ref={tiltRef} className="web-demo__tilt">
              <GlassPanel world="web" className="web-bezel">
                <div className="web-browser__bar">
                  <span aria-hidden="true" className="web-browser__dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="web-browser__url">orrinfalls.example</span>
                  <span className="web-browser__tag">Concept</span>
                </div>
                <div
                  ref={viewportRef}
                  className="web-demo__viewport web-card"
                  role="img"
                  aria-label="Concept site for a fictional canyon lodge, Orrin Falls: a bright canyon with two waterfalls, seen as through a window, the camera travelling into it."
                >
                  <span aria-hidden="true" className="web-demo__shine" />
                </div>
              </GlassPanel>
              {/* over the frame, and larger than its window: what is nearer
                  than the glass stands past its edges */}
              <canvas ref={canvasRef} className="web-card__canvas" aria-hidden="true" />
              <span aria-hidden="true" className="web-card__hint">
                <span className="web-card__hint-fine">Move to look around</span>
                <span className="web-card__hint-touch">Drag to look</span>
                <i />
                Hold to dive
              </span>
            </div>
          </div>
          <span aria-hidden="true" className="web-demo__mirror" />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GlassPanel from "@/components/world/GlassPanel";
import { addFrameJob, frameInterval } from "@/components/world/frameLoop";
import { deviceClass, gpuClass } from "@/lib/device";
import { MARGIN, SCENES, TUNING, createDepthCard, type CardTuning, type DepthCard } from "./depthCard";

gsap.registerPlugin(ScrollTrigger);

/** the frame's chrome around its viewport, CSS pixels (web.css: .web-bezel, .web-browser__bar) */
const PAD = 9;
const BAR = 32;
/** seconds for one flight into the canyon */
const PERIOD = 22;
/** where a flight is once it has come out of the light: where it waits to begin */
const CLEAR = 0.09;
/** Immersion: the pointer held still on the card this long, and the card
 *  comes forward, growing to fill most of the screen while the camera eases
 *  into a slow push; the pointer moving at all sends it back. */
const IMMERSE_AFTER = 2.5;
/** how far (px) the pointer may drift and still count as still */
const IMMERSE_SLOP = 3;
/** how much of the screen's width the card may fill when immersed; its
 *  height is what lies between the page's top and bottom fades (globals.css
 *  --fade-top / --fade-bottom), so the address bar never goes under one */
const IMMERSE_FILL_W = 0.94;
const fades = () => {
  const vh = window.innerHeight;
  return { top: Math.min(128, Math.max(112, vh * 0.14)) * 0.8, bottom: Math.min(144, Math.max(124, vh * 0.16)) * 0.6 };
};
/** how much faster the flight runs when immersed, and while the card is held */
const IMMERSE_SPEED = 1.9;
const DIVE = 3;
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
 * frame (depthCard.ts). Moving across it looks around; holding the pointer
 * still on it brings it forward, filling the screen, into a slow push-in.
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
  const cardRef = useRef<DepthCard | null>(null);
  // over the scene switch: resting there is choosing, not flying
  const overSwitch = useRef(false);
  const [scene, setScene] = useState(0);
  const [changing, setChanging] = useState(false);
  const pickScene = (i: number) => {
    const card = cardRef.current;
    if (!card || i === card.scene()) return;
    setScene(i);
    setChanging(true);
    card.show(i).then(() => window.setTimeout(() => setChanging(false), 1900));
  };

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
              // the switch shows once the frame stands
              root.toggleAttribute("data-upright", self.progress > 0.4);
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
    const device = deviceRef.current;
    if (!root || !rig || !tiltEl || !viewport || !canvas || !device) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cls = deviceClass();
    const u = new URLSearchParams(window.location.search);
    // ?card=travel,lean,glass tunes it; ?cardf=0.5 holds the flight at a
    // point; ?cardt=0.6,-0.3 holds a tilt; ?cards=1 opens on another scene
    const tune: CardTuning = { ...TUNING };
    (u.get("card") ?? "").split(",").forEach((v, i) => {
      const key = (["travel", "lean", "glass"] as const)[i];
      if (key && v !== "" && !Number.isNaN(Number(v))) tune[key] = Number(v);
    });
    const holdFrac = u.has("cardf") ? Number(u.get("cardf")) : -1;
    const holdTilt = u.has("cardt") ? (u.get("cardt") ?? "").split(",").map(Number) : null;

    let card: DepthCard | null = null;
    let alive = true;
    let started = false;
    let inView = false;
    const gov = { t0: 0, n: 0, slow: 0 };
    // ?cardd: the card's state on window, for the design-loop tools
    const dbgCard = u.has("cardd");
    const s = {
      w: 0,
      h: 0,
      // the pointer, anywhere on the page (the card can arrive under a
      // pointer that never moved: the page scrolled it there)
      px: -1e4,
      py: -1e4,
      known: false,
      moved: false,
      lastMove: -1e9,
      // where the pointer came to rest, and when
      ax: 0,
      ay: 0,
      at: 0,
      // the window's box on screen, measured every frame in the read phase
      vl: 0,
      vt: 0,
      vw: 0,
      vh: 0,
      measured: false,
      tx: 0,
      ty: 0,
      frac: CLEAR,
      speed: 1,
      held: false,
      over: false,
      rest: 0,
      // immersion 0..1, and the device's own box (untransformed by it)
      imm: 0,
      dl: 0,
      dt: 0,
      dw: 0,
      dh: 0,
      // the backing store's extra density while the card is enlarged
      boost: 1,
      last: -1,
      still: true, // a frame is owed (after a resize, or once for reduced motion)
      odd: false,
      upright: false,
    };

    // ?cardr=0.5 scales the canvas, ?cardx=nodraw|notilt drops one cost: for measuring
    const resScale = u.has("cardr") ? Number(u.get("cardr")) : 1;
    const drop = u.get("cardx") ?? "";
    // Sharp where the machine can afford it. Integrated graphics draw the card
    // at three quarters of the size and let the browser scale it: it is a
    // photograph in motion, and the frame time matters more than the pixels.
    // Drawn at the screen's full density: the picture is the point of the
    // section. The governor's share steps it down only if frames run long.
    let govern = 1;
    // integrated graphics: the enlarged card is drawn a little softer
    let weak = false;
    const dpr = () => Math.min(Math.min(window.devicePixelRatio || 1, 2) * s.boost, 2.5) * govern * resScale;
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
      cardRef.current = card;
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
          root.setAttribute("data-card", "");
          const open = Number(u.get("cards") ?? 0);
          if (open > 0 && open < SCENES.length) {
            setScene(open);
            card?.show(open);
          }
          // the other worlds arrive in idle time, so a switch is immediate
          window.setTimeout(() => SCENES.forEach((_, i) => card?.preload(i)), 2500);
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
      if (e.pointerType === "touch") return;
      s.px = e.clientX;
      s.py = e.clientY;
      s.known = true;
      s.moved = true;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      s.held = true;
      s.px = e.clientX;
      s.py = e.clientY;
      s.known = true;
      root.setAttribute("data-used", "");
    };
    const onUp = () => (s.held = false);
    const hot = () => document.documentElement.setAttribute("data-cursor-hot", "");
    const cold = () => document.documentElement.removeAttribute("data-cursor-hot");
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      viewport.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      viewport.addEventListener("pointerenter", hot);
      viewport.addEventListener("pointerleave", cold);
    }

    const stop = addFrameJob({
      read() {
        // one measurement a frame while the card is on screen: the page may
        // have scrolled it under a pointer that never moved
        if (reduce || !inView) return;
        const r = viewport.getBoundingClientRect();
        s.vl = r.left;
        s.vt = r.top;
        s.vw = r.width;
        s.vh = r.height;
        // the device is not enlarged by immersion (the tilt layer inside it
        // is): its box is where the card stands at rest
        const d = device.getBoundingClientRect();
        s.dl = d.left;
        s.dt = d.top;
        s.dw = d.width;
        s.dh = d.height;
        s.measured = true;
      },
      write(time) {
        const raw = s.last < 0 ? 0 : time - s.last;
        const dt = Math.min(0.05, raw);
        s.last = time;
        if (!card || !inView || document.hidden) return;
        // The governor: the frame budget on a display of any rate, and how
        // often it was blown over the last two seconds. Past a quarter, the
        // canvas steps down a notch (never below 60% of its size); it never
        // steps back up, so it cannot oscillate.
        if (!reduce && raw > 0 && raw < 0.25 && s.upright) {
          gov.n++;
          if (raw > Math.max(frameInterval(), 1 / 60) * 1.45) gov.slow++;
          if (time - gov.t0 > 2) {
            if (gov.n > 30 && gov.slow / gov.n > 0.25 && govern > 0.8) {
              govern = Math.max(0.8, govern - 0.1);
              size();
            }
            gov.t0 = time;
            gov.n = gov.slow = 0;
          }
        }
        if (reduce) {
          if (s.still) card.draw(0, 0, CLEAR, 0, false);
          s.still = false;
          return;
        }
        if (s.moved) {
          s.moved = false;
          s.lastMove = time;
          // a resting pointer may drift a few pixels and still be resting
          if (Math.hypot(s.px - s.ax, s.py - s.ay) > IMMERSE_SLOP) {
            s.ax = s.px;
            s.ay = s.py;
            s.at = time;
          }
        }
        const onCard =
          s.known && s.measured && !overSwitch.current && s.px > s.vl && s.px < s.vl + s.vw && s.py > s.vt && s.py < s.vt + s.vh;
        // where the pointer is on the card; left alone, it sways on its own
        const idle = !onCard && (time - s.lastMove > 2.4 || !s.measured);
        let gx: number;
        let gy: number;
        if (holdTilt) {
          gx = holdTilt[0] || 0;
          gy = holdTilt[1] || 0;
        } else if (idle) {
          gx = Math.sin(time * 0.31) * 0.36;
          gy = Math.sin(time * 0.23 + 1) * 0.24;
        } else {
          gx = Math.max(-1, Math.min(1, (s.px - (s.vl + s.vw / 2)) / (s.vw * 0.5 + 1)));
          gy = Math.max(-1, Math.min(1, (s.py - (s.vt + s.vh / 2)) / (s.vh * 0.5 + 1)));
        }
        const k = 1 - Math.exp(-dt * (idle ? 1.4 : 5));
        s.tx += (gx - s.tx) * k;
        s.ty += (gy - s.ty) * k;
        // Held still on the card long enough, it comes forward and the camera
        // eases into a slow push; the pointer moving at all sends it back.
        const still = onCard && uprightRef.current && !s.held ? Math.min(1, (time - s.at) / IMMERSE_AFTER) : 0;
        const immerse = still >= 1;
        s.rest = still;
        if (immerse) root.setAttribute("data-used", "");
        // in over a second and a half, out a little quicker
        const ik = 1 - Math.exp(-dt * (immerse ? 2.2 : 3.4));
        s.imm += ((immerse ? 1 : 0) - s.imm) * ik;
        if (Math.abs(s.imm - (immerse ? 1 : 0)) < 0.0005) s.imm = immerse ? 1 : 0;
        root.toggleAttribute("data-immersed", s.imm > 0.02);
        const target = s.held && onCard ? DIVE : 1 + (IMMERSE_SPEED - 1) * s.imm;
        s.speed += (target - s.speed) * (1 - Math.exp(-dt * (target > s.speed ? 1.2 : 2.6)));
        // enlarged, the canvas is drawn denser so it stays sharp (once, as it
        // starts; back to normal once it is home)
        const fd = fades();
        const room = window.innerHeight - fd.top - fd.bottom;
        const fill = s.dw > 0 ? Math.min((window.innerWidth * IMMERSE_FILL_W) / s.dw, room / s.dh) : 1;
        const S = Math.max(1, fill);
        if (immerse && s.boost === 1 && S > 1.05) {
          s.boost = weak ? Math.min(S, 1.12) : S;
          size();
        } else if (!immerse && s.imm === 0 && s.boost !== 1) {
          s.boost = 1;
          size();
        }
        if (uprightRef.current || holdFrac >= 0) s.frac = (s.frac + (dt * s.speed) / PERIOD) % 1;
        s.upright = uprightRef.current;
        // the card's place: at rest where the page put it; immersed, centred
        // on the screen and grown to fill it (a transform on the tilt layer
        // only: nothing on the page moves for it)
        const e = s.imm * s.imm * (3 - 2 * s.imm);
        const cx = (window.innerWidth / 2 - (s.dl + s.dw / 2)) * e;
        const cy = (fd.top + room / 2 - (s.dt + s.dh / 2)) * e;
        const sc = 1 + (S - 1) * e;
        const lean = 1 - 0.6 * e;
        if (drop !== "notilt")
          tiltEl.style.transform =
            (e > 0.0005 ? `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) scale(${sc.toFixed(4)}) ` : "") +
            `rotateY(${(s.tx * LEAN_Y * lean).toFixed(3)}deg) rotateX(${(-s.ty * LEAN_X * lean).toFixed(3)}deg)`;
        // On a display faster than 60 the scene is drawn every other frame:
        // the lean above still moves every frame (it is only a transform), and
        // the flight is slow enough that 60 new pictures a second is smooth.
        s.odd = !s.odd;
        if (frameInterval() < 1 / 85 && s.odd && !s.still) return;
        s.still = false;
        if (dbgCard)
          (window as unknown as { __card: unknown }).__card = {
            frac: +s.frac.toFixed(4),
            speed: +s.speed.toFixed(2),
            held: s.held,
            rest: +s.rest.toFixed(2),
            imm: +s.imm.toFixed(3),
            onCard,
            upright: uprightRef.current,
            govern,
            scene: card.scene(),
          };
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
      window.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      viewport.removeEventListener("pointerenter", hot);
      viewport.removeEventListener("pointerleave", cold);
      cold();
      card?.dispose();
      cardRef.current = null;
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
            you can lean into. Move across it to look around, hold still to
            step in, and change the world it looks onto.
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
                  <span className="web-browser__url">{SCENES[scene].url}</span>
                  <span className="web-browser__tag">Concept</span>
                </div>
                <div
                  ref={viewportRef}
                  className="web-demo__viewport web-card"
                  role="img"
                  aria-label={
                    scene === 0
                      ? "Concept site for a fictional canyon lodge, Orrin Falls: a bright canyon with two waterfalls, seen as through a window, the camera travelling into it."
                      : "Concept site for a fictional forest lodge, Holloway Grove: a path through giant redwoods in shafts of sunlight, seen as through a window, the camera travelling into it."
                  }
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
                <span className="web-card__hint-fine">Hold still to step in</span>
                <span className="web-card__hint-touch">Hold to fly in</span>
              </span>
            </div>
          </div>
          <span aria-hidden="true" className="web-demo__mirror" />
          {/* the world in the window: two lenses, each looking onto one. Outside
              the card's 3D layer: inside it they could not be hit-tested. */}
          <div
            className="card-worlds"
            role="radiogroup"
            aria-label="The world in the window"
            data-changing={changing ? "" : undefined}
            onPointerEnter={() => (overSwitch.current = true)}
            onPointerLeave={() => (overSwitch.current = false)}
          >
            {SCENES.map((sc, i) => (
              <button
                key={sc.key}
                type="button"
                role="radio"
                aria-checked={scene === i}
                className="card-world"
                data-on={scene === i ? "" : undefined}
                onClick={() => pickScene(i)}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--lx", `${(((e.clientX - r.left) / r.width - 0.5) * -10).toFixed(1)}%`);
                  e.currentTarget.style.setProperty("--ly", `${(((e.clientY - r.top) / r.height - 0.5) * -10).toFixed(1)}%`);
                }}
                onPointerLeave={(e) => {
                  e.currentTarget.style.setProperty("--lx", "0%");
                  e.currentTarget.style.setProperty("--ly", "0%");
                }}
              >
                <span className="card-world__lens" aria-hidden="true">
                  <span className="card-world__view" style={{ backgroundImage: `url(/images/card/${sc.key}-lens.webp)` }} />
                </span>
                <span className="card-world__name">{sc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { addFrameJob } from "@/components/world/frameLoop";
import CarbonForgeSite from "./CarbonForgeSite";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────────────────
   /web-design-division §1 — the concept wheel (21st: scroll-morph-hero,
   rebuilt for this page).

   Ten of this division's concept sites orbit the hero's browser:
     · arrival — a ring of light collapses from the edges of the screen onto
       the browser; then the deck is thrown in from beyond the edges, card
       by card, clockwise: each one comes in huge, spinning and blurred,
       slams past its place in the orbit and settles back; as the last one
       lands a shockwave and a flash fire out from the browser (once);
     · rest — the orbit drifts. Cards on the far side pass BEHIND the browser
       (smaller, dimmer); cards on the near side pass in front of it;
     · hover / tap — the browser loads that site (`onPick`), and the orbit
       holds still while you look;
     · scroll — as the hero leaves, the orbit bends into a wide arc across
       the lower frame and sweeps, fading with the hero.

   Rebuilt rather than pasted: the original hijacked the mouse wheel with its
   own virtual scroll and re-rendered React on every spring tick. Here the
   page's own scroll drives it, and each frame is one transform + opacity
   write per card on the site's single frame loop — and only while the hero is
   on screen.
   ───────────────────────────────────────────────────────────────────────── */

export interface SiteTemplate {
  key: string;
  name: string;
  /** what the browser's address bar shows */
  url: string;
  /** small image for the card */
  card: string;
  /** full image for the browser preview */
  full: string;
  /** a live, moving concept site rendered in code instead of an image */
  live?: "carbon-forge";
}

interface Props {
  templates: SiteTemplate[];
  /** the hero section: the scroll range, and the frame the arc spans */
  sectionRef: RefObject<HTMLElement | null>;
  /** index of the site the browser should show, or null for its own */
  onPick: (i: number | null) => void;
  /** the browser, at the centre of the orbit */
  children: ReactNode;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const DRIFT = 0.07; // radians a second: one lap in ~90s
/** how much of the arrival is spent dealing: the last card is thrown at this point */
const DEAL = 0.5;
/** how far out a card starts, in orbit radii: well beyond the screen's edges */
const THROW = 3.8;
/** how far (radians) a card curves round on its way in */
const CURVE = 0.9;
/** the arrival, seconds: the collapse, the throw, the burst */
const T_CONVERGE = 0.5;
const T_THROW = 2.6;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  // a short overshoot: past its slot by about a tenth of the way in
  const c = 1.3;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export default function ConceptWheel({ templates, sectionRef, onPick, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  });
  const n = templates.length;
  // the live cards' video waits until the wheel has landed
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const el = root.current;
    const section = sectionRef.current;
    if (!el || !section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const st = {
      intro: reduced ? 1 : 0, // 0 hidden behind the browser · 1 all in orbit
      p: 0, // scroll
      spin: 0, // orbit angle
      speed: reduced ? 0 : 1, // eases to 0 while a card is held
      hold: false,
      w: 0,
      h: 0,
      // this wheel's centre, relative to the section's centre
      dx: 0,
      dy: 0,
      sw: 0,
      sh: 0,
      vh: 0,
      // the largest orbit that clears the chrome (measured, see measure())
      maxRx: 1e9,
      // room above and below the browser, separately (the menu is above,
      // the floor is below: the orbit may reach further down than up)
      maxUp: 1e9,
      maxDown: 1e9,
      visible: true,
      last: -1,
      z: [] as number[],
      blur: [] as boolean[],
    };

    const measure = () => {
      const r = el.getBoundingClientRect();
      const s = section.getBoundingClientRect();
      st.w = r.width;
      st.h = r.height;
      st.sw = s.width;
      st.sh = s.height;
      st.vh = window.innerHeight;
      // The orbit is as big as the screen allows, and no bigger: its cards
      // stop short of the progress rail on the right and of the chrome
      // lanes at the top (the menu) and bottom (the chevron, the contact
      // icon), measured at the hero's resting scroll. A card's rotated,
      // scaled box is taken as ~0.62 of its width/height either side.
      const card = cards.current[0];
      const cw = card?.offsetWidth || 150;
      const ch = card?.offsetHeight || 94;
      const cx = r.left + r.width / 2;
      const cy = r.top + window.scrollY + r.height / 2;
      const rail = document.querySelector<HTMLElement>(".progress-rail")?.getBoundingClientRect();
      const right = rail && rail.width > 0 ? rail.left - 16 : window.innerWidth - 12;
      st.maxRx = Math.max(60, right - cx - cw * 0.62);
      const phone = window.innerWidth < 900;
      st.maxUp = phone ? 1e9 : Math.max(60, cy - 92 - ch * 0.62);
      st.maxDown = phone ? 1e9 : Math.max(60, st.vh - 84 - cy - ch * 0.62);
      st.dx = r.left + r.width / 2 - (s.left + s.width / 2);
      st.dy = r.top + r.height / 2 - (s.top + s.height / 2);
    };

    const place = () => {
      const { w, h } = st;
      if (!w) return;
      const mobile = w < 520;
      const k = st.intro;
      // on a phone the wheel is below the fold and scrolls past quickly: it
      // keeps its orbit rather than bending into an arc as it arrives
      const morph = mobile ? 0 : smooth(st.p / 0.5);
      const sweep = smooth((st.p - 0.3) / 0.7);
      // the orbit: a flattened ring round the browser, a little wider than it
      // (inside the column: its right edge is the progress rail's lane)
      // (desktop: the cards' outer edges stop short of the progress rail)
      const rx = Math.min(st.maxRx, w * 0.5 - (mobile ? 34 : 40));
      // taller than the box: the orbit rides up into the open space above the
      // browser and down toward the floor, without the box taking the room
      const ryBase = h * 0.5 + (mobile ? 10 : Math.min(110, st.vh * 0.12));
      const ryUp = Math.min(st.maxUp, ryBase);
      const ryDown = Math.min(st.maxDown, ryBase);
      // vertical radius for an angle: the upper half of the orbit uses the
      // room above, the lower half the room below
      const vy = (ang: number) => {
        const sn = Math.sin(ang);
        return sn * (sn < 0 ? ryUp : ryDown);
      };
      // the arc: across the whole section, crowned in its lower part
      const spread = mobile ? 96 : 118;
      const arcR = Math.min(st.sw, st.sh * 1.6) * (mobile ? 1.3 : 1.05);
      // the crown stays put in the VIEWPORT while the hero scrolls away:
      // the section has moved up by p x its scroll range, so add it back
      const scrolled = st.p * Math.max(0, st.sh - st.vh * 0.55);
      const crown = st.vh * (mobile ? 0.7 : 0.66) + scrolled; // section y of the crown
      const arcCx = -st.dx; // section centre, in this wheel's coordinates
      const arcCy = crown - st.sh / 2 - st.dy + arcR;
      const step = spread / Math.max(1, n - 1);
      const shift = spread * 0.2 - sweep * spread * 0.4;

      for (let i = 0; i < n; i++) {
        const card = cards.current[i];
        if (!card) continue;
        const a = st.spin + (i / n) * Math.PI * 2 - Math.PI / 2;
        const depth = Math.sin(a); // -1 far (top) .. 1 near (bottom)
        const orbit = {
          x: Math.cos(a) * rx,
          y: vy(a),
          r: -Math.cos(a) * 7, // a slight lean with the orbit, never on its side
          s: 0.84 + 0.26 * (depth * 0.5 + 0.5),
          o: 0.55 + 0.45 * (depth * 0.5 + 0.5),
        };
        // the throw: card i comes in on its own beat, clockwise from the top
        const e = clamp01((k - (i / n) * DEAL) / (1 - DEAL));
        const out = easeOutCubic(e);
        let x: number, y: number, r: number, s: number, o: number;
        let flip = 0;
        if (e < 1) {
          // from beyond the screen's edge along its own direction, curving
          // in; the back-ease carries it PAST its slot, inside the orbit,
          // before it settles back out into place
          const reach = lerp(THROW, 1, easeOutBack(e));
          const lag = (1 - out) * CURVE;
          x = Math.cos(a + lag) * rx * reach;
          y = vy(a + lag) * reach;
          r = orbit.r + (1 - out) * (i % 2 ? 190 : -190);
          s = lerp(2.4, orbit.s, out);
          o = orbit.o * smooth(e / 0.1);
          flip = (1 - out) * 72; // edge-on -> face
        } else {
          x = orbit.x;
          y = orbit.y;
          r = orbit.r;
          s = orbit.s;
          o = orbit.o;
        }
        if (morph > 0) {
          const deg = -90 - spread / 2 + i * step + shift;
          const rad = (deg * Math.PI) / 180;
          const ax = arcCx + Math.cos(rad) * arcR;
          const ay = arcCy + Math.sin(rad) * arcR;
          const edge = 1 - smooth((Math.abs(deg + 90) - spread * 0.42) / (spread * 0.1));
          x = lerp(x, ax, morph);
          y = lerp(y, ay, morph);
          r = lerp(r, deg + 90, morph);
          s = lerp(s, mobile ? 1.1 : 1.05, morph);
          o = lerp(o, edge, morph);
        }
        card.style.transform =
          `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` +
          (flip > 0.05 ? ` perspective(700px) rotateY(${flip.toFixed(1)}deg)` : "") +
          ` rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
        card.style.opacity = o.toFixed(3);
        // motion blur while it flies, sharp as it lands (desktop only: a
        // filter per card per frame is not worth it on a phone GPU)
        const blur = e < 1 && !mobile ? (1 - out) * 14 : 0;
        if (blur > 0.2 || st.blur[i]) {
          st.blur[i] = blur > 0.2;
          card.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "";
        }
        card.style.visibility = o < 0.01 ? "hidden" : "visible";
        // far side of the orbit passes behind the browser (it sits at z 2);
        // in flight a card comes in over everything
        const z = morph > 0.5 ? 3 : e < 0.9 ? 4 : depth < 0 ? 1 : 3;
        if (st.z[i] !== z) {
          st.z[i] = z;
          card.style.zIndex = String(z);
        }
      }
    };

    measure();
    place();
    const ro = new ResizeObserver(() => {
      measure();
      place();
    });
    ro.observe(el);
    ro.observe(section);
    // the progress rail mounts a moment after the page: measure again once
    // it is there, and whenever the window changes size
    const remeasure = () => {
      measure();
      place();
    };
    const late = [window.setTimeout(remeasure, 900), window.setTimeout(remeasure, 2200)];
    window.addEventListener("resize", remeasure, { passive: true });

    const io = new IntersectionObserver(([e]) => (st.visible = e.isIntersecting), { rootMargin: "10% 0px" });
    io.observe(section);

    let tl: gsap.core.Timeline | null = null;
    // ?cwt=0..1 — the entrance frozen at one instant, for a look (the rings'
    // CSS animation is held at the matching moment)
    const hold = new URLSearchParams(window.location.search).get("cwt");
    // the burst fires as the last cards land
    const T_BURST = T_CONVERGE + T_THROW * 0.9;
    if (hold !== null && !reduced) {
      st.intro = Math.min(1, Math.max(0, Number(hold)));
      const at = T_CONVERGE + st.intro * T_THROW;
      el.setAttribute("data-converge", "");
      el.setAttribute("data-burst", "");
      el.querySelectorAll<HTMLElement>(".cw__converge").forEach((w) => {
        w.style.animationPlayState = "paused";
        w.style.animationDelay = `${(-at).toFixed(2)}s`;
      });
      el.querySelectorAll<HTMLElement>(".cw__flash, .cw__wave").forEach((w) => {
        w.style.animationPlayState = "paused";
        w.style.animationDelay = `${(T_BURST - at).toFixed(2)}s`;
      });
      st.spin = 0;
      place();
    } else if (!reduced) {
      // after the headline's shutter has opened (~0.7s)
      tl = gsap.timeline({ delay: 0.5, onUpdate: place, onComplete: () => setLanded(true) });
      // a ring collapses from the screen's edges onto the browser...
      tl.call(() => el.setAttribute("data-converge", ""), undefined, 0);
      // ...the deck is thrown in...
      tl.to(st, { intro: 1, duration: T_THROW, ease: "none" }, T_CONVERGE);
      // ...and it goes off as the last cards land
      tl.call(() => el.setAttribute("data-burst", ""), undefined, T_BURST);
    }

    const trig = reduced
      ? null
      : ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom 55%",
          onUpdate: (self) => {
            st.p = self.progress;
          },
          onRefresh: () => measure(),
        });

    // the orbit's own motion, on the shared frame loop, only while on screen
    const stop = addFrameJob({
      write: (time) => {
        if (!st.visible) return;
        const dt = st.last < 0 ? 0 : Math.min(0.1, time - st.last);
        st.last = time;
        st.speed += ((st.hold ? 0 : 1) - st.speed) * (1 - Math.exp(-dt * 4));
        if (!reduced && st.intro >= 1 && hold === null) st.spin += DRIFT * st.speed * dt;
        place();
      },
    });

    const holdOn = () => (st.hold = true);
    const holdOff = () => (st.hold = false);
    el.addEventListener("pointerenter", holdOn);
    el.addEventListener("pointerleave", holdOff);

    return () => {
      late.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", remeasure);
      ro.disconnect();
      io.disconnect();
      tl?.kill();
      trig?.kill();
      stop();
      el.removeEventListener("pointerenter", holdOn);
      el.removeEventListener("pointerleave", holdOff);
    };
  }, [n, sectionRef]);

  // Hover: the card leans toward the pointer and a sheen follows it. The
  // pointer position comes from the event itself (offsetX/Y are in the
  // card's own untransformed box), so nothing measures the layout.
  const tilt = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch") return;
    const face = e.currentTarget.firstElementChild as HTMLElement | null;
    const w = e.currentTarget.offsetWidth || 1;
    const h = e.currentTarget.offsetHeight || 1;
    const nx = Math.min(1, Math.max(0, e.nativeEvent.offsetX / w));
    const ny = Math.min(1, Math.max(0, e.nativeEvent.offsetY / h));
    face?.style.setProperty("--ry", `${((nx - 0.5) * 22).toFixed(1)}deg`);
    face?.style.setProperty("--rx", `${((0.5 - ny) * 18).toFixed(1)}deg`);
    face?.style.setProperty("--mx", `${(nx * 100).toFixed(0)}%`);
    face?.style.setProperty("--my", `${(ny * 100).toFixed(0)}%`);
  };
  const untilt = (e: React.PointerEvent<HTMLButtonElement>) => {
    const face = e.currentTarget.firstElementChild as HTMLElement | null;
    face?.style.setProperty("--ry", "0deg");
    face?.style.setProperty("--rx", "0deg");
  };

  // the full previews arrive in idle time, so a hover swaps at once
  useEffect(() => {
    const load = () => templates.forEach((t) => (new Image().src = t.full));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const idle = !!w.requestIdleCallback;
    const id = idle ? w.requestIdleCallback!(load, { timeout: 5000 }) : window.setTimeout(load, 3000);
    return () => {
      if (idle) w.cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, [templates]);

  return (
    <div ref={root} className="cw" onPointerLeave={() => pickRef.current(null)}>
      {/* the burst: a flash behind the browser and two rings running out */}
      <span aria-hidden="true" className="cw__converge" />
      <span aria-hidden="true" className="cw__flash" />
      <span aria-hidden="true" className="cw__wave" />
      <span aria-hidden="true" className="cw__wave cw__wave--2" />
      <span aria-hidden="true" className="cw__wave cw__wave--3" />
      <div className="cw__centre">{children}</div>
      {templates.map((t, i) => (
        <button
          key={t.key}
          type="button"
          ref={(b) => {
            cards.current[i] = b;
          }}
          className="cw__card"
          style={{ opacity: 0 }}
          aria-label={`Show the ${t.name} concept site`}
          onPointerEnter={(e) => {
            if (e.pointerType !== "touch") pickRef.current(i);
          }}
          onPointerMove={tilt}
          onPointerLeave={untilt}
          onFocus={() => pickRef.current(i)}
          onClick={() => pickRef.current(i)}
        >
          <span className="cw__face">
            {t.live ? (
              <span className="cw__live">
                <CarbonForgeSite play={landed} />
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.card} alt="" decoding="async" draggable={false} />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

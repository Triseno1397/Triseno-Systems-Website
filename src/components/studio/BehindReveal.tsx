"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GlassPanel from "@/components/world/GlassPanel";
import Aperture from "./Aperture";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §3 — Behind the Studio: THE DEAL. Its own mechanic (M1) — not the
   hero's iris, not the strip's horizontal travel.

   The section pins, and scroll deals a contact sheet onto the stage floor:
   each print flies in from the dark, turns, and lands in the fan while the
   prints already on the table give way beneath it. The founder's story
   advances beside it one beat per print, so every scroll position is a
   different frame of one sequence. Pointer: a print lifts and squares up
   under the cursor.

   Phones (< 768px) and reduced motion: no pin — the fan rests dealt and the
   whole story is solid, readable type (M5).
   ───────────────────────────────────────────────────────────────────────── */

interface Print {
  src: string;
  cap: string;
  /** resting place in the fan: offset in % of the print, rotation in deg */
  x: number;
  y: number;
  r: number;
}

// Four frames, each from a clip that appears only once elsewhere on the page
// (in the formats strip) — never the hero reel, never twice here.
const PRINTS: Print[] = [
  { src: "/posters/direct-response.jpg", cap: "01 · Practicals", x: -38, y: -10, r: -7 },
  { src: "/posters/ugc-watch-unbox.jpg", cap: "02 · Warm key", x: 34, y: -26, r: 6 },
  { src: "/posters/demo-sneaker-cleaner.jpg", cap: "03 · Macro", x: -22, y: 28, r: 4 },
  { src: "/posters/visual-appeal.jpg", cap: "04 · Top light", x: 40, y: 22, r: -5 },
];

const BEATS = [
  {
    label: "Ten years behind the camera",
    text: "Our founder spent nearly a decade behind professional cameras in Los Angeles. Broadcast, live production, and large-scale shoots — nationally televised award shows, stadium events, and corporate stages for global technology brands.",
  },
  {
    label: "One discipline",
    text: "Knowing which shot sells the moment, and getting it. That's the entire craft of product advertising: the angle, the light, the three seconds that stop a scroll. We don't guess at what converts on screen.",
  },
  {
    label: "The same treatment",
    text: "When a brand hands us their product, it gets the same treatment those stages got. Shot with intent, built to perform, delivered like it matters. Because to the person buying it, it does.",
  },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

export default function BehindReveal() {
  const root = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const prints = gsap.utils.toArray<HTMLElement>(".sx-print", root.current);
      const stage = root.current?.querySelector<HTMLElement>(".sx-behind__stage") ?? null;

      // Desktop: pinned deal, driven directly by scroll progress.
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const n = PRINTS.length;
        // Timeline over the pinned range (300dvh): fade in on the spot while
        // the strip fades out (0-.12) · the deal (.12-.68) · hold (.68-.76) ·
        // fade out (.76-.88) · empty stage while the proof wall rises (.88-1).
        const render = (p: number) => {
          const d = clamp01((p - 0.12) / 0.56);
          const o = Math.min(clamp01(p / 0.12), 1 - clamp01((p - 0.76) / 0.12));
          if (stage) {
            stage.style.opacity = o.toFixed(3);
            stage.style.visibility = o <= 0.005 ? "hidden" : "visible";
            stage.style.visibility = o < 0.005 ? "hidden" : "visible";
          }
          prints.forEach((el, i) => {
            const pr = PRINTS[i];
            // print i lands across [i/n, (i + 0.85)/n] of the deal
            const land = easeOut((d * n - i) / 0.85);
            // and gives way a little as each later print lands on top of it
            const under = clamp01(d * n - i - 1) / (n - 1);
            const x = pr.x + (1 - land) * 60;
            const y = pr.y + (1 - land) * 150;
            const r = pr.r + (1 - land) * 24;
            const s = 1 - under * 0.08;
            el.style.transform = `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
            el.style.opacity = clamp01(land * 1.6).toFixed(3);
            el.style.setProperty("--dim", (under * 0.5).toFixed(3));
          });
          setBeat(Math.min(BEATS.length - 1, Math.floor(d * BEATS.length * 0.999)));
        };
        render(0);
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          onRefresh: (self) => render(self.progress),
          onUpdate: (self) => render(self.progress),
        });
        return () => {
          st.kill();
          prints.forEach((el) => el.removeAttribute("style"));
          stage?.removeAttribute("style");
        };
      });

      // Phones: the fan deals itself as the section scrolls through (no pin).
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
        prints.forEach((el, i) => {
          const pr = PRINTS[i];
          gsap.fromTo(
            el,
            { xPercent: pr.x * 0.2, yPercent: 40 + i * 12, rotation: pr.r + 12 },
            {
              xPercent: pr.x,
              yPercent: pr.y,
              rotation: pr.r,
              ease: "none",
              scrollTrigger: { trigger: root.current, start: "top 90%", end: "top 20%", scrub: 0.5 },
            },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} data-rail="Behind" className="sx-behind" aria-labelledby="sx-behind-title">
      <div className="sx-behind__stage">
        <GlassPanel world="creative" veil={0.55} className="sx-behind__text">
          <p className="sx-kicker font-mono">
            <Aperture size={14} strokeWidth={1.25} glow />
            Behind the Studio
          </p>
          <h2 id="sx-behind-title" className="sx-behind__title font-display font-bold uppercase">
            Triseno was built by a camera professional.
          </h2>
          <ol className="sx-beats">
            {BEATS.map((b, i) => (
              <li key={b.label} className="sx-beat" data-on={i === beat ? "" : undefined} data-past={i < beat ? "" : undefined}>
                <p className="sx-beat__label font-mono">
                  <b>{String(i + 1).padStart(2, "0")}</b> / {String(BEATS.length).padStart(2, "0")} — {b.label}
                </p>
                <p className="sx-beat__text font-sans font-light">{b.text}</p>
              </li>
            ))}
          </ol>
        </GlassPanel>

        {/* The table: prints from the studio's own frames, dealt by scroll. */}
        <div aria-hidden="true" className="sx-behind__table">
          <div className="sx-prints">
            {PRINTS.map((p) => (
              <figure key={p.src} className="sx-print">
                <span className="sx-print__lift">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" loading="lazy" decoding="async" />
                  <figcaption className="font-mono">{p.cap}</figcaption>
                </span>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

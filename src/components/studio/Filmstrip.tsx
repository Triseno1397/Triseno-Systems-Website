"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Pause, Play, SpeakerSimpleHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import { selectMakeItems, type MakeItem } from "@/content/reels";
import { useReels } from "@/content/ReelsProvider";
import { getLenis } from "@/components/world/SmoothScroll";
import Aperture from "./Aperture";
import { LazyVideo, REDUCED, useDraftMode, useMediaQuery } from "./media";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─────────────────────────────────────────────────────────────────────────
   /studio §2 — pinned horizontal filmstrip scrub (site-map.md).
   The format library (src/content/reels.json, edited through /edit) runs
   through a gate at the centre of the viewport: the frame in the gate plays,
   every other frame is a paused, desaturated poster.
   · scrub  — desktop, motion allowed: the section is tall, the stage sticks,
              vertical scroll drives the strip (transform only).
   · native — mobile, reduced motion and the CMS preview: a native horizontal
              snap scroller, no pin, no scroll-jacking (M5).
   Each frame keeps data-cms-id="studio:reel:<i>" so the editor's click-to-select
   and scroll-to still address the same positions as before.
   ───────────────────────────────────────────────────────────────────────── */

const STEP_VH = 46; // vertical scroll per frame in scrub mode

const pad = (n: number) => String(n).padStart(2, "0");
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface Gate {
  index: number;
  sound: boolean;
  manual: boolean;
}
const GATE_ZERO: Gate = { index: 0, sound: false, manual: false };
const gateTo = (i: number) => (g: Gate) => (g.index === i ? g : { index: i, sound: false, manual: false });

function ratioOf(item: MakeItem): { w: number; h: number } {
  const [a, b] = item.ratio.split(":").map(Number);
  const w = Number.isFinite(a) && a > 0 ? a : 9;
  const h = Number.isFinite(b) && b > 0 ? b : 16;
  // A two-clip format shows both clips side by side in one frame.
  return item.videos ? { w: w * item.videos.length, h } : { w, h };
}

export default function Filmstrip() {
  const items = selectMakeItems(useReels());
  const count = items.length;

  const wide = useMediaQuery("(min-width: 768px)");
  const reduced = useMediaQuery(REDUCED);
  const draft = useDraftMode();
  const scrub = wide && !reduced && !draft;

  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  // One state object: a new frame in the gate always lands muted and (under
  // reduced motion) paused, so the three values can never disagree.
  const [gate, setGate] = useState<Gate>(GATE_ZERO);
  // The editor can delete the reel that is currently in the gate.
  const active = Math.min(gate.index, Math.max(0, count - 1));
  const soundOn = gate.sound;
  const manual = gate.manual;

  /* ── scrub: vertical scroll -> strip position ── */
  useGSAP(
    () => {
      if (!scrub || count < 1) return;
      const section = root.current;
      const strip = track.current;
      const port = viewport.current;
      if (!section || !strip || !port) return;

      let centres: number[] = [];
      let half = 0;
      const measure = () => {
        centres = Array.from(strip.children).map((el) => {
          const f = el as HTMLElement;
          return f.offsetLeft + f.offsetWidth / 2;
        });
        half = port.clientWidth / 2;
      };
      const apply = (p: number) => {
        if (!centres.length) return;
        const f = p * (count - 1);
        const i0 = Math.min(count - 1, Math.floor(f));
        const i1 = Math.min(count - 1, i0 + 1);
        // Ease between frames so each one rests in the gate.
        const c = centres[i0] + (centres[i1] - centres[i0]) * easeInOut(f - i0);
        strip.style.transform = `translate3d(${(half - c).toFixed(1)}px,0,0)`;
        if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
        setGate(gateTo(Math.round(f)));
      };

      measure();
      apply(0);
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onRefresh: (self) => {
          measure();
          apply(self.progress);
        },
        onUpdate: (self) => apply(self.progress),
      });
      // Frame widths settle once the fonts and the first clips have laid out.
      const late = window.setTimeout(() => ScrollTrigger.refresh(), 600);

      return () => {
        window.clearTimeout(late);
        st.kill();
        strip.style.transform = "";
      };
    },
    { scope: root, dependencies: [scrub, count], revertOnUpdate: true },
  );

  /* ── native: the frame nearest the centre of the scroller is active ── */
  useEffect(() => {
    if (scrub) return;
    const port = viewport.current;
    const strip = track.current;
    if (!port || !strip) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const mid = port.scrollLeft + port.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      Array.from(strip.children).forEach((el, i) => {
        const f = el as HTMLElement;
        const d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setGate(gateTo(best));
      const max = port.scrollWidth - port.clientWidth;
      if (bar.current) bar.current.style.transform = `scaleX(${(max > 0 ? port.scrollLeft / max : 0).toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    port.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      port.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrub, count]);

  const goTo = (i: number) => {
    const section = root.current;
    const frame = track.current?.children[i] as HTMLElement | undefined;
    if (!section || !frame) return;
    if (scrub) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const span = section.offsetHeight - window.innerHeight;
      const y = top + (count > 1 ? i / (count - 1) : 0) * span;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      frame.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
    }
  };

  const current = items[active];
  if (!current) return null;
  const canHear = Boolean(current.video && current.audio);

  return (
    <section
      ref={root}
      id="formats"
      data-rail="Formats"
      data-mode={scrub ? "scrub" : "native"}
      className="sx-film"
      style={{ ["--frames" as string]: count, ["--step" as string]: `${STEP_VH}vh` } as CSSProperties}
      aria-labelledby="sx-film-title"
    >
      <div className="sx-film__stage">
        <div aria-hidden="true" className="sx-glow sx-glow--low" />

        <header className="sx-film__head">
          <div>
            <p className="sx-kicker font-mono">
              <Aperture size={14} strokeWidth={1.25} glow />
              What we make
            </p>
            <h2 id="sx-film-title" className="sx-h2 font-display font-semibold uppercase">
              One studio. Every format the feed demands.
            </h2>
          </div>
          <p className="sx-film__lead font-sans font-light">
            Start where you need volume and climb to where you need polish. Every tier is built to perform on the
            platform it ships to — not just to look good in a portfolio.
          </p>
        </header>

        <div className="sx-film__band">
          <div ref={viewport} className="sx-film__viewport">
            <ol ref={track} className="sx-film__track">
              {items.map((item, i) => {
                const r = ratioOf(item);
                const on = i === active;
                return (
                  <li
                    key={`${item.title}-${i}`}
                    className="sx-frame"
                    data-on={on ? "" : undefined}
                    data-orient={r.w >= r.h ? "landscape" : "portrait"}
                    style={{ aspectRatio: `${r.w} / ${r.h}` }}
                  >
                    <span aria-hidden="true" className="sx-frame__edge font-mono">
                      <span>
                        {item.n} {item.title}
                      </span>
                      <span>{item.videos ? `2 × ${item.ratio}` : item.ratio}</span>
                    </span>
                    <button
                      type="button"
                      className="sx-frame__media"
                      data-cms-id={`studio:reel:${i}`}
                      aria-label={`${item.n} of ${pad(count)} — ${item.title}`}
                      aria-current={on ? "true" : undefined}
                      onClick={() => goTo(i)}
                    >
                      {item.videos ? (
                        <span className="sx-frame__duo">
                          {item.videos.map((clip) => (
                            <span key={clip.src} className="sx-frame__cell">
                              <LazyVideo src={clip.src} active={on} force={on && manual} className="sx-fill" />
                              {clip.label ? <span className="sx-frame__cap font-mono">{clip.label}</span> : null}
                            </span>
                          ))}
                        </span>
                      ) : item.video ? (
                        <LazyVideo
                          src={item.video}
                          active={on}
                          force={on && manual}
                          sound={on && soundOn}
                          className="sx-fill"
                        />
                      ) : (
                        // No reel yet (e.g. Brand Films): a camera slate, not an empty frame.
                        <span className="sx-slate">
                          <Aperture size={72} open={on ? 0.8 : 0.3} strokeWidth={1.25} glow={on} />
                          <span className="font-mono">Slate {item.n} — reel in production</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          {/* The gate: the only tinted line-work — it marks the active frame. */}
          <span aria-hidden="true" className="sx-film__gate" />
        </div>

        <div className="sx-film__foot">
          <div className="sx-film__progress" aria-hidden="true">
            <span ref={bar} />
          </div>
          <div key={active} className="sx-film__caption" aria-live="polite">
            <div className="sx-film__caption-main">
              <p className="sx-film__count font-mono">
                <b>{current.n}</b> / {pad(count)}
              </p>
              <h3 className="sx-h3 font-display font-semibold uppercase">{current.title}</h3>
              <p className="sx-film__tagline font-sans">{current.sm}</p>
            </div>
            <div className="sx-film__caption-side">
              <p className="sx-film__desc font-sans font-light">{current.desc}</p>
              <ul className="sx-tags font-mono">
                {current.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                {reduced && (current.video || current.videos) ? (
                  <li>
                    <button
                      type="button"
                      className="sx-sound"
                      aria-pressed={manual}
                      onClick={() => setGate((g) => ({ ...g, manual: !g.manual }))}
                    >
                      {manual ? (
                        <Pause size={14} weight="light" aria-hidden="true" />
                      ) : (
                        <Play size={14} weight="light" aria-hidden="true" />
                      )}
                      {manual ? "Pause clip" : "Play clip"}
                    </button>
                  </li>
                ) : null}
                {canHear ? (
                  <li>
                    <button
                      type="button"
                      className="sx-sound"
                      aria-pressed={soundOn}
                      onClick={() => setGate((g) => ({ ...g, sound: !g.sound }))}
                    >
                      {soundOn ? (
                        <SpeakerSimpleHigh size={14} weight="light" aria-hidden="true" />
                      ) : (
                        <SpeakerSimpleSlash size={14} weight="light" aria-hidden="true" />
                      )}
                      {soundOn ? "Sound on" : "Sound off"}
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

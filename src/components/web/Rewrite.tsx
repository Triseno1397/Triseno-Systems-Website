"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * "Your website isn't a brochure. It's your ___."
 * The last word changes under a beam of light: a slim, skewed light bar crosses
 * the word, everything behind it is already the next word (landing a touch
 * over-bright and settling), everything ahead of it is the old word going dark.
 * All words sit stacked in one grid cell (the cell is as wide as the longest
 * word), each carrying its own period and underline, so nothing reflows or
 * jumps. Transform / opacity / clip-path / filter only (M1). Cycles only on
 * screen with the tab visible; reduced motion keeps the first word.
 */
const WORDS = ["night shift", "front door", "best closer", "open sign", "showroom", "first impression"];
const HOLD = 2.0;
const SWEEP = 1.05;
const SHOWN = "inset(-40% -12% -40% 0%)";
const BEFORE = "inset(-40% 100% -40% 0%)"; // nothing shown yet (revealed from the left)

export default function Rewrite() {
  const slot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>(".rw-word"));
    const beam = el.querySelector<HTMLElement>(".rw-beam")!;
    words.forEach((w, k) => gsap.set(w, { clipPath: k === 0 ? SHOWN : BEFORE }));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cur = 0, visible = false, busy = false, alive = true;
    let tl: gsap.core.Timeline | null = null, wait: gsap.core.Tween | null = null;

    const sweep = () => {
      if (!alive || !visible || document.hidden) { busy = false; return; }
      busy = true;
      const next = (cur + 1) % words.length;
      const a = words[cur], b = words[next];
      // the beam travels only as far as the longer of the two words, not the whole cell
      const box = el.getBoundingClientRect();
      const edge = (w: HTMLElement) => w.lastElementChild!.getBoundingClientRect().right - box.left;
      const span = Math.max(edge(a), edge(b)) + box.width * 0.02;
      const p = { x: -0.04 * span };
      const draw = () => {
        const x = Math.max(0, p.x);
        a.style.clipPath = `inset(-40% -12% -40% ${x}px)`;
        b.style.clipPath = `inset(-40% ${Math.max(0, box.width - x)}px -40% 0px)`;
        gsap.set(beam, { x: p.x });
      };
      gsap.set(b, { filter: "brightness(1.9) blur(1.2px)" });
      draw();
      tl = gsap.timeline({
        onComplete: () => {
          gsap.set(a, { clipPath: BEFORE, opacity: 1 });
          gsap.set(b, { clipPath: SHOWN });
          cur = next;
          wait = gsap.delayedCall(HOLD, sweep);
        },
      });
      tl.to(p, { x: span, duration: SWEEP, ease: "power2.inOut", onUpdate: draw }, 0)
        .to(beam, { opacity: 1, duration: 0.18, ease: "power1.out" }, 0)
        .to(beam, { opacity: 0, duration: 0.22, ease: "power1.in" }, SWEEP - 0.2)
        .to(a, { opacity: 0.35, duration: SWEEP * 0.6, ease: "power1.in" }, 0)
        .to(b, { filter: "brightness(1) blur(0px)", duration: 0.9, ease: "power2.out" }, SWEEP * 0.55);
    };
    const kick = () => {
      if (busy || !visible || document.hidden) return;
      busy = true;
      wait?.kill();
      wait = gsap.delayedCall(HOLD, sweep);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { threshold: 0.4 });
    io.observe(el);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      tl?.kill(); wait?.kill();
    };
  }, []);

  return (
    <section data-rail="Rewrite" className="web-section web-rewrite" aria-labelledby="web-rewrite-title">
      <div className="web-rewrite__inner">
        <p className="web-eyebrow">
          <span className="web-sq" aria-hidden="true" />
          A second opinion
        </p>
        <h2 id="web-rewrite-title" className="web-rewrite__title" aria-label="Your website isn't a brochure. It's your night shift, your front door, your best closer.">
          <span aria-hidden="true" className="web-rewrite__line">Your website isn&apos;t a brochure.</span>
          <span aria-hidden="true" className="web-rewrite__line">
            It&apos;s your{" "}
            <span ref={slot} className="rw-slot">
              {WORDS.map((w, k) => (
                <span key={w} className="rw-word" style={k === 0 ? undefined : { clipPath: BEFORE }}>
                  <span className="rw-ink">{w}</span>
                  <span className="rw-dot">.</span>
                </span>
              ))}
              <span className="rw-beam" />
            </span>
          </span>
        </h2>
        <p className="web-body web-rewrite__body">
          It works the hours you don&apos;t, answers the question before it&apos;s asked and books the job while you&apos;re on one.
        </p>
      </div>
    </section>
  );
}

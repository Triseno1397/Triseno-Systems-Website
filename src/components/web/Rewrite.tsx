"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * "Your website isn't a brochure. It's your ___."
 * An editor's pass on one word: a hand-drawn strike crosses it out, the struck
 * word drops away, and the next one is written in, left to right, in the serif
 * hand with a swash drawn under it. Transform / opacity / clip-path only (M1).
 * Cycles only on screen with the tab visible; reduced motion keeps the first.
 */
const WORDS = ["night shift", "front door", "best closer", "open sign", "showroom", "first impression"];
const HOLD = 1.7;

export default function Rewrite() {
  const [i, setI] = useState(0);
  const slot = useRef<HTMLSpanElement>(null);
  const s = useRef({ visible: false, busy: false, mounted: false, wait: null as gsap.core.Tween | null });
  const next = useRef(() => {});

  next.current = () => {
    const st = s.current, el = slot.current;
    if (!el || !st.visible || document.hidden) { st.busy = false; return; }
    st.busy = true;
    const word = el.querySelector(".rw-word"), strike = el.querySelector(".rw-strike"), swash = el.querySelector(".rw-swash");
    gsap.timeline({ onComplete: () => setI((n) => (n + 1) % WORDS.length) })
      .to(swash, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.25, ease: "power2.in" }, 0)
      .fromTo(strike, { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: "power2.out", immediateRender: false }, 0.05)
      .to([word, strike], { y: "0.35em", opacity: 0, duration: 0.35, ease: "power2.in" }, 0.55);
  };

  // the new word writes itself in
  useEffect(() => {
    const st = s.current, el = slot.current;
    if (!el) return;
    if (!st.mounted) { st.mounted = true; return; }
    const word = el.querySelector(".rw-word"), strike = el.querySelector(".rw-strike"), swash = el.querySelector(".rw-swash");
    gsap.set(strike, { scaleX: 0, y: 0, opacity: 1 });
    gsap.timeline({ onComplete: () => { st.wait = gsap.delayedCall(HOLD, () => next.current()); } })
      .fromTo(word, { clipPath: "inset(-20% 100% -30% 0)", y: 0, opacity: 1 }, { clipPath: "inset(-20% 0% -30% 0)", duration: 0.75, ease: "power2.inOut" }, 0)
      .fromTo(swash, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.6, ease: "expo.out" }, 0.55);
  }, [i]);

  useEffect(() => {
    const st = s.current, el = slot.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const kick = () => {
      if (st.busy || !st.visible || document.hidden) return;
      st.busy = true;
      st.wait?.kill();
      st.wait = gsap.delayedCall(HOLD, () => next.current());
    };
    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) kick(); }, { threshold: 0.4 });
    io.observe(el);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); st.wait?.kill(); st.busy = false; };
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
              <span className="rw-word">{WORDS[i]}</span>
              <span className="rw-strike" />
              <span className="rw-swash" />
            </span>
            <span className="rw-dot">.</span>
          </span>
        </h2>
        <p className="web-body web-rewrite__body">
          It works the hours you don&apos;t, answers the question before it&apos;s asked and books the job while you&apos;re on one.
        </p>
      </div>
    </section>
  );
}

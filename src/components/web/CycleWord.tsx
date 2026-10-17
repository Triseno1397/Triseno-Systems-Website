"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * One word that keeps changing inside a sentence that keeps making sense.
 * The outgoing word dissolves letter by letter into a blur and lifts away; the
 * next one condenses out of the blur, left to right. Only opacity / filter /
 * transform move (design-system M1). It cycles only while on screen and the tab
 * is visible, and stays on the first word under prefers-reduced-motion.
 * The letters are decorative (aria-hidden); the heading carries an aria-label.
 */
interface CycleWordProps {
  words: string[];
  /** seconds a word rests before it dissolves */
  hold?: number;
  className?: string;
}

export default function CycleWord({ words, hold = 1.8, className }: CycleWordProps) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const s = useRef({ visible: false, busy: false, mounted: false, timer: null as gsap.core.Tween | null });

  // the outgoing word: dissolve, then hand over to the next index
  const dissolve = useRef(() => {});
  dissolve.current = () => {
    const st = s.current;
    const el = ref.current;
    if (!el || !st.visible || document.hidden) { st.busy = false; return; }
    st.busy = true;
    gsap.to(el.children, {
      opacity: 0, filter: "blur(10px)", y: "-0.14em",
      duration: 0.42, stagger: 0.032, ease: "power2.in",
      onComplete: () => setIndex((i) => (i + 1) % words.length),
    });
  };

  // the incoming word: condense out of the blur, rest, go again
  useLayoutEffect(() => {
    const st = s.current;
    const el = ref.current;
    if (!st.mounted) { st.mounted = true; return; }
    if (!el) return;
    gsap.fromTo(
      el.children,
      { opacity: 0, filter: "blur(12px)", y: "0.18em" },
      {
        opacity: 1, filter: "blur(0px)", y: 0,
        duration: 0.75, stagger: 0.04, ease: "expo.out",
        onComplete: () => { st.timer = gsap.delayedCall(hold, () => dissolve.current()); },
      },
    );
  }, [index, hold]);

  useEffect(() => {
    const st = s.current;
    const el = ref.current;
    if (!el || words.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const kick = () => {
      if (st.busy || !st.visible || document.hidden) return;
      st.busy = true;
      st.timer?.kill();
      st.timer = gsap.delayedCall(hold * 0.6, () => dissolve.current());
    };
    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) kick(); }, { threshold: 0.2 });
    io.observe(el);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      st.timer?.kill();
      gsap.killTweensOf(el.children);
      st.busy = false;
    };
  }, [words.length, hold]);

  return (
    <span ref={ref} aria-hidden="true" className={className}>
      {words[index].split("").map((c, i) => (
        <span key={`${index}-${i}`} className="cycle-word__ch">{c}</span>
      ))}
    </span>
  );
}

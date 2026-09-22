"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OperatorState } from "./RobotScene";
import { addFrameJob } from "@/components/world/frameLoop";

const RobotScene = dynamic(() => import("./RobotScene"), { ssr: false });

/* The Operator section: copy on the left, the rigged robot on the right. The
   3D only mounts once the section is near, and only renders while in view. */
export default function RobotSection() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const state = useRef<OperatorState>({ px: 0, py: 0, fine: true, strike: 0 });
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [hue, setHue] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    state.current.fine = fine;
    setTouch(!fine);
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "120% 0px" });
    // mount while the browser is idle after load, not mid-scroll on the way
    // down (building the scene on a phone is a few hundred ms of work)
    const hasIdle = "requestIdleCallback" in window;
    const idleId = hasIdle
      ? window.requestIdleCallback(() => setNear(true), { timeout: 4000 })
      : window.setTimeout(() => setNear(true), 2500);
    const viewIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "10% 0px" });
    // when the stage fills the screen, tell the portal world behind it to rest
    const coverIo = new IntersectionObserver(
      ([e]) => window.dispatchEvent(new CustomEvent("portal:covered", { detail: e.intersectionRatio > 0.72 })),
      { threshold: [0, 0.72, 1] },
    );
    nearIo.observe(el);
    viewIo.observe(el);
    coverIo.observe(el);
    // the pointer, relative to the robot: it looks at you wherever you are on the page
    // the stage's box is measured in the frame loop's read phase, never inside
    // a pointer event (where a layout read can force a mid-frame layout)
    let r: DOMRect | null = null;
    const stopMeasure = addFrameJob({
      read: () => {
        r = stage.current?.getBoundingClientRect() ?? null;
      },
    });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.3;
      state.current.px = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)));
      state.current.py = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5)));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      nearIo.disconnect();
      viewIo.disconnect();
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      coverIo.disconnect();
      window.dispatchEvent(new CustomEvent("portal:covered", { detail: false }));
      window.removeEventListener("pointermove", onMove);
      stopMeasure();
    };
  }, []);

  const strike = () => {
    state.current.strike += 1;
  };

  return (
    <section
      ref={ref}
      data-rail="Operator"
      aria-label="Interactive 3D character"
      className="portal-robot relative z-10 mx-auto grid min-h-[100svh] max-w-[1400px] items-center px-[var(--gutter)]"
      style={hue ? ({ "--robot-hue": hue } as React.CSSProperties) : undefined}
    >
      <div className="portal-robot__copy relative">
        <p className="chrome-label mb-6 font-mono text-white">Interactive 3D — the page is the demo</p>
        <h2 className="portal-robot__title font-display font-bold uppercase">
          It knows
          <br />
          where you are.
        </h2>
        <p className="mt-6 max-w-[40ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
          A rigged character rendered live in your browser. Every joint tracks your cursor, from the hips to the
          visor. And it is armed.
        </p>
        <p className="portal-robot__hint chrome-label mt-8 font-mono text-white">
          {touch ? "Tap it" : "Click it"} — each strike carries a division
        </p>
      </div>

      <div
        ref={stage}
        className="portal-robot__stage relative"
        data-ready={ready ? "" : undefined}
        data-cursor="hover"
        role="button"
        tabIndex={0}
        aria-label="Make the robot draw its blade"
        onClick={strike}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            strike();
          }
        }}
      >
        <span aria-hidden="true" className="portal-robot__aura" />
        {near ? (
          <div className="absolute inset-0">
            <RobotScene state={state.current} running={inView} onHue={setHue} onReady={() => setReady(true)} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OperatorState } from "./RobotScene";
import { addFrameJob } from "@/components/world/frameLoop";

const RobotScene = dynamic(() => import("./RobotScene"), { ssr: false });

/* The Operator, standing in the portal's own hall beside the division menu:
   no stage, no scrim, no panel — a transparent canvas over the world, so he
   shares its floor and its light. Mounts in idle time after load; renders only
   while the hero is on screen. */
export default function RobotStage({ active = true, hue }: { active?: boolean; hue?: string | null }) {
  // on phones the portal world is a still plate, so the Operator brings his own
  // canvas; on desktop he is rendered inside the portal scene itself
  const stage = useRef<HTMLDivElement>(null);
  const state = useRef<OperatorState>({ px: 0, py: 0, fine: true, strike: 0 });
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(true);
  const running = active && inView;
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    state.current.fine = fine;
    setTouch(!fine);
    // building the scene is a few hundred ms of work: do it while idle
    const hasIdle = "requestIdleCallback" in window;
    const idleId = hasIdle
      ? window.requestIdleCallback(() => setNear(true), { timeout: 4000 })
      : window.setTimeout(() => setNear(true), 2500);
    const viewIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "20% 0px" });
    viewIo.observe(el);

    // the stage box is measured in the frame loop's read phase, never inside a
    // pointer event (a layout read there forces a mid-frame layout)
    let r: DOMRect | null = null;
    const stopMeasure = addFrameJob({
      read: () => {
        r = stage.current?.getBoundingClientRect() ?? null;
      },
    });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.3;
      state.current.px = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)));
      state.current.py = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5)));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      viewIo.disconnect();
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      window.removeEventListener("pointermove", onMove);
      stopMeasure();
    };
  }, []);

  const strike = () => {
    state.current.strike += 1;
  };

  return (
    <div
      ref={stage}
      className="portal-robot pointer-events-auto"
      data-ready={ready ? "" : undefined}
      data-cursor="hover"
      role="button"
      tabIndex={0}
      aria-label="The Operator — click to draw its blade"
      onClick={strike}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          strike();
        }
      }}
    >
      {near ? (
        <div className="portal-robot__gl">
          <RobotScene state={state.current} running={running} hue={hue ?? null} onReady={() => setReady(true)} />
        </div>
      ) : null}
      <p aria-hidden="true" className="portal-robot__hint chrome-label font-mono text-white">
        {touch ? "Tap" : "Click"} the operator
      </p>
    </div>
  );
}

"use client";

/**
 * Easter-egg portal to /web-design. Two emblems live at the bottom of
 * /contact: a spinning, draggable emblem on top and a stationary one
 * below it.
 *
 * Mechanic: drag the spinning emblem onto the stationary one. While the
 * cursor is over the target, the target collapses (shrinks toward zero
 * while a bright cyan/purple core grows out of its center — a singularity).
 * When the collapse completes (~750ms), the screen flashes and the page
 * hard-navigates to /web-design.
 *
 * Hit detection runs off a window-level pointermove listener (and a rAF
 * fallback) rather than framer-motion's onDrag so we don't miss frames
 * during fast drags or motionless holds.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import Image from "next/image";
import PortalBlast from "@/components/contact/PortalBlast";

const HOLD_DURATION_MS = 750;
const HIT_PADDING = 36;

export default function HiddenPortalSeal() {
  const targetRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);
  const [overTarget, setOverTarget] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const [blastOrigin, setBlastOrigin] = useState<{ x: number; y: number } | null>(
    null
  );

  const overTargetRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const unlockedRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const cancelHold = () => {
    if (holdRafRef.current !== null) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    holdStartRef.current = null;
    setHoldProgress(0);
  };

  const triggerUnlock = () => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    // Anchor the blast to the screen point where the singularity formed.
    const t = targetRef.current;
    if (t) {
      const r = t.getBoundingClientRect();
      setBlastOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    setUnlocking(true);
    cancelHold();
    // Navigation is fired from PortalBlast's timeline, once the bloom has the
    // screen fully covered — so the warp plays out before the page swaps.
  };

  const startHold = () => {
    if (holdStartRef.current !== null) return;
    holdStartRef.current = performance.now();
    const tick = () => {
      if (holdStartRef.current === null) return;
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);
      if (progress >= 1) {
        triggerUnlock();
      } else {
        holdRafRef.current = requestAnimationFrame(tick);
      }
    };
    holdRafRef.current = requestAnimationFrame(tick);
  };

  const isPointInTarget = (px: number, py: number) => {
    const t = targetRef.current;
    if (!t) return false;
    const r = t.getBoundingClientRect();
    return (
      px >= r.left - HIT_PADDING &&
      px <= r.right + HIT_PADDING &&
      py >= r.top - HIT_PADDING &&
      py <= r.bottom + HIT_PADDING
    );
  };

  const evaluateOverlap = (px: number, py: number) => {
    if (unlockedRef.current) return;
    const overNow = isPointInTarget(px, py);
    if (overNow && !overTargetRef.current) {
      overTargetRef.current = true;
      setOverTarget(true);
      startHold();
    } else if (!overNow && overTargetRef.current) {
      overTargetRef.current = false;
      setOverTarget(false);
      cancelHold();
    }
  };

  // Window-level pointer tracking while dragging. This is more reliable
  // than framer-motion's onDrag callback, which can miss frames on
  // touch devices and doesn't fire when the pointer is held still.
  useEffect(() => {
    if (!dragging) return;

    const handlePointer = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      evaluateOverlap(e.clientX, e.clientY);
    };
    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0] ?? e.changedTouches[0];
      if (!touch) return;
      lastPointerRef.current = { x: touch.clientX, y: touch.clientY };
      evaluateOverlap(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("touchmove", handleTouch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const onDragStart = (e: PointerEvent | MouseEvent | TouchEvent) => {
    setDragging(true);
    // Seed the pointer position from the drag-start event so we can
    // immediately evaluate overlap before the first move event fires.
    const ptr =
      "clientX" in e
        ? { x: e.clientX, y: e.clientY }
        : "touches" in e && e.touches[0]
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : null;
    if (ptr) {
      lastPointerRef.current = ptr;
      evaluateOverlap(ptr.x, ptr.y);
    }
  };

  const onDragEnd = () => {
    setDragging(false);
    if (!unlockedRef.current) {
      overTargetRef.current = false;
      setOverTarget(false);
      cancelHold();
    }
  };

  // Visual values driven by hold progress.
  const targetScale = overTarget ? 1 - holdProgress : 1;
  const targetOpacity = overTarget ? 1 - holdProgress * 0.5 : 0.85;
  const coreSize = overTarget ? 16 + holdProgress * 110 : 0;
  const coreOpacity = overTarget ? 0.45 + holdProgress * 0.55 : 0;

  return (
    <>
      <div className="relative flex flex-col items-center gap-10 pt-16 pb-28">
        {/* Spinning, draggable emblem */}
        <motion.div
          drag
          dragMomentum={false}
          dragSnapToOrigin
          dragElastic={0.4}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          whileDrag={{ scale: 1.05, cursor: "grabbing" }}
          whileHover={{ scale: 1.03 }}
          style={{ x, y, touchAction: "none" }}
          className="relative z-[55] flex h-[148px] w-[148px] cursor-grab items-center justify-center select-none"
          aria-label="Triseno seal"
        >
          <span
            className="relative z-10 flex h-full w-full items-center justify-center logo-spin-3d"
            style={{
              transformStyle: "preserve-3d",
              filter: "drop-shadow(0 6px 18px rgba(0,229,255,0.18))",
            }}
          >
            <Image
              src="/images/triseno-logo-v2.png"
              alt=""
              width={400}
              height={400}
              className="h-[136px] w-[136px] object-contain pointer-events-none"
              draggable={false}
              priority={false}
            />
          </span>
        </motion.div>

        {/* Stationary target — collapses into a singularity while held */}
        <div
          ref={targetRef}
          className="relative flex h-[148px] w-[148px] items-center justify-center"
        >
          <Image
            src="/images/triseno-logo-v2.png"
            alt=""
            width={400}
            height={400}
            className="h-[136px] w-[136px] object-contain select-none pointer-events-none"
            draggable={false}
            style={{
              transform: `scale(${targetScale})`,
              opacity: targetOpacity,
              filter: overTarget
                ? `drop-shadow(0 0 ${20 + holdProgress * 40}px rgba(0,229,255,${0.4 + holdProgress * 0.55}))`
                : "drop-shadow(0 4px 14px rgba(0,0,0,0.35))",
              transition: dragging
                ? "transform 60ms linear, opacity 60ms linear, filter 60ms linear"
                : "transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease, filter 320ms ease",
            }}
          />

          {/* Bright core grows from the center as the logo shrinks. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              width: `${coreSize}px`,
              height: `${coreSize}px`,
              borderRadius: "50%",
              opacity: coreOpacity,
              background:
                "radial-gradient(circle, #ffffff 0%, rgba(0,229,255,0.85) 28%, rgba(157,92,255,0.4) 60%, rgba(0,229,255,0) 80%)",
              boxShadow: `0 0 ${coreSize * 0.9}px rgba(0,229,255,${0.5 * holdProgress})`,
              transition: dragging
                ? "width 60ms linear, height 60ms linear, opacity 60ms linear"
                : "width 320ms ease, height 320ms ease, opacity 320ms ease",
            }}
          />
        </div>
      </div>

      {/* Unlock — hyperspeed detonation that warps into the Web Design Division. */}
      {unlocking && (
        <PortalBlast
          origin={blastOrigin}
          onNavigate={() => window.location.assign("/web-design-division")}
        />
      )}
    </>
  );
}

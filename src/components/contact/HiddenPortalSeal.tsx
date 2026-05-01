"use client";

/**
 * Easter-egg portal to /web-design. Two emblems live at the bottom of
 * /contact: a spinning, draggable emblem on top and a stationary one
 * below it.
 *
 * Mechanic: drag the spinning emblem onto the stationary one. While the
 * cursor is over the target, the target collapses (shrinks toward zero
 * while a bright cyan core grows out of its center — a singularity).
 * When the collapse completes (~750ms), the screen flashes and the page
 * hard-navigates to /web-design. No release timing required; the visual
 * tells you when it's done.
 */

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  type PanInfo,
} from "framer-motion";
import Image from "next/image";

const HOLD_DURATION_MS = 750;
const FLASH_BEFORE_NAV_MS = 360;
// Inflate the target hit zone so an imprecise drop still registers.
const HIT_PADDING = 32;

export default function HiddenPortalSeal() {
  const targetRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);
  const [overTarget, setOverTarget] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [unlocking, setUnlocking] = useState(false);

  const overTargetRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const unlockedRef = useRef(false);

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
    setUnlocking(true);
    cancelHold();
    window.setTimeout(() => {
      window.location.assign("/web-design");
    }, FLASH_BEFORE_NAV_MS);
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

  const isPointInTarget = (point: { x: number; y: number }) => {
    const t = targetRef.current;
    if (!t) return false;
    const r = t.getBoundingClientRect();
    return (
      point.x >= r.left - HIT_PADDING &&
      point.x <= r.right + HIT_PADDING &&
      point.y >= r.top - HIT_PADDING &&
      point.y <= r.bottom + HIT_PADDING
    );
  };

  const onDrag = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (unlockedRef.current) return;
    const overNow = isPointInTarget(info.point);
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
          onDragStart={() => setDragging(true)}
          onDrag={onDrag}
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
              className="h-[136px] w-[136px] object-contain"
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
            className="h-[136px] w-[136px] object-contain select-none"
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

      {/* Unlock flash — radial cyan/purple sweep before navigation */}
      <AnimatePresence>
        {unlocking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[200]"
            style={{
              background:
                "radial-gradient(circle at 50% 60%, rgba(0,229,255,0.7) 0%, rgba(157,92,255,0.32) 30%, rgba(5,8,16,0) 62%), #050810",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

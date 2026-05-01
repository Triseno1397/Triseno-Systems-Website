"use client";

/**
 * Easter-egg portal to /web-design. Two emblems live at the bottom of
 * /contact: a spinning, draggable emblem on top and a stationary one
 * below it. Drag the spinning emblem over the stationary one and hold
 * for ~900ms — a progress ring fills, the screen flashes, and the page
 * navigates to /web-design.
 *
 * No labels, no obvious affordance. Discovery is intentional: someone
 * familiar enough to try grabbing the logo earns the route.
 */

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  type PanInfo,
} from "framer-motion";
import Image from "next/image";

const HOLD_DURATION_MS = 900;
const FLASH_BEFORE_NAV_MS = 320;

export default function HiddenPortalSeal() {
  const targetRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);
  const [overTarget, setOverTarget] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [unlocking, setUnlocking] = useState(false);

  const overTargetRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);

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
    if (unlocking) return;
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
      point.x >= r.left &&
      point.x <= r.right &&
      point.y >= r.top &&
      point.y <= r.bottom
    );
  };

  const onDrag = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
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
    if (!unlocking) {
      overTargetRef.current = false;
      setOverTarget(false);
      cancelHold();
    }
  };

  // Progress ring constants (r=68 → circumference ≈ 427.26)
  const RING_R = 68;
  const RING_C = 2 * Math.PI * RING_R;
  const ringDashOffset = RING_C * (1 - holdProgress);

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

        {/* Stationary target emblem */}
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
              opacity: overTarget ? 1 : 0.85,
              filter: overTarget
                ? "drop-shadow(0 0 24px rgba(0,229,255,0.55))"
                : "drop-shadow(0 4px 14px rgba(0,0,0,0.35))",
              transition: "opacity 240ms ease, filter 240ms ease",
            }}
          />

          {/* Hold-progress ring — appears only while the seal is over target */}
          <svg
            viewBox="0 0 148 148"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
            style={{
              opacity: overTarget ? 1 : 0,
              transition: "opacity 240ms ease",
            }}
          >
            <circle
              cx="74"
              cy="74"
              r={RING_R}
              fill="none"
              stroke="rgba(0,229,255,0.18)"
              strokeWidth="1.25"
            />
            <circle
              cx="74"
              cy="74"
              r={RING_R}
              fill="none"
              stroke="#00e5ff"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={ringDashOffset}
              transform="rotate(-90 74 74)"
              style={{
                transition: "stroke-dashoffset 80ms linear",
                filter: "drop-shadow(0 0 6px rgba(0,229,255,0.6))",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Unlock flash — radial cyan/purple sweep before navigation */}
      <AnimatePresence>
        {unlocking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[200]"
            style={{
              background:
                "radial-gradient(circle at 50% 60%, rgba(0,229,255,0.6) 0%, rgba(157,92,255,0.28) 32%, rgba(5,8,16,0) 62%), #050810",
            }}
          />
        )}
      </AnimatePresence>

      {/* Suppress dragging while we're transitioning out */}
      {dragging ? null : null}
    </>
  );
}

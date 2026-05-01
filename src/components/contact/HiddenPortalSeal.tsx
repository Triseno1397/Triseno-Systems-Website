"use client";

/**
 * Easter-egg portal to /web-design. Lives at the bottom of the contact page
 * like a wax seal under a letter. Drag the seal to the dropzone that fades
 * in and the page transitions to the (unlisted) web-design experience.
 *
 * Discovery is intended to be accidental — there is no "drag me" affordance
 * beyond a grab cursor and a soft idle glow. People who try it find it.
 */

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  type PanInfo,
} from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";

const NAV_DELAY_MS = 720;

export default function HiddenPortalSeal() {
  const router = useRouter();
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);
  const [overDropzone, setOverDropzone] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const isPointInDropzone = (point: { x: number; y: number }) => {
    const dz = dropzoneRef.current;
    if (!dz) return false;
    const r = dz.getBoundingClientRect();
    return (
      point.x >= r.left &&
      point.x <= r.right &&
      point.y >= r.top &&
      point.y <= r.bottom
    );
  };

  const onDrag = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    setOverDropzone(isPointInDropzone(info.point));
  };

  const onDragEnd = (
    _: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    const hit = isPointInDropzone(info.point);
    setDragging(false);
    setOverDropzone(false);
    if (hit && !unlocking) {
      setUnlocking(true);
      // Brief portal flash, then navigate.
      window.setTimeout(() => {
        router.push("/web-design");
      }, NAV_DELAY_MS);
    }
  };

  return (
    <>
      {/* The seal — wrapped so the drag transform doesn't fight layout */}
      <div className="relative flex flex-col items-center pt-8 pb-20">
        <motion.div
          drag
          dragMomentum={false}
          dragSnapToOrigin
          dragElastic={0.35}
          onDragStart={() => setDragging(true)}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          whileDrag={{ scale: 1.06, cursor: "grabbing" }}
          whileHover={{ scale: 1.04 }}
          style={{ x, y, touchAction: "none" }}
          className="relative z-[55] flex h-[88px] w-[88px] cursor-grab items-center justify-center rounded-full select-none"
          aria-label="Triseno seal"
        >
          {/* Idle aura — gentle breathing glow */}
          <span
            aria-hidden="true"
            className="absolute inset-[-14px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(0,229,255,0.28) 0%, rgba(0,229,255,0) 65%)",
              filter: "blur(6px)",
              animation: "wd-glow-breathe 3.6s ease-in-out infinite",
            }}
          />
          {/* Outer hairline ring */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: "rgba(0,229,255,0.35)",
              boxShadow:
                "0 0 18px rgba(0,229,255,0.18), inset 0 0 22px rgba(0,229,255,0.08)",
            }}
          />
          {/* Logo spinning slowly */}
          <span
            className="relative z-10 flex h-full w-full items-center justify-center logo-spin-3d"
            style={{ transformStyle: "preserve-3d" }}
          >
            <Image
              src="/images/triseno-logo-v2.png"
              alt=""
              width={200}
              height={200}
              className="h-[58px] w-[58px] object-contain"
              draggable={false}
              priority={false}
            />
          </span>
        </motion.div>
        <p className="mt-4 text-[10px] uppercase tracking-[0.32em] text-white/30">
          trisenosystems
        </p>
      </div>

      {/* Dropzone — fades in only while dragging */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-6"
          >
            <div
              ref={dropzoneRef}
              data-active={overDropzone}
              className="relative flex h-[120px] w-full max-w-[420px] items-center justify-center rounded-[28px]"
              style={{
                borderWidth: "1.5px",
                borderStyle: "dashed",
                borderColor: overDropzone
                  ? "rgba(0,229,255,0.85)"
                  : "rgba(0,229,255,0.35)",
                background: overDropzone
                  ? "rgba(0,229,255,0.10)"
                  : "rgba(10,14,26,0.55)",
                backdropFilter: "blur(10px)",
                boxShadow: overDropzone
                  ? "0 0 38px rgba(0,229,255,0.45), inset 0 0 28px rgba(0,229,255,0.18)"
                  : "0 14px 30px rgba(0,0,0,0.45)",
                transition: "border-color 220ms ease, background 220ms ease, box-shadow 220ms ease",
              }}
            >
              <span
                className="text-[11px] uppercase tracking-[0.32em]"
                style={{
                  color: overDropzone ? "#ffffff" : "rgba(255,255,255,0.55)",
                  transition: "color 220ms ease",
                }}
              >
                {overDropzone ? "release" : "deliver here"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock flash — brief portal feel before route change */}
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
                "radial-gradient(circle at 50% 100%, rgba(0,229,255,0.55) 0%, rgba(157,92,255,0.25) 30%, rgba(5,8,16,0.0) 60%), #050810",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

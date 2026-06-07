"use client";

/**
 * Cockpit-style warp throttle.
 *
 * A vertical thruster lever the visitor drags to set the hyperspeed star
 * speed. Full manual control: whatever value you leave it at is where the warp
 * holds. Writes a 0..1 value into `targetRef` (Hero eases the actual star field
 * toward it for an engine "spool" feel) and mirrors it in local state for the
 * visuals.
 *
 * Drag the handle/track, scroll-wheel over it, or focus it and use arrow keys.
 */

import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Lightning } from "@phosphor-icons/react";

const HANDLE_H = 26; // px — handle grip height
const STEP = 0.05;

function statusFor(v: number): string {
  if (v < 0.04) return "All Stop";
  if (v < 0.2) return "Standby";
  if (v < 0.5) return "Warp";
  if (v < 0.85) return "High Warp";
  return "Maximum Warp";
}

interface Props {
  /** Shared 0..1 target the parent eases the warp field toward. */
  targetRef: MutableRefObject<number>;
  /** Starting throttle position (0..1). */
  initial?: number;
  className?: string;
}

export default function WarpThrottle({
  targetRef,
  initial = 0.35,
  className,
}: Props) {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [trackH, setTrackH] = useState(280);
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Seed the shared target on mount.
  useEffect(() => {
    targetRef.current = initial;
  }, [targetRef, initial]);

  // Measure the track so the handle can be transform-positioned in px.
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackH(trackRef.current.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const apply = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setValue(clamped);
    targetRef.current = clamped;
    setTouched(true);
  };

  const setFromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    apply(1 - (clientY - rect.top) / rect.height);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
    setFromClientY(e.clientY);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return;
    setFromClientY(e.clientY);
  };
  const endDrag = (e: ReactPointerEvent) => {
    draggingRef.current = false;
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    let v = value;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        v += STEP;
        break;
      case "ArrowDown":
      case "ArrowLeft":
        v -= STEP;
        break;
      case "PageUp":
        v += STEP * 4;
        break;
      case "PageDown":
        v -= STEP * 4;
        break;
      case "Home":
        v = 1;
        break;
      case "End":
        v = 0;
        break;
      default:
        return;
    }
    e.preventDefault();
    apply(v);
  };

  // Wheel control — non-passive so we can stop the page from scrolling while
  // the cursor is over the throttle.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.max(
        0,
        Math.min(1, targetRef.current + (e.deltaY < 0 ? STEP : -STEP))
      );
      targetRef.current = next;
      setValue(next);
      setTouched(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [targetRef]);

  const factor = (value * 9).toFixed(1);
  const status = statusFor(value);
  const handleOffset = Math.max(0, (1 - value) * (trackH - HANDLE_H));

  return (
    <div
      ref={wrapRef}
      role="slider"
      tabIndex={0}
      aria-label="Warp throttle"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={`Warp ${factor}, ${status}`}
      onKeyDown={onKeyDown}
      className={`group flex select-none flex-col items-center gap-2 px-0 py-1 outline-none transition-colors md:gap-3 md:rounded-2xl md:border md:border-white/[0.06] md:bg-[#0a0e1a]/40 md:px-4 md:py-5 md:backdrop-blur-md md:focus-visible:border-cyan-400/40 ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      {/* Header — desktop only */}
      <div className="hidden items-center gap-2 md:flex">
        <Lightning size={14} weight="fill" className="text-cyan-400" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">
          Warp Drive
        </span>
      </div>

      {/* Readout — compact on mobile (number only) */}
      <div className="flex flex-col items-center leading-none">
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-text-tertiary md:block">
          Throttle
        </span>
        <span
          className="font-mono text-base font-semibold tabular-nums text-text-primary md:text-3xl"
          style={{ textShadow: `0 0 ${8 + value * 18}px rgba(0,229,255,${0.4 + value * 0.5})` }}
        >
          {factor}
        </span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/80 md:block">
          {status}
        </span>
      </div>

      {/* Track */}
      <div className="relative flex h-[clamp(150px,32vh,240px)] items-center justify-center md:h-[clamp(190px,34vh,320px)]">
        {/* Powering-up halo behind the track */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(0,229,255,0.25), transparent 75%)",
            opacity: 0.12 + value * 0.55,
            transform: `scale(${0.9 + value * 0.5})`,
          }}
        />

        {/* Scale ticks — desktop only */}
        <div
          aria-hidden="true"
          className="absolute -left-4 inset-y-0 hidden flex-col justify-between py-1 md:flex"
        >
          {[9, 7, 5, 3, 1].map((n) => (
            <span
              key={n}
              className="font-mono text-[8px] leading-none text-white/25"
            >
              {n}
            </span>
          ))}
        </div>

        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative h-full w-2 cursor-pointer rounded-full md:w-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))",
            boxShadow:
              "inset 0 0 0 1px rgba(0,180,216,0.2), inset 0 2px 10px rgba(0,0,0,0.65)",
          }}
        >
          {/* Fill (bottom -> handle) */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-full origin-bottom rounded-full"
            style={{
              height: "100%",
              transform: `scaleY(${value})`,
              background:
                "linear-gradient(180deg, #9af3ff 0%, #00e5ff 35%, #00b4d8 100%)",
            }}
          />
          {/* Fill glow — opacity scales with throttle */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              opacity: 0.25 + value * 0.6,
              boxShadow: `0 0 ${10 + value * 26}px rgba(0,229,255,${0.35 + value * 0.5})`,
            }}
          />

          {/* Handle */}
          <div
            className="absolute left-1/2 top-0 grid w-8 cursor-grab place-items-center rounded-md active:cursor-grabbing md:w-[46px]"
            style={{
              height: HANDLE_H,
              transform: `translate(-50%, ${handleOffset}px)`,
              background: "linear-gradient(180deg, #18222f, #0a0e1a)",
              border: "1px solid rgba(0,229,255,0.55)",
              boxShadow: `0 0 ${8 + value * 22}px rgba(0,229,255,${0.4 + value * 0.5}), inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            {/* Grip lines */}
            <div className="flex flex-col gap-[3px]">
              <span className="block h-px w-5 bg-cyan-300/70" />
              <span className="block h-px w-5 bg-cyan-300/70" />
              <span className="block h-px w-5 bg-cyan-300/70" />
            </div>
            {/* First-run pulse hint */}
            {!touched && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-md animate-ping"
                style={{ border: "1px solid rgba(0,229,255,0.55)" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Hint — desktop only */}
      <span
        className={`hidden font-mono text-[9px] uppercase tracking-[0.2em] text-white/35 transition-opacity duration-500 md:block ${
          touched ? "opacity-0" : "opacity-100"
        }`}
      >
        Drag to engage
      </span>
    </div>
  );
}

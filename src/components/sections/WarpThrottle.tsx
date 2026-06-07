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

const HANDLE_H = 30; // px — handle grip height
const STEP = 0.05;

// Faceted/beveled silhouette for the thruster grip — reads more "machined
// cockpit lever" than a plain rounded block.
const BEVEL =
  "polygon(0% 30%, 22% 0%, 78% 0%, 100% 30%, 100% 70%, 78% 100%, 22% 100%, 0% 70%)";

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
  initial = 0.03,
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
      className={`group relative flex select-none flex-col items-center gap-2 px-0 py-1 outline-none transition-colors md:gap-3 md:rounded-2xl md:border md:border-cyan-400/15 md:bg-gradient-to-b md:from-[#0c1320]/70 md:to-[#070b14]/80 md:px-4 md:py-5 md:shadow-[0_0_0_1px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] md:backdrop-blur-md md:focus-visible:border-cyan-400/50 ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      {/* Console corner brackets — desktop only, give the panel a HUD frame */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1.5 top-1.5 hidden h-3 w-3 border-l border-t border-cyan-400/40 md:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 top-1.5 hidden h-3 w-3 border-r border-t border-cyan-400/40 md:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 left-1.5 hidden h-3 w-3 border-b border-l border-cyan-400/40 md:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 right-1.5 hidden h-3 w-3 border-b border-r border-cyan-400/40 md:block"
      />

      {/* Header — desktop only */}
      <div className="hidden items-center gap-1.5 md:flex">
        <span className="font-mono text-[10px] text-cyan-400/40">[</span>
        <Lightning size={13} weight="fill" className="text-cyan-400" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">
          Warp Drive
        </span>
        <span className="font-mono text-[10px] text-cyan-400/40">]</span>
      </div>

      {/* Readout — compact on mobile (number only) */}
      <div className="flex flex-col items-center leading-none">
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-text-tertiary md:block">
          Throttle
        </span>
        <div className="flex items-center gap-1.5">
          <span className="hidden font-mono text-sm leading-none text-cyan-400/40 md:block">
            &laquo;
          </span>
          <span
            className="font-mono text-base font-semibold tabular-nums text-text-primary md:text-3xl"
            style={{ textShadow: `0 0 ${8 + value * 18}px rgba(0,229,255,${0.4 + value * 0.5})` }}
          >
            {factor}
          </span>
          <span className="hidden font-mono text-sm leading-none text-cyan-400/40 md:block">
            &raquo;
          </span>
        </div>
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

        {/* Throttle-quadrant housing — desktop only. A machined channel the
            lever rides in, with bolt heads at the corners. */}
        <div
          aria-hidden="true"
          className="absolute -inset-y-3 left-1/2 hidden w-[58px] -translate-x-1/2 rounded-lg md:block"
          style={{
            background:
              "linear-gradient(90deg, #0b121c 0%, #18222f 50%, #0b121c 100%)",
            boxShadow:
              "inset 0 0 0 1px rgba(0,180,216,0.18), inset 0 2px 14px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)",
          }}
        >
          {[
            "left-1.5 top-1.5",
            "right-1.5 top-1.5",
            "bottom-1.5 left-1.5",
            "bottom-1.5 right-1.5",
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute ${pos} h-1.5 w-1.5 rounded-full`}
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #2c3a48, #060a12)",
                boxShadow: "inset 0 0 0 0.5px rgba(0,229,255,0.2)",
              }}
            />
          ))}
        </div>

        {/* Scale ticks (numbered) — desktop only */}
        <div
          aria-hidden="true"
          className="absolute -left-5 inset-y-0 hidden flex-col justify-between py-1 md:flex"
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

        {/* Gate notches (unnumbered) — desktop only, mirror the scale on the
            right for a throttle-quadrant feel. */}
        <div
          aria-hidden="true"
          className="absolute -right-3 inset-y-0 hidden flex-col justify-between py-1 md:flex"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="block h-px w-2 bg-cyan-400/20" />
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
          {/* Redline / max-warp hazard zone at the top of the channel */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 hidden h-[12%] rounded-t-full md:block"
            style={{
              background:
                "repeating-linear-gradient(45deg, rgba(255,77,79,0.45) 0 3px, transparent 3px 6px)",
              opacity: 0.5 + value * 0.5,
            }}
          />

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

          {/* Handle — faceted machined thruster grip */}
          <div
            className="absolute left-1/2 top-0 w-8 cursor-grab active:cursor-grabbing md:w-[52px]"
            style={{
              height: HANDLE_H,
              transform: `translate(-50%, ${handleOffset}px)`,
            }}
          >
            {/* Outer bevel — acts as the glowing rim of the lever */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                clipPath: BEVEL,
                background:
                  "linear-gradient(180deg, rgba(0,229,255,0.85), rgba(0,180,216,0.5))",
                boxShadow: `0 0 ${8 + value * 22}px rgba(0,229,255,${0.4 + value * 0.5})`,
              }}
            />
            {/* Inner metal face */}
            <div
              aria-hidden="true"
              className="absolute inset-[1.5px]"
              style={{
                clipPath: BEVEL,
                background:
                  "linear-gradient(180deg, #2a3744 0%, #141d27 48%, #090d16 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            />
            {/* Finger grooves + active reading line */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-[3px]">
                <span className="block h-px w-5 bg-black/50" />
                <span
                  className="block h-[2px] w-6 rounded-full bg-cyan-300"
                  style={{
                    boxShadow: `0 0 ${4 + value * 10}px rgba(0,229,255,${0.6 + value * 0.4})`,
                  }}
                />
                <span className="block h-px w-5 bg-black/50" />
              </div>
            </div>
            {/* First-run pulse hint */}
            {!touched && (
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-ping"
                style={{
                  clipPath: BEVEL,
                  border: "1px solid rgba(0,229,255,0.55)",
                }}
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

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/* Shared by every /studio section: media-query state without setState-in-effect,
   and a video that only takes a src once it is near the viewport (design-system
   §7: video is lazy, the LCP element is text). */

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const REDUCED = "(prefers-reduced-motion: reduce)";

const noopSubscribe = () => () => {};

/** true inside the CMS preview iframe (/studio?__draft=1). */
export function useDraftMode(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("__draft") === "1",
    () => false,
  );
}

interface LazyVideoProps {
  src: string;
  className?: string;
  /** Mount the src immediately (above the fold). */
  eager?: boolean;
  /** Play while on screen. false = paused poster frame. */
  active?: boolean;
  /** Unmuted. Only ever true after a click. */
  sound?: boolean;
  /** Play even when motion is reduced — only ever set by an explicit click. */
  force?: boolean;
  label?: string;
  /**
   * Seconds into the clip that a *paused* frame should show. Some clips open on
   * an establishing wide that does not depict the format the frame is labelled
   * with (apparel try-on opens on a drone shot of a street), and the paused
   * poster is what a still screenshot of the page shows. Default 0.1s.
   */
  poster?: number;
  /**
   * Play only [start, end] seconds of the clip, looping inside that range.
   * Used to keep a clip's baked-in end card or brand super off a frame that
   * carries our own type.
   */
  range?: [number, number];
}

export function LazyVideo({
  src,
  className,
  eager = false,
  active = true,
  sound = false,
  force = false,
  label,
  poster,
  range,
}: LazyVideoProps) {
  const holder = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  // Every clip ships a still at the same path under /posters. A frame off the
  // centre of the strip therefore shows real work from the moment it is on
  // screen, instead of a black rectangle waiting on a 6–15MB decode.
  const still = `/posters/${src.split("/").pop()?.replace(/\.mp4$/, ".jpg")}`;
  const [near, setNear] = useState(eager);
  const [onScreen, setOnScreen] = useState(false);
  const reduced = useMediaQuery(REDUCED);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const arm = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          arm.disconnect();
        }
      },
      { rootMargin: "80% 40%" },
    );
    const see = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), {
      threshold: 0.05,
    });
    arm.observe(el);
    see.observe(el);
    return () => {
      arm.disconnect();
      see.disconnect();
    };
  }, []);

  const shouldPlay = near && onScreen && active && (!reduced || force);
  const from = range?.[0];
  const to = range?.[1];

  // Loop inside the range: native `loop` would run the excluded tail.
  useEffect(() => {
    const v = video.current;
    if (!v || from === undefined || to === undefined) return;
    const clamp = () => {
      if (v.currentTime < from - 0.25 || v.currentTime >= to) v.currentTime = from;
    };
    const again = () => {
      v.currentTime = from;
      v.play().catch(() => {});
    };
    v.addEventListener("timeupdate", clamp);
    v.addEventListener("ended", again);
    return () => {
      v.removeEventListener("timeupdate", clamp);
      v.removeEventListener("ended", again);
    };
  }, [from, to, near]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    // React's `muted` prop does not reliably reach the DOM.
    v.muted = !sound;
    if (shouldPlay) v.play().catch(() => {});
    else v.pause();
  }, [shouldPlay, sound, near]);

  return (
    <div ref={holder} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={still} alt="" aria-hidden="true" className="sx-still" loading="lazy" decoding="async" />
      {near ? (
        <video
          ref={video}
          poster={still}
          // The media fragment makes a paused clip show a real frame, not black
          // — and lands it on a frame that depicts the format (see `poster`).
          src={`${src}#t=${poster ?? from ?? 0.1}`}
          muted
          loop={from === undefined}
          playsInline
          preload="metadata"
          aria-label={label}
          aria-hidden={label ? undefined : true}
          tabIndex={-1}
        />
      ) : null}
    </div>
  );
}

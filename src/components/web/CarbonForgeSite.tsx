"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Concept site with a moving hero — fictional knife maker "Carbon Forge".
 * Live HTML/CSS in container units (crisp at any size: an orbit card or the
 * hero's browser), over a 9-second silent loop cut from the studio's own
 * product reel (public/templates/carbon-forge.*, 139KB as WebM).
 *
 * The video only loads once `play` is true (the wheel has landed, or the
 * browser is showing this site) and only plays while it is on screen; under
 * reduced motion it is the poster frame and nothing moves.
 */
export default function CarbonForgeSite({ play = true }: { play?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // once asked to play it stays loaded (latched during render, not in an effect)
  const [armed, setArmed] = useState(false);
  if (play && !armed && !reduced) setArmed(true);

  useEffect(() => {
    const v = video.current;
    if (!v || !armed) return;
    // the sources were added after mount: have the element pick them up
    v.load();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [armed]);

  return (
    <span className="cf">
      <video
        ref={video}
        className="cf-video"
        poster="/templates/carbon-forge-poster.webp"
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      >
        {armed ? (
          <>
            <source src="/templates/carbon-forge.webm" type="video/webm" />
            <source src="/templates/carbon-forge.mp4" type="video/mp4" />
          </>
        ) : null}
      </video>
      <span className="cf-shade" aria-hidden="true" />
      <span className="cf-nav">
        <span className="cf-logo">Carbon Forge</span>
        <span className="cf-links">
          <span>Knives</span>
          <span>The forge</span>
          <span>Care</span>
        </span>
        <span className="cf-btn">Shop the line</span>
      </span>
      <span className="cf-copy">
        <span className="cf-kicker">Hand-forged in small batches</span>
        <span className="cf-h">
          Folded 64 times.
          <em>Sharpened once.</em>
        </span>
        <span className="cf-p">A carbon-steel core, a lifetime edge, and a forge you can visit.</span>
        <span className="cf-actions">
          <span className="cf-btn cf-btn--solid">Choose your blade</span>
          <span className="cf-link">Watch the fold</span>
        </span>
      </span>
      <span className="cf-specs">
        <span>
          <b>61</b>HRC hardness
        </span>
        <span>
          <b>64</b>layer fold
        </span>
        <span>
          <b>Life</b>time edge service
        </span>
      </span>
    </span>
  );
}

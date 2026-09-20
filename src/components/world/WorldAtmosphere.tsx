"use client";

import type { CSSProperties } from "react";

/**
 * The lit place, composited in CSS.
 *
 * Every world falls back to this when 3D is not appropriate — a phone, reduced
 * motion, no WebGL, or a GPU too weak to keep the canvas up. It is not a flat
 * void and not a plain gradient: a horizon band, a bloom above it, a row of
 * silhouetted slabs standing on the horizon, drifting haze, a wet floor that
 * catches the light, floating dust and a vignette. Layers are transform- and
 * opacity-animated only, and hold still under `prefers-reduced-motion`.
 *
 * `hue` is the surface's single hue (design-system D2). White gives the
 * achromatic version used by the portal at rest, `/work` and `/contact`.
 */
export default function WorldAtmosphere({
  hue = "#ffffff",
  className = "",
  fixed = false,
}: {
  hue?: string;
  className?: string;
  /** pin it to the viewport instead of the nearest positioned ancestor */
  fixed?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`world-atmos ${fixed ? "world-atmos--fixed" : ""} ${className}`}
      style={{ ["--atmos-hue" as string]: hue } as CSSProperties}
    >
      <span className="world-atmos__sky" />
      <span className="world-atmos__shaft" />
      <span className="world-atmos__bloom" />
      <span className="world-atmos__slabs" />
      <span className="world-atmos__horizon" />
      <span className="world-atmos__haze world-atmos__haze--a" />
      <span className="world-atmos__haze world-atmos__haze--b" />
      <span className="world-atmos__floor">
        <span className="world-atmos__grid" />
        <span className="world-atmos__pool" />
      </span>
      <span className="world-atmos__dust" />
      <span className="world-atmos__vignette" />
    </div>
  );
}

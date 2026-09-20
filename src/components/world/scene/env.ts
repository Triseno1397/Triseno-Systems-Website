import { createContext } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────────────
   Shared world state for every rendered Triseno world (portal + divisions).
   Only one world canvas is ever mounted at a time, so a single module-level
   record is the cheapest possible bridge between the DOM layer and useFrame —
   no React re-render ever sits between a scroll tick and the camera.
   ───────────────────────────────────────────────────────────────────────── */

export const WHITE = "#ffffff";

/** Quality tier. "low" is a weak GPU: it still renders a lit place, just fewer passes. */
export type Tier = "high" | "low";
export const TierContext = createContext<Tier>("high");

export const env = {
  /** the light colour the world is currently throwing around (white at rest) */
  light: new THREE.Color(WHITE),
  /** 0..1 brightness envelope used for the dip between two hues */
  level: 1,
  /**
   * 0..1 — how achromatic the world is right now. At 1 (white light: the
   * portal at rest, WORK, CONTACT) the world is lit harder, not greyer: hotter
   * key and rim light, a brighter horizon, deeper fog and less haze wash, so
   * colourless reads as a premium high-contrast pass, never as desaturated.
   */
  white: 1,
  /** world position of whatever is in focus (DOF target, key light) */
  focus: new THREE.Vector3(0, 1.95, 0),
};

export const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * A hue never blends into another hue (that would show a third colour, or a
 * pale version of itself). It dips to dark, swaps, and comes back up.
 */
export class HueDip {
  hex = WHITE;
  color = new THREE.Color(WHITE);
  level = 1;
  out = new THREE.Color(WHITE);
  update(dt: number, targetHex: string) {
    if (targetHex !== this.hex) {
      this.level -= dt / 0.22;
      if (this.level <= 0) {
        this.level = 0;
        this.hex = targetHex;
        this.color.set(targetHex);
      }
    } else if (this.level < 1) {
      this.level = Math.min(1, this.level + dt / 0.55);
    }
    const e = this.level * this.level * (3 - 2 * this.level);
    this.out.copy(this.color).multiplyScalar(e);
    return this.out;
  }
}

/** `?dbg=…` switches, read once. Uppercase H pins the high tier for captures. */
export const DBG =
  typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("dbg") || "";

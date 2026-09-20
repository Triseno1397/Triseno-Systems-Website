import { DIVISIONS, MENU_ORDER, type Division } from "@/lib/divisions";

// Mutable bridge between the DOM layer (menu hover, scroll) and the R3F scene.
// Written from event handlers / ScrollTrigger, read inside useFrame — no React
// re-render ever sits between a scroll tick and the camera.
export const portalState = {
  /** index into MENU_ITEMS of the lit word */
  active: 0,
  /** 0..1 while the hero scrolls out (camera flies through the signature object) */
  hero: 0,
  /** 0..1 across the three-doors section (camera dolly) */
  doors: 0,
  /** 0..1 across the gate */
  gate: 0,
  /** normalised pointer, -1..1 */
  px: 0,
  py: 0,
  /** door index under the pointer in 3D, or -1 */
  hoverDoor: -1,
};

export const MENU_ITEMS: Division[] = MENU_ORDER.map((k) => DIVISIONS[k]);

export const DOOR_ITEMS: Division[] = [DIVISIONS.creative, DIVISIONS.web, DIVISIONS.ai];

/* ── Camera dolly maths, shared by the scene (camera) and the DOM (cards) ── */

export const DOOR_Z = [-16, -30, -44];
export const DOLLY_START_Z = -2;
export const DOLLY_END_Z = -50;

const LINGER_AT = 6; // camera lingers when a door is this far ahead
const SPAN = DOLLY_START_Z - DOLLY_END_Z; // 48
const P0 = (DOLLY_START_Z - DOOR_Z[0] - LINGER_AT) / SPAN;
const PERIOD = (DOOR_Z[0] - DOOR_Z[1]) / SPAN;
const AMP = (PERIOD / (Math.PI * 2)) * 0.62;

/** Scroll progress (0..1) -> camera z, slowing down in front of each door. */
export function dollyZ(p: number): number {
  const eased = p - AMP * Math.sin(((p - P0) / PERIOD) * Math.PI * 2);
  return DOLLY_START_Z - SPAN * Math.min(1, Math.max(0, eased));
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * How lit door `i` is for a camera at `camZ`. A door only takes its hue while
 * it is the one in front of the camera, so two division hues never share a
 * frame (design-system D2).
 */
export function doorLit(i: number, camZ: number): number {
  const d = camZ - DOOR_Z[i]; // distance still to travel to the door
  return smooth(16, 11, d) * (1 - smooth(1.5, -0.5, d));
}

/** Visibility (0..1) of door `i`'s copy card. */
export function cardVisible(i: number, camZ: number): number {
  const d = camZ - DOOR_Z[i];
  return smooth(13.5, 10.5, d) * (1 - smooth(4.2, 2.6, d));
}

import { DIVISIONS, MENU_ORDER, type Division } from "@/lib/divisions";

// Mutable bridge between the DOM layer (menu hover, scroll, warp) and the R3F
// scene. Written from event handlers / ScrollTrigger, read inside useFrame —
// no React re-render ever sits between a scroll tick and the camera.
export const portalState = {
  /** index into MENU_ITEMS: which glyph the signature object shows */
  active: 0,
  /**
   * true only while a menu word is hovered / focused. At rest the portal is
   * achromatic: the object morphs with the headline but stays white, and the
   * environment is neutral grey (design-system §1).
   */
  hot: false,
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
  /** performance.now() when a warp out of the portal started, else 0 */
  warpAt: 0,
  /** screen-space y (0..1) of the wet floor at the gate object's base — the beams land here */
  gateFloorY: 0.8,
  /** poster capture mode (?capture=…): no view offset, fixed framing */
  capture: "" as "" | "hero" | "door" | "gate",
};

export const MENU_ITEMS: Division[] = MENU_ORDER.map((k) => DIVISIONS[k]);

export const DOOR_ITEMS: Division[] = [DIVISIONS.creative, DIVISIONS.web, DIVISIONS.ai];

/* ── Camera dolly maths, shared by the scene (camera) and the DOM (cards) ── */

export const DOOR_Z = [-16, -30, -44];
export const DOLLY_START_Z = -2;
export const DOLLY_END_Z = -50;

const LINGER_AT = 8.5; // camera lingers when a door is this far ahead
const SPAN = DOLLY_START_Z - DOLLY_END_Z; // 48
const P0 = (DOLLY_START_Z - DOOR_Z[0] - LINGER_AT) / SPAN;
const PERIOD = (DOOR_Z[0] - DOOR_Z[1]) / SPAN;
const AMP = (PERIOD / (Math.PI * 2)) * 0.62;

/** Scroll progress (0..1) -> camera z, slowing down in front of each door. */
export function dollyZ(p: number): number {
  const eased = p - AMP * Math.sin(((p - P0) / PERIOD) * Math.PI * 2);
  return DOLLY_START_Z - SPAN * Math.min(1, Math.max(0, eased));
}

export const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * How lit door `i` is for a camera at `camZ`. The camera flies THROUGH each
 * door; a door holds its hue from the approach until the camera is through it,
 * and the next one only ignites after that — two division hues never share a
 * frame (design-system D2). The last door stays lit into the gate.
 */
export function doorLit(i: number, camZ: number): number {
  const d = camZ - DOOR_Z[i]; // distance still to travel to the door
  const on = smooth(12.6, 10, d);
  return i === DOOR_Z.length - 1 ? on : on * (1 - smooth(0.4, -1, d));
}

/** Visibility (0..1) of door `i`'s copy card: up while the door is framed, gone before the fly-through. */
export function cardVisible(i: number, camZ: number): number {
  const d = camZ - DOOR_Z[i];
  // a long fully-visible window, so a card is read at rest, not mid-fade
  return smooth(12.8, 11.6, d) * (1 - smooth(5.4, 4.2, d));
}

/** Which side of the frame door `i` sits on (-1 left, +1 right); its card takes the other side. */
export function doorSide(i: number): number {
  return i % 2 === 0 ? -1 : 1;
}

/**
 * Horizontal framing, as a fraction of the viewport width, that the focal
 * object is pushed off-centre so copy never sits on top of it. Positive =
 * object to the right. Hero and gate: right. Doors alternate. It unwinds to 0
 * whenever the camera flies through something.
 */
export function framing(hero: number, doors: number, gate: number, camZ: number): number {
  if (doors <= 0) return 1 - smooth(0, 0.62, hero);
  let f = 0;
  for (let i = 0; i < DOOR_Z.length; i++) {
    const d = camZ - DOOR_Z[i];
    f += doorSide(i) * smooth(13.8, 11.4, d) * (1 - smooth(6.2, 2.2, d));
  }
  return f + smooth(0.05, 0.7, gate);
}

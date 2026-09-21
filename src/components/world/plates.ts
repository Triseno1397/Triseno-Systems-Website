import manifest from "../../../public/art-manifest.json";
import type { DivisionKey } from "@/lib/divisions";

/* ─────────────────────────────────────────────────────────────────────────
   World plates (design-loop/world-plates.md): generated environment art that
   is the base layer of every world. One desktop (2880x1620) and one mobile
   (1170x2069) plate per world, and for Creative / Web / AI two further camera
   STATIONS further into the same place (station 1 is the base plate). Every
   image has a pre-blurred "-glass" copy (a few KB) that GlassPanel paints and
   that doubles as the plate's placeholder.
   ───────────────────────────────────────────────────────────────────────── */

export type PlateWorld = "portal" | "creative" | "web" | "ai";

export interface Plate {
  desktop: string;
  mobile: string;
  /** base64 WebP placeholders from the manifest (may be empty) */
  desktopBlur: string;
  mobileBlur: string;
  /** pre-blurred copies for GlassPanel and as true-colour placeholders */
  desktopGlass: string;
  mobileGlass: string;
  /** vertical position of the plate's horizon / vanishing point, 0 = top */
  horizon: { desktop: number; mobile: number };
}

const entries = manifest as Record<string, { w: number; h: number; blur?: string }>;

const HORIZON: Record<PlateWorld, { desktop: number; mobile: number }> = {
  // measured from the art: where the floor meets the far wall
  portal: { desktop: 0.72, mobile: 0.76 },
  // the push-in / crop anchor for these worlds. Every station shares its
  // world's anchor (stations were generated with horizon and vanishing point
  // held), and page overlays (ai.css, web.css, studio.css) are laid out on
  // these same values — change them together or not at all.
  creative: { desktop: 0.62, mobile: 0.64 },
  web: { desktop: 0.6, mobile: 0.62 },
  ai: { desktop: 0.56, mobile: 0.58 },
};

function build(world: PlateWorld, desktop: string, mobile: string): Plate {
  const glass = (src: string) => src.replace(/\.webp$/, "-glass.webp");
  return {
    desktop,
    mobile,
    desktopBlur: entries[desktop]?.blur ?? "",
    mobileBlur: entries[mobile]?.blur ?? "",
    desktopGlass: glass(desktop),
    mobileGlass: glass(mobile),
    horizon: HORIZON[world],
  };
}

/** Station 1 — the base plate. */
export function plate(world: PlateWorld): Plate {
  return build(world, `/worlds/${world}-desktop.webp`, `/worlds/${world}-mobile.webp`);
}

/** Every camera station of a world, in travel order (the portal has one: its doors travel in 3D). */
export function stationPlates(world: PlateWorld): Plate[] {
  if (world === "portal") return [plate(world)];
  return [
    plate(world),
    build(world, `/worlds/${world}-station2.webp`, `/worlds/${world}-station2-mobile.webp`),
    build(world, `/worlds/${world}-station3.webp`, `/worlds/${world}-station3-mobile.webp`),
  ];
}

/** The plate a surface stands in. Work and Contact are achromatic: the portal's gallery. */
export function plateForDivision(key: DivisionKey): PlateWorld {
  return key === "creative" || key === "web" || key === "ai" ? key : "portal";
}

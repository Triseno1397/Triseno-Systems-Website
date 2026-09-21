import manifest from "../../../public/art-manifest.json";
import type { DivisionKey } from "@/lib/divisions";

/* ─────────────────────────────────────────────────────────────────────────
   World plates (design-loop/world-plates.md): generated environment art that
   is the base layer of every world. One desktop (2880x1620) and one mobile
   (1170x2069) plate per world, each with a tiny blur placeholder in
   /art-manifest.json that paints instantly while the real image loads.
   ───────────────────────────────────────────────────────────────────────── */

export type PlateWorld = "portal" | "creative" | "web" | "ai";

export interface Plate {
  desktop: string;
  mobile: string;
  /** base64 WebP placeholders (may be empty if the manifest has no entry) */
  desktopBlur: string;
  mobileBlur: string;
  /** vertical position of the plate's horizon / vanishing point, 0 = top */
  horizon: { desktop: number; mobile: number };
}

const entries = manifest as Record<string, { w: number; h: number; blur?: string }>;

const HORIZON: Record<PlateWorld, { desktop: number; mobile: number }> = {
  // measured from the art: where the floor meets the far wall under the shaft
  portal: { desktop: 0.72, mobile: 0.76 },
  creative: { desktop: 0.62, mobile: 0.64 },
  web: { desktop: 0.6, mobile: 0.62 },
  ai: { desktop: 0.56, mobile: 0.58 },
};

export function plate(world: PlateWorld): Plate {
  const desktop = `/worlds/${world}-desktop.webp`;
  const mobile = `/worlds/${world}-mobile.webp`;
  return {
    desktop,
    mobile,
    desktopBlur: entries[desktop]?.blur ?? "",
    mobileBlur: entries[mobile]?.blur ?? "",
    horizon: HORIZON[world],
  };
}

/** The plate a surface stands in. Work and Contact are achromatic: the portal's gallery. */
export function plateForDivision(key: DivisionKey): PlateWorld {
  return key === "creative" || key === "web" || key === "ai" ? key : "portal";
}

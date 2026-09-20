// Route -> division map. The single source for the division name shown in the
// chrome lockup, the division hue (design-system §1) and the glyph.

export type GlyphKind = "circle" | "square" | "triangle" | "diamond" | "plus";

export type DivisionKey = "portal" | "creative" | "web" | "ai" | "work" | "contact";

export interface Division {
  key: DivisionKey;
  /** Text after the slash in the lockup: TRISENO / <name>. */
  name: string;
  route: string;
  /** The only saturated colour allowed on that surface. White = achromatic. */
  hue: string;
  glyph: GlyphKind;
  /**
   * true when the route is not an App Router page (served from /public through
   * a rewrite), so the warp must finish with a document navigation.
   */
  external?: boolean;
}

export const WHITE = "#ffffff";

export const DIVISIONS: Record<DivisionKey, Division> = {
  portal: { key: "portal", name: "Portal", route: "/", hue: WHITE, glyph: "circle" },
  creative: { key: "creative", name: "Creative", route: "/studio", hue: "#ff8a3d", glyph: "circle" },
  web: {
    key: "web",
    name: "Web Design",
    route: "/web-design-division",
    hue: "#9d5cff",
    glyph: "square",
    external: true,
  },
  ai: { key: "ai", name: "AI Infrastructure", route: "/ai-infrastructure", hue: "#00b4d8", glyph: "triangle" },
  work: { key: "work", name: "Work", route: "/work", hue: WHITE, glyph: "diamond" },
  contact: { key: "contact", name: "Contact", route: "/contact", hue: WHITE, glyph: "plus" },
};

/** Menu order used by the portal menu and the overlay menu. */
export const MENU_ORDER: DivisionKey[] = ["creative", "web", "ai", "work", "contact"];

// Upper-case in the DOM (not only via CSS) so the words read the same to
// assistive tech, copy/paste and automated capture as they do on screen.
export const MENU_LABEL: Record<DivisionKey, string> = {
  portal: "PORTAL",
  creative: "CREATIVE",
  web: "WEB DESIGN",
  ai: "AI INFRASTRUCTURE",
  work: "WORK",
  contact: "CONTACT",
};

export function divisionForPath(pathname: string): Division {
  if (pathname === "/") return DIVISIONS.portal;
  const match = (Object.values(DIVISIONS) as Division[]).find(
    (d) => d.route !== "/" && (pathname === d.route || pathname.startsWith(d.route + "/")),
  );
  if (match) return match;
  if (pathname.startsWith("/portfolio")) return DIVISIONS.work;
  return DIVISIONS.portal;
}

export function divisionForHref(href: string): Division {
  const path = href.split(/[?#]/)[0] || "/";
  return divisionForPath(path);
}

/**
 * Routes already rebuilt on the revamp foundation. Only these get the global
 * chrome, orb cursor and smooth scroll; legacy pages keep their own navigation
 * until their piece of the revamp lands. The warp transition is global.
 */
const REVAMPED = ["/", "/ai-infrastructure", "/work"];

export function isRevampedRoute(pathname: string): boolean {
  return REVAMPED.includes(pathname);
}

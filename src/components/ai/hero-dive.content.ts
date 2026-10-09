/* ─────────────────────────────────────────────────────────────────────────
   hero-dive — every word the push-in prints. Kept out of content.ts so the
   hero's builder and the page's lead never edit the same file; the lead may
   fold these into content.ts HERO when wiring.
   ───────────────────────────────────────────────────────────────────────── */

export const DIVE = {
  /** under the figure, pointer devices */
  hintFine: "Press and hold the core",
  /** under the figure, touch devices */
  hintTouch: "Touch and hold the core",
  /** the scroll cue at the hero's bottom-left */
  cue: "Scroll",
  /** the stage's accessible name (role=button) */
  aria: "Hold to look inside the core; release to come back.",
  /** sr-only, read with the figure's own description */
  inside:
    "Inside the core: the Triseno mark cast in the same liquid chrome, two routes orbiting it, the drafting grid continuing into the dark.",
  /** the live caption once the camera has crossed the skin; the request is this visitor's own (session.mint) */
  captionInside: (id: string, local: string, tz: string): string =>
    `The layer underneath · REQ ${id} · ${local}${tz ? ` ${tz}` : ""}`,
  /** low devices never dive: the hold only swells the mercury */
  captionLow: "core · hold to swell",
} as const;

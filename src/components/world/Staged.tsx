"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { WARP_COVERED_EVENT, WARP_END_EVENT } from "./WarpProvider";

/* ─────────────────────────────────────────────────────────────────────────
   A page's sections, one per frame when the page arrives by warp.

   Arriving through the tunnel, a division page used to mount every section
   in the route's one commit: ten sections' worth of first layout and text
   shaping in a single task (the concept sites inside the frames are mostly
   type), each section's scroll triggers measuring the page as it went, the
   old page's triggers unwinding in the same breath. On a mid-range phone that
   task ran well over a second and the tunnel froze with it.

   Behind the tunnel nothing is visible yet, so the sections take turns: the
   route's own commit carries only the page's world layer, and the sections
   follow one per frame, each in the frame after the last has been laid out
   and painted. The page holds `data-world-loading` until they
   are all in, so the tunnel never lifts on a page still arriving (the warp
   waits for that attribute, WarpProvider). Direct loads and history moves
   mount everything at once, exactly as the server rendered it.

   Leaving is staged the same way: once the tunnel fully covers the page, its
   sections go one per frame from the bottom up, so their scroll triggers and
   tweens unwind in their own frames instead of inside the route's commit.
   A warp that never changes the route puts them back.
   ───────────────────────────────────────────────────────────────────────── */

/** fired on window once a staged page has every section in the document */
export const SECTIONS_EVENT = "world:sections";

/* A page may stage inside a staged section (a gallery's comps). The warp is
   held while any of them is still mounting, and the page is announced whole
   when the last one lets go. */
let holding = 0;
function hold(on: boolean) {
  holding += on ? 1 : -1;
  document.documentElement.toggleAttribute("data-world-loading", holding > 0);
  if (!on && holding === 0) window.dispatchEvent(new Event(SECTIONS_EVENT));
}

export default function Staged({ children }: { children: ReactNode }) {
  const kids = Children.toArray(children);
  // under a warp the screen is covered; on a direct load the server HTML already has everything
  const [staged] = useState(
    () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-warping"),
  );
  const [shown, setShown] = useState(staged ? 0 : kids.length);
  const [leaving, setLeaving] = useState(false);
  const done = shown >= kids.length;

  useEffect(() => {
    if (leaving) {
      if (shown === 0) return;
      const id = window.requestAnimationFrame(() => setShown((n) => Math.max(0, n - 1)));
      return () => window.cancelAnimationFrame(id);
    }
    if (!staged || done) return;
    // the next one in the frame after this one has been laid out and painted
    const id = window.requestAnimationFrame(() => setShown((n) => n + 1));
    return () => window.cancelAnimationFrame(id);
  }, [staged, shown, done, leaving]);

  useEffect(() => {
    const onCovered = () => setLeaving(true);
    const onEnd = () => {
      // still here: the route did not change (or the visitor came back)
      setLeaving(false);
      setShown(kids.length);
    };
    window.addEventListener(WARP_COVERED_EVENT, onCovered);
    window.addEventListener(WARP_END_EVENT, onEnd);
    return () => {
      window.removeEventListener(WARP_COVERED_EVENT, onCovered);
      window.removeEventListener(WARP_END_EVENT, onEnd);
    };
  }, [kids.length]);

  useEffect(() => {
    if (!staged || done || leaving) return;
    hold(true);
    return () => hold(false);
  }, [staged, done, leaving]);

  return <>{kids.slice(0, shown)}</>;
}

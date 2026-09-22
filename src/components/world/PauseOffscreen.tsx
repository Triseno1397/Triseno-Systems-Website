"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────────────
   ANIMATIONS DO NOT RUN IN ROOMS YOU ARE NOT IN.

   A section's own motion — the AI diagrams' loops, a marquee, a pulsing rim —
   is written as an infinite CSS animation, and an infinite animation keeps
   running when its section is nowhere near the viewport. On /ai-infrastructure
   that meant the diagrams' animated SVG nodes were recalculating style on every
   frame of every other section, including the last one, a page and a half away.

   Every rail section is watched, and anything off screen has its animations
   paused (world.css). One attribute per section, toggled a handful of times a
   page — the observer itself costs nothing per frame.

   A section's entrance animation is unaffected in the way that matters: it is
   paused at its first frame until the section comes into view, which is when it
   was meant to play.
   ───────────────────────────────────────────────────────────────────────── */

export default function PauseOffscreen() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.setAttribute("data-pause-offscreen", "");

    let io: IntersectionObserver | null = null;
    const watch = () => {
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            (e.target as HTMLElement).toggleAttribute("data-inview", e.isIntersecting);
          }
        },
        // a little ahead of the edge, so nothing starts mid-move on arrival
        { rootMargin: "25% 0px" },
      );
      document.querySelectorAll("main [data-rail]").forEach((el) => io?.observe(el));
    };

    watch();
    // sections arrive with the page: re-observe once things have settled
    const id = window.setTimeout(watch, 1200);

    return () => {
      window.clearTimeout(id);
      window.clearTimeout(id);
      io?.disconnect();
      root.removeAttribute("data-pause-offscreen");
      document.querySelectorAll("main [data-rail]").forEach((el) => el.removeAttribute("data-inview"));
    };
  }, [pathname]);

  return null;
}

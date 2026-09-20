"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

/* ─────────────────────────────────────────────────────────────────────────
   CONTENT NEVER COLLIDES WITH CHROME — and the world stays full-bleed.

   Every direct child of <main> that is page CONTENT gets a vertical mask
   (world.css `[data-fade]`): transparent through the chrome zone at the top
   and bottom of the viewport, easing to fully opaque inside the lanes. The
   mask is one viewport tall and is re-positioned every frame so it stays
   pinned to the viewport while the content scrolls through it — the content
   dissolves before it can reach the lockup, the menu trigger, the chevron or
   the contact icon.

   World layers are never masked: anything `position: fixed` directly under
   <main> (every page mounts its lit world that way) or marked
   `data-world-layer` is skipped, so the 3D scene / backdrop reaches every
   edge of the frame untouched. Nothing is painted over the scene.

   The update runs on the GSAP ticker, after Lenis has moved the page in the
   same frame, so the fade never lags the scroll by a frame.
   ───────────────────────────────────────────────────────────────────────── */

function isContent(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("data-world-layer") || el.hasAttribute("data-no-fade")) return false;
  const cs = getComputedStyle(el);
  return cs.position !== "fixed" && cs.display !== "none";
}

export default function ContentFade() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-content-fade", "");
    let list: HTMLElement[] = [];
    const last = new WeakMap<HTMLElement, number>();
    let vh = -1;

    const scan = () => {
      list.forEach((el) => el.removeAttribute("data-fade"));
      const main = document.querySelector("main");
      list = main ? Array.from(main.children).filter(isContent) : [];
      list.forEach((el) => el.setAttribute("data-fade", ""));
      tick();
    };

    const tick = () => {
      if (window.innerHeight !== vh) {
        vh = window.innerHeight;
        root.style.setProperty("--fade-vh", `${vh}px`);
      }
      for (const el of list) {
        const y = Math.round(-el.getBoundingClientRect().top);
        if (last.get(el) !== y) {
          last.set(el, y);
          el.style.setProperty("--fade-y", `${y}px`);
        }
      }
    };

    scan();
    // pages mount their sections (and GSAP wraps pinned ones in pin-spacers)
    // after this runs, so re-scan whenever <main>'s children change
    const main = document.querySelector("main");
    const mo = new MutationObserver(scan);
    if (main) mo.observe(main, { childList: true });
    const late = window.setTimeout(scan, 600);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      mo.disconnect();
      window.clearTimeout(late);
      list.forEach((el) => {
        el.removeAttribute("data-fade");
        el.style.removeProperty("--fade-y");
      });
      root.removeAttribute("data-content-fade");
    };
  }, [pathname]);

  return null;
}

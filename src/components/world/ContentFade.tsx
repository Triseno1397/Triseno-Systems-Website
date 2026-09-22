"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { addFrameJob } from "./frameLoop";

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

    let ys: number[] = [];
    const read = () => {
      ys = list.map((el) => Math.round(-el.getBoundingClientRect().top));
    };
    const write = () => {
      if (window.innerHeight !== vh) {
        vh = window.innerHeight;
        root.style.setProperty("--fade-vh", `${vh}px`);
      }
      list.forEach((el, i) => {
        const y = ys[i];
        if (y === undefined || last.get(el) === y) return;
        last.set(el, y);
        el.style.setProperty("--fade-y", `${y}px`);
      });
    };
    const tick = () => {
      read();
      write();
    };

    scan();
    // pages mount their sections (and GSAP wraps pinned ones in pin-spacers)
    // after this runs, so re-scan whenever <main>'s children change
    const main = document.querySelector("main");
    const mo = new MutationObserver(scan);
    if (main) mo.observe(main, { childList: true });
    const late = window.setTimeout(scan, 600);
    // phones & tablets fade into fixed scrims (world.css) — no per-frame mask
    const lite = window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
    // where the browser can drive the mask from scroll itself (world.css), the
    // script only keeps --fade-vh current on resize — no per-frame work
    const native = !lite && typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
    const onResize = () => {
      vh = window.innerHeight;
      root.style.setProperty("--fade-vh", `${vh}px`);
    };
    if (native) {
      onResize();
      window.addEventListener("resize", onResize, { passive: true });
    }
    const stop = lite || native ? () => window.removeEventListener("resize", onResize) : addFrameJob({ read, write });

    return () => {
      stop();
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

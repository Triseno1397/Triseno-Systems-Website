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

    // Every read first, every write after: a scan used to strip and re-set
    // the attribute on every section around its style reads, and each read
    // after a write was a forced style pass over the page. Only what changed
    // is touched, so a scan on a settled page writes nothing.
    const scan = () => {
      const main = document.querySelector("main");
      const next = main ? Array.from(main.children).filter(isContent) : [];
      const keep = new Set(next);
      for (const el of list) {
        if (keep.has(el)) continue;
        el.removeAttribute("data-fade");
        el.style.removeProperty("--fade-y");
      }
      for (const el of next) if (!el.hasAttribute("data-fade")) el.setAttribute("data-fade", "");
      list = next;
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

    // phones & tablets fade into fixed scrims (world.css) — no per-frame mask
    const lite = window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
    // where the browser can drive the mask from scroll itself (world.css), the
    // script only keeps --fade-vh current on resize — no per-frame work
    const native = !lite && typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
    scan();
    // the one script-driven path positions the masks now; a later section
    // gets its first position from the frame job, in the frame it arrives
    if (!lite && !native) tick();
    // pages mount their sections (and GSAP wraps pinned ones in pin-spacers)
    // after this runs, and arriving by warp they land one per frame
    // (world/Staged), so re-scan whenever <main>'s children change: once per
    // frame, however many changed
    let pending = 0;
    const rescan = () => {
      if (!pending) {
        pending = window.requestAnimationFrame(() => {
          pending = 0;
          scan();
        });
      }
    };
    const main = document.querySelector("main");
    const mo = new MutationObserver(rescan);
    if (main) mo.observe(main, { childList: true });
    const late = window.setTimeout(rescan, 600);
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
      window.cancelAnimationFrame(pending);
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

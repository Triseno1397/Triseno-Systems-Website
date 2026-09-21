"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import manifest from "../../../public/art-manifest.json";

gsap.registerPlugin(ScrollTrigger);

/**
 * The world the Web Design Division lives in (design-loop/world-plates.md).
 *
 * BASE: the generated plate — a violet concrete atrium of receding square
 * portals (the division's own glyph, at the scale of architecture) with a
 * polished floor. Full-bleed, fixed, marked `data-world-layer` so the
 * content-only edge fade never touches it.
 *
 * ALIVE, not a still:
 * - scroll dollies the camera deeper through the portals across the whole
 *   page (scale about the vanishing point + a small drift);
 * - the pointer parallaxes the plate a few px and drags a soft violet light
 *   across it (additive);
 * - two haze banks drift, the far portal's light breathes, dust hangs in it;
 * - every section registers a station and the key haze moves to the far side
 *   of the object on stage.
 *
 * The blur placeholder from the art manifest paints instantly; the plate fades
 * in over it. The plate is never the LCP element and never blocks text; a
 * missing file leaves the placeholder, never a broken page.
 * Only transform / opacity / filter animate (M4). Reduced motion: still plate.
 */

type Art = { w: number; h: number; blur: string };
const ART = manifest as Record<string, Art | undefined>;
const PLATE = { desktop: "/worlds/web-desktop.webp", mobile: "/worlds/web-mobile.webp" };

export default function WebWorld() {
  const layerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  /* Fade the plate in once decoded. Written straight to the DOM (no render),
     and checked on mount too: the plate may finish loading before hydration,
     when onLoad has no listener yet. */
  const markLoaded = () => layerRef.current?.setAttribute("data-loaded", "");
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) layerRef.current?.setAttribute("data-loaded", "");
  }, []);

  /* stations */
  useGSAP(
    () => {
      const layer = layerRef.current;
      const main = layer?.parentElement;
      if (!layer || !main) return;
      layer.dataset.at = "hero";
      const stations = gsap.utils.toArray<HTMLElement>("[data-station]", main);
      const triggers = stations.map((section) =>
        ScrollTrigger.create({
          trigger: section,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => {
            if (self.isActive) layer.dataset.at = section.dataset.station ?? "hero";
          },
        }),
      );
      return () => triggers.forEach((t) => t.kill());
    },
    { scope: layerRef },
  );

  /* camera dolly (scroll) + pointer parallax and light, eased on one rAF loop */
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const target = { cam: 0, px: 0, py: 0, lx: window.innerWidth * 0.62, ly: window.innerHeight * 0.4 };
    const cur = { ...target };
    let raf = 0;

    const readScroll = () => {
      const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      target.cam = Math.min(1, Math.max(0, window.scrollY / span));
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      target.px = (e.clientX / window.innerWidth) * 2 - 1;
      target.py = (e.clientY / window.innerHeight) * 2 - 1;
      target.lx = e.clientX;
      target.ly = e.clientY;
      kick();
    };

    const step = () => {
      raf = 0;
      let moving = false;
      (Object.keys(cur) as Array<keyof typeof cur>).forEach((k) => {
        const d = target[k] - cur[k];
        const eps = k === "lx" || k === "ly" ? 0.5 : 0.0005;
        if (Math.abs(d) > eps) {
          cur[k] += d * (k === "cam" ? 0.12 : 0.07);
          moving = true;
        } else cur[k] = target[k];
      });
      layer.style.setProperty("--cam", cur.cam.toFixed(4));
      layer.style.setProperty("--px", cur.px.toFixed(4));
      layer.style.setProperty("--py", cur.py.toFixed(4));
      layer.style.setProperty("--lx", `${cur.lx.toFixed(1)}px`);
      layer.style.setProperty("--ly", `${cur.ly.toFixed(1)}px`);
      if (moving) raf = requestAnimationFrame(step);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const blurD = ART[PLATE.desktop]?.blur;
  const blurM = ART[PLATE.mobile]?.blur;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      data-world-layer=""
      className="web-scene"
      data-at="hero"
    >
      <div className="web-plate">
        <div className="web-plate__cam">
          <div className="web-plate__par">
            {blurD ? <span className="web-plate__blur web-plate__blur--d" style={{ backgroundImage: `url(${blurD})` }} /> : null}
            {blurM ? <span className="web-plate__blur web-plate__blur--m" style={{ backgroundImage: `url(${blurM})` }} /> : null}
            <picture>
              <source media="(min-width: 768px)" srcSet={PLATE.desktop} />
              <img
                ref={imgRef}
                className="web-plate__img"
                src={PLATE.mobile}
                alt=""
                decoding="async"
                fetchPriority="low"
                onLoad={markLoaded}
              />
            </picture>
            {/* the far portal's light, locked to the plate so it dollies with it */}
            <span className="web-plate__shaft" />
          </div>
        </div>
        <span className="web-plate__haze web-plate__haze--a" />
        <span className="web-plate__haze web-plate__haze--b" />
        <span className="web-plate__dust" />
      </div>
      <span className="web-scene__haze" />
      <span className="web-plate__light" />
    </div>
  );
}

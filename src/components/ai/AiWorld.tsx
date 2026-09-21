"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * The world for /ai-infrastructure — the cathedral plate (design-loop/
 * world-plates.md): a nave of dark pillars strung with cyan light filaments,
 * a wet reflective floor, and a calm dark centre. It replaces the old WebGL
 * lattice outright; nothing procedural draws behind the content any more.
 *
 * It is a fixed layer directly under <main> (data-world-layer), so the
 * foundation's content fade never touches it, and it is alive:
 *   - scroll dollies the camera down the nave (scale 1 -> 1.12, slight rise),
 *   - the pointer parallaxes it a few pixels and carries a soft cyan light,
 *   - the filaments on each side breathe out of phase, and the vanishing
 *     point pulses.
 * Only transform / opacity / filter animate.
 *
 * FROST. Every content panel marked `.ai-glass` gets a blurred twin drawn here,
 * inside the world layer, tracked to the panel's box every frame. The content
 * fade masks every section, and a masked element is a backdrop root — so a
 * backdrop-filter inside a section can only ever blur the section itself, never
 * the world (that is why round 3's cards looked like clear film). Drawing the
 * frost in the world layer gives real frosted glass under every panel.
 *
 * Soft neutral scrims at the top and bottom edges keep the chrome legible
 * over bright filaments (design-system §2, chrome scrims).
 */

/* tiny blur placeholders from /art-manifest.json, painted instantly under the plate */
const BLUR_D = "data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAAAQBACdASoYAA4APtFUo0uoJKMhsAgBABoJZgCdMoAC/JvlRZa2o+a0GAD+8OZWf66DAVG0OFtWEwWSGs26PnTeUQhSfo+NKqMXhaMAwKKcKoddf3TaSHj8eL9k/RMW73SNQ1C0YuSDPlf49M+fmYWmGlWXV1m1KGgABGBXcZMqUjC3v6YPRX7gAAA=";
const BLUR_M = "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAADQAwCdASoOABgAPtFUo0uoJKMhsAgBABoJQBOmUABLXq+MoEL+6AAA/vMA6CBGLfvP9S5pPI9bM9rO1syRvuerOOmZW5NcZ590dI9gxq4oPPu2ftOA9Ovh/Qy4UrC37tL//jSQD2ZYwpv9ARMT669ZYi+5J94LYM7GzsnxAdxSDFAA";
const DESKTOP = "/worlds/ai-desktop.webp";
const MOBILE = "/worlds/ai-mobile.webp";

export default function AiWorld() {
  const camRef = useRef<HTMLDivElement>(null);
  const parRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const frostRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  /* fade the plate in over its blur placeholder */
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const done = () => img.setAttribute("data-loaded", "");
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener("load", done, { once: true });
    return () => img.removeEventListener("load", done);
  }, []);

  /* camera: scroll dolly + pointer parallax + pointer light */
  useEffect(() => {
    const cam = camRef.current;
    const par = parRef.current;
    const light = lightRef.current;
    if (!cam || !par || !light) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let lx = window.innerWidth * 0.5;
    let ly = window.innerHeight * 0.58;
    let tlx = lx;
    let tly = ly;
    let moved = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      tlx = e.clientX;
      tly = e.clientY;
      moved = true;
    };

    const tick = () => {
      const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const k = Math.min(1, Math.max(0, window.scrollY / span));
      if (reduced.matches) {
        cam.style.transform = "scale(1.04)";
        return;
      }
      cam.style.transform = `translate3d(0, ${(-2.6 * k).toFixed(3)}%, 0) scale(${(1 + 0.12 * k).toFixed(4)})`;
      if (fine.matches) {
        x += (tx - x) * 0.06;
        y += (ty - y) * 0.06;
        par.style.transform = `translate3d(${(-x * 12).toFixed(2)}px, ${(-y * 8).toFixed(2)}px, 0)`;
        if (!moved) {
          // before the first move the light wanders the nave on its own
          const t = performance.now() / 1000;
          tlx = window.innerWidth * (0.5 + 0.22 * Math.sin(t * 0.21));
          tly = window.innerHeight * (0.56 + 0.12 * Math.sin(t * 0.33 + 1));
        }
        lx += (tlx - lx) * 0.08;
        ly += (tly - ly) * 0.08;
        light.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
      }
    };

    gsap.ticker.add(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  /* frost: a blurred twin of the world under every .ai-glass panel */
  useEffect(() => {
    const layer = frostRef.current;
    if (!layer) return;
    const twins = new Map<HTMLElement, HTMLSpanElement>();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const twin = twins.get(entry.target as HTMLElement);
        if (!twin) continue;
        const box = entry.borderBoxSize?.[0];
        const w = box ? box.inlineSize : (entry.target as HTMLElement).offsetWidth;
        const h = box ? box.blockSize : (entry.target as HTMLElement).offsetHeight;
        twin.style.width = `${w}px`;
        twin.style.height = `${h}px`;
      }
    });

    const sync = () => {
      const now = new Set(document.querySelectorAll<HTMLElement>("main .ai-glass"));
      for (const [el, twin] of twins) {
        if (!now.has(el)) {
          ro.unobserve(el);
          twin.remove();
          twins.delete(el);
        }
      }
      for (const el of now) {
        if (twins.has(el)) continue;
        const twin = document.createElement("span");
        twin.className = "ai-world__frost-pane";
        layer.appendChild(twin);
        twins.set(el, twin);
        ro.observe(el);
      }
    };

    const tick = () => {
      const vh = window.innerHeight;
      for (const [el, twin] of twins) {
        const r = el.getBoundingClientRect();
        const on = r.bottom > -40 && r.top < vh + 40 && r.width > 0;
        twin.style.visibility = on ? "visible" : "hidden";
        if (on) twin.style.transform = `translate3d(${r.left.toFixed(1)}px, ${r.top.toFixed(1)}px, 0)`;
      }
    };

    sync();
    const mo = new MutationObserver(sync);
    const main = document.querySelector("main");
    if (main) mo.observe(main, { childList: true, subtree: true });
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      mo.disconnect();
      ro.disconnect();
      twins.forEach((t) => t.remove());
    };
  }, []);

  const blurVars = {
    ["--plate-blur-d" as string]: `url("${BLUR_D}")`,
    ["--plate-blur-m" as string]: `url("${BLUR_M}")`,
  };

  return (
    <div aria-hidden="true" data-world-layer="" className="ai-world__scene" style={blurVars}>
      <div ref={camRef} className="ai-plate">
        <div ref={parRef} className="ai-plate__par">
          <picture>
            <source media="(max-width: 767px)" srcSet={MOBILE} />
            <img ref={imgRef} className="ai-plate__img" src={DESKTOP} alt="" decoding="async" fetchPriority="low" />
          </picture>
          {/* living atmosphere: each side's filaments breathe out of phase */}
          <span className="ai-plate__glow ai-plate__glow--l" />
          <span className="ai-plate__glow ai-plate__glow--r" />
          <span className="ai-plate__core" />
        </div>
      </div>
      <span ref={lightRef} className="ai-plate__light" />
      <span className="ai-world__scrim ai-world__scrim--top" />
      <span className="ai-world__scrim ai-world__scrim--bottom" />
      <div ref={frostRef} className="ai-world__frost" />
    </div>
  );
}

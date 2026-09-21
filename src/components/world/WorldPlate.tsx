"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addFrameJob } from "./frameLoop";
import { plate as plateFor, stationPlates, type PlateWorld } from "./plates";
import { setStationStarts, stationFrames, type StationStart } from "./stations";
import { platePose, plateTransform, type PlatePose } from "./plateMotion";

/* ─────────────────────────────────────────────────────────────────────────
   A world plate in the DOM — the lit place behind a page on a phone, under
   reduced motion, without WebGL, and wherever a page wants the plate without
   a 3D foreground (see design-loop/world-plates.md).

   Brought to life with transform / opacity only:
   · a slow scroll-driven push-in (scale 1.00 → 1.12 about the vanishing
     point) with a few pixels of vertical drift;
   · a few pixels of pointer parallax and a soft light following the pointer;
   · the light shaft breathing, low haze drifting, dust;
   · a colour grade — `mix-blend-mode: color` keeps the plate's light and
     takes the division hue — plus a hue spill on the floor. White = none: the
     plate stays colourless. Hue swaps dip through no-tint, never blend.
   The blur placeholder paints first; the real plate fades in when decoded.
   ───────────────────────────────────────────────────────────────────────── */

export interface WorldPlateProps {
  world: PlateWorld;
  /** the one hue this surface may carry right now; white (default) = colourless */
  hue?: string;
  /** how strongly the hue grades the plate, 0..1 */
  tint?: number;
  /**
   * Camera stations (stations.ts): where each station of this world begins —
   * a fraction of page scroll, or a CSS selector the station arrives with.
   * Omit for the default (spread down the page, the last on the gate);
   * `false` keeps the base plate only.
   */
  stations?: StationStart[] | false;
  className?: string;
}

const WHITE = "#ffffff";

export default function WorldPlate({
  world,
  hue = WHITE,
  tint = 0.78,
  stations,
  className = "",
}: WorldPlateProps) {
  const p = plateFor(world);
  const all = stationPlates(world);
  const plates = stations === false ? all.slice(0, 1) : all;
  const camRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  // which stations have been asked for their full image (preloaded just ahead of need)
  const [near, setNear] = useState<boolean[]>(() => plates.map((_, i) => i === 0));
  const [loaded, setLoaded] = useState<boolean[]>(() => plates.map(() => false));
  const markLoaded = (i: number) =>
    setLoaded((l) => (l[i] ? l : l.map((v, k) => (k === i ? true : v))));

  // register where the stations begin, for this plate and every GlassPanel
  const startsKey = stations === false ? "off" : JSON.stringify(stations ?? null);
  useEffect(() => {
    const parsed = JSON.parse(startsKey === "off" ? '"off"' : startsKey) as StationStart[] | "off" | null;
    setStationStarts(world, parsed ?? undefined);
    return () => setStationStarts(world, undefined);
  }, [world, startsKey]);

  // hue swaps dip through colourless: the old grade fades out before the new
  // one fades in, so two division hues never mix
  const [shown, setShown] = useState(hue);
  const on = shown === hue && hue.toLowerCase() !== WHITE;
  useEffect(() => {
    if (hue === shown) return;
    const t = window.setTimeout(() => setShown(hue), 260);
    return () => window.clearTimeout(t);
  }, [hue, shown]);

  useEffect(() => {
    const cam = camRef.current;
    const light = lightRef.current;
    if (!cam) return;
    const pose: PlatePose = { tx: 0, ty: 0, s: 1 };
    let last = "";
    const lastLayer: string[] = [];
    const asked = plates.map((_, i) => i === 0);
    // same pose model, same station model and same clock as every GlassPanel's
    // copy of this plate
    let frames: ReturnType<typeof stationFrames> = [];
    const read = () => {
      platePose(pose);
      frames = stationFrames(world);
    };
    const write = () => {
      const t = plateTransform(pose);
      if (t !== last) {
        last = t;
        cam.style.transform = t;
      }
      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const f = frames[i] ?? { alpha: 0, scale: 1, near: false };
        const key = f.alpha <= 0.001 ? "hidden" : `${f.alpha.toFixed(3)}|${f.scale.toFixed(4)}`;
        if (key !== lastLayer[i]) {
          lastLayer[i] = key;
          el.style.opacity = f.alpha.toFixed(3);
          el.style.visibility = f.alpha <= 0.001 ? "hidden" : "visible";
          el.style.transform = `scale(${f.scale.toFixed(4)})`;
        }
        if (f.near && !asked[i]) {
          asked[i] = true;
          setNear((n) => n.map((v, k) => (k === i ? true : v)));
        }
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !light) return;
      light.style.opacity = "1";
      light.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
    read();
    write();
    const stop = addFrameJob({ read, write });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, plates.length]);

  const style = {
    ["--plate-hue" as string]: shown,
    ["--plate-tint" as string]: String(tint),
    ["--plate-h-d" as string]: `${p.horizon.desktop * 100}%`,
    ["--plate-h-m" as string]: `${p.horizon.mobile * 100}%`,
    // placeholder: the plate's own pre-blurred glass copy (true colour; the
    // manifest's 24px blurs carry chroma noise — a teal cast on amber)
    ["--plate-blur-d" as string]: `url("${p.desktopGlass}")`,
    ["--plate-blur-m" as string]: `url("${p.mobileGlass}")`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      data-world-layer=""
      data-tinted={on ? "" : undefined}
      className={`world-plate ${className}`}
      style={style}
    >
      <div ref={camRef} className="world-plate__cam">
        {plates.map((st, i) => (
          <div
            key={st.desktop}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            className="world-plate__station"
            style={
              {
                ["--st-ph-d" as string]: `url("${st.desktopGlass}")`,
                ["--st-ph-m" as string]: `url("${st.mobileGlass}")`,
                opacity: i === 0 ? 1 : 0,
                visibility: i === 0 ? "visible" : "hidden",
              } as CSSProperties
            }
          >
            {near[i] ? (
              <picture>
                <source media="(max-width: 767px)" srcSet={st.mobile} />
                <img
                  src={st.desktop}
                  alt=""
                  decoding="async"
                  fetchPriority="low"
                  className="world-plate__img"
                  data-loaded={loaded[i] ? "" : undefined}
                  ref={(img) => {
                    // an image decoded before hydration never fires onLoad; catch it
                    if (img?.complete && img.naturalWidth > 0) window.requestAnimationFrame(() => markLoaded(i));
                  }}
                  onLoad={() => markLoaded(i)}
                />
              </picture>
            ) : null}
          </div>
        ))}
        <span className="world-plate__shaft" />
        <span className="world-plate__haze" />
      </div>
      <span className="world-plate__tint" />
      <span className="world-plate__spill" />
      <span ref={lightRef} className="world-plate__light" />
      <span className="world-plate__dust" />
      <span className="world-plate__vignette" />
    </div>
  );
}

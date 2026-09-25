"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { divisionForHref, type Division } from "@/lib/divisions";
import { glyphPoints } from "@/lib/glyph-path";
import Glyph from "./Glyph";
import { deviceClass } from "@/lib/device";

/* ─────────────────────────────────────────────────────────────────────────
   M2 — travel between worlds, as one arc of ~2.5s:
     0.0s  the page lets go: the portal centres its object and fades its menu
           (it listens for the `world:warp` event), chrome fades out;
     0.1s  a full-bleed streak tunnel, purely in the DESTINATION hue, closes in;
     0.9s  the route changes underneath the tunnel;
     1.0s  the title card — destination glyph + name — resolves letter by letter
           while the tunnel is still pushing;
     1.7s+ the tunnel decelerates and dissolves over the incoming page;
     2.5s  chrome arrives.
   The cover is drawn with alpha over the live page, so there is never a blank
   frame.
   ───────────────────────────────────────────────────────────────────────── */

/** Fired on window when a warp starts. detail: { href, key } */
export const WARP_EVENT = "world:warp";

interface WarpApi {
  travel: (href: string) => void;
  busy: boolean;
}

const WarpContext = createContext<WarpApi>({ travel: () => {}, busy: false });

export function useWarp(): WarpApi {
  return useContext(WarpContext);
}

const T_IN = 520; // cover ramps up (ease-out: ~97% by 360ms)
const T_NAV = 900; // router.push fires here (page fully covered)
const T_TITLE = 980; // title card starts resolving
const T_MIN_HOLD = 1720; // earliest the out phase may start
const T_OUT = 800; // cover ramps down
const T_GIVE_UP = 5000; // never trap the visitor behind the tunnel

const STAR_COUNT = 720;

interface Star {
  x: number;
  y: number;
  z: number;
  /** 0.35..1 — brightness within the one hue; there are no white streaks */
  lum: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function WarpProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [busy, setBusy] = useState(false);
  const [dest, setDest] = useState<Division | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const fromPathRef = useRef(pathname);
  const arrivedRef = useRef(false);
  const rafRef = useRef(0);

  // The route underneath has changed -> the out phase may begin.
  useEffect(() => {
    if (busyRef.current && pathname !== fromPathRef.current) arrivedRef.current = true;
  }, [pathname]);

  // Coming back through the bfcache after a document navigation: clear the tunnel.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      cancelAnimationFrame(rafRef.current);
      busyRef.current = false;
      setBusy(false);
      if (overlayRef.current) overlayRef.current.style.display = "none";
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const travel = useCallback(
    (href: string) => {
      if (busyRef.current) return;
      const target = divisionForHref(href);
      const targetPath = href.split(/[?#]/)[0] || "/";
      if (targetPath === window.location.pathname) return;

      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!overlay || !canvas) {
        window.location.assign(href);
        return;
      }

      busyRef.current = true;
      arrivedRef.current = false;
      fromPathRef.current = window.location.pathname;
      setBusy(true);
      setDest(target);
      if (!target.external) router.prefetch(href);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [hr, hg, hb] = hexToRgb(target.hue);
      const ctx = canvas.getContext("2d");
      // the tunnel is streaks of light: at a pixel ratio of 1 and half the
      // streaks it is the same picture on a machine that could not draw more
      const weak = deviceClass() !== "high";
      const dpr = Math.min(window.devicePixelRatio || 1, weak ? 1 : 1.5);
      let w = 0;
      let h = 0;
      const resize = () => {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      };
      resize();
      window.addEventListener("resize", resize);

      const stars: Star[] = Array.from({ length: weak ? STAR_COUNT / 2 : STAR_COUNT }, () => ({
        x: (Math.random() * 2 - 1) * 1.6,
        y: (Math.random() * 2 - 1) * 1.6,
        z: Math.random() * 0.95 + 0.05,
        lum: 0.35 + Math.random() * 0.65,
      }));
      const ring = glyphPoints(target.glyph, 96);

      overlay.style.display = "block";
      overlay.style.opacity = "1";
      document.documentElement.setAttribute("data-warping", "");
      titleRef.current?.removeAttribute("data-show");
      window.dispatchEvent(new CustomEvent(WARP_EVENT, { detail: { href, key: target.key } }));

      // Warp time advances by at most one 1/20s step per DRAWN frame. On a
      // real device (60fps) that is plain wall-clock time; on a machine that
      // can only draw a few frames a second while the destination world boots,
      // the arc still plays every beat — tunnel, title card, dissolve —
      // instead of jumping straight to the landed page.
      const start = performance.now();
      let navigated = false;
      let titled = false;
      let outStart = 0;
      let last = start;
      let t = 0;

      const finish = () => {
        window.removeEventListener("resize", resize);
        overlay.style.display = "none";
        document.documentElement.removeAttribute("data-warping");
        busyRef.current = false;
        setBusy(false);
      };

      const frame = (now: number) => {
        const step = Math.min(50, Math.max(0, now - last));
        t += step;
        const dt = Math.min(48, step) / 16.67;
        last = now;
        const wall = now - start;

        if (!navigated && t >= (reduced ? 420 : T_NAV)) {
          navigated = true;
          if (target.external) {
            // Static page served from /public — finish with a document navigation.
            // The tunnel keeps drawing until the new document paints.
            window.setTimeout(() => window.location.assign(href), reduced ? 0 : 1000);
          } else {
            router.push(href);
          }
        }
        if (!titled && t >= (reduced ? 200 : T_TITLE)) {
          titled = true;
          titleRef.current?.setAttribute("data-show", "");
        }
        if (!outStart && !target.external) {
          // A destination that boots a 3D world holds the tunnel (instead of showing its
          // own loader) by setting data-world-loading until its first frames are drawn.
          const worldLoading = document.documentElement.hasAttribute("data-world-loading");
          const ready = arrivedRef.current && !worldLoading && t >= (reduced ? 600 : T_MIN_HOLD);
          if (ready || wall >= T_GIVE_UP) outStart = t;
        }

        const inK = clamp01(t / (reduced ? 400 : T_IN));
        const outK = outStart ? clamp01((t - outStart) / (reduced ? 450 : T_OUT)) : 0;
        // the cover closes fast and fully: the old page is gone, not ghosted,
        // by the time the tunnel is up to speed
        const cover = (1 - Math.pow(1 - inK, 3)) * (1 - easeInOutCubic(outK));
        const speed = reduced ? 0 : 0.0025 + 0.05 * easeInOutCubic(inK) * (1 - easeOutExpo(outK) * 0.94);

        if (titleRef.current) {
          // the card keeps drifting toward the viewer for as long as the tunnel pushes
          const push = 0.94 + Math.min(1, t / 2600) * 0.1;
          titleRef.current.style.opacity = String(outStart ? 1 - easeInOutCubic(clamp01(outK * 1.35)) : 1);
          titleRef.current.style.transform = `scale(${push.toFixed(4)})`;
        }

        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.globalCompositeOperation = "source-over";
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = `rgba(0,0,0,${cover})`;
          ctx.fillRect(0, 0, w, h);

          const cx = w / 2;
          const cy = h / 2;
          const scale = Math.max(w, h) * 0.55;

          // Hue bloom at the vanishing point.
          const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.9);
          bloom.addColorStop(0, `rgba(${hr},${hg},${hb},${0.42 * cover})`);
          bloom.addColorStop(0.35, `rgba(${hr},${hg},${hb},${0.12 * cover})`);
          bloom.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
          ctx.fillStyle = bloom;
          ctx.fillRect(0, 0, w, h);

          if (!reduced) {
            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "butt";
            for (const s of stars) {
              const pz = s.z;
              s.z -= speed * dt;
              if (s.z <= 0.012) {
                s.x = (Math.random() * 2 - 1) * 1.6;
                s.y = (Math.random() * 2 - 1) * 1.6;
                s.z = 1;
                continue;
              }
              const x0 = cx + (s.x / pz) * scale * 0.5;
              const y0 = cy + (s.y / pz) * scale * 0.5;
              const x1 = cx + (s.x / s.z) * scale * 0.5;
              const y1 = cy + (s.y / s.z) * scale * 0.5;
              if ((x1 < -50 || x1 > w + 50 || y1 < -50 || y1 > h + 50) && (x0 < 0 || x0 > w || y0 < 0 || y0 > h)) continue;
              const a = clamp01(1.25 - s.z) * cover;
              ctx.strokeStyle = `rgba(${hr},${hg},${hb},${a * s.lum})`;
              ctx.lineWidth = Math.min(3.2, 0.6 + (1 - s.z) * 2.8);
              ctx.beginPath();
              ctx.moveTo(x0, y0);
              ctx.lineTo(x1, y1);
              ctx.stroke();
            }

            // A procession of destination-glyph gates flying past the camera.
            const gates = 5;
            for (let g = 0; g < gates; g++) {
              const phase = ((t / 1100) * (0.6 + speed * 14) + g / gates) % 1;
              const gs = Math.pow(phase, 3.2) * scale * 2.4 + 6;
              const ga = Math.sin(phase * Math.PI) * 0.85 * cover;
              if (ga <= 0.01) continue;
              ctx.strokeStyle = `rgba(${hr},${hg},${hb},${ga})`;
              ctx.lineWidth = 1 + phase * 2;
              ctx.beginPath();
              for (let i = 0; i <= 96; i++) {
                const k = (i % 96) * 2;
                const px = cx + ring[k] * gs;
                const py = cy - ring[k + 1] * gs;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.stroke();
            }
          }
        }

        if (outStart && outK >= 1) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
    },
    [router],
  );

  const api = useMemo(() => ({ travel, busy }), [travel, busy]);

  return (
    <WarpContext.Provider value={api}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{ display: "none" }}
        className="fixed inset-0 z-[1000] cursor-wait"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
        <div ref={titleRef} className="warp-title absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center text-white">
          {dest ? (
            <>
              <span className="warp-title__glyph">
                <Glyph kind={dest.glyph} size={56} color={dest.hue} strokeWidth={1.5} glow />
              </span>
              <span className="warp-title__name font-display font-bold uppercase" aria-hidden="true">
                {Array.from(dest.name.toUpperCase()).map((ch, i) =>
                  ch === " " ? (
                    <span key={i} className="warp-title__space" />
                  ) : (
                    <span key={i} className="warp-title__char" style={{ ["--i" as string]: i }}>
                      {ch}
                    </span>
                  ),
                )}
              </span>
              <span className="warp-title__label font-mono uppercase">Triseno / {dest.name}</span>
            </>
          ) : null}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {busy && dest ? `Travelling to ${dest.name}` : ""}
      </div>
    </WarpContext.Provider>
  );
}

/* A link that travels by warp. Modifier-clicks keep native behaviour. */
interface WarpLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: ReactNode;
}

export function WarpLink({ href, onClick, children, ...rest }: WarpLinkProps) {
  const { travel } = useWarp();
  const external = divisionForHref(href).external;

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    travel(href);
  };

  if (external) {
    return (
      <a href={href} onClick={handle} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={handle} {...rest}>
      {children}
    </Link>
  );
}

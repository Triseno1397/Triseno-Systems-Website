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
import { T_OUT, createTunnel } from "./warpTunnel";

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
   frame. The tunnel draws in a worker (warp.worker.ts, warpTunnel.ts): the
   route change and the destination's first render run on this thread in the
   middle of the arc, and a tunnel drawn here stalled with them. The title
   card moves on the compositor (CSS), for the same reason.
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

const T_NAV = 900; // router.push fires here (page fully covered)
const T_TITLE = 980; // title card starts resolving
const T_MIN_HOLD = 1720; // earliest the out phase may start
const T_GIVE_UP = 5000; // never trap the visitor behind the tunnel

const STAR_COUNT = 720;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* The one tunnel worker, made on the first warp: the overlay's canvas is
   handed to it for good (a canvas can be transferred only once). null where
   the browser cannot draw a canvas off the main thread. */
let tunnelWorker: Worker | null | undefined;
function ensureWorker(canvas: HTMLCanvasElement): Worker | null {
  if (tunnelWorker !== undefined) return tunnelWorker;
  tunnelWorker = null;
  if (new URLSearchParams(window.location.search).has("warpmain")) return null;
  try {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || !("transferControlToOffscreen" in canvas)) return null;
    const w = new Worker(new URL("./warp.worker.ts", import.meta.url), { type: "module" });
    const off = canvas.transferControlToOffscreen();
    w.postMessage({ type: "init", canvas: off }, [off]);
    tunnelWorker = w;
  } catch {
    tunnelWorker = null;
  }
  return tunnelWorker;
}

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
      tunnelWorker?.postMessage({ type: "stop" });
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
      // The web division's concept sites draw in their own faces (root
      // layout: Instrument Serif, Anton). Left to the page, they began to
      // download as it mounted and swapped in mid-tunnel, re-styling the whole
      // new page (~210ms, measured). Asked for now, they are in before it.
      if (target.key === "web") {
        const cs = getComputedStyle(document.documentElement);
        const serif = cs.getPropertyValue("--font-concept-serif").trim();
        const cond = cs.getPropertyValue("--font-concept-cond").trim();
        for (const f of [`400 16px ${serif}`, `italic 400 16px ${serif}`, `400 16px ${cond}`]) if (f.length > 12) document.fonts.load(f).catch(() => {});
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // the tunnel is streaks of light: at a pixel ratio of 1 and half the
      // streaks it is the same picture on a machine that could not draw more
      const weak = deviceClass() !== "high";
      const dpr = Math.min(window.devicePixelRatio || 1, weak ? 1 : 1.5);
      const setup = {
        hue: hexToRgb(target.hue),
        ring: Array.from(glyphPoints(target.glyph, 96)),
        reduced,
        stars: weak ? STAR_COUNT / 2 : STAR_COUNT,
      };

      // The tunnel draws in a worker wherever the canvas can be handed to
      // one, so it keeps its frame rate while this thread builds the next
      // page; otherwise here, from the same code.
      const worker = ensureWorker(canvas);
      const dims = { w: window.innerWidth, h: window.innerHeight, dpr };
      const sizeIt = () => {
        dims.w = window.innerWidth;
        dims.h = window.innerHeight;
        if (worker) worker.postMessage({ type: "size", ...dims });
        else {
          canvas.width = Math.round(dims.w * dpr);
          canvas.height = Math.round(dims.h * dpr);
        }
      };
      sizeIt();
      window.addEventListener("resize", sizeIt);

      overlay.style.display = "block";
      overlay.style.opacity = "1";
      document.documentElement.setAttribute("data-warping", "");
      const title = titleRef.current;
      title?.removeAttribute("data-show");
      title?.removeAttribute("data-out");
      window.dispatchEvent(new CustomEvent(WARP_EVENT, { detail: { href, key: target.key } }));

      const start = performance.now();
      const timers: number[] = [];
      let poll = 0;
      let ended = false;

      const finish = (stats?: { maxGap: number; long: number; frames: number }) => {
        if (ended) return;
        ended = true;
        timers.forEach((id) => window.clearTimeout(id));
        window.clearInterval(poll);
        window.removeEventListener("resize", sizeIt);
        if (worker) worker.onmessage = null;
        overlay.style.display = "none";
        title?.removeAttribute("data-show");
        title?.removeAttribute("data-out");
        document.documentElement.removeAttribute("data-warping");
        busyRef.current = false;
        setBusy(false);
        // for the design-loop tools: how the tunnel's own frames went
        (window as unknown as { __warpStats: unknown }).__warpStats = { ...(stats ?? {}), mode: worker ? "worker" : "main", ms: Math.round(performance.now() - start) };
      };

      // the beats: the route changes under a full cover, then the title card
      timers.push(
        window.setTimeout(
          () => {
            if (target.external) {
              // Static page served from /public — finish with a document
              // navigation. The tunnel keeps drawing until the new document paints.
              window.setTimeout(() => window.location.assign(href), reduced ? 0 : 1000);
            } else router.push(href);
          },
          reduced ? 420 : T_NAV,
        ),
        window.setTimeout(() => title?.setAttribute("data-show", ""), reduced ? 200 : T_TITLE),
      );

      // Out: once the route has changed, the destination's world has drawn
      // its first frames (it holds data-world-loading until then) and the
      // tunnel has run its minimum, it dissolves over the incoming page.
      let outAt = 0; // main-thread fallback only
      const readyToLeave = () => {
        const wall = performance.now() - start;
        if (target.external) return wall >= T_GIVE_UP;
        const worldLoading = document.documentElement.hasAttribute("data-world-loading");
        return (arrivedRef.current && !worldLoading && wall >= (reduced ? 600 : T_MIN_HOLD)) || wall >= T_GIVE_UP;
      };

      if (worker) {
        worker.onmessage = (e: MessageEvent<{ type: string; maxGap: number; long: number; frames: number }>) => {
          if (e.data.type === "done") finish(e.data);
        };
        worker.postMessage({ type: "start", ...setup });
        poll = window.setInterval(() => {
          if (!readyToLeave()) return;
          window.clearInterval(poll);
          title?.setAttribute("data-out", "");
          worker.postMessage({ type: "out" });
        }, 40);
        // never trap the visitor, even if the worker goes quiet
        timers.push(window.setTimeout(() => finish(), T_GIVE_UP + T_OUT + 1500));
      } else {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish();
          window.location.assign(href);
          return;
        }
        const tunnel = createTunnel(ctx, () => dims, setup);
        let last = start;
        let maxGap = 0;
        let long = 0;
        let frames = 0;
        const frame = (now: number) => {
          if (ended) return;
          const raw = now - last;
          last = now;
          if (frames++ > 0) {
            maxGap = Math.max(maxGap, raw);
            if (raw > 25) long++;
          }
          const step = Math.min(50, Math.max(0, raw));
          if (!outAt && readyToLeave()) {
            outAt = tunnel.time() + step;
            title?.setAttribute("data-out", "");
          }
          if (tunnel.frame(step, outAt)) {
            finish({ maxGap: Math.round(maxGap), long, frames });
            return;
          }
          rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
      }
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

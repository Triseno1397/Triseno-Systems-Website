"use client";

import "@/app/discover.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FINDS, OPEN_MAP_EVENT, PAGES, TOTAL, discover, foundCount, isFound, onDiscover, type Find } from "@/lib/discover";
import { WarpLink } from "./WarpProvider";

/**
 * The hunt's counter (lib/discover.ts): a small pill at the foot of every
 * page — "Found 05 / 40" — a toast for each new find, and a map of the whole
 * site behind it, page by page, with the found pieces named and the rest
 * left as hints.
 *
 * It also does the finding for "seen" and "touch" pieces, so no section has
 * to know about the hunt: every [data-rail] section on the page is watched,
 * and one that holds a third of the screen for a moment (seen) or takes a
 * press inside it (touch) is marked.
 *
 * And it says out loud that the site is alive:
 *   - a roll call: arriving on a page, the pill opens for a few seconds to
 *     say how many pieces the page holds and how many you can play with
 *     (once per page per visit);
 *   - cues: each piece you can play with wears a small pulsing chip saying
 *     what to do ("Drag the split", "Press and hold") while it is on screen,
 *     until it has been found; on a desktop the cursor carries the same words
 *     over it (data-try-say, read by OrbCursor).
 */

const SEEN_MS = 1200;
const SEEN_SHARE = 0.35;

const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
const pad = (n: number) => String(n).padStart(2, "0");

export default function Discovery() {
  const pathname = norm(usePathname() ?? "/");
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ key: number; find: Find; n: number } | null>(null);
  const [, bump] = useState(0);
  const [roll, setRoll] = useState<string | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // the count, and a toast for each new find
  useEffect(() => {
    let timer = 0;
    const off = onDiscover((id) => {
      setCount(foundCount());
      bump((v) => v + 1);
      if (!id) return;
      const find = FINDS.find((f) => f.id === id);
      if (!find) return;
      setToast({ key: performance.now(), find, n: foundCount() });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 3200);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  // seen and touch finds on this page
  useEffect(() => {
    const here = FINDS.filter((f) => (f.page === pathname || f.page === "*") && f.rail);
    if (!here.length) return;
    const byRail = new Map(here.map((f) => [f.rail as string, f]));
    const watched = new WeakSet<Element>();
    const timers = new Map<Element, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const find = byRail.get(e.target.getAttribute("data-rail") ?? "");
          if (!find || find.mode !== "seen" || isFound(find.id)) continue;
          const vh = window.innerHeight || 1;
          const share = e.intersectionRect.height / Math.min(vh, e.boundingClientRect.height || vh);
          const covered = e.isIntersecting && (share >= 0.6 || e.intersectionRect.height / vh >= SEEN_SHARE);
          if (covered && !timers.has(e.target)) {
            timers.set(e.target, window.setTimeout(() => discover(find.id), SEEN_MS));
          } else if (!covered && timers.has(e.target)) {
            window.clearTimeout(timers.get(e.target));
            timers.delete(e.target);
          }
        }
      },
      { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.6, 0.75, 0.9, 1] },
    );
    // sections mount late (dynamic chunks, pin spacers): look again a few times
    const scan = () => {
      document.querySelectorAll("main [data-rail]").forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        io.observe(el);
      });
    };
    scan();
    const rescans = [600, 1500, 3500, 7000].map((ms) => window.setTimeout(scan, ms));

    const onPress = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-rail]");
      const find = el ? byRail.get(el.getAttribute("data-rail") ?? "") : undefined;
      if (find && find.mode === "touch") discover(find.id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onPress(e);
    };
    document.addEventListener("pointerdown", onPress, { capture: true, passive: true });
    document.addEventListener("keydown", onKey, { capture: true });

    return () => {
      io.disconnect();
      rescans.forEach((t) => window.clearTimeout(t));
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("pointerdown", onPress, { capture: true });
      document.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [pathname]);

  // the roll call: what this page holds, once per page per visit
  useEffect(() => {
    const here = FINDS.filter((f) => f.page === pathname);
    if (!here.length) return;
    const key = `triseno:roll:${pathname}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: the roll call plays on every arrival instead
    }
    const play = here.filter((f) => f.mode !== "seen").length;
    const t1 = window.setTimeout(() => setRoll(`${here.length} pieces on this page · ${play} to play with`), 1400);
    const t2 = window.setTimeout(() => setRoll(null), 7400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      setRoll(null);
    };
  }, [pathname]);

  // the cues: a chip on each piece you can play with, until it is found
  useEffect(() => {
    const here = FINDS.filter((f) => f.cue && f.page === pathname);
    if (!here.length) return;
    type Pinned = { target: HTMLElement; host: HTMLElement; chip: HTMLElement; io: IntersectionObserver; pos: string };
    const pinned = new Map<string, Pinned>();
    const unpin = (id: string, fade: boolean) => {
      const p = pinned.get(id);
      if (!p) return;
      pinned.delete(id);
      p.io.disconnect();
      p.target.removeAttribute("data-try-say");
      if (!fade) {
        p.chip.remove();
        return;
      }
      p.chip.setAttribute("data-done", "");
      window.setTimeout(() => p.chip.remove(), 600);
    };
    // the chip lives in the target's nearest positioned box (no section's
    // layout is touched), placed over the target's own rectangle
    const place = ({ target, host, chip, pos }: Pinned) => {
      const t = target.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const x = t.left - h.left + host.scrollLeft;
      const y = t.top - h.top + host.scrollTop;
      const at =
        pos === "center"
          ? [x + t.width / 2, y + t.height / 2]
          : pos === "above"
            ? [x + t.width / 2, y - 10]
            : pos === "foot"
              ? [x + t.width / 2, y + t.height * 0.84]
              : [x + t.width - 14, y + 14];
      chip.style.left = `${Math.round(at[0])}px`;
      chip.style.top = `${Math.round(at[1])}px`;
    };
    const pin = () => {
      for (const f of here) {
        const cue = f.cue!;
        const had = pinned.get(f.id);
        if (had && had.chip.isConnected && had.target.isConnected) continue;
        if (had) unpin(f.id, false);
        if (isFound(f.id)) continue;
        const el = document.querySelector(cue.at);
        // an SVG figure carries its chip by the element that holds it
        const target = el instanceof HTMLElement ? el : (el?.parentElement ?? null);
        if (!target) continue;
        const host = getComputedStyle(target).position !== "static" ? target : (target.offsetParent as HTMLElement | null);
        if (!host) continue;
        target.setAttribute("data-try-say", cue.say);
        const chip = document.createElement("span");
        chip.className = "try-cue font-mono";
        chip.dataset.pos = cue.pos ?? "corner";
        chip.setAttribute("aria-hidden", "true");
        const word = document.createElement("b");
        word.textContent = cue.say;
        chip.append(document.createElement("i"), word);
        host.appendChild(chip);
        // placed again each time its piece comes into view (one read, then),
        // never on a timer: a timed read forced a layout in the middle of a scroll
        const p: Pinned = { target, host, chip, io: null as unknown as IntersectionObserver, pos: cue.pos ?? "corner" };
        p.io = new IntersectionObserver(
          ([e]) => {
            const on = e.intersectionRatio >= 0.35;
            if (on && !chip.hasAttribute("data-on")) place(p);
            chip.toggleAttribute("data-on", on);
          },
          { threshold: [0, 0.35, 0.7] },
        );
        p.io.observe(target);
        place(p);
        pinned.set(f.id, p);
      }
    };
    // never before the page has hydrated (a node added to a section React is
    // still hydrating breaks it); then a few more looks, as sections mount
    // late and a re-render can replace a target, and done
    let again = 0;
    let looks = 0;
    const first = window.setTimeout(() => {
      pin();
      again = window.setInterval(() => {
        pin();
        if (++looks >= 6) window.clearInterval(again);
      }, 3000);
    }, 3000);
    const off = onDiscover((id) => {
      if (id) unpin(id, true);
    });
    return () => {
      window.clearTimeout(first);
      window.clearInterval(again);
      off();
      [...pinned.keys()].forEach((id) => unpin(id, false));
    };
  }, [pathname]);

  // the map: opened from the pill or the home hero's line, closed by Esc,
  // a click outside, or travelling
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MAP_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MAP_EVENT, onOpen);
  }, []);
  useEffect(() => close(), [pathname, close]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      pillRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || pillRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  const done = count >= TOTAL;

  return (
    <div className="discover" data-open={open ? "" : undefined}>
      {toast ? (
        <p key={toast.key} className="discover__toast" role="status">
          <span className="discover__toast-n font-mono">
            {pad(toast.n)}/{TOTAL}
          </span>
          <span className="discover__toast-name">
            <span className="font-mono">Found</span> {toast.find.name}
          </span>
        </p>
      ) : null}

      {open ? (
        <div
          ref={panelRef}
          className="discover__panel"
          role="dialog"
          aria-modal="false"
          aria-label="Everything there is to find on this site"
          data-lenis-prevent=""
        >
          <header className="discover__head">
            <p className="discover__kicker font-mono">The whole site is the portfolio</p>
            <h2 className="discover__title font-display">
              {done ? "You found all of it" : `${pad(count)} of ${TOTAL} found`}
            </h2>
            <p className="discover__lede">
              Every section runs its own build. Click, drag, hold and scroll everything: the rest are still out
              there.
            </p>
            <span className="discover__bar" aria-hidden="true">
              <i style={{ transform: `scaleX(${count / TOTAL})` }} />
            </span>
          </header>
          <ol className="discover__pages">
            {PAGES.map((page) => {
              const finds = FINDS.filter((f) => f.page === page.path || (f.page === "*" && page.path === "/"));
              const got = finds.filter((f) => isFound(f.id)).length;
              const here = page.path === pathname;
              return (
                <li key={page.path} className="discover__page" data-here={here ? "" : undefined}>
                  <p className="discover__pagehead">
                    {here ? (
                      <span className="discover__pagename font-display">{page.name}</span>
                    ) : (
                      <WarpLink href={page.path} className="discover__pagename font-display">
                        {page.name}
                      </WarpLink>
                    )}
                    <span className="discover__pagecount font-mono">
                      {got}/{finds.length}
                      {here ? " · you are here" : ""}
                    </span>
                  </p>
                  <ul className="discover__finds">
                    {finds.map((f) => {
                      const on = isFound(f.id);
                      return (
                        <li key={f.id} className="discover__find" data-found={on ? "" : undefined}>
                          <i aria-hidden="true" />
                          <span>{on ? f.name : f.hint}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <button
        ref={pillRef}
        type="button"
        className="discover__pill"
        aria-expanded={open}
        aria-label={`${count} of ${TOTAL} pieces found. Open the map of everything to find`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="discover__ring" aria-hidden="true" style={{ ["--p" as string]: count / TOTAL }} />
        <span className="font-mono">
          <b>{pad(count)}</b>/{TOTAL}
        </span>
        <span className="discover__pilllabel font-mono">found</span>
        <span className="discover__roll font-mono" data-on={roll ? "" : undefined} aria-live="polite">
          {roll ? <span>{roll}</span> : null}
        </span>
      </button>
    </div>
  );
}

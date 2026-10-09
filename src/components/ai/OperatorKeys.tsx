"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import "@/app/ai-projection.css";
import { getLenis, lockScroll } from "@/components/world/SmoothScroll";
import { KEYS } from "./projection.content";

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR KEYS — the chords that drive the page, and the sheet that lists
   them. Mounted once in AiPage.

   One window keydown listener. It ignores anything typed into a field, any
   key with a modifier held, and everything while the site menu is open.
     g, then s / c / n / i / p / w   scrolls to Stack / Compression / Night /
                                     Industries / Process / Why (900 ms window)
     .                               window "ai:send"       (the stack sends)
     /                               window "ai:focus-logs" (the inspector's filter)
     x                               SPEC notes on / off    (html[data-spec])
     ?                               this sheet
     esc                             window "ai:escape"     (every drawer listens)
   Space on the core is the core's own key; it is only listed here.

   Two tiny stores live here so the Slate's buttons, the SpecNotes and the
   sheet all read one truth without a context: SPEC on/off (persisted in
   localStorage "ai:spec") and the sheet open/closed. Both are SSR-safe.

   The sheet is a paper dialog, portaled to <body> so it sits above the
   chrome; focus is trapped inside it and returned on close; it is inert
   while closed. Touch devices get the gestures instead of the chords, plus
   a SPEC switch, since the phone slate carries no SPEC button.
   ───────────────────────────────────────────────────────────────────────── */

type Listener = () => void;
const emit = (ls: Set<Listener>) => ls.forEach((l) => l());
const serverFalse = () => false;

/* ── SPEC ── */

const SPEC_STORAGE = "ai:spec";
let specOn = false;
const specLs = new Set<Listener>();

function applySpec(on: boolean, persist: boolean): void {
  if (on !== specOn) {
    specOn = on;
    emit(specLs);
  }
  if (typeof document !== "undefined") document.documentElement.toggleAttribute("data-spec", on);
  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SPEC_STORAGE, on ? "1" : "0");
    } catch {
      // blocked storage: the toggle still works for this page
    }
  }
}

export function getSpec(): boolean {
  return specOn;
}
export function setSpec(on: boolean): void {
  applySpec(on, true);
}
export function toggleSpec(): void {
  applySpec(!specOn, true);
}
export function subscribeSpec(cb: Listener): () => void {
  specLs.add(cb);
  return () => {
    specLs.delete(cb);
  };
}
/** True while SPEC notes are shown. Re-renders only on the toggle. */
export function useSpec(): boolean {
  return useSyncExternalStore(subscribeSpec, getSpec, serverFalse);
}

/* ── the sheet ── */

let sheetOpen = false;
const sheetLs = new Set<Listener>();

export function isKeysOpen(): boolean {
  return sheetOpen;
}
export function openKeys(): void {
  if (sheetOpen) return;
  sheetOpen = true;
  emit(sheetLs);
}
export function closeKeys(): void {
  if (!sheetOpen) return;
  sheetOpen = false;
  emit(sheetLs);
}
export function toggleKeys(): void {
  if (sheetOpen) closeKeys();
  else openKeys();
}
export function subscribeKeys(cb: Listener): () => void {
  sheetLs.add(cb);
  return () => {
    sheetLs.delete(cb);
  };
}
export function useKeysOpen(): boolean {
  return useSyncExternalStore(subscribeKeys, isKeysOpen, serverFalse);
}

/* ── helpers ── */

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, serverFalse);

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    serverFalse,
  );
}

const CHORDS: Record<string, string> = {
  s: "Stack",
  c: "Compression",
  n: "Night",
  i: "Industries",
  p: "Process",
  w: "Why",
};
const CHORD_WINDOW_MS = 900;
const FIELD = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

export default function OperatorKeys() {
  const mounted = useMounted();
  const open = useKeysOpen();
  const spec = useSpec();
  const touch = useMedia("(hover: none)");
  const narrow = useMedia("(max-width: 767px)");
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);

  // SPEC restored from the last visit; the attribute is dropped with the page
  useEffect(() => {
    let stored = false;
    try {
      stored = window.localStorage.getItem(SPEC_STORAGE) === "1";
    } catch {
      // private mode: start off
    }
    applySpec(specOn || stored, false);
    return () => {
      document.documentElement.removeAttribute("data-spec");
      closeKeys();
    };
  }, []);

  // the chords
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let armed = 0;
    const chord = (on: boolean) => window.dispatchEvent(new CustomEvent("ai:chord", { detail: { armed: on } }));
    const disarm = () => {
      if (!armed) return;
      window.clearTimeout(armed);
      armed = 0;
      chord(false);
    };
    const jump = (rail: string) => {
      const el = document.querySelector<HTMLElement>(`main [data-rail="${rail}"]`);
      if (!el) return;
      if (isKeysOpen()) {
        // release the page now, not after React's commit, or Lenis (stopped
        // under the sheet) would drop the scrollTo below
        closeKeys();
        lockScroll(false);
      }
      // a paper sheet opens on its hairline under the chrome lane; a dark band
      // takes the top of the frame
      const lane = el.classList.contains("ai-section") ? (probeRef.current?.offsetHeight ?? 0) : 0;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(el, { offset: -lane, duration: 1.4 });
      else {
        const top = el.getBoundingClientRect().top + window.scrollY - lane;
        window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && target.closest(FIELD)) return;
      if (document.getElementById("world-menu")?.hasAttribute("data-open")) return;
      const k = e.key;
      if (k === "Escape") {
        disarm();
        // the sheet is the top layer: Esc closes it and stops there, so it
        // never also resolves a slip or closes a drawer underneath
        if (isKeysOpen()) {
          e.preventDefault();
          closeKeys();
          return;
        }
        window.dispatchEvent(new CustomEvent("ai:escape"));
        return;
      }
      if (e.repeat) return;
      if (armed) {
        const rail = CHORDS[k.toLowerCase()];
        disarm();
        if (rail) {
          e.preventDefault();
          jump(rail);
          return;
        }
      }
      switch (k) {
        case "g":
        case "G":
          armed = window.setTimeout(disarm, CHORD_WINDOW_MS);
          chord(true);
          return;
        case ".":
          window.dispatchEvent(new CustomEvent("ai:send"));
          return;
        case "/":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("ai:focus-logs"));
          return;
        case "x":
        case "X":
          toggleSpec();
          return;
        case "?":
          e.preventDefault();
          toggleKeys();
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      disarm();
    };
  }, []);

  // the sheet: focus moves in, cycles inside, and returns on close
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(sheet.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])")).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    // the page holds still under a modal sheet (Lenis stopped, overflow hidden)
    lockScroll(true);
    const raf = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    sheet.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      sheet.removeEventListener("keydown", onKey);
      lockScroll(false);
      if (prev && typeof prev.focus === "function" && document.contains(prev)) prev.focus();
    };
  }, [open]);

  if (!mounted) return null;

  const rows = touch ? KEYS.gestures : KEYS.rows;
  const withSwitch = touch || narrow;

  return createPortal(
    <>
      {/* a 0-wide probe: the chrome's top lane, resolved by the browser */}
      <span ref={probeRef} aria-hidden="true" className="ai-keys__probe" />
      <div
        id="ai-keys"
        ref={sheetRef}
        className="ai-keys"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-keys-title"
        data-open={open ? "" : undefined}
        data-lenis-prevent=""
        inert={!open}
      >
        <div className="ai-keys__scrim" aria-hidden="true" onClick={() => closeKeys()} />
        <div className="ai-keys__sheet">
          <div className="ai-keys__head">
            <p id="ai-keys-title" className="ai-keys__title">
              <i aria-hidden="true" className="ai-keys__mark" />
              {touch ? KEYS.touchTitle : KEYS.title}
            </p>
            <button ref={closeRef} type="button" className="ai-keys__close" onClick={() => closeKeys()} aria-label="Close">
              {touch ? KEYS.touchClose : KEYS.close}
            </button>
          </div>
          <ul className="ai-keys__rows">
            {rows.map((row) => (
              <li key={row.keys.join("+") + row.action}>
                <span className="ai-keys__k">
                  {row.keys.map((k, i) => (
                    <kbd key={i}>{k}</kbd>
                  ))}
                </span>
                <span className="ai-keys__a">{row.action}</span>
              </li>
            ))}
          </ul>
          {withSwitch ? (
            <button type="button" role="switch" aria-checked={spec} className="ai-keys__switch" onClick={() => toggleSpec()}>
              <span className="ai-keys__switch-l">
                {KEYS.specRow}
                <small>{KEYS.specHint}</small>
              </span>
              <span aria-hidden="true" className="ai-keys__switch-box" />
            </button>
          ) : null}
          <p className="ai-keys__foot">{touch ? KEYS.touchFoot : KEYS.foot}</p>
        </div>
      </div>
    </>,
    document.body,
  );
}

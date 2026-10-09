import { useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   CLEAN-DARK — who owns the dark right now.

   /ai-infrastructure is the lit room, so while it is mounted the shared
   chrome (nav, rail, corner buttons, cursor) is inverted to ink and the
   phone's content-fade scrims are paper (ai.css, html[data-clean]). Four
   moments cut to the dark: the hero's dive into the core, the stack film,
   night falling on the sheet, and the iris at the end. Each of them needs the
   chrome back to white line-work and the ambience glow and grain out of the
   way — html[data-clean-dark].

   One attribute, several owners. Each dark moment enters under its own key
   and leaves under it; the attribute is on while any owner holds it, so the
   descent arriving while the stack still owns the viewport can never flip
   the chrome off by mistake. The DOM is written only on a 0 <-> 1 transition,
   so the hero may call cleanDark("dive", v > 0.66) every frame for free.

   SSR-safe: no document at import; apply() is a no-op without one.
   ───────────────────────────────────────────────────────────────────────── */

export const CLEAN_DARK_ATTR = "data-clean-dark";

const owners = new Set<string>();
const listeners = new Set<() => void>();
let active = false;

function apply(): void {
  const next = owners.size > 0;
  if (next === active) return;
  active = next;
  if (typeof document !== "undefined") document.documentElement.toggleAttribute(CLEAN_DARK_ATTR, next);
  listeners.forEach((l) => l());
}

/**
 * `cleanDark("stack", true)` enters, `cleanDark("stack", false)` leaves.
 * Idempotent per owner: entering twice is one hold, leaving an owner that
 * never entered is nothing.
 */
export function cleanDark(owner: string, on: boolean): void {
  if (on) owners.add(owner);
  else owners.delete(owner);
  apply();
}

/** Take the dark under this key. */
cleanDark.enter = (owner: string): void => {
  owners.add(owner);
  apply();
};

/** Release this key. Always call it in the owner's unmount cleanup. */
cleanDark.leave = (owner: string): void => {
  if (owners.delete(owner)) apply();
};

/** Is this owner currently holding the dark? */
cleanDark.has = (owner: string): boolean => owners.has(owner);

/** Is the attribute on (does anyone hold the dark)? */
cleanDark.isActive = (): boolean => active;

/** The current owners, for debugging. */
cleanDark.owners = (): string[] => Array.from(owners);

/** Drop every owner (the page's own unmount; never from inside a section). */
cleanDark.clear = (): void => {
  owners.clear();
  apply();
};

/** Called on every 0 <-> 1 transition. Returns the unsubscribe. */
cleanDark.subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** True while any owner holds the dark. Re-renders only on the transition. */
export function useCleanDark(): boolean {
  return useSyncExternalStore(cleanDark.subscribe, cleanDark.isActive, serverFalse);
}

const serverFalse = (): boolean => false;

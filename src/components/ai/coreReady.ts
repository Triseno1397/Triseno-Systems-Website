/* ─────────────────────────────────────────────────────────────────────────
   CORE READY — the hero's one heavy moment, kept off the landing's splash.

   Building the chrome core (its environment map's programs compile on the
   main thread; most of a second on a laptop) cannot be split or moved off
   the thread. So it runs while the landing still holds its first, still
   frame and its film is downloading, and the splash waits for it: the
   landing calls coreReady.then(go) and the core calls coreReady.done() once
   its build is through. A core that never builds (no WebGL, unmounted) never
   holds the splash for long: the landing has its own ceiling on the wait.
   ───────────────────────────────────────────────────────────────────────── */

let built = false;
const waiting = new Set<() => void>();

export const coreReady = {
  done(): void {
    if (built) return;
    built = true;
    waiting.forEach((cb) => cb());
    waiting.clear();
  },
  /** run cb once the core is built (now, if it already is); returns a cancel */
  then(cb: () => void): () => void {
    if (built) {
      cb();
      return () => {};
    }
    waiting.add(cb);
    return () => waiting.delete(cb);
  },
  /** the core unmounted: the next visit builds (and waits) again */
  reset(): void {
    built = false;
  },
};

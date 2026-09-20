/* ─────────────────────────────────────────────────────────────────────────
   The bridge between a division page's scroll and the world rendered behind
   it. Written from a scroll listener, read inside useFrame — no React render
   ever sits between a scroll tick and the camera. DOM consumers that do want
   to react (a section that lights up when the camera reaches it) subscribe.
   ───────────────────────────────────────────────────────────────────────── */

export const worldState = {
  /** 0..1 — how far down the page the camera has travelled */
  progress: 0,
  /** normalised pointer, -1..1, for a slight parallax on the camera */
  px: 0,
  py: 0,
  /** true while the page is being captured as a poster (no idle motion) */
  still: false,
};

type Listener = (progress: number) => void;
const listeners = new Set<Listener>();

/** Subscribe to scroll progress. Returns an unsubscribe function. */
export function onWorldProgress(fn: Listener): () => void {
  listeners.add(fn);
  fn(worldState.progress);
  return () => {
    listeners.delete(fn);
  };
}

export function setWorldProgress(p: number) {
  const v = Math.min(1, Math.max(0, p));
  if (v === worldState.progress) return;
  worldState.progress = v;
  listeners.forEach((fn) => fn(v));
}

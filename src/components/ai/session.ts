import { useRef, useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   THE SESSION — what this visitor did on /ai-infrastructure.

   One request is filmed across the page: the hero mints it with the
   visitor's own clock, Compression presses its steps into agents, the stack
   sends it and times the trace, the console halts and prints a routing slip,
   the night counts what ran unattended, and the diagnostic ticket at the gate
   prints all of it back. This module is the only memory those figures share.

   Two channels, one file:
   · the SESSION channel — durable facts, written a dozen times per visit,
     persisted to sessionStorage ("ai:session") and read by React through
     useSession(selector). A write notifies only when a field actually changed.
   · the REEL channel — the slate's scroll-derived timecode, the current
     chapter and the measured frame rate. Written from a frame job (up to 24
     times a second while scrolling), so it is a separate store: a reel write
     never wakes a React reader of the session, and vice versa.

   SSR-safe: nothing touches window or storage at import. The first client
   call to any session accessor rehydrates from storage; the server always
   sees the defaults, and useSession hands React the same defaults for the
   hydration pass so the markup never mismatches.
   ───────────────────────────────────────────────────────────────────────── */

/* ── types ── */

/** The request the hero mints on the first crossing into the core. */
export type SessionRequest = {
  /** "intake-" + minutes since local midnight, zero-padded to 4: "intake-0842" */
  id: string;
  /** the visitor's wall clock at minting, 24 h: "14:02:11" */
  local: string;
  /** the zone's short name when one exists ("PDT", "GMT+2"), else the city ("Berlin") */
  tz: string;
  /** Date.now() at minting */
  mintedAt: number;
};

export type CounterKey = "dives" | "requests" | "approvals" | "corrections";

export type TraceState = "done" | "blocked" | "breached";

/** One span of a stack trace. Richer span shapes are assignable as long as these fields exist. */
export type TraceSpan = {
  id: string;
  name: string;
  /** 0 Data · 1 Models · 2 Agents · 3 Interface */
  layer: number;
  /** ms from the request leaving the frame */
  start: number;
  /** ms */
  dur: number;
  parent?: string;
  async?: boolean;
  failed?: boolean;
};

export type SessionTrace = {
  /** "intake" | "catalog query" | "lead qualification" */
  preset: string;
  totalMs: number;
  spans: readonly TraceSpan[];
  state: TraceState;
};

/** How the console's routing slip was resolved. */
export type SessionSlip = {
  outcome: "approved" | "corrected";
  /** the named person on the slip, e.g. "J. Okafor" */
  to?: string;
  /** the corrected field's value (outcome "corrected") */
  value?: string;
  /** the console's cycle clock at resolution, e.g. "00:00:41" */
  at?: string;
};

export type SessionNight = { tasks: number; escalations: number };

export type SessionEvent = {
  /** Date.now() */
  t: number;
  /** who wrote it: "compression" | "stack" | "night" | "gate" | … */
  src: string;
  line: string;
};

export type SessionState = {
  req: SessionRequest | null;
  dives: number;
  requests: number;
  approvals: number;
  corrections: number;
  /** figure ids that have rendered at least once, in first-seen order, deduped */
  figures: readonly string[];
  lastTrace: SessionTrace | null;
  slip: SessionSlip | null;
  night: SessionNight | null;
  /** the last EVENT_CAP lines, oldest first */
  events: readonly SessionEvent[];
};

export type SessionPatch = Partial<SessionState> | ((s: SessionState) => Partial<SessionState>);

export const EVENT_CAP = 24;

export const DEFAULT_SESSION: SessionState = Object.freeze({
  req: null,
  dives: 0,
  requests: 0,
  approvals: 0,
  corrections: 0,
  figures: Object.freeze([]) as readonly string[],
  lastTrace: null,
  slip: null,
  night: null,
  events: Object.freeze([]) as readonly SessionEvent[],
});

/* ── internals shared by both channels ── */

type Listener = () => void;

/**
 * Shallow-merge a patch onto a state object. Returns null when nothing would
 * change (so no notification goes out), otherwise a new object. Keys set to
 * undefined are ignored: the contract for an absent value is null.
 */
function merge<S extends object>(prev: S, patch: Partial<S>): S | null {
  let next: S | null = null;
  for (const key of Object.keys(patch) as (keyof S)[]) {
    const v = patch[key];
    if (v === undefined || Object.is(v, prev[key])) continue;
    if (!next) next = { ...prev };
    next[key] = v as S[keyof S];
  }
  return next;
}

function notify(listeners: Set<Listener>): void {
  listeners.forEach((l) => l());
}

/* ── the SESSION channel ── */

const STORAGE_KEY = "ai:session";
const STORAGE_VERSION = 1;

let state: SessionState = DEFAULT_SESSION;
let hydrated = false;
const listeners = new Set<Listener>();

function fromStored(raw: unknown): SessionState | null {
  if (!raw || typeof raw !== "object") return null;
  const box = raw as { v?: unknown; s?: unknown };
  if (box.v !== STORAGE_VERSION || !box.s || typeof box.s !== "object") return null;
  const s = box.s as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const obj = <T>(v: unknown): T | null => (v && typeof v === "object" ? (v as T) : null);
  const figures = Array.isArray(s.figures) ? s.figures.filter((x): x is string => typeof x === "string") : [];
  const events = Array.isArray(s.events)
    ? (s.events as unknown[])
        .filter((e): e is SessionEvent => !!e && typeof e === "object" && typeof (e as SessionEvent).line === "string")
        .slice(-EVENT_CAP)
    : [];
  return {
    req: obj<SessionRequest>(s.req),
    dives: num(s.dives),
    requests: num(s.requests),
    approvals: num(s.approvals),
    corrections: num(s.corrections),
    figures,
    lastTrace: obj<SessionTrace>(s.lastTrace),
    slip: obj<SessionSlip>(s.slip),
    night: obj<SessionNight>(s.night),
    events,
  };
}

/** Runs once, on the first client access. The server never gets here. */
function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const next = fromStored(JSON.parse(raw));
    if (next) state = next;
  } catch {
    // private mode, blocked storage, or a stale shape: start clean
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, s: state }));
  } catch {
    // storage full or blocked: the in-memory session still works for this page
  }
}

/** The current session. Stable identity between writes, so it is safe as a memo key. */
export function getSession(): SessionState {
  ensureHydrated();
  return state;
}

/**
 * Shallow-merge a patch (or a function of the current state). Notifies and
 * persists only when a field actually changed. Returns the resulting state.
 */
export function setSession(patch: SessionPatch): SessionState {
  ensureHydrated();
  const p = typeof patch === "function" ? patch(state) : patch;
  const next = merge(state, p);
  if (!next) return state;
  state = next;
  persist();
  notify(listeners);
  return state;
}

/** Subscribe to session writes (not reel writes). Returns the unsubscribe. */
export function subscribe(cb: Listener): () => void {
  ensureHydrated();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Mint the request, once per session: the id is minutes since the visitor's
 * local midnight, the clock their own, the zone theirs. A second call returns
 * the same request, so every crossing after the first prints the same stamp.
 */
export function mint(): SessionRequest {
  const s = getSession();
  if (s.req) return s.req;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const id = "intake-" + String(minutes).padStart(4, "0");
  let local = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  let tz = "";
  try {
    // en-US with h23 keeps "14:02:11" in Latin digits for the mono slate and
    // ticket, whatever the visitor's locale; the zone is still theirs
    const fmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    local = fmt.format(now);
    const zone = fmt.resolvedOptions().timeZone || "";
    const short = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    tz =
      short && /^(?:[A-Z]{2,5}|GMT[+-]\d{1,2}(?::\d{2})?)$/.test(short)
        ? short
        : (zone.split("/").pop() ?? "").replace(/_/g, " ");
  } catch {
    // an exotic Intl: the fallback clock above stands, with no zone
  }
  const req: SessionRequest = { id, local, tz, mintedAt: Date.now() };
  setSession({ req });
  return req;
}

/** Increment one of the four counters. */
export function bump(key: CounterKey, by = 1): number {
  const next = getSession()[key] + by;
  setSession({ [key]: next });
  return next;
}

/** Record that a figure rendered. Deduped; returns true the first time. */
export function figure(id: string): boolean {
  const s = getSession();
  if (s.figures.includes(id)) return false;
  setSession({ figures: [...s.figures, id] });
  return true;
}

export function setTrace(trace: SessionTrace | null): void {
  setSession({ lastTrace: trace });
}

export function setSlip(slip: SessionSlip | null): void {
  setSession({ slip });
}

export function setNight(night: SessionNight | null): void {
  setSession({ night });
}

/** Append a line to the event log (capped at EVENT_CAP, oldest dropped). */
export function log(src: string, line: string): SessionEvent {
  const ev: SessionEvent = { t: Date.now(), src, line };
  setSession((s) => ({ events: [...s.events, ev].slice(-EVENT_CAP) }));
  return ev;
}

/** The most recent event from one source, or null. */
export function lastEvent(src: string): SessionEvent | null {
  const { events } = getSession();
  for (let i = events.length - 1; i >= 0; i--) if (events[i].src === src) return events[i];
  return null;
}

/** Back to the defaults and clear storage (dev tooling and tests). */
export function reset(): void {
  ensureHydrated();
  state = DEFAULT_SESSION;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing to clear
    }
  }
  notify(listeners);
}

/** The session as one object, for `session.bump("dives")`-style call sites. */
export const session = {
  get: getSession,
  set: setSession,
  subscribe,
  mint,
  bump,
  figure,
  setTrace,
  setSlip,
  setNight,
  log,
  lastEvent,
  reset,
} as const;

/* ── the REEL channel ── */

/** The page is a seven-minute reel at 24 fps: the slate's timecode counts scroll depth in frames of it. */
export const REEL_SECONDS = 7 * 60;
export const REEL_FPS = 24;
export const REEL_FRAMES = REEL_SECONDS * REEL_FPS;

export type ReelState = {
  /** scroll depth 0..1 (scroll / (docHeight - innerHeight)) */
  progress: number;
  /** reelFrame(progress): 0..REEL_FRAMES */
  frame: number;
  /** the current chapter's data-ch, "04", or null before any section has reported */
  ch: string | null;
  /** the current section's data-rail, "Compression", or null */
  rail: string | null;
  /** measured frames per second, rounded; 0 while unknown or the tab is hidden */
  fps: number;
};

export const DEFAULT_REEL: ReelState = Object.freeze({ progress: 0, frame: 0, ch: null, rail: null, fps: 0 });

let reelState: ReelState = DEFAULT_REEL;
const reelListeners = new Set<Listener>();

/** Scroll depth 0..1 to a frame of the reel (clamped, rounded). */
export function reelFrame(progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.round(p * REEL_FRAMES);
}

/** A frame of the reel as "HH:MM:SS:FF". */
export function timecode(frame: number): string {
  const f = Math.max(0, Math.min(REEL_FRAMES, Math.round(frame)));
  const ff = f % REEL_FPS;
  const total = Math.floor(f / REEL_FPS);
  const ss = total % 60;
  const mm = Math.floor(total / 60) % 60;
  const hh = Math.floor(total / 3600);
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
}

export function getReel(): ReelState {
  return reelState;
}

/** Shallow-merge; notifies only when a field changed. Safe to call every frame. */
export function setReel(patch: Partial<ReelState>): ReelState {
  const next = merge(reelState, patch);
  if (!next) return reelState;
  reelState = next;
  notify(reelListeners);
  return reelState;
}

/** Subscribe to reel writes (not session writes). Returns the unsubscribe. */
export function subscribeReel(cb: Listener): () => void {
  reelListeners.add(cb);
  return () => {
    reelListeners.delete(cb);
  };
}

export const reel = {
  get: getReel,
  set: setReel,
  subscribe: subscribeReel,
  frame: reelFrame,
  timecode,
  SECONDS: REEL_SECONDS,
  FPS: REEL_FPS,
  FRAMES: REEL_FRAMES,
} as const;

/* ── React ── */

/** Shallow equality for selectors that return a fresh object or array each time. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a) as (keyof T)[];
  const kb = Object.keys(b) as (keyof T)[];
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false;
  return true;
}

const identity = <S>(s: S): S => s;

/**
 * useSyncExternalStore with a selector. The selection is cached against the
 * state's identity and the selector's identity, and compared with isEqual, so
 * a component re-renders only when what it selected changed, and React's
 * "getSnapshot must be cached" check always sees a stable value.
 */
function useSelected<S, T>(
  sub: (cb: Listener) => () => void,
  get: () => S,
  server: S,
  selector: (s: S) => T,
  isEqual: (a: T, b: T) => boolean,
): T {
  const cache = useRef<{ s: S; sel: (s: S) => T; v: T } | null>(null);
  const pick = (s: S): T => {
    const c = cache.current;
    if (c && c.s === s && c.sel === selector) return c.v;
    const v = selector(s);
    const out = c && isEqual(c.v, v) ? c.v : v;
    cache.current = { s, sel: selector, v: out };
    return out;
  };
  return useSyncExternalStore(
    sub,
    () => pick(get()),
    () => pick(server),
  );
}

/**
 * Read the session in React. `useSession()` returns the whole state (its
 * identity changes only on a write); `useSession(s => s.req)` re-renders only
 * when the request changes. Pass `shallowEqual` for selectors that build an
 * object. Never fires on reel writes.
 */
export function useSession(): SessionState;
export function useSession<T>(selector: (s: SessionState) => T, isEqual?: (a: T, b: T) => boolean): T;
export function useSession<T>(selector?: (s: SessionState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const sel = selector ?? (identity as unknown as (s: SessionState) => T);
  return useSelected(subscribe, getSession, DEFAULT_SESSION, sel, isEqual);
}

/**
 * Read the reel in React. Prefer subscribeReel + a textContent write for
 * anything that follows the timecode; this hook is for coarse readers
 * (the chapter, `useReel(r => r.ch)`), which change a dozen times a visit.
 */
export function useReel(): ReelState;
export function useReel<T>(selector: (r: ReelState) => T, isEqual?: (a: T, b: T) => boolean): T;
export function useReel<T>(selector?: (r: ReelState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const sel = selector ?? (identity as unknown as (r: ReelState) => T);
  return useSelected(subscribeReel, getReel, DEFAULT_REEL, sel, isEqual);
}

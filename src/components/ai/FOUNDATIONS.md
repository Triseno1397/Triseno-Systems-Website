# FOUNDATIONS — `session.ts` and `cleanDark.ts`

Two shared modules every builder on `/ai-infrastructure` imports and never rewrites.
Both live in `src/components/ai/`, are SSR-safe (nothing touches `window`, `document`
or storage at import), need no React context, and are tested in isolation (Node + SSR).

```ts
import { session, useSession, reel, setReel, subscribeReel, timecode, reelFrame } from "./session";
import { cleanDark, useCleanDark } from "./cleanDark";
```

---

## 1. `session.ts` — what this visitor did

One request is filmed across the page. The hero mints it with the visitor's own clock,
Compression presses its steps into agents, the stack sends it and times the trace, the
console halts on a slip, the night counts what ran unattended, and the ticket at the gate
prints it all back. `session.ts` is the only memory those figures share.

### State

```ts
type SessionState = {
  req: SessionRequest | null;        // { id: "intake-0842", local: "14:02:11", tz: "PDT", mintedAt: number }
  dives: number;                     // completed crossings into the core
  requests: number;                  // SEND REQUEST runs on the stack
  approvals: number;                 // routing slips approved
  corrections: number;               // routing slips corrected
  figures: readonly string[];        // figure ids that rendered, first-seen order, deduped
  lastTrace: SessionTrace | null;    // { preset, totalMs, spans: readonly TraceSpan[], state: "done" | "blocked" | "breached" }
  slip: SessionSlip | null;          // { outcome: "approved" | "corrected", to?: "J. Okafor", value?: string, at?: "00:00:41" }
  night: SessionNight | null;        // { tasks: 2318, escalations: 41 }
  events: readonly SessionEvent[];   // { t: Date.now(), src, line }, last 24, oldest first
};
type TraceSpan = { id: string; name: string; layer: number; start: number; dur: number; parent?: string; async?: boolean; failed?: boolean };
```

`DEFAULT_SESSION` is frozen; every field has a value before any writer has run, so every
reader works on first paint (`req` is `null`, counters `0`, arrays empty). A richer span
type is assignable to `TraceSpan` as long as it has the five required fields.

### Reading

```ts
getSession(): SessionState                 // stable identity between writes; fine as a memo key
subscribe(cb: () => void): () => void      // session writes only; returns the unsubscribe

useSession(): SessionState                 // whole state; re-renders on any durable write (a dozen per visit)
useSession(s => s.req)                     // re-renders only when the request changes (Object.is)
useSession(s => ({ a: s.dives, b: s.requests }), shallowEqual)   // object-returning selectors pass shallowEqual
```

`useSession` is `useSyncExternalStore` with a cached selector. On the server and during
hydration it returns `DEFAULT_SESSION`, then re-renders once with the rehydrated state, so
the markup never mismatches. Never read `window.sessionStorage` yourselves.

### Writing

```ts
setSession(patch | (s) => patch)           // shallow merge; notifies + persists only if a field changed; undefined values ignored

session.mint(): SessionRequest             // once per session; later calls return the same request
session.bump("dives" | "requests" | "approvals" | "corrections", by = 1): number
session.figure(id): boolean                // true the first time this id is recorded
session.setTrace(trace | null)
session.setSlip(slip | null)
session.setNight(night | null)
session.log(src, line): SessionEvent       // appends; capped at EVENT_CAP (24)
session.lastEvent(src): SessionEvent | null
session.reset()                            // defaults + clears storage (dev/tests only)
```

`session.get` / `session.set` / `session.subscribe` are aliases of the named exports.
State is persisted to `sessionStorage["ai:session"]` in a try/catch on every durable write
and rehydrated lazily on the first client access (corrupt or old-version data falls back to
the defaults without throwing).

### Who writes what

| Item | Call sites |
|---|---|
| hero-dive | on first crossing `const req = session.mint()` → caption `` `The layer underneath . REQ ${req.id} . ${req.local} ${req.tz}` ``; `session.bump("dives")` per completed crossing |
| intake-reading | `session.figure("intake")` on first intersection |
| mercury-compression | `session.figure("compression")`; on settle `session.log("compression", "12 steps -> 05 agents . 2 layers")` |
| agent-anatomy | `session.figure("anatomy")` |
| stack-instrument | `session.figure("stack")`; on run completion `session.bump("requests")` and `session.setTrace({ preset, totalMs, spans, state })` |
| console-slip | boot line reads `session.get().lastTrace` (`bench . last trace 1,310 ms` when present); on resolve `session.setSlip({ outcome, to: "J. Okafor", value?, at })` then `session.bump("approvals")` or `session.bump("corrections")` |
| night-watch | `session.figure("night")`; once at p ≥ 0.97 `session.setNight({ tasks: 2318, escalations: 41 })` and `session.log("night", "night . 2,318 tasks . 41 escalations")` |
| projection (Slate) | the single `[data-fig]` IntersectionObserver calls `session.figure(host.dataset.fig)` |
| exit (Ticket) | `const s = useSession()` and prints: `REQ s.req?.id`, `MINTED s.req.local s.req.tz`, `STEPS session.lastEvent("compression")?.line`, `TRACE s.lastTrace`, `SLIP s.slip`, `NIGHT s.night`, `FIGURES s.figures.length`; on tear `session.log("gate", \`ticket torn . ${s.figures.length} figures rendered\`)` |

Figure ids are the section's `data-fig` value: `intake`, `compression`, `anatomy`, `stack`,
`night`, plus whatever the lead assigns to the kept figures. `figure()` dedupes, so a
section may report itself and the Slate's observer may report it again.

### The reel channel (the slate's clock)

The timecode changes up to 24 times a second while scrolling, so it lives in a second
store that never wakes a `useSession` reader.

```ts
type ReelState = { progress: number; frame: number; ch: string | null; rail: string | null; fps: number };
//                 scroll 0..1     reel frame   data-ch "04"      data-rail "Compression"   measured, 0 = unknown/hidden

REEL_SECONDS = 420, REEL_FPS = 24, REEL_FRAMES = 10080   // the page is a seven-minute reel at 24 fps
reelFrame(progress): number                                // clamped, rounded
timecode(frame): "HH:MM:SS:FF"                             // timecode(3224) === "00:02:14:08"

getReel(), setReel(patch), subscribeReel(cb)               // setReel bails out when nothing changed: safe every frame
useReel(), useReel(r => r.ch)                               // coarse readers only (the chapter); never follow the frame through React
```

Slate pattern (one frame job, one write phase, text written only when it changed):

```ts
const off = addFrameJob({
  read() { y = getLenis()?.scroll ?? window.scrollY; },             // docHeight cached on resize, not read here
  write() {
    const progress = max > 0 ? y / max : 0;
    const frame = reelFrame(progress);
    if (frame !== last) { last = frame; tcEl.textContent = timecode(frame); setReel({ progress, frame }); }
  },
});
```

### Rules

- Never write `sessionStorage["ai:session"]` or `document.documentElement` from a section; go through the store.
- Never call a session writer per frame. The hot path is `setReel`, and it bails out on unchanged values.
- Writers are plain functions: call them from event handlers, GSAP callbacks and effects, never during render.
- Readers that print per-frame values use `subscribeReel` + `textContent`, not a hook.
- `events` is capped at 24; use it for lines, use the typed fields (`lastTrace`, `slip`, `night`) for figures the ticket must parse.

---

## 2. `cleanDark.ts` — who owns the dark

While the page is mounted, `html[data-clean]` inverts the shared chrome to ink and turns
the phone content-fade scrims to paper (`ai.css`). Four moments cut to the dark and need
the chrome back to white line-work: the hero dive, the stack film, night on the sheet, the
descent iris. They all set the same attribute, `html[data-clean-dark]`, so it is
reference-counted by owner. The attribute is on while any owner holds it.

What `html[data-clean-dark]` does today (`ai.css`, `ai-ambience.css`): the chrome
(`.morph-nav`, `.chrome-btn`, `.progress-rail`, `.orb-cursor`) returns to white; the phone
`body::before/::after` scrims return to the site's black; `.ai-glow` and `.ai-grain` go to
opacity 0. The projection item adds `.ai-slate { color: #e8f1f3 }` and switches the gate
streak off under it.

### API

```ts
cleanDark(owner: string, on: boolean): void   // the plan's shape; idempotent per owner
cleanDark.enter(owner)                        // take the dark under this key
cleanDark.leave(owner)                        // release it; ALWAYS in your unmount cleanup
cleanDark.has(owner): boolean
cleanDark.isActive(): boolean                 // is the attribute on
cleanDark.owners(): string[]                  // debugging
cleanDark.subscribe(cb): () => void           // fires on every 0 <-> 1 transition
cleanDark.clear()                             // the page's own unmount only; never from a section
useCleanDark(): boolean                       // React; re-renders only on the transition
CLEAN_DARK_ATTR === "data-clean-dark"
```

The DOM is written only when the owner count crosses 0 ↔ 1, so a per-frame call such as
`cleanDark("dive", v > 0.66)` costs a `Set` lookup and nothing else.

### Owner keys in use

`"dive"` (IntelligenceCore), `"stack"` (StackFilm), `"night"` (NightWatch), `"descent"` (Descent, already migrated).
Use your item's key; never another builder's.

### Patterns

Scroll band (StackFilm, NightWatch):

```ts
const st = ScrollTrigger.create({ trigger: section, start: "top 12%", end: "bottom 12%", onToggle: (t) => cleanDark("stack", t.isActive) });
return () => { st.kill(); cleanDark.leave("stack"); };
```

Per-frame scalar (the hero dive, inside the existing draw loop):

```ts
cleanDark("dive", dive.v > 0.66);           // every frame, free
// cleanup: cleanDark.leave("dive");
```

A JS reader that must step aside under the dark (the gate streak):

```ts
if (cleanDark.isActive()) { streak.style.opacity = "0"; return; }
```

### Rules

- Never `toggleAttribute("data-clean-dark", …)` or `removeAttribute` directly. Descent used to; it now goes through `cleanDark("descent", …)` and `cleanDark.leave("descent")`.
- Every `enter` has a `leave` in the same component's cleanup, including the `ScrollTrigger` paths under reduced motion (killing a trigger does not fire `onToggle`).
- CSS reacts to the attribute; JS reacts through `isActive()` / `subscribe` / `useCleanDark()`. No one polls the DOM.

---

## 3. Note for the lead (AiPage wiring)

Nothing in these modules needs mounting. Optional but recommended, in AiPage's existing
`data-clean` effect cleanup, add `cleanDark.clear()` so a route change mid-descent can never
leave `data-clean-dark` on `<html>`:

```ts
import { cleanDark } from "./cleanDark";
// inside the useEffect cleanup, after root.removeAttribute("data-clean"):
cleanDark.clear();
```

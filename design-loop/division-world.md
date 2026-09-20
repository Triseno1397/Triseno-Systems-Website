# division-world.md — the shared lit world behind a division page

`src/components/world/DivisionWorld.tsx` renders ONE continuous lit 3D place behind a whole page:
wet rippled reflective ground, a horizon glow, five layered haze banks, a corridor of silhouetted
monoliths with a skyline beyond, floating dust in two depths, and a key light that spills the
division hue onto the floor. Four copies of the division glyph stand down the corridor at the scale
of architecture, alternating sides of the frame. It is built from the same pieces as the portal
(`src/components/world/scene/*`), so the portal and the divisions read as one site.

The camera never cuts. Page scroll drives one monotonic dolly (z 13 → −72) with a slow lateral
weave, so any two consecutive scroll positions are two frames of one camera move.

## Props

| prop | type | default | meaning |
|---|---|---|---|
| `division` | `DivisionKey` (`"creative" \| "web" \| "ai" \| "work" \| "contact"`) | required | Picks the single hue and the glyph from `src/lib/divisions.ts` (design-system §1). `work`/`contact` give the achromatic white world. |
| `scrollRef` | `RefObject<HTMLElement>` | document | Drive the camera from one element's scroll range instead of the whole page. |
| `onReady` | `() => void` | — | Fires once the canvas has drawn its first frames (use it to release a loader). |
| `className` | `string` | — | Extra class on the fixed layer. |

## Adopting it (the whole change)

```tsx
import DivisionWorld, { WorldSection, WorldCard } from "@/components/world/DivisionWorld";

<main className="relative bg-black text-white">
  <DivisionWorld division="ai" />               {/* first child; fixed, z-0 */}
  <WorldSection rail="Hero"> …headline… </WorldSection>
  <WorldSection rail="Offer">
    <WorldCard> …copy over the scene… </WorldCard>
  </WorldSection>
  <WorldSection rail="Gate" railNext="Contact"> … </WorldSection>
</main>
```

Rules for the page:
1. **Paint no section backgrounds.** A section with `bg-black` (or any opaque fill) hides the world
   and brings back the "stacked document blocks" failure. Media (video, mock sites) is fine.
2. **Sections sit above the world:** `position: relative; z-index: 10` (`WorldSection` does it).
3. **Copy over the scene goes in a `WorldCard`** — frosted glass, 1px white, radius 0. Never an
   opaque black rectangle.
4. **Keep out of the chrome lanes.** `WorldSection` pads by `--lane-top` / `--lane-bottom` /
   `--gutter`. If you do not use it, pad your own sections with those tokens (globals.css).
   `--lane-right` (the rail's lane, ≥1200px only) is already applied to every `<main>` on a
   revamped route by world.css — do not add it again.
5. Keep your own per-section motion mechanic (M1); the world is the stage, not a mechanic.
6. **Chrome collision is handled globally.** Two fixed neutral fade bands (`.chrome-fade`, mounted by
   `Chrome.tsx` at z 790) fade every page's content to black before it reaches the lockup, trigger,
   chevron or contact icon. Their sizes are `--fade-top` / `--fade-bottom` (globals.css); the lanes
   are those plus 16px. Keep anything that must be read at rest (a headline, a CTA) inside the lanes,
   and keep page content below z 790 so it passes under the bands.

## Exports

| export | what |
|---|---|
| `default DivisionWorld` | the fixed world layer |
| `WorldSection` | `{ rail, railNext?, id?, className?, children }` — 100dvh section inside the safe zone, registers with the progress rail via `data-rail` |
| `WorldCard` | `{ className?, children }` — frosted readable substrate |
| `useWorldProgress(fn)` | subscribe to scroll progress 0..1 without re-rendering on every tick: `useWorldProgress(p => el.current!.style.opacity = String(p))` |
| `worldState` | the live record (`progress`, `px`, `py`) for imperative reads |

To place something "in" the world, read progress: section *i* of *n* is on camera around
`progress ≈ i / (n − 1)`; the four glyph markers pass at progress ≈ 0.22, 0.46, 0.69, 0.93.

## Performance and fallbacks (all automatic)

- `three` / R3F are lazy-loaded (`next/dynamic`, `ssr: false`); the LCP element stays your headline.
- **Mobile (< 768px), `prefers-reduced-motion`, no WebGL:** no canvas. The layer shows
  `WorldAtmosphere` — the same place composited in CSS (horizon band, bloom, silhouetted slabs,
  drifting haze, wet floor holding a rippled pool of the hue, dust, vignette). Never flat black.
  It is also what shows instantly while the canvas loads.
- **Weak GPU:** `PerformanceMonitor` drops to the LOW tier — no refraction, no depth of field,
  256px mirror — but the ground, haze, horizon, monoliths, dust, hue spill and bloom all stay,
  so LOW still reads as a lit place.
- `?dbg=H` pins the high tier for captures (as on the portal).

`WorldAtmosphere` can be used on its own: `<WorldAtmosphere hue="#9d5cff" fixed />`.

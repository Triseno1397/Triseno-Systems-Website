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
| `plate` | `boolean` | `false` | Stand in the division's generated plate (`/worlds/{division}-*.webp`; Work/Contact use the portal plate): plate as deep background, 3D as foreground. See world-plates.md. |
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
6. **Chrome collision is handled globally — content only, the world stays full-bleed.**
   `ContentFade` (mounted by `Chrome.tsx`) gives every direct child of `<main>` that is content a
   viewport-pinned vertical mask (`[data-fade]` in world.css): transparent through the chrome zone at
   the top and bottom, fully opaque inside the lanes. Nothing is painted over the scene.
   What a page must do:
   - Mount its world layer as a **direct child of `<main>` with `position: fixed`** (DivisionWorld,
     AiWorld, WebWorld, StudioBackdrop all already do). Fixed direct children — or anything with
     `data-world-layer` — are never masked. A backdrop placed *inside* a section is content and will
     fade at the edges; move it out or mark it `data-world-layer`.
   - Put sections (or their pin-spacers) as direct children of `<main>`; GSAP pinning is fine.
   - Opt an element out with `data-no-fade` only if it is not text (e.g. a full-bleed media band).
   - Keep must-read-at-rest content inside `--lane-top` / `--lane-bottom` (band + 16px).

## Exports

| export | what |
|---|---|
| `default DivisionWorld` | the fixed world layer |
| `WorldSection` | `{ rail, railNext?, id?, className?, children }` — 100dvh section inside the safe zone, registers with the progress rail via `data-rail` |
| `WorldCard` | `{ division?, className?, children }` — a GlassPanel: frosted readable substrate that works under the content fade |
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

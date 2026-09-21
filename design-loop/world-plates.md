# World plates — how every world is now built

Round 3's craft critic lost to the reference on every page for the same reason three rounds running:
the reference's world is a lit, material place (terrain, fog, reflection, depth); ours was procedural
line-work and haze reading as "dim murk". We now have generated environment art. It is the base of every world.

## Assets (all in `public/`, WebP, web-weight)
| World | Desktop (2880x1620) | Mobile (1170x2069) |
|---|---|---|
| Portal (achromatic monolith gallery, wet stone floor, one white light shaft) | `/worlds/portal-desktop.webp` | `/worlds/portal-mobile.webp` |
| Creative (amber film soundstage, light shafts, crane + stands at edges) | `/worlds/creative-desktop.webp` | `/worlds/creative-mobile.webp` |
| Web (violet concrete atrium, receding square portals) | `/worlds/web-desktop.webp` | `/worlds/web-mobile.webp` |
| AI (cathedral of cyan filaments, dark calm centre) | `/worlds/ai-desktop.webp` | `/worlds/ai-mobile.webp` |

`/art-manifest.json` maps every asset path to `{ w, h, blur }` where `blur` is a tiny base64 WebP
placeholder — paint it instantly, fade the real image in over it.

Other art (some still rendering; code defensively, a missing file must never break a page):
- `/concepts/{mesa-tordo,ironvale-build,solenne-aesthetics,harrow-pike,tavo-supply,kilo-club,alder-quay,caliber-nine}.webp` — hero photos for the eight Web Design concept sites (brand names match `RangeComps.tsx`).
- `/concepts/fennick-rowe-engineer.webp`, `/concepts/fennick-rowe-van.webp` — photography for the rebuilt "after" site.
- `/testimonials/{maren-holloway,marcus-thibault,priya-raman,caleb-whitford,sofia-marchetti,jonah-pruitt,elena-vasquez,hannah-lindqvist,tomas-reyes,devin-okafor}.webp` — portraits matching `studio/testimonials.ts`.

## How to use a plate
1. **It is the base layer.** Full-bleed, `position: fixed`, inside the world layer (a fixed direct child of `<main>`, or marked `data-world-layer`) so the content-only fade never touches it. Desktop plate above 768px, mobile plate below.
2. **Bring it to life — a still image is not a world.** Combine: a slow scroll-driven camera move (scale ~1.0 → 1.12 plus a small vertical drift across the whole page), pointer parallax (a few px), a soft pointer-following light (additive, division hue or white), and living atmosphere on top (drifting haze, a gently breathing light shaft, dust motes). Animate only transform/opacity/filter.
3. **3D becomes foreground, not the whole world.** Keep existing real-time 3D (the portal's glass object and doors, the AI lattice, the web frames) as *lit foreground elements* composited over the plate — with a transparent canvas. Trim anything that fights the plate or crosses text. The AI lattice in particular must no longer be the full-screen backdrop.
4. **Readable by construction.** The plates keep a calm, dark middle band. Content sits on real frosted glass (`backdrop-filter: blur()`, 1px white hairline, 0 radius) or a local soft neutral scrim. No scene detail through resting type.
5. **Performance.** The plate must not become the LCP element or block text: blur placeholder first, `decoding="async"`, fade in. Text remains LCP.

## Shared foundation pieces (src/components/world/)
- **`<WorldPlate world="portal|creative|web|ai" hue? tint? />`** — the plate, alive, in the DOM: blur placeholder →
  fade-in, scroll push-in + pointer parallax + pointer light (shared pose model, `plateMotion.ts`), breathing shaft,
  drifting haze, dust, vignette. It is `data-world-layer`, so put it in your fixed world layer. `hue` grades the plate
  (luminance kept, hue from the division) with a dip through colourless between hues; leave it white for a plate
  already painted in its hue. Phones / reduced motion get the same component.
- **`PlateBackdrop`** (`scene/plate.tsx`) — the same plate as the deep background *inside* an R3F scene, so glass
  refracts it. Pair it with a level camera whose lens is shifted onto `plate(world).horizon.desktop` (see
  `PortalScene.tsx` CameraRig) so real-time objects stand on the plate's floor. `DivisionWorld plate` does both.
- **`<DivisionWorld division="…" plate />`** and **`<WorldAtmosphere plate="…" />`** accept a plate.

## How to use GlassPanel (frosted glass under the content fade)
`ContentFade` masks every content section, and a masked ancestor turns `backdrop-filter` into clear glass — it can no
longer see the world layer behind. So never rely on `backdrop-filter` for a card inside page content. Use
`<GlassPanel world="creative" className="…">…</GlassPanel>` instead (import from `@/components/world/GlassPanel`;
`world` is your page's plate: `portal` for Work / Contact). It draws a pre-blurred copy of that plate
(`/worlds/{world}-{desktop|mobile}-glass.webp`) inside itself, re-aligned with the fixed plate every frame, plus a
neutral veil (`veil={0..1}`, default 0.5) and the 1px white hairline — real frosted glass at the cost of one tiny image
and one transform per panel, immune to masks, opacity, filters and pinned sections. It is `position: relative;
overflow: hidden`; put your padding on it via `className`. It stays aligned only with a plate rendered by `WorldPlate`
/ `PlateBackdrop` (shared pose model); a page that animates its plate some other way should switch to `WorldPlate`.
`WorldCard` is already a GlassPanel.

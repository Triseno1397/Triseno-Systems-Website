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

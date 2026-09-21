# site-map.md — pages, sections, and the ONE motion mechanic each section owns

Rule M1: no mechanic appears twice. "21st" = one of the 11 components Tristen picked (each used exactly once).
Copy source: `Downloads/triseno-website-copy.md` (AI infrastructure), existing `/studio` + `/web-design-division` copy in `src/content/**`.

## Global chrome (every page)
- **Morphing scroll navbar** (21st: morphing-scroll-navbar) — full lockup at top, morphs to a compact pill-less hairline bar after 80px scroll; reads `TRISENO / <DIVISION>`.
- Glass-orb cursor, wireframe loader, right-edge progress rail, warp route transition in destination hue.

## `/` Portal — achromatic
1. **Signature object menu** — R3F object on a wet reflective floor; menu of 5 words (CREATIVE · WEB DESIGN · AI INFRASTRUCTURE · WORK · CONTACT); hovering a word swaps the object's glyph + hue. Headline uses **text-rotate** (21st): "WE BUILD [AD CREATIVE | WEBSITES | AI SYSTEMS]".
2. **Three doors** — scroll-scrubbed camera dolly past three lit portals (amber circle, violet square, cyan triangle), one line of positioning each, click = warp.
3. **Gate** — final CTA "Start a Conversation" over **background beams with collision** (21st), white beams only.

## `/studio` Creative — amber
1. Hero: **scroll-expansion hero** (21st) — the showreel starts as a small framed window and expands to full-bleed as you scroll.
2. What we make: horizontal pinned **filmstrip scrub** — 7 formats (UGC, product hero, direct response, ASMR, try-on, demo, brand film), videos play on centre.
3. Behind the studio: **pinned print deal** — scrolling deals four stills onto the lit stage one at a time while the founder's story advances a beat per print; hover lifts a print.
4. Proof: **testimonials with marquee** (21st) — a demonstration of the component: fictional sample clients with generated portraits, carrying one discreet note that the wall is illustrative.
5. Gate → contact (amber warp).

## `/web-design-division` Web — violet
1. Hero: **hero shutter text** (21st) — headline slices open like a shutter.
2. The page is the demo: **container scroll animation** (21st) — a device frame tilts up from the floor showing a fully built fictional concept site.
3. Before / after: **compare reveal** (21st) — drag slider, a dated template vs the rebuilt fictional concept site.
4. What you get: **sticky stacking cards** — deliverables stack and scale back as the next arrives.
5. Range: **cursor-follow image trail / hover-swap gallery** of industry concepts (labelled concepts).
6. Gate → contact (violet warp).

## `/ai-infrastructure` AI — cyan
1. Hero: **Splite** (21st: splite) — interactive Spline 3D scene with spotlight; headline "We Build the Operational Intelligence Layer".
2. Capabilities: **spotlight cards** (21st) in a bento of the 7 capabilities; cursor spotlight reveals hairline borders.
3. Workflow compression: **scroll-scrubbed SVG draw** — a 12-step process line collapses into a 2-layer system as you scroll.
4. Process: **radial orbital timeline** (21st) — Diagnose → Architect → Build → Deploy → Compound.
5. Industries: **accordion rows with mono agent-log typewriter** on open.
6. Why Triseno: **two-way toggle** — typical AI vendor vs Triseno, three rows wiping between answers. (The odometer is a separate Counts section that counts only what the page draws.)
7. Gate → "Start with a diagnostic" (cyan warp).

## `/work` — achromatic (white diamond), an entry takes its division's hue only while active
Reframed: an **index of what the studio can build**, never a portfolio of past clients. 23 entries: the 8 Creative
formats (existing `/videos` clips), the 9 Web concept sites (fictional brands, labelled "Concept site"), 6 AI
"System concept" entries named after the AI page's capabilities (AI world plates as media). Every entry warps to its
division page. World: portal plate via `WorldPlate`, colourless; intro + gate copy on `GlassPanel`.
1. Index: **clip-path + displacement hover-distortion list** — display-type rows; the hovered row pulls a media
   preview after the cursor (behind the type) that leans, shears (clip-path quad) and ripples (SVG displacement
   filter) with its velocity; entries swap by a directional clip-path wipe. Keyboard focus docks it beside the row.
   **Division filter (All / Creative / Web / AI) reflows the list**: leaving rows wipe out sideways, survivors glide
   to their new places (GSAP Flip, transform only), arriving rows wipe in staggered. Phone: no cursor — each row is a
   disclosure that opens its media inline; the filter works the same.
2. Gate: **convergence** — circle, square and triangle (white hairlines) arrive from three sides on scroll and fuse;
   the white diamond resolves out of them. "Start a Conversation" -> /contact.

## `/contact` — achromatic (white hexagon) until a division is chosen
On the world chrome (the old (site) navbar/footer group is gone). World: portal plate via `WorldPlate`.
1. Conversation: **one-question-at-a-time form with line-draw progress** — a hexagon node per step, the line draws
   forward (scaleX). The first question picks the division; from then on the scene light (plate grade + floor
   spill, and the glass that frosts it) and the line take that division's hue, UI stays white. Steps: division,
   name, email, phone + preferred contact, company, project type (per division), current site (Web only),
   timeline, message. Enter advances (Ctrl/Cmd+Enter in the message), a click on a choice answers it, Back sits
   before the field (Shift+Tab reaches it), each step validates, aria-live announces the step, focus follows.
   `?division=creative|web|ai` preselects and opens on the name (division CTAs and the chrome contact icon pass it).
   Same web3forms endpoint, key and field names as before; success and error states.
2. Direct: email + Instagram on glass, and the **hidden portal seal** easter egg (drag-to-collapse) kept.

## Loop pieces
1. Foundation + Portal (`/` and global chrome/transition/cursor/loader)
2. Creative (`/studio`)
3. Web Design Division (`/web-design-division`)
4. AI Infrastructure (`/ai-infrastructure`)
(Work + Contact follow as piece 5 once 1–4 pass; they reuse the foundation.)

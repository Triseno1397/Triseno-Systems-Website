# design-system.md — Triseno Systems (revamp)

The single rulebook the system critic judges against. It merges four *rule sources* (Refero/OHZI tokens,
live ohzi.io, the old repo CLAUDE.md, the Triseno brand bible) into one. It does **not** merge the
divisions — the three divisions are separate worlds with separate identities. Every rule is checkable
from a screenshot or filmstrip.

## 1. Structure: one portal, three separate worlds
| Surface | Route | Hue (the ONLY saturated colour allowed there) | Glyph |
|---|---|---|---|
| Portal (home) | `/` | none of its own. At rest (nothing hovered, auto-rotation included) the scene is achromatic: white light, grey haze. While a division word is hovered/focused the object AND its environment light (floor spill, haze) take that division's hue | — |
| Triseno Studio — Creative | `/studio` | amber `#ff8a3d` (hot end `#ff4d6d` inside media only) | circle / aperture |
| Web Design Division | `/web-design-division` | violet `#9d5cff` | square / frame |
| AI Infrastructure | `/ai-infrastructure` | cyan data-light `#00b4d8` | triangle / node |
| Work, Contact | `/work`, `/contact` | achromatic; each item takes the hue of the division it belongs to | white diamond (Work) / white cross (Contact) — achromatic, never hued |

- **D1. You always know which division you are in.** Every division page shows, in every screenshot: the division name in the chrome (top-left lockup reads `TRISENO / <DIVISION>`), the division glyph, and only that division's hue.
- **D2. No hue bleed.** A division's hue never appears on another division's page. The only place two division hues may share a frame is the portal menu and a gate/warp transition between worlds.
- **Portal focus states.** On the portal, a division counts as focused while its menu word is hovered/focused OR while the camera is travelling through that division's door in the scroll sequence. Either way the scene may take that division's hue. At the very top of the page, with nothing hovered, the scene is achromatic.
- **D3. Separate entry points.** Each division is a complete pitch on its own URL (hero → offer → proof → process → CTA), so a client sent straight to one division never needs the others. Cross-links to other divisions live only in the menu overlay and the final gate.

## 2. Colour
- DOM canvas `#000000`; raised panel `#111111`; text `#ffffff`; secondary `#f5f5f7`; muted `#cfcfcf`. No navy or grey-blue DOM backgrounds or CSS gradients. Rendered 3D scenes are exempt: fog, haze and light in the scene may carry the active hue, and at rest they are neutral grey, never blue-grey.
- UI line-work (borders, icons, dividers, cursor, rails) is pure white at 1px. UI is never tinted with the division hue except: active state, data readouts, focus ring.
- **Inactive / unselected states** (resting menu words, collapsed accordion rows, dimmed non-current items) may be white at reduced opacity — the reference dims unselected menu words to ~35%. This is not an off-palette grey.
- **Division gates use the division glyph.** A division page's final gate uses that division's own glyph (circle / square / triangle). The diamond is the portal's Work glyph, not a generic gate mark.
- Colour comes from the scene/media (3D, video, generated imagery) and from the single division hue. Max one saturated hue per frame (see D2).
- No purple-to-blue SaaS gradients. No drop shadows on UI. Glow is allowed only on scene objects and the division glyph.
- **Frosted-glass cards are allowed** over a rendered scene (bar.md #5 requires them): translucent, backdrop-blurred, 1px white hairline, 0 radius. They may pick up the scene's light through the blur; they may not carry their own painted hue or gradient.
- **Chrome scrims are allowed**: a soft, neutral-black (never hued) falloff behind a chrome element so it stays legible. It must have no hard edge and no rule line. This is not a drop shadow.
- **Type at rest is solid.** Display and body type settle to a solid fill (white, fog or ash). A gradient or mask on type is allowed only while a reveal animation is running, never as a resting style.
- **The world is full-bleed; the fade applies to content only.** The edge fade that protects chrome must mask the scrolling content layer, never the rendered scene — the lit world must reach every edge of the frame. No letterbox bands.
- **The scene sits behind content, always.** No scene geometry, line, node, light column or bloom may render on top of, or through, resting type or controls. Where scene detail sits behind text, the text gets a readable substrate (frosted card, local soft scrim, or the scene is dimmed/defocused behind it).
- **Content never collides with chrome.** As content scrolls toward a fixed chrome element it must fade out or be masked before it reaches it — text may never print through, under, or over the lockup, rail, chevron or contact icon at any scroll position.

## 3. Type
- **Display: Unbounded** (600–700), uppercase, tracking ≥ 0.06em, never negative. Used for headlines, menu words, chrome labels, buttons.
- **Body: Geist Sans** (400), sentence case, 16–18px, line-height 1.5, max line length 62ch. **Data: Geist Mono** for counters, labels, agent logs.
- Hairline contrast pairing: a 600–700 headline is paired with 100–400 supporting text; hierarchy comes from weight and size, not colour.
- Display size ≥ 4× body size on desktop hero frames; ≥ 2.5× on phones (< 768px), where 4× in Unbounded cannot fit a single word like "CREATIVE" across 390px. A phone hero may drop body text entirely. Content uses at most 3 type sizes per frame; all chrome and mono labels share one further small size (12–13px). The lockup wordmark counts as chrome.
- Banned: Inter, Roboto, Arial, system fonts, emojis, Lucide icons (Phosphor only, thin/light weight).

## 4. Shape and chrome
- Radius 0 on buttons, inputs, cards, media frames. The only curves allowed: the orb cursor, glyph circles, and device frames that are depicting a real device.
- Buttons are ghost: transparent fill, 1px white stroke, Unbounded 500 uppercase. Hover = stroke draws / fill wipes in white with black text; never a coloured fill.
- Persistent chrome ≤ 5 elements: lockup (TL), menu trigger (TR), back/up chevron (BL), contact icon (BR), section progress rail (right edge, labelled current → next). Nothing else is fixed to the viewport.
- Custom cursor on pointer devices: ~40px glass orb; native cursor on touch.
- Loader: wireframe of the signature object + one progress bar.

## 5. Motion
- **M1. No mechanic twice.** No two sections on the whole site share the same primary motion mechanic. Each section's mechanic is named in `design-loop/site-map.md`; the critic checks the filmstrip against it.
- **M2. Travel between worlds.** Route changes between portal and divisions play a full-screen warp in the destination hue, 1.2–2.5s, no blank frame.
- **M3.** Nothing animates for under 400ms or over 2.5s (scroll-scrubbed motion exempt). One easing family: `power3/expo.out`-style decelerations; no bounce, no elastic.
- **M4.** Only `transform`, `opacity`, `clip-path`, `filter` on composited layers, and shader uniforms animate. Never layout properties.
- **M5.** `prefers-reduced-motion`: every section renders its final state, fully readable, with no scroll-jacking. Mobile (< 768px): no pinned section longer than 2 viewport heights; 3D scenes fall back to video/poster.
- **M6.** Every section fills the viewport with scene or media (min-height `100dvh`); no flat empty black bands taller than 120px between sections.

## 6. Content
- **The site IS the demo.** Every section exists to showcase a component, interaction or piece of craft. It is never a proof page: no section is judged on whether it proves past results, and no section asks for or depends on real client work. Testimonials, stats, case studies and concept sites are component demonstrations.
- The site is a showcase. Realistic filler is allowed for testimonials, case studies, client names and concept work so every component looks the way it would on a finished client site. Filler uses fictional people and fictional company names only — never a real brand, real person, or real logo that did not work with Triseno.
- No legible fake UI or dashboards in generated imagery. Real sites/screens are real captures.
- No on-screen text baked into generated video. No speaking AI avatars.
- Voice: precise systems engineer. Numbers over adjectives.
- CTA wording comes from the brand bible's approved set: "Start a Conversation" (the default), "Start with a diagnostic" (AI Infrastructure entry point), "Let's talk architecture". A page may lead with whichever fits its buyer; every page must offer "Start a Conversation" somewhere.

## 6b. Components are tailored, never cloned
- The 11 reference components from 21st.dev are inspiration for a mechanic, not a look. Each one is rebuilt in Triseno's language: division glyphs (circle / square / triangle), the division hue, Unbounded + Geist type, 0-radius hairline styling, Triseno copy, and at least one behaviour the stock demo does not have. If a section could be mistaken for the stock 21st.dev demo in a screenshot, it fails.

## 7. Build rules
- Next.js 16 App Router, TypeScript, Tailwind 4, GSAP + ScrollTrigger, Framer Motion, Lenis, React Three Fiber. Read `node_modules/next/dist/docs/` before using a Next API.
- 3D/video is lazy-loaded; LCP element is text or a poster image. Target Lighthouse performance ≥ 90 on division pages.
- Max content width 1400px for text blocks; scenes are full-bleed.
- The CMS at `/edit` and `src/content/**` keep working.

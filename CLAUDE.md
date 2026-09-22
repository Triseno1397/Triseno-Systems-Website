# CLAUDE.md — Triseno Systems Website (revamp branch)

## Project
**The website IS the demo.** When a prospect asks Tristen for his work, he sends this site. Its only job
is to showcase a wide range of distinct components, interactions and craft, so a visitor thinks "they
can build anything." It is NOT a proof page: never add or ask for past client sites, case studies as
evidence, or real results. Testimonials, stats, concept sites and case studies appear only as
demonstrations of a component, filled with realistic fictional content.

Every section uses a different motion mechanic, inside an immersive, ohzi.io-style world.

Triseno Systems has **three separate divisions**, each with its own page, hue, glyph and client base.
Never blend them:
1. **Triseno Studio (Creative)** — `/studio` — ad creative for paid social. Amber.
2. **Web Design Division** — `/web-design-division` — custom conversion-built websites. Violet.
3. **AI Infrastructure** — `/ai-infrastructure` — consulting, architecture, implementation. Cyan.
Plus the portal (`/`), `/work`, `/contact`, and the CMS at `/edit` (keep it working).

## Source of truth
- `design-loop/design-system.md` — design rules. Follow exactly.
- `design-loop/site-map.md` — pages, sections, and the one motion mechanic each section owns.
- `design-loop/bar.md` — what makes the reference (ohzi.io) good.

## Stack
Next.js 16 (App Router) + TypeScript, Tailwind 4, GSAP + ScrollTrigger + @gsap/react, Framer Motion,
Lenis, three + @react-three/fiber + drei, @phosphor-icons/react, Unbounded (display) + Geist Sans/Mono.
Read `node_modules/next/dist/docs/` before using a Next API (see AGENTS.md).

## Hard rules
- No emojis. Realistic filler content is fine (showcase site) but only with fictional names/companies — never real brands or people.
- Animate only transform/opacity/clip-path/filter/shader uniforms. Respect `prefers-reduced-motion`.
- `min-h-[100svh]` (stable small-viewport units; never `h-screen`, and not `dvh`, which resizes as the phone address bar moves).
- Do not generate Higgsfield video without Tristen approving the shot first.

# CLAUDE.md — Triseno Systems Website

## Project
Building the trisenosystems.com website — a premium, motion-driven site for
**Triseno Systems, a creative studio in two divisions:**
1. **Triseno Studio** — ad creative / content creation for paid social (Instagram,
   TikTok, YouTube): UGC ads, product hero, direct response, ASMR, apparel try-on,
   product demos, brand films.
2. **Web Design Division** — cinematic, conversion-built websites for DTC brands.

The home page is a split portal routing into the two divisions (`/studio` and
`/web-design-division`), plus `/portfolio` (Work) and `/contact`. This is NOT the
old "AI infrastructure" business — do not reintroduce that positioning or copy.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- GSAP + @gsap/react + ScrollTrigger (scroll animations, timelines, pinned sections)
- Framer Motion (component micro-interactions, page transitions)
- @phosphor-icons/react (icons — NO emojis, NO Lucide)
- Geist Sans (headings) + Geist Mono (code/tech accents)

## Design Rules
- Dark base across the site; each division owns its own accent identity:
  - Global / portal: navy (--bg-primary: #0a0e1a) + cyan (--accent-primary: #00b4d8)
  - Triseno Studio + Work: warm palette (amber/orange, `.studio-page` in globals.css)
  - Web Design Division: cyan→violet (the one place violet/#9d5cff is intentional)
- NO centered hero text (use split-screen or asymmetric layouts)
- NO uniform card grids (use Bento layouts, varied sizes)
- NO Inter, Roboto, Arial, or system fonts
- NO emojis anywhere in code or UI
- NO white backgrounds; NO purple gradients except the Web Design Division's cyan→violet
- Animate only `transform` and `opacity` — never layout properties
- Respect `prefers-reduced-motion`
- Use `min-h-[100dvh]` not `h-screen`
- Use CSS Grid not flexbox percentage math
- Max content width: max-w-[1400px] mx-auto

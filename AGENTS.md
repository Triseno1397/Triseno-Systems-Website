<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Triseno Systems website

Marketing site for **trisenosystems.com** — an AI infrastructure company. Single premium site, **not** a separate product app.

- **Stack:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind CSS 4, GSAP + ScrollTrigger + `@gsap/react`, Lenis (smooth scroll), Framer Motion, React Three Fiber + drei + postprocessing (Web Design 3D), `@phosphor-icons/react`, Geist Sans/Mono.
- **Setup & structure:** see `README.md`. **Design & code rules:** see `CLAUDE.md` — follow them exactly.
- **Routes:** `/`, `/capabilities`, `/process`, `/portfolio`, `/contact`, `/web-design`.
- **Load-bearing conventions:** dark navy theme only (no white bg, no purple gradients, no emojis); animate only `transform`/`opacity` and respect `prefers-reduced-motion`; the homepage hero is a single `<canvas>` warp (`WarpHero`) with no global particle field or per-frame GSAP.
- **The Web Design division** (`src/app/web-design/**`, `src/components/web-design/**`) is a self-contained cyan→violet sub-brand — treat it as its own surface and don't bleed its styling into the main site.
- **Deploy:** Vercel; push to `main` = production deploy, PR branches get previews.

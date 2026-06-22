# Triseno Systems — Website

The marketing site for **[trisenosystems.com](https://trisenosystems.com)** — a premium, motion-driven site for an AI infrastructure company (multi-agent orchestration, workflow compression, decision-layer automation).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**, built with **Turbopack**
- **Tailwind CSS 4** (theme defined inline in `src/app/globals.css`)
- **GSAP** + `@gsap/react` + **ScrollTrigger** — pinned/scrubbed scroll choreography
- **Lenis** — smooth scroll that drives the scrubbed timelines
- **Framer Motion** — component micro-interactions and page transitions
- **React Three Fiber** + `drei` + `postprocessing` — the 3D scenes in the Web Design division
- **@phosphor-icons/react** — icons (no emojis, no Lucide)
- **Geist Sans** (headings) + **Geist Mono** (code/tech accents)

## Getting started

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
```

### Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the local dev server (Turbopack) |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build           |
| `npm run lint`  | Run ESLint                           |

> `next.config.ts` pins `turbopack.root` because the project path contains a space.

## Routes

| Path           | Page                                                        |
| -------------- | ----------------------------------------------------------- |
| `/`            | Home — canvas **warp hero** (`WarpHero`) with a draggable speed throttle, capabilities zoom, "Built For", and the Web Design division band |
| `/capabilities`| Capabilities                                                |
| `/process`     | Process                                                     |
| `/portfolio`   | Portfolio                                                   |
| `/contact`     | Contact (hides an easter-egg portal into `/web-design`)     |
| `/web-design`  | Web Design **division** — a self-contained cyan→violet sub-brand with 3D (R3F) hero and scroll demo |

## Structure

```
src/
  app/                 # App Router routes + root layout + globals.css
    page.tsx           # Home (renders HomeContent)
    layout.tsx         # Root layout: Navbar, PageTransition, Footer
    capabilities|process|portfolio|contact|web-design/
  components/
    sections/          # Homepage + page sections (WarpHero, CapabilitiesZoom, BuiltFor, ...)
    layout/            # Navbar, Footer, PageHero, PageTransition
    animations/        # ScrollReveal, TextReveal, ParallaxLayer, MagneticButton
    ui/                # Button, shared primitives
    web-design/        # The Web Design division (sections + WebGL scenes)
  hooks/               # useGSAPScroll (Lenis), useGSAPSetup, useScrollParallax, ...
  lib/                 # animation/timeline helpers (capabilities-zoom, split-text, animations)
```

## Conventions

Design and code rules live in **`CLAUDE.md`** — the highlights:

- Dark navy palette (`--bg-primary: #0a0e1a`, `--accent-primary: #00b4d8`); no white backgrounds, no purple gradients.
- Animate only `transform` and `opacity`; never layout properties. Always respect `prefers-reduced-motion`.
- The homepage hero is a single performant `<canvas>` warp — no per-frame GSAP, no global particle field.
- The **Web Design division** (`src/app/web-design/**`, `src/components/web-design/**`) is a self-contained sub-brand; treat it as its own surface.

## Deployment

Hosted on **Vercel** (team _Triseno's projects_). Pushing to `main` triggers a production deploy; pull request branches get preview deployments automatically.

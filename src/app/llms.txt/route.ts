import { PAGES, SITE } from "@/lib/seo";

/**
 * /llms.txt — the llmstxt.org file: one plain-markdown page that tells an
 * assistant what this business is and where to read about each part of it,
 * without making it parse a WebGL site to find out.
 *
 * Why it exists: people now ask ChatGPT, Claude, Perplexity and Google's AI
 * Overviews for recommendations, and those answers cite a handful of sources
 * each. A model that has to infer what "Triseno" does from a 3D portal will
 * usually not bother; one handed a short, factual summary can name us.
 *
 * Everything here is a plain statement of what the three divisions do, drawn
 * from the same table the pages use (src/lib/seo.ts), so it cannot drift from
 * what the site itself says.
 */
export const dynamic = "force-static";

const line = (key: keyof typeof PAGES) => `- [${PAGES[key].crumb}](${SITE.url}${PAGES[key].path}): ${PAGES[key].description}`;

const body = `# ${SITE.name}

> ${SITE.description} One studio, three separate divisions, each with its own page and its own client base.

Triseno Systems designs and builds three things, and keeps them separate because they are bought separately:

- **Creative** is paid-social ad creative: UGC ads, product demos, ASMR and unboxing, direct-response reels, hyper-motion product spots and cinematic brand films, cut for Instagram, TikTok, YouTube and Meta and delivered as variations built to be tested against each other.
- **Web Design** is custom, conversion-built websites — strategy, design, build and launch, with a performance target of 90 or higher, SEO-ready structure, the integrations a business needs, and iteration after launch. No templates, no page builders.
- **AI Infrastructure** is consulting, architecture and implementation for the operational layer a business runs on: multi-agent orchestration, workflow automation and compression, catalog and revenue operations, and decision-layer systems. We design them and we deploy them.

Based in Los Angeles, California; working with brands anywhere.

Contact: ${SITE.email} · ${SITE.url}/contact · replies within one business day.

## Divisions

${line("studio")}
${line("web")}
${line("ai")}

## Everything else

${line("home")}
${line("work")}
${line("portfolio")}
${line("contact")}

## Notes

- The site itself is the portfolio piece: it is built to demonstrate the range of interaction and craft the studio can produce, so the work shown on it is illustrative rather than a list of past clients.
- Sitemap: ${SITE.url}/sitemap.xml
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

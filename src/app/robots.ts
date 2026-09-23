import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Emit as a file at build time rather than a per-request function — this route
// has no dynamic input, so there is nothing to gain from rendering it live.
export const dynamic = "force-static";

// The assistants people now ask for recommendations. A wildcard rule already
// allows them, but several of these crawlers are blocked by default at the CDN
// or by a stray rule, and an answer engine that cannot read the site cannot
// name it — so they are listed explicitly, with the same doors closed as
// everyone else. (See /llms.txt for what we point them at.)
const ANSWER_ENGINES = [
  "GPTBot", // ChatGPT browsing / training
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User", // a person asking ChatGPT to open the page
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini / AI Overviews grounding
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "cohere-ai",
  "meta-externalagent",
];

const DISALLOW = ["/edit", "/api/", "/web-design-division.html"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...ANSWER_ENGINES.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}

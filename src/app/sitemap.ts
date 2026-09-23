import type { MetadataRoute } from "next";
import { PAGES, SITE } from "@/lib/seo";

// Emit as a file at build time rather than a per-request function — this route
// has no dynamic input, so there is nothing to gain from rendering it live.
export const dynamic = "force-static";

// Every indexable route, from the same table the pages draw their metadata
// from, so a page cannot exist without being listed. The three division pages
// carry the search intent; the portal is the brand result.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const weight: Record<keyof typeof PAGES, { priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = {
    home: { priority: 1, changeFrequency: "monthly" },
    studio: { priority: 0.9, changeFrequency: "monthly" },
    web: { priority: 0.9, changeFrequency: "monthly" },
    ai: { priority: 0.9, changeFrequency: "monthly" },
    work: { priority: 0.7, changeFrequency: "monthly" },
    portfolio: { priority: 0.6, changeFrequency: "monthly" },
    contact: { priority: 0.6, changeFrequency: "yearly" },
  };
  return (Object.keys(PAGES) as Array<keyof typeof PAGES>).map((key) => ({
    url: `${SITE.url}${PAGES[key].path}`,
    lastModified,
    changeFrequency: weight[key].changeFrequency,
    priority: weight[key].priority,
    images: [`${SITE.url}${PAGES[key].og}`],
  }));
}

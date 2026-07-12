import type { MetadataRoute } from "next";

// Static-export target (next.config.ts → output: "export") requires metadata
// route handlers to be fully static so they emit as files at build time.
export const dynamic = "force-static";

const BASE_URL = "https://trisenosystems.com";

// Crawl map for search engines. Keep in sync with the App Router routes.
// The Web Design division lives as a static page in /public and is linked
// from the nav/footer; it is not an App Router route, so it is not listed here.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1, changeFrequency: "monthly" },
    { path: "/studio", priority: 0.9, changeFrequency: "monthly" },
    { path: "/portfolio", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

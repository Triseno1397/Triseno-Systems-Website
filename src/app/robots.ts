import type { MetadataRoute } from "next";

// Emit as a file at build time rather than a per-request function — this route
// has no dynamic input, so there is nothing to gain from rendering it live.
export const dynamic = "force-static";

const BASE_URL = "https://trisenosystems.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/edit", "/api/", "/web-design-division.html"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

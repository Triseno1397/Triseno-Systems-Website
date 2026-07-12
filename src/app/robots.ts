import type { MetadataRoute } from "next";

// Static-export target (next.config.ts → output: "export") requires metadata
// route handlers to be fully static so they emit as files at build time.
export const dynamic = "force-static";

const BASE_URL = "https://trisenosystems.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

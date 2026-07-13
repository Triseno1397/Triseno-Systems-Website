import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve from the config file's own location so the root is correct
// regardless of cwd. Project path contains a space ("Triseno Website v2 AG"),
// which otherwise causes Turbopack to walk up to c:\Users\trist and fail to
// resolve tailwindcss.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Not a static export. The CMS at /edit needs API routes, middleware, and a
  // session cookie, none of which exist under `output: "export"`. The four
  // marketing routes still prerender to static HTML — verify on every build
  // that they show as ○ (Static) and only /edit + /api/cms are ƒ (Dynamic).
  images: {
    // Cloudinary already serves f_auto/q_auto; layering Next's optimizer on top
    // double-transforms and burns the Image Optimization quota for no gain.
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  // The Web Design Division is still a hand-written static page in /public.
  // Under `output: "export"` Vercel stripped the .html and served it at the
  // clean URL; a server build serves /public verbatim, so without this rewrite
  // /web-design-division 404s and every nav/footer/portal link to it breaks.
  // Retire this rewrite when the page is ported to the App Router.
  async rewrites() {
    return [
      {
        source: "/web-design-division",
        destination: "/web-design-division.html",
      },
    ];
  },
  // Allow LAN/VPN hosts to load Next.js dev resources (HMR, RSC, chunks) when
  // testing on a phone. Without this, scripts get blocked and pages render
  // visually but never hydrate, so handlers like the menu button do nothing.
  allowedDevOrigins: ["192.168.1.152", "192.168.0.105", "10.5.0.2"],
};

export default nextConfig;

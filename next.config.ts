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
  // /web-design-division is an App Router page (src/app/web-design-division).
  // The old hand-written static page stays on disk at
  // /public/web-design-division.html and is reachable only at that .html URL.
  // Allow LAN/VPN hosts to load Next.js dev resources (HMR, RSC, chunks) when
  // testing on a phone. Without this, scripts get blocked and pages render
  // visually but never hydrate, so handlers like the menu button do nothing.
  allowedDevOrigins: ["192.168.1.152", "192.168.0.105", "10.5.0.2"],
};

export default nextConfig;

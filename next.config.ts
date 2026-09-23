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
  // no "X-Powered-By: Next.js" — nothing a visitor needs, one thing a scanner wants
  poweredByHeader: false,
  async headers() {
    // The browser-side hardening every page carries. A full script-src CSP is
    // not set: Next's own inline scripts and the parse-time video warm-up
    // would need a per-request nonce, which turns every static page dynamic.
    // What a CSP can still lock without that — framing, base, form targets,
    // plugins, mixed content — is locked here.
    const security = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Content-Security-Policy",
        // frame-ancestors 'self': the editor previews the site in its own iframe
        value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https://api.web3forms.com; upgrade-insecure-requests",
      },
    ];
    // Immutable media: the models, clips, plates and posters never change in
    // place (a new file gets a new name), so the browser keeps them for a year.
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/(.*)", headers: security },
      { source: "/models/:path*", headers: immutable },
      { source: "/videos/:path*", headers: immutable },
      { source: "/worlds/:path*", headers: immutable },
      { source: "/posters/:path*", headers: immutable },
      { source: "/og/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      // the legacy static copy of the web design page: reachable, never indexed
      { source: "/web-design-division.html", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // the editor and its API are never cached or indexed by anyone
      { source: "/edit/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;

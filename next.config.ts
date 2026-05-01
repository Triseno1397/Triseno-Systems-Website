import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve from the config file's own location so the root is correct
// regardless of cwd. Project path contains a space ("Triseno Website v2 AG"),
// which otherwise causes Turbopack to walk up to c:\Users\trist and fail to
// resolve tailwindcss.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  // Allow LAN/VPN hosts to load Next.js dev resources (HMR, RSC, chunks) when
  // testing on a phone. Without this, scripts get blocked and pages render
  // visually but never hydrate, so handlers like the menu button do nothing.
  allowedDevOrigins: ["192.168.1.152", "192.168.0.105", "10.5.0.2"],
};

export default nextConfig;

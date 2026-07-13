import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { UNLOCK_COOKIE } from "@/lib/cms/auth";
import "./editor.css";

/**
 * The editor lives in its own route segment so its bundle — and later @dnd-kit,
 * react-colorful, recharts — is code-split away from the marketing site entirely.
 * Nothing here ships to a visitor.
 *
 * WHY THE GATE IS HERE AND NOT IN MIDDLEWARE
 *
 * The obvious design is an Edge middleware in front of /edit. It does not work, for
 * two independent reasons that each cost real time to find:
 *
 *   1. The Edge bundle is not given arbitrary server env vars. Inspecting
 *      middleware-manifest.json shows its `env` block carries only Next's internals —
 *      EDIT_UNLOCK_KEY and EDIT_SESSION_SECRET are simply absent, so every check
 *      silently evaluates against `undefined` and fails closed. Every route behind the
 *      matcher 404s and it reads as a routing bug.
 *   2. Anything the middleware imports is compiled for Edge, so a shared auth module
 *      that reaches for node:crypto poisons the bundle and breaks it outright.
 *
 * And the deeper point: middleware was never the security boundary anyway. Next has
 * shipped middleware-bypass CVEs (CVE-2025-29927), so a design that *relied* on it
 * would be one framework bug away from handing out a GitHub token. Gating in a Node
 * server component gives us real env access, no Edge constraints, and nothing to
 * bypass. The API routes independently re-verify via requireSession() regardless.
 */
export const metadata: Metadata = {
  title: "Triseno CMS",
  robots: { index: false, follow: false },
};

// Reads cookies, so it can never be prerendered.
export const dynamic = "force-dynamic";

export default async function EditLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();

  // No unlock cookie → as far as this visitor is concerned, /edit does not exist.
  // 404 rather than 401: don't advertise that there is a door here to attack. This is
  // what makes a 4-digit PIN survivable — you cannot reach the PIN form without first
  // having visited the bookmarked unlock link.
  if (jar.get(UNLOCK_COOKIE)?.value !== "1") {
    notFound();
  }

  return <div className="cms">{children}</div>;
}

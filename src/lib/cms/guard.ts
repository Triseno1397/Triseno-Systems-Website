import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "./auth";

/**
 * The real authorization check, called at the top of every /api/cms handler.
 *
 * Middleware already redirected the logged-out, but middleware is bypassable (see
 * src/middleware.ts) — so this is the check that actually holds. It is cheap; run it
 * everywhere.
 *
 * Also enforces CSRF on mutating requests. sameSite=lax already blocks cross-site
 * form posts, but a custom header cannot be set by a cross-origin form at all, and
 * checking Origin costs nothing. No library needed.
 */
export type GuardResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireSession(opts: { mutating?: boolean } = {}): Promise<GuardResult> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return { ok: false, status: 401, error: "Unauthorized" };

  if (opts.mutating) {
    const h = await headers();

    // A cross-origin <form> can POST, but it cannot set a custom header.
    if (h.get("x-triseno-cms") !== "1") {
      return { ok: false, status: 403, error: "Missing CMS header" };
    }

    // And the Origin must be us.
    const origin = h.get("origin");
    const host = h.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return { ok: false, status: 403, error: "Bad origin" };
        }
      } catch {
        return { ok: false, status: 403, error: "Bad origin" };
      }
    }
  }

  return { ok: true, session };
}

/** Best-effort client IP for the login throttle. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

import { NextResponse } from "next/server";
import { checkUnlockKey, UNLOCK_COOKIE, unlockCookieOptions } from "@/lib/cms/auth";

// Node runtime: this needs to actually read EDIT_UNLOCK_KEY, which the Edge runtime
// does not expose. A route handler has no layout, so the layout's unlock gate cannot
// lock us out of the very endpoint that grants the unlock.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The bookmarked unlock link: /edit/unlock?k=<128-bit key>.
 *
 * Visiting it once drops a long-lived cookie; without that cookie /edit 404s and the
 * PIN form is unreachable. That is what turns a 10,000-combination PIN into something
 * an attacker cannot even begin to guess at — they have to get past 2^128 first.
 *
 * A wrong key gets a 404, not a 401: no oracle, nothing to enumerate.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("k") ?? undefined;

  if (!checkUnlockKey(key)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const res = NextResponse.redirect(new URL("/edit/login", req.url));
  res.cookies.set(UNLOCK_COOKIE, "1", unlockCookieOptions);
  return res;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  UNLOCK_COOKIE,
} from "@/lib/cms/auth";
// Node-only (scrypt). Kept in its own module so it can never reach an Edge bundle.
import { verifyPin } from "@/lib/cms/pin";
import { checkLoginThrottle, clearLoginFailures, recordLoginFailure } from "@/lib/cms/throttle";
import { clientIp } from "@/lib/cms/guard";

// scrypt is Node-only — it does not exist on the Edge runtime.
export const runtime = "nodejs";

export async function POST(req: Request) {
  // The unlock cookie is required HERE, not just on the /edit pages.
  //
  // This endpoint has no layout, so the layout's unlock gate does not protect it — it is
  // reachable directly. Without this check, an attacker could ignore /edit entirely and
  // grind the PIN against this route: 10,000 combinations, which is not a secret.
  //
  // With it, reaching the PIN check at all requires the 128-bit unlock key, so the PIN
  // only ever has to stop someone who already has the bookmarked link (a borrowed laptop),
  // not the internet. This is the check that lets the throttle be a simple in-memory one.
  const jar = await cookies();
  if (jar.get(UNLOCK_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = await clientIp();

  // Throttle before doing any work, so a flood costs us nothing.
  const throttle = checkLoginThrottle(ip);
  if (!throttle.allowed) {
    return NextResponse.json({ error: throttle.reason }, { status: 429 });
  }

  let pin: unknown;
  try {
    ({ pin } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (typeof pin !== "string" || pin.length === 0 || pin.length > 128) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // ~100ms by design: it is what makes online guessing of a short PIN impractical.
  // If the secrets aren't configured (a fresh deploy where the Vercel env vars haven't
  // been added yet), say so plainly rather than emitting a bare 500.
  let ok: boolean;
  try {
    ok = await verifyPin(pin);
  } catch {
    return NextResponse.json(
      { error: "The editor isn't configured yet. Set the EDIT_* environment variables." },
      { status: 503 }
    );
  }

  if (!ok) {
    recordLoginFailure(ip);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  clearLoginFailures(ip);

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}

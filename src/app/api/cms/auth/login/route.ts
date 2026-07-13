import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/cms/auth";
// Node-only (scrypt). Kept in its own module so it can never reach the Edge bundle.
import { verifyPin } from "@/lib/cms/pin";
import { checkLoginThrottle, clearLoginFailures, recordLoginFailure } from "@/lib/cms/store";
import { clientIp } from "@/lib/cms/guard";

// scrypt is Node-only — it does not exist on the Edge runtime.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = await clientIp();

  // Throttle BEFORE doing any work, so a flood costs us nothing.
  const throttle = await checkLoginThrottle(ip);
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

  // ~100ms by design: it is what makes online guessing of a 4-digit PIN impractical.
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
    await recordLoginFailure(ip);
    // Deliberately vague, and identical for "wrong PIN" and "no such user".
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await clearLoginFailures(ip);

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}

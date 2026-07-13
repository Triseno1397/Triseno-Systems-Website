import { SignJWT, jwtVerify } from "jose";

/**
 * Session + PIN handling for /edit.
 *
 * Threat model, stated plainly: this door holds a GitHub token with write access to
 * `main`. The PIN is four digits — 10,000 combinations — which on its own is not a
 * credential, it's a speed bump. The blast radius is bounded (someone defaces a
 * marketing site; we click Rollback), so the answer is not to refuse the PIN but to
 * make guessing it useless:
 *
 *   1. UNLOCK KEY   — /edit is unreachable without a cookie set by visiting
 *                     /edit/unlock?k=<128-bit secret> once. An attacker cannot even
 *                     reach the PIN form. This is what actually secures the door;
 *                     the PIN is the thing that stops a borrowed laptop.
 *   2. LOCKOUT      — per-IP and, crucially, GLOBAL. A distributed attack defeats
 *                     per-IP limiting trivially; a global cap does not.
 *   3. scrypt       — ~100ms per verification. Not about timing-safety (a 4-char
 *                     compare is not a realistic oracle) but about making each guess
 *                     cost three orders of magnitude more than a string compare.
 *
 * `jose`, not `jsonwebtoken`: middleware runs on the Edge runtime, which has no Node
 * crypto. jsonwebtoken cannot run there at all — it fails at import, and the failure
 * looks like a routing bug rather than a crypto one.
 *
 * THIS MODULE MUST STAY EDGE-SAFE. It is imported by src/middleware.ts, so it may not
 * reach for node:crypto, even behind a lazy `await import`. Doing so poisons the Edge
 * bundle: the middleware silently fails to build and every route under its matcher
 * 404s, which reads as a routing bug and sends you hunting in completely the wrong
 * place. (It cost an hour here.) The scrypt PIN check therefore lives in its own
 * Node-only module, ./pin.ts, imported solely by the login route.
 */

/**
 * The `__Host-` prefix is the strongest cookie guarantee the platform offers: the
 * browser refuses the cookie unless it is Secure, Path=/, and has no Domain — so it
 * cannot be planted by a subdomain or over plain HTTP. We want that in production.
 *
 * But it *requires* Secure, and Secure cookies are not sent over http://localhost by
 * every client, which makes the whole flow untestable locally. So the prefix and the
 * Secure flag are dropped together, and only when CMS_INSECURE_COOKIES=1 is explicitly
 * set — a variable that exists in .env.local and must never exist in production.
 * Failing open here would silently ship a downgradeable session cookie.
 */
const SECURE_COOKIES = process.env.CMS_INSECURE_COOKIES !== "1";

const SESSION_COOKIE = SECURE_COOKIES ? "__Host-triseno_edit" : "triseno_edit_dev";
const UNLOCK_COOKIE = SECURE_COOKIES ? "__Host-triseno_key" : "triseno_key_dev";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8h, refreshed on activity

export { SESSION_COOKIE, UNLOCK_COOKIE, SESSION_TTL_SECONDS, SECURE_COOKIES };

function secret(): Uint8Array | null {
  const s = process.env.EDIT_SESSION_SECRET;
  return s ? new TextEncoder().encode(s) : null;
}

export type Session = { sub: string; jti: string };

export async function createSession(sub = "owner"): Promise<string> {
  const key = secret();
  // Only reachable from the login route, which has already verified the PIN — so a
  // missing secret here is a deployment error and should be loud, not silent.
  if (!key) throw new Error("EDIT_SESSION_SECRET is not set");

  const jti = crypto.randomUUID();
  return new SignJWT({ sub, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/**
 * Verify a session token. Returns null on ANY failure and never throws.
 *
 * That includes the secret being absent. This is called while rendering /edit, so a
 * throw would surface as a 500 — and on a deploy where the env vars have not been set
 * yet, a 500 is both alarming and uninformative. Failing closed (deny) is the correct
 * behaviour for a missing key: no secret, no session, no access.
 */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const key = secret();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
    return { sub: payload.sub, jti: payload.jti };
  } catch {
    return null;
  }
}

/** Constant-time compare of the unlock key. Edge-safe (no Node Buffer). */
export function checkUnlockKey(given: string | undefined): boolean {
  const expected = process.env.EDIT_UNLOCK_KEY;
  if (!expected || !given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: SECURE_COOKIES,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export const unlockCookieOptions = {
  httpOnly: true,
  secure: SECURE_COOKIES,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 365 * 24 * 60 * 60, // a year — he bookmarks the link once
};

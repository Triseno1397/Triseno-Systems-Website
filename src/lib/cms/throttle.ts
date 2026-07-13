/**
 * Login throttle.
 *
 * In-memory, deliberately. The previous design used Upstash Redis for a shared counter,
 * which meant an account signup and two more secrets just to rate-limit one endpoint —
 * a poor trade for a two-person CMS.
 *
 * What actually secures this door is the unlock key: /api/cms/auth/login now refuses any
 * request that does not already carry the unlock cookie, so you cannot even *reach* the
 * PIN check without first knowing a 128-bit secret. Guessing 10,000 PINs is irrelevant
 * if you must guess 2^128 first. The throttle below is defence in depth, not the wall.
 *
 * Honest limitation: serverless means this counter is per-instance and resets when an
 * instance goes cold, so a determined attacker who already holds the unlock key could
 * get more attempts than the nominal limit. That is an acceptable residual risk here —
 * anyone with the unlock key is, by construction, someone we handed the bookmark to.
 */

type Bucket = { count: number; resetAt: number };

const IP_MAX = 5;
const IP_WINDOW_MS = 15 * 60 * 1000;

const buckets = new Map<string, Bucket>();

/** Keep the map from growing without bound on a long-lived instance. */
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export type ThrottleVerdict = { allowed: true } | { allowed: false; reason: string };

export function checkLoginThrottle(ip: string): ThrottleVerdict {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(ip);
  if (bucket && now <= bucket.resetAt && bucket.count >= IP_MAX) {
    return { allowed: false, reason: "Too many attempts. Try again in a few minutes." };
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearLoginFailures(ip: string): void {
  buckets.delete(ip);
}

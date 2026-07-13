import { Redis } from "@upstash/redis";

/**
 * The CMS's small amount of server state: the working draft, the publish log, the
 * publish lock, and the login counters.
 *
 * Upstash when it is configured; an in-memory map otherwise. The fallback exists so
 * `npm run dev` works with zero external accounts — but it is per-process and dies on
 * restart, so production MUST have the env vars. isPersistent() surfaces that in the
 * editor UI rather than letting someone lose an afternoon of edits to a cold lambda.
 *
 * Upstash rather than Postgres deliberately: it speaks HTTP, so it works on the Edge
 * runtime and has no connection-pool problem in a serverless environment.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export function isPersistent(): boolean {
  return redis !== null;
}

/** Dev-only fallback. Values carry their own expiry so TTL semantics still hold. */
const memory = new Map<string, { value: unknown; expiresAt: number | null }>();

function memoryGet<T>(key: string): T | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt !== null && Date.now() > hit.expiresAt) {
    memory.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function get<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  return memoryGet<T>(key);
}

export async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (redis) {
    if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
    else await redis.set(key, value);
    return;
  }
  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function del(key: string): Promise<void> {
  if (redis) await redis.del(key);
  else memory.delete(key);
}

/** Increment a counter that expires. Returns the new value. Used by the rate limiter. */
export async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, ttlSeconds);
    return n;
  }
  const current = memoryGet<number>(key) ?? 0;
  const next = current + 1;
  const existing = memory.get(key);
  memory.set(key, {
    value: next,
    expiresAt: existing?.expiresAt ?? Date.now() + ttlSeconds * 1000,
  });
  return next;
}

/**
 * Acquire a lock, or return false if someone already holds it.
 * Guards Publish: a double-click would otherwise produce two commits and two builds.
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  if (redis) {
    const res = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
    return res === "OK";
  }
  if (memoryGet<string>(key)) return false;
  memory.set(key, { value: "1", expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}

/** Push onto a capped list (newest first). Used for the publish history. */
export async function pushCapped(key: string, value: unknown, cap: number): Promise<void> {
  if (redis) {
    await redis.lpush(key, JSON.stringify(value));
    await redis.ltrim(key, 0, cap - 1);
    return;
  }
  const list = memoryGet<unknown[]>(key) ?? [];
  list.unshift(value);
  memory.set(key, { value: list.slice(0, cap), expiresAt: null });
}

export async function listRange<T>(key: string, start = 0, stop = -1): Promise<T[]> {
  if (redis) {
    const raw = await redis.lrange<string | T>(key, start, stop);
    return raw.map((r) => (typeof r === "string" ? (JSON.parse(r) as T) : (r as T)));
  }
  const list = memoryGet<T[]>(key) ?? [];
  return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
}

/* ─────────────────────────── keys ─────────────────────────── */

export const KEYS = {
  draft: "triseno:draft",
  publishes: "triseno:publishes",
  publishLock: "triseno:publish:lock",
  loginFailIp: (ip: string) => `triseno:login:fail:${ip}`,
  loginFailGlobal: "triseno:login:fail:global",
} as const;

/* ─────────────────────────── login throttle ─────────────────────────── */

const IP_MAX = 5;
const IP_WINDOW = 15 * 60; // 15 min
const GLOBAL_MAX = 20;
const GLOBAL_WINDOW = 60 * 60; // 1 hour

export type ThrottleVerdict = { allowed: true } | { allowed: false; reason: string };

/**
 * A 4-digit PIN is only guessable if you get to keep guessing. Per-IP limiting alone
 * is defeated by rotating IPs, so the global cap is the rule that actually bites: past
 * 20 failures in an hour the PIN stops working site-wide. The cost is that he could
 * lock himself out for an hour, once — a fair trade for closing a distributed attack.
 */
export async function checkLoginThrottle(ip: string): Promise<ThrottleVerdict> {
  const [ipFails, globalFails] = await Promise.all([
    get<number>(KEYS.loginFailIp(ip)),
    get<number>(KEYS.loginFailGlobal),
  ]);

  if ((globalFails ?? 0) >= GLOBAL_MAX) {
    return {
      allowed: false,
      reason: "Too many failed attempts across the site. Locked for one hour.",
    };
  }
  if ((ipFails ?? 0) >= IP_MAX) {
    return { allowed: false, reason: "Too many failed attempts. Try again in 15 minutes." };
  }
  return { allowed: true };
}

export async function recordLoginFailure(ip: string): Promise<void> {
  await Promise.all([
    incr(KEYS.loginFailIp(ip), IP_WINDOW),
    incr(KEYS.loginFailGlobal, GLOBAL_WINDOW),
  ]);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await del(KEYS.loginFailIp(ip));
}

/**
 * Server-only helpers for /launch: the Stripe calls (plain REST, no SDK) and
 * the launch-spot count.
 *
 * Spots are counted honestly: paid launch deposits in Stripe for that month,
 * plus bookings Tristen took some other way, which he enters himself in
 * LAUNCH_SPOTS_BOOKED ("2026-11=2,2026-12=1"). When a month is full the page
 * offers the next month instead.
 *
 * Env:
 *   STRIPE_SECRET_KEY        sk_test_… while testing, sk_live_… in production
 *   LAUNCH_SPOTS_PER_MONTH   default 6
 *   LAUNCH_SPOTS_BOOKED      optional, "YYYY-MM=n,…"
 */

const STRIPE_API = "https://api.stripe.com/v1";
const TZ = "America/Los_Angeles";

export const stripeReady = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

/** Stripe wants form encoding with bracketed keys for nested values. */
export function formEncode(data: Record<string, unknown>, prefix = ""): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") out.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      out.push(formEncode(v as Record<string, unknown>, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out.filter(Boolean).join("&");
}

export async function stripe<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: Record<string, unknown>; revalidate?: number } = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const method = init.method ?? "GET";
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" && init.body ? formEncode(init.body) : undefined,
    ...(init.revalidate !== undefined ? { next: { revalidate: init.revalidate } } : { cache: "no-store" as const }),
  });
  const json = (await res.json().catch(() => null)) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe ${res.status}`);
  return json;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  created: number;
  customer_details?: { email?: string | null; name?: string | null } | null;
  payment_intent?: string | null;
  metadata: Record<string, string>;
}

// ── months ──────────────────────────────────────────────────────────────

/** "2026-11" for the current month in Los Angeles. */
export function monthKey(offset = 0, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric" }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value) - 1 + offset;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

// ── spots ───────────────────────────────────────────────────────────────

export function spotsPerMonth(): number {
  const n = Number.parseInt(process.env.LAUNCH_SPOTS_PER_MONTH ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

function manualBooked(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const pair of (process.env.LAUNCH_SPOTS_BOOKED ?? "").split(",")) {
    const [k, v] = pair.split("=").map((s) => s.trim());
    const n = Number.parseInt(v ?? "", 10);
    if (/^\d{4}-\d{2}$/.test(k ?? "") && Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

/** Paid launch deposits per month, read from Stripe (last ~100 days). */
async function stripeBooked(revalidate?: number): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!stripeReady()) return out;
  const since = Math.floor(Date.now() / 1000) - 100 * 86400;
  let after = "";
  for (let page = 0; page < 5; page++) {
    const q = `status=complete&limit=100&created[gte]=${since}${after ? `&starting_after=${after}` : ""}`;
    const list = await stripe<{ data: CheckoutSession[]; has_more: boolean }>(`/checkout/sessions?${q}`, { revalidate });
    for (const s of list.data) {
      if (s.metadata?.kind !== "launch_spot" || s.payment_status !== "paid") continue;
      const m = s.metadata.launch_month;
      if (m) out[m] = (out[m] ?? 0) + 1;
    }
    if (!list.has_more || !list.data.length) break;
    after = list.data[list.data.length - 1].id;
  }
  return out;
}

export interface Spots {
  /** the month a deposit made now reserves */
  month: string;
  label: string;
  total: number;
  left: number;
  /** label of the current month when it is already full */
  fullMonth?: string;
  /** false when the count could not be read (Stripe down / not set up) */
  live: boolean;
}

async function bookedByMonth(fresh: boolean): Promise<{ booked: (key: string) => number; live: boolean }> {
  const manual = manualBooked();
  let paid: Record<string, number> = {};
  let live = stripeReady();
  try {
    paid = await stripeBooked(fresh ? undefined : 60);
  } catch {
    live = false;
  }
  return { booked: (key) => (paid[key] ?? 0) + (manual[key] ?? 0), live };
}

export async function launchSpots(opts: { fresh?: boolean } = {}): Promise<Spots> {
  const total = spotsPerMonth();
  const { booked, live } = await bookedByMonth(Boolean(opts.fresh));
  const current = monthKey(0);
  for (let i = 0; i < 4; i++) {
    const key = monthKey(i);
    const left = Math.max(0, total - booked(key));
    if (left > 0)
      return { month: key, label: monthLabel(key), total, left, fullMonth: i > 0 ? monthLabel(current) : undefined, live };
  }
  const key = monthKey(4);
  return { month: key, label: monthLabel(key), total, left: total, fullMonth: monthLabel(current), live };
}

/** Open spots left in one month ("2026-11"), read fresh: for the booking email. */
export async function spotsLeftIn(month: string): Promise<{ left: number; total: number }> {
  const total = spotsPerMonth();
  const { booked } = await bookedByMonth(true);
  return { left: Math.max(0, total - booked(month)), total };
}

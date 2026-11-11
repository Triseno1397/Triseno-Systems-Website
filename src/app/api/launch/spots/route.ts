import { NextResponse } from "next/server";
import { launchSpots, monthKey, monthLabel } from "@/lib/launch";

export const dynamic = "force-dynamic";

/**
 * GET /api/launch/spots — the live launch-spot count for the site-wide ticker.
 * Same numbers the /launch page shows (paid deposits + Tristen's own count +
 * his scheduled booking days). Edge-cached for a minute so a busy page never
 * hammers Stripe.
 */
export async function GET() {
  const s = await launchSpots();
  const full = Boolean(s.fullMonth);
  return NextResponse.json(
    {
      // the month the ticker talks about: the current one, even when it is full
      month: s.fullMonth ?? s.label,
      next: s.label,
      total: s.total,
      left: full ? 0 : s.left,
      full,
      resetLabel: monthLabel(monthKey(1)),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}

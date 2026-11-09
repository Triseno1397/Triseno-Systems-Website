import { NextResponse } from "next/server";
import { launchSchema, timingText, currentSiteText, DEPOSIT_CENTS } from "@/components/launch/schema";
import { launchSpots, stripe, stripeReady, type CheckoutSession } from "@/lib/launch";

export const dynamic = "force-dynamic";

/**
 * POST /api/launch/checkout — validates the three questions + contact details,
 * picks the month the deposit reserves (live spot count), and opens a Stripe
 * Checkout Session for the deposit. The answers ride along as metadata so they
 * live with the payment in the Stripe dashboard too.
 */
export async function POST(req: Request) {
  if (!stripeReady()) {
    return NextResponse.json({ error: "Online reservations aren't switched on yet." }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  // honeypot: humans never see this field
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).website_url) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = launchSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      errors[k] ??= issue.message;
    }
    return NextResponse.json({ error: "Some answers need a second look.", errors }, { status: 422 });
  }
  const a = parsed.data;

  const spots = await launchSpots({ fresh: true });
  const origin = new URL(req.url).origin;
  const cut = (s: string) => s.slice(0, 480);

  const metadata = {
    kind: "launch_spot",
    launch_month: spots.month,
    business_name: cut(a.businessName),
    business_type: a.business,
    contact_name: cut(a.name),
    phone: cut(a.phone),
    instagram: cut(a.instagram),
    live_by: cut(timingText(a.timing, a.date)),
    offers: cut(a.sells),
    site_should_let_people: cut(a.actions.join("; ")),
    current_site: cut(currentSiteText(a.current, a.siteUrl)),
  };

  try {
    const session = await stripe<CheckoutSession>("/checkout/sessions", {
      method: "POST",
      body: {
        mode: "payment",
        submit_type: "book",
        customer_email: a.email,
        customer_creation: "always",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: DEPOSIT_CENTS,
              product_data: {
                name: `Launch spot deposit — ${spots.label}`,
                description:
                  "Reserves your launch spot and starts your custom website preview. Applied in full to your site; refunded in full if you pass on the preview.",
              },
            },
          },
        ],
        metadata,
        payment_intent_data: {
          description: `Launch spot deposit — ${a.businessName} (${spots.label})`,
          metadata,
        },
        custom_text: {
          submit: {
            message:
              "Your deposit goes toward your site. If the preview isn't right for you, it's refunded in full.",
          },
        },
        success_url: `${origin}/launch/confirmed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/launch?canceled=1`,
      },
    });
    if (!session.url) throw new Error("No checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[launch] checkout failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Checkout couldn't open right now." }, { status: 502 });
  }
}

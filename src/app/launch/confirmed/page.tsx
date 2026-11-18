import type { Metadata } from "next";
import TrisenoMark from "@/components/world/TrisenoMark";
import VaultDoor from "@/components/launch/VaultDoor";
import LaunchNotify, { type Reservation } from "@/components/launch/LaunchNotify";
import { EMAIL } from "@/components/contact/form";
import { monthLabel, spotsLeftIn, stripe, stripeReady, type CheckoutSession } from "@/lib/launch";
import { SITE } from "@/lib/seo";
import "../../contact.css";
import "../../launch.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch Spot Reserved | Triseno Systems",
  robots: { index: false, follow: false },
};

async function readSession(id: string | undefined): Promise<CheckoutSession | null> {
  if (!id || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id) || !stripeReady()) return null;
  try {
    const s = await stripe<CheckoutSession>(`/checkout/sessions/${id}`);
    return s.metadata?.kind === "launch_spot" && s.payment_status === "paid" ? s : null;
  } catch {
    return null;
  }
}

export default async function LaunchConfirmed({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const s = await readSession(session_id);

  const m = s?.metadata ?? {};
  let spotsLeft = "";
  if (s && m.launch_month) {
    try {
      const sp = await spotsLeftIn(m.launch_month);
      spotsLeft = `${sp.left} of ${sp.total} left in ${monthLabel(m.launch_month)}`;
    } catch {
      /* the email still goes out without the count */
    }
  }
  const reservation: Reservation | null = s
    ? {
        session: s.id,
        payment: typeof s.payment_intent === "string" ? s.payment_intent : "",
        amount: `$${((s.amount_total ?? 0) / 100).toFixed(2)}`,
        month: m.launch_month ? monthLabel(m.launch_month) : "",
        email: s.customer_details?.email ?? "",
        name: m.contact_name ?? s.customer_details?.name ?? "",
        businessName: m.business_name ?? "",
        businessType: m.business_type ?? "",
        liveBy: m.live_by ?? "",
        offers: m.offers ?? "",
        actions: m.site_should_let_people ?? "",
        currentSite: m.current_site ?? "",
        phone: m.phone ?? "",
        instagram: m.instagram ?? "",
        test: s.id.startsWith("cs_test_"),
        spotsLeft,
      }
    : null;
  const first = reservation?.name.trim().split(/\s+/)[0];

  return (
    <main className="vault">
      <header className="vbar">
        <a href="/" aria-label="Triseno Systems, back to the site">
          <TrisenoMark size={20} color="currentColor" />
          <span>Triseno Systems</span>
        </a>
        <span>The Launch Vault</span>
      </header>

      <section aria-labelledby="lc-title" className="vc">
        <div className="vc__inner">
          {reservation ? (
            <>
              <div className="vc__door">
                <VaultDoor total={6} left={0} sealed caption="locked" />
              </div>
              <p className="v-eyebrow">
                <i aria-hidden="true" />
                <span>{reservation.month} launch vault</span>
              </p>
              <h1 id="lc-title" className="vc__title" tabIndex={-1}>
                You&apos;re in{first ? `, ${first}` : ""}.
              </h1>
              <p className="vc__body">
                Your {reservation.amount} deposit is in and your launch spot is held. We&apos;re starting on your custom
                preview for {reservation.businessName || "your business"} and will reach out within one business day. A
                confirmation is on its way to {reservation.email || "your inbox"}.
              </p>
              <dl className="vc__summary">
                <div><dt>Live by</dt><dd>{reservation.liveBy}</dd></div>
                <div><dt>Business</dt><dd>{reservation.businessType}</dd></div>
                <div><dt>People should be able to</dt><dd>{reservation.actions}</dd></div>
                <div><dt>Deposit</dt><dd>{reservation.amount}, applied to your site. Refunded in full if you pass on the preview.</dd></div>
              </dl>
              <LaunchNotify reservation={reservation} />
            </>
          ) : (
            <>
              <h1 id="lc-title" className="vc__title" tabIndex={-1}>
                We couldn&apos;t find that payment
              </h1>
              <p className="vc__body">
                If you just paid, your spot is safe. Stripe emails your receipt, and we see every deposit. Reach us at{" "}
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or <a href={`tel:${SITE.phoneE164}`}>{SITE.phone}</a> and we&apos;ll
                confirm it.
              </p>
            </>
          )}
          <div className="vc__actions">
            <a href="/web-design-division" className="v-btn v-btn--quiet">
              See what we build
            </a>
          </div>
        </div>
      </section>

      <footer className="vfoot">
        <span>Triseno Systems</span>
        <a href="/">Back to the site</a>
      </footer>
    </main>
  );
}

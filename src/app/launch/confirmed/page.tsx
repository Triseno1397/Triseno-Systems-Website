import type { Metadata } from "next";
import WorldPlate from "@/components/world/WorldPlate";
import Glyph from "@/components/world/Glyph";
import SignOff from "@/components/world/SignOff";
import GlassPanel from "@/components/world/GlassPanel";
import TrisenoMark from "@/components/world/TrisenoMark";
import GhostButton from "@/components/ui/GhostButton";
import LaunchNotify, { type Reservation } from "@/components/launch/LaunchNotify";
import { EMAIL } from "@/components/contact/form";
import { monthLabel, stripe, stripeReady, type CheckoutSession } from "@/lib/launch";
import { SITE } from "@/lib/seo";
import "../../contact.css";
import "../../launch.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch Spot Reserved | Triseno Systems",
  robots: { index: false, follow: false },
};

const HUE = "#9d5cff";

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
      }
    : null;
  const first = reservation?.name.trim().split(/\s+/)[0];

  return (
    <main className="contact-world launch-world relative text-white" data-tinted="" style={{ ["--cf-scene-hue" as string]: HUE }}>
      <div aria-hidden="true" data-world-layer="" className="contact-world__scene">
        <WorldPlate world="portal" stations={false} hue={HUE} tint={0.5} />
        <span className="contact-world__scrim contact-world__scrim--top" />
        <span className="contact-world__scrim contact-world__scrim--bottom" />
      </div>

      <section data-rail="Reserved" aria-labelledby="lc-title" className="contact-section lc-section">
        <GlassPanel world="portal" className="cf-panel lc-panel" veil={0.55}>
          <div className="cf cf-done" style={{ ["--cf-hue" as string]: HUE }}>
            <span className="cf-done__glyph" aria-hidden="true">
              <TrisenoMark title="Triseno Systems" />
            </span>
            {reservation ? (
              <>
                <p className="contact-label">
                  <Glyph kind="square" size={12} color={HUE} strokeWidth={1.25} />
                  <span>{reservation.month} launch spot</span>
                </p>
                <h1 id="lc-title" className="cf-legend font-display lc-title">
                  You&apos;re in{first ? `, ${first}` : ""}
                </h1>
                <p className="cf-body">
                  Your {reservation.amount} deposit is in and your launch spot is held. We&apos;re starting on your
                  custom preview for {reservation.businessName || "your business"} and will reach out within one business
                  day. A confirmation is on its way to {reservation.email || "your inbox"}.
                </p>
                <dl className="lc-summary">
                  <div><dt>Live by</dt><dd>{reservation.liveBy}</dd></div>
                  <div><dt>Business</dt><dd>{reservation.businessType}</dd></div>
                  <div><dt>People should be able to</dt><dd>{reservation.actions}</dd></div>
                  <div><dt>Deposit</dt><dd>{reservation.amount}, applied to your site. Refunded in full if you pass on the preview.</dd></div>
                </dl>
                <LaunchNotify reservation={reservation} />
              </>
            ) : (
              <>
                <h1 id="lc-title" className="cf-legend font-display lc-title">
                  We couldn&apos;t find that payment
                </h1>
                <p className="cf-body">
                  If you just paid, your spot is safe. Stripe emails your receipt, and we see every deposit. Reach us at{" "}
                  <a href={`mailto:${EMAIL}`} className="world-underline">{EMAIL}</a> or{" "}
                  <a href={`tel:${SITE.phoneE164}`} className="world-underline">{SITE.phone}</a> and we&apos;ll confirm it.
                </p>
              </>
            )}
            <div className="cf-done__actions">
              <GhostButton href="/web-design-division">See what we build</GhostButton>
            </div>
          </div>
        </GlassPanel>
      </section>
      <SignOff />
    </main>
  );
}

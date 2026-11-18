import type { Metadata } from "next";
import TrisenoMark from "@/components/world/TrisenoMark";
import LaunchForm from "@/components/launch/LaunchForm";
import VaultHero from "@/components/launch/VaultHero";
import { DEPOSIT_LABEL } from "@/components/launch/schema";
import { launchSpots, monthKey, monthLabel, stripeReady } from "@/lib/launch";
import { SITE } from "@/lib/seo";
import "../contact.css";
import "../launch.css";

// the spot count is read from Stripe at most once a minute
export const revalidate = 60;

const TITLE = "Reserve Your Launch Spot | Triseno Systems";
const DESCRIPTION =
  "Reserve a launch spot with Triseno Systems. A deposit holds your spot, starts your custom website preview and goes toward your site. Refunded in full if you pass on the preview.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/launch" },
  // a page for leads Tristen sends here, not a search landing page
  robots: { index: false, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE.url}/launch`,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Reserve your launch spot — Triseno Systems" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og/default.png"] },
};

const STEPS = [
  {
    n: "01",
    title: "Reserve",
    body: `Answer three quick questions and place the ${DEPOSIT_LABEL} deposit. Your place is held from that moment.`,
  },
  {
    n: "02",
    title: "Preview",
    body: "We design a custom preview of your site around your business, then walk you through it.",
  },
  {
    n: "03",
    title: "Launch",
    body: "Love it, and we finish it and take it live on your timeline with your deposit already applied. Pass on it, and the deposit comes back in full.",
  },
];

export default async function LaunchRoute() {
  const spots = await launchSpots();

  return (
    <main className="vault">
      <header className="vbar">
        <a href="/" aria-label="Triseno Systems, back to the site">
          <TrisenoMark size={20} color="currentColor" />
          <span>Triseno Systems</span>
        </a>
        <span>The Launch Vault</span>
      </header>

      <VaultHero spots={spots} resetLabel={monthLabel(monthKey(1))} />

      <section className="vs" aria-labelledby="vs-title">
        <p id="vs-title" className="v-eyebrow">
          <i aria-hidden="true" />
          <span>Inside the vault</span>
        </p>
        <ol className="vs__list">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="vs__n" aria-hidden="true">
                {s.n}
              </span>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="reserve" className="vr" aria-labelledby="reserve-title">
        <div className="vr__intro">
          <p className="v-eyebrow">
            <i aria-hidden="true" />
            <span>Your reservation</span>
          </p>
          <h2 id="reserve-title" className="vr__title">
            <span>Claim a</span>
            <em>{spots.label}</em>
            <span>place</span>
          </h2>
          <p className="vr__sub">
            Three quick questions, then the {DEPOSIT_LABEL} deposit. It holds your place, puts your custom preview into
            production and goes toward your site. If the preview isn&apos;t right for you, you get it back in full.
          </p>
          <p className="vr__direct">
            Questions first? Call or text <a href={`tel:${SITE.phoneE164}`}>{SITE.phone}</a>
          </p>
        </div>

        <LaunchForm monthLabel={spots.label} ready={stripeReady()} nextMonth={Boolean(spots.fullMonth)} />
      </section>

      <footer className="vfoot">
        <span>Triseno Systems</span>
        <a href="/">Back to the site</a>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import WorldPlate from "@/components/world/WorldPlate";
import Glyph from "@/components/world/Glyph";
import SignOff from "@/components/world/SignOff";
import LaunchForm from "@/components/launch/LaunchForm";
import SpotMeter from "@/components/launch/SpotMeter";
import { DEPOSIT_LABEL } from "@/components/launch/schema";
import { launchSpots, stripeReady } from "@/lib/launch";
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

const HUE = "#9d5cff";

const STEPS = [
  {
    n: "01",
    title: "Reserve",
    body: `Answer three quick questions and place the ${DEPOSIT_LABEL} deposit. Your spot is held from that moment.`,
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
    <main className="contact-world launch-world relative text-white" data-tinted="" style={{ ["--cf-scene-hue" as string]: HUE }}>
      <div aria-hidden="true" data-world-layer="" className="contact-world__scene">
        <WorldPlate world="portal" stations={false} hue={HUE} tint={0.5} />
        <span className="contact-world__scrim contact-world__scrim--top" />
        <span className="contact-world__scrim contact-world__scrim--bottom" />
      </div>

      <section data-rail="Reserve" aria-labelledby="launch-title" className="contact-section contact-hero launch-hero">
        <div className="contact-hero__intro">
          <p className="contact-label">
            <Glyph kind="square" size={12} color={HUE} strokeWidth={1.25} />
            <span>Launch spots</span>
          </p>
          <h1 id="launch-title" className="contact-display font-display font-bold uppercase">
            <span>Reserve</span>
            <span>your</span>
            <span>launch</span>
          </h1>
          <p className="contact-body contact-hero__sub">
            Your website starts with a launch spot. A {DEPOSIT_LABEL} deposit holds it, puts your custom preview into
            production and goes toward your site. If the preview isn&apos;t right for you, you get it back in full.
          </p>

          <SpotMeter spots={spots} />

          <ol className="lf-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="cf-num">{s.n}</span>
                <span className="lf-steps__text">
                  <b className="font-display">{s.title}</b>
                  <span>{s.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="lf-direct">
            Questions first? Call or text{" "}
            <a href={`tel:${SITE.phoneE164}`} className="world-underline">
              {SITE.phone}
            </a>
          </p>
        </div>

        <LaunchForm monthLabel={spots.label} ready={stripeReady()} />
      </section>
      <SignOff />
    </main>
  );
}

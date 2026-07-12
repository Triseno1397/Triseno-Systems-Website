import type { Metadata } from "next";
import PortfolioShowcase from "@/components/studio/PortfolioShowcase";

export const metadata: Metadata = {
  title: "Work · Triseno Studio product ad reels",
  description:
    "Selected work from Triseno Studio — product hero, UGC, direct-response, apparel try-on, ASMR, and demo reels, built to perform on Instagram, TikTok, and YouTube.",
  alternates: {
    canonical: "/portfolio",
  },
};

// Rendered outside the (site) route group so it brings its own Studio chrome —
// nav + rotating marquee footer — instead of the division-agnostic navbar/footer.
export default function PortfolioPage() {
  return <PortfolioShowcase />;
}

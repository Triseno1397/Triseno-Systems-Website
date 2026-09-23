import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import PortfolioShowcase from "@/components/studio/PortfolioShowcase";
import ReelsProvider from "@/content/ReelsProvider";

export const metadata: Metadata = pageMetadata("portfolio");

// Rendered outside the (site) route group so it brings its own Studio chrome —
// nav + rotating marquee footer — instead of the division-agnostic navbar/footer.
export default function PortfolioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("portfolio")) }} />
      <ReelsProvider>
        <PortfolioShowcase />
      </ReelsProvider>
    </>
  );
}

import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import PortalPage from "@/components/portal/PortalPage";

export const metadata: Metadata = pageMetadata("home");

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("home")) }} />
      <PortalPage />
    </>
  );
}

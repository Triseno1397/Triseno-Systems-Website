import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import StudioWorld from "@/components/studio/StudioWorld";
import ReelsProvider from "@/content/ReelsProvider";
import "../studio.css";

export const metadata: Metadata = pageMetadata("studio");

// ReelsProvider stays the page root: it is the CMS contract. /edit loads this
// route with ?__draft=1 and pushes unsaved reel libraries into it over postMessage.
export default function StudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("studio")) }} />
      <ReelsProvider>
        <StudioWorld />
      </ReelsProvider>
    </>
  );
}

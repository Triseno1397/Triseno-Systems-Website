import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import WebDivisionPage from "@/components/web/WebDivisionPage";
import "../web.css";

// The concept sites' fonts (Instrument Serif, Anton) are declared in the
// root layout: see the note there.

export const metadata: Metadata = pageMetadata("web");

export default function WebDesignDivisionRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("web")) }} />
      <WebDivisionPage />
    </>
  );
}

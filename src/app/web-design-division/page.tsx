import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import { Anton, Instrument_Serif } from "next/font/google";
import WebDivisionPage from "@/components/web/WebDivisionPage";
import "../web.css";

// Typographic voices for the fictional concept sites shown INSIDE device and
// preview frames only (depicted content). Page UI stays Unbounded + Geist.
// Not preloaded: the LCP element is page text, the mocks sit below the fold.
const conceptSerif = Instrument_Serif({
  variable: "--font-concept-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const conceptCondensed = Anton({
  variable: "--font-concept-cond",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = pageMetadata("web");

export default function WebDesignDivisionRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("web")) }} />
      <WebDivisionPage fontClassName={`${conceptSerif.variable} ${conceptCondensed.variable}`} />
    </>
  );
}

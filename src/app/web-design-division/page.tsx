import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Web Design Division · Triseno Systems",
  description:
    "Custom, conversion-built websites. No templates: strategy, design, build, performance of 90 or higher, SEO-ready structure, integrations and ongoing iteration.",
  alternates: { canonical: "/web-design-division" },
  openGraph: {
    title: "Web Design Division · Triseno Systems",
    description: "Custom, conversion-built websites. No templates. The page is the demo.",
    url: "https://trisenosystems.com/web-design-division",
    siteName: "Triseno Systems",
    type: "website",
  },
};

export default function WebDesignDivisionRoute() {
  return <WebDivisionPage fontClassName={`${conceptSerif.variable} ${conceptCondensed.variable}`} />;
}

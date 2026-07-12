import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Triseno Systems · premium ad creative and conversion-built websites",
    template: "%s",
  },
  description:
    "Premium product ad creative for paid social plus cinematic, conversion-built websites for DTC brands. Days, not weeks. One studio, two divisions.",
  metadataBase: new URL("https://trisenosystems.com"),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "product ad creative",
    "UGC ads",
    "paid social video",
    "DTC video ads",
    "TikTok ads",
    "Instagram Reels ads",
    "product demo video",
    "brand films",
    "direct response ads",
    "conversion-built websites",
    "DTC web design",
    "ecommerce website design",
    "video ad studio",
  ],
  icons: {
    icon: "/images/triseno-logo-v2.png",
    apple: "/images/triseno-logo-v2.png",
  },
  openGraph: {
    title: "Triseno Systems · premium ad creative and conversion-built websites",
    description:
      "Premium product ad creative for paid social plus cinematic, conversion-built websites for DTC brands. Days, not weeks. One studio, two divisions.",
    url: "https://trisenosystems.com",
    siteName: "Triseno Systems",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/images/triseno-logo.jpeg",
        width: 1200,
        height: 630,
        alt: "Triseno Systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Triseno Systems · premium ad creative and conversion-built websites",
    description:
      "Premium product ad creative for paid social plus cinematic, conversion-built websites for DTC brands. Days, not weeks. One studio, two divisions.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Organization + WebSite structured data. Surfaces a richer brand result in
// Google (knowledge panel, sitelinks) and states the two service lines in a
// machine-readable form. Rendered on every page via the root layout.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://trisenosystems.com/#organization",
      name: "Triseno Systems",
      url: "https://trisenosystems.com",
      logo: "https://trisenosystems.com/images/triseno-logo-v2.png",
      description:
        "A creative studio in two divisions: premium product ad creative for paid social, and cinematic, conversion-built websites for DTC brands.",
      email: "Tristen@trisenosystems.com",
      sameAs: ["https://instagram.com/trisenosystems"],
    },
    {
      "@type": "WebSite",
      "@id": "https://trisenosystems.com/#website",
      url: "https://trisenosystems.com",
      name: "Triseno Systems",
      publisher: { "@id": "https://trisenosystems.com/#organization" },
    },
    {
      "@type": "ProfessionalService",
      name: "Triseno Studio",
      url: "https://trisenosystems.com/studio",
      parentOrganization: { "@id": "https://trisenosystems.com/#organization" },
      description:
        "Performance product ad creative for Instagram, TikTok, and YouTube — UGC ads, product demos, ASMR and direct-response reels, and cinematic brand films.",
    },
    {
      "@type": "ProfessionalService",
      name: "Triseno Web Design Division",
      url: "https://trisenosystems.com/web-design-division",
      parentOrganization: { "@id": "https://trisenosystems.com/#organization" },
      description:
        "Cinematic, conversion-built websites for DTC and ecommerce brands.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      {/* Root layout owns only <html>, fonts, <body>, and metadata. Global
          nav/footer chrome lives in the (site) route group so the full-screen
          portal (/) and the warm Studio page (/studio) can supply their own. */}
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}

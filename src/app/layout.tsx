import type { Metadata } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import WorldShell from "@/components/world/WorldShell";
import "./globals.css";
import "./world.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face (design-system §3): headlines, menu words, chrome labels, buttons.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Triseno Systems · ad creative, web design, AI infrastructure",
    template: "%s",
  },
  description:
    "Triseno Systems is three separate divisions: ad creative for paid social, custom conversion-built websites, and AI infrastructure for business operations.",
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
    "AI infrastructure consulting",
    "AI systems implementation",
  ],
  openGraph: {
    title: "Triseno Systems · ad creative, web design, AI infrastructure",
    description:
      "Triseno Systems is three separate divisions: ad creative for paid social, custom conversion-built websites, and AI infrastructure for business operations.",
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
    title: "Triseno Systems · ad creative, web design, AI infrastructure",
    description:
      "Triseno Systems is three separate divisions: ad creative for paid social, custom conversion-built websites, and AI infrastructure for business operations.",
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
        "Three separate divisions: product ad creative for paid social, custom conversion-built websites, and AI infrastructure consulting, architecture and implementation.",
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
    {
      "@type": "ProfessionalService",
      name: "Triseno AI Infrastructure",
      url: "https://trisenosystems.com/ai-infrastructure",
      parentOrganization: { "@id": "https://trisenosystems.com/#organization" },
      description:
        "AI infrastructure consulting, architecture and implementation — the intelligence layer a business runs on.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable}`}
    >
      {/* Root layout owns <html>, fonts, <body>, metadata and the WorldShell
          (warp transition everywhere; chrome/cursor/smooth scroll on revamped
          routes). /portfolio and /edit bring their own chrome. */}
      <body>
        {/* The first video a browser decodes in a session costs a freeze: on
            Windows, Chrome builds its hardware video pipeline the first time
            any page plays a clip, and the GPU process holds still for 1-2s
            while it does. Measured: it landed on the studio hero's showreel,
            right on arrival. A 2KB clip of black, started here at parse time,
            takes that once-per-browser cost before hydration has even created
            the WebGL context — while nothing is on screen but the loader mark.
            A browser that has already played a video pays nothing. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(navigator.connection&&navigator.connection.saveData)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var v=document.createElement("video");v.muted=true;v.playsInline=true;v.setAttribute("playsinline","");v.setAttribute("aria-hidden","true");v.preload="auto";v.style.cssText="position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1";v.src="/videos/warm.mp4";var done=false;var end=function(){if(done)return;done=true;try{v.pause();v.removeAttribute("src");v.load();v.remove()}catch(e){}};v.addEventListener("ended",end);v.addEventListener("error",end);document.body.appendChild(v);var p=v.play();if(p&&p.catch)p.catch(end);setTimeout(end,4000)}catch(e){}})();',
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <WorldShell>{children}</WorldShell>
      </body>
    </html>
  );
}

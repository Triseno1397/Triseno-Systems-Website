import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import WorldShell from "@/components/world/WorldShell";
import { ORGANIZATION_JSON_LD, PAGES, SITE, jsonLdHtml } from "@/lib/seo";
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
    default: PAGES.home.title,
    template: "%s",
  },
  description: PAGES.home.description,
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  keywords: PAGES.home.keywords,
  category: "business",
  openGraph: {
    title: PAGES.home.title,
    description: PAGES.home.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
    images: [{ url: PAGES.home.og, width: 1200, height: 630, alt: PAGES.home.ogAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGES.home.title,
    description: PAGES.home.description,
    images: [PAGES.home.og],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: SITE.ink,
  colorScheme: "dark",
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
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(ORGANIZATION_JSON_LD) }}
        />
        <WorldShell>{children}</WorldShell>
      </body>
    </html>
  );
}

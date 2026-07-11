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
      <body>{children}</body>
    </html>
  );
}

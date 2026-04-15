import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ParticleField from "@/components/animations/ParticleField";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Triseno Systems | AI Infrastructure for Operations & Scale",
  description:
    "Multi-agent orchestration, workflow compression, and decision-layer automation. Triseno Systems builds the operational AI layer for complex enterprises.",
  icons: {
    icon: "/images/triseno-logo-v2.png",
    apple: "/images/triseno-logo-v2.png",
  },
  openGraph: {
    title: "Triseno Systems | AI Infrastructure for Operations & Scale",
    description:
      "Multi-agent orchestration, workflow compression, and decision-layer automation. Triseno Systems builds the operational AI layer for complex enterprises.",
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
    title: "Triseno Systems | AI Infrastructure for Operations & Scale",
    description:
      "Multi-agent orchestration, workflow compression, and decision-layer automation.",
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
      <body>
        <ParticleField />
        <Navbar />
        <main className="relative z-[1]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

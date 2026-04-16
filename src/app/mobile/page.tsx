import type { Metadata } from "next";
import dynamic from "next/dynamic";
import MobileHero from "@/components/sections/mobile/MobileHero";

const MobileShowcase = dynamic(
  () => import("@/components/sections/mobile/MobileShowcase"),
  { ssr: true }
);
const MobileProcess = dynamic(
  () => import("@/components/sections/mobile/MobileProcess"),
  { ssr: true }
);
const MobileCTA = dynamic(
  () => import("@/components/sections/mobile/MobileCTA"),
  { ssr: true }
);

export const metadata: Metadata = {
  title: "Mobile Development — Triseno Systems",
  description:
    "Native and cross-platform mobile applications engineered for performance. iOS, Android, and React Native development by Triseno Systems.",
  openGraph: {
    title: "Mobile Development — Triseno Systems",
    description:
      "Native and cross-platform mobile applications engineered for performance. iOS, Android, and React Native development by Triseno Systems.",
    url: "https://trisenosystems.com/mobile",
    siteName: "Triseno Systems",
    type: "website",
  },
};

export default function MobilePage() {
  return (
    <div className="mob-division">
      <MobileHero />
      <MobileShowcase />
      <MobileProcess />
      <MobileCTA />
    </div>
  );
}

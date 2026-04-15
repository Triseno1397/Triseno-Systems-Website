import type { Metadata } from "next";
import dynamic from "next/dynamic";
import WebDesignHero from "@/components/sections/web-design/WebDesignHero";

const WebDesignShowcase = dynamic(
  () => import("@/components/sections/web-design/WebDesignShowcase"),
  { ssr: true }
);
const WebDesignProcess = dynamic(
  () => import("@/components/sections/web-design/WebDesignProcess"),
  { ssr: true }
);
const WebDesignCTA = dynamic(
  () => import("@/components/sections/web-design/WebDesignCTA"),
  { ssr: true }
);

export const metadata: Metadata = {
  title: "Web Design & Development — Triseno Systems",
  description:
    "Precision-engineered websites for brands that refuse to blend in. Custom websites, web applications, and e-commerce by Triseno Systems.",
  openGraph: {
    title: "Web Design & Development — Triseno Systems",
    description:
      "Precision-engineered websites for brands that refuse to blend in. Custom websites, web applications, and e-commerce by Triseno Systems.",
    url: "https://trisenosystems.com/web-design",
    siteName: "Triseno Systems",
    type: "website",
  },
};

export default function WebDesignPage() {
  return (
    <div className="wd-division">
      <WebDesignHero />
      <WebDesignShowcase />
      <WebDesignProcess />
      <WebDesignCTA />
    </div>
  );
}

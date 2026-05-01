import type { Metadata } from "next";
import WebDesignPageShell from "@/components/web-design/WebDesignPageShell";
import WebDesignErrorBoundary from "@/components/web-design/WebDesignErrorBoundary";

export const metadata: Metadata = {
  title: "Web Design Division — Triseno Systems",
  description:
    "The page is the demo. Custom sites, web apps, e-commerce, and landing pages — engineered by Triseno Systems.",
  openGraph: {
    title: "Web Design Division — Triseno Systems",
    description:
      "The page is the demo. Custom sites, web apps, e-commerce, and landing pages — engineered by Triseno Systems.",
    url: "https://trisenosystems.com/web-design",
    siteName: "Triseno Systems",
    type: "website",
  },
};

export default function WebDesignPage() {
  return (
    <WebDesignErrorBoundary>
      <WebDesignPageShell />
    </WebDesignErrorBoundary>
  );
}

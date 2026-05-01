import type { Metadata } from "next";
import WebDesignPageShell from "@/components/web-design/WebDesignPageShell";
import WebDesignErrorBoundary from "@/components/web-design/WebDesignErrorBoundary";

export const metadata: Metadata = {
  title: "Web Design Division — Triseno Systems",
  description:
    "The page is the demo. Custom sites, web apps, e-commerce, and landing pages — engineered by Triseno Systems.",
  // Unlisted: nothing in nav links here, and search engines should ignore it.
  // The page is reachable only via the contact-page easter egg.
  robots: { index: false, follow: false, nocache: true },
};

export default function WebDesignPage() {
  return (
    <WebDesignErrorBoundary>
      <WebDesignPageShell />
    </WebDesignErrorBoundary>
  );
}

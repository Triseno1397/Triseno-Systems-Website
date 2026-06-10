import type { Metadata } from "next";
import WebDesignPageShell from "@/components/web-design/WebDesignPageShell";
import WebDesignErrorBoundary from "@/components/web-design/WebDesignErrorBoundary";

export const metadata: Metadata = {
  title: "Web Design Division — Triseno Systems",
  description:
    "The page is the demo. Custom sites, web apps, e-commerce, and landing pages — engineered by Triseno Systems.",
  // Public: linked from the navbar, homepage division band, and footer, and
  // still reachable via the contact-page easter-egg portal as a bonus.
  // (Default robots = indexable; no override needed.)
};

export default function WebDesignPage() {
  return (
    <WebDesignErrorBoundary>
      <WebDesignPageShell />
    </WebDesignErrorBoundary>
  );
}

import type { Metadata } from "next";
import WebDesignPageShell from "@/components/web-design/WebDesignPageShell";

export const metadata: Metadata = {
  title: "Web Design Division — Triseno Systems",
  description:
    "This page is the demo. Every scroll moment is a premium technique you can ship on your own site.",
  openGraph: {
    title: "Web Design Division — Triseno Systems",
    description:
      "This page is the demo. Every scroll moment is a premium technique you can ship on your own site.",
    url: "https://trisenosystems.com/web-design",
    siteName: "Triseno Systems",
    type: "website",
  },
};

export default function WebDesignPage() {
  return <WebDesignPageShell />;
}

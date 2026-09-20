import type { Metadata } from "next";
import PortalPage from "@/components/portal/PortalPage";

export const metadata: Metadata = {
  title: "Triseno Systems · ad creative, web design, AI infrastructure",
  description:
    "Triseno Systems is three separate divisions: ad creative for paid social, custom conversion-built websites, and AI infrastructure for business operations.",
};

export default function Home() {
  return <PortalPage />;
}

import type { Metadata } from "next";
import DivisionPlaceholder from "@/components/world/DivisionPlaceholder";
import { DIVISIONS } from "@/lib/divisions";

export const metadata: Metadata = {
  title: "AI Infrastructure · Triseno Systems",
  description: "We build the intelligence layer your business runs on. Consulting, architecture and implementation.",
  alternates: { canonical: "/ai-infrastructure" },
  // Placeholder until the division page is built (revamp piece 4).
  robots: { index: false, follow: true },
};

export default function AiInfrastructurePage() {
  return (
    <DivisionPlaceholder
      division={DIVISIONS.ai}
      line="We build the intelligence layer your business runs on: consulting, architecture and implementation. This page is being built — the conversation is already open."
    />
  );
}

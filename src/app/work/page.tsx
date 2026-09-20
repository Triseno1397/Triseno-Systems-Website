import type { Metadata } from "next";
import DivisionPlaceholder from "@/components/world/DivisionPlaceholder";
import GhostButton from "@/components/ui/GhostButton";
import { DIVISIONS } from "@/lib/divisions";

export const metadata: Metadata = {
  title: "Work · Triseno Systems",
  description: "Selected work across Triseno's three divisions.",
  alternates: { canonical: "/work" },
  // Placeholder until the work index is built (revamp piece 5).
  robots: { index: false, follow: true },
};

export default function WorkPage() {
  return (
    <DivisionPlaceholder
      division={DIVISIONS.work}
      line="One index for all three divisions, each project tinted by the division it belongs to. This page is being built — the current Studio reels are live now."
    >
      <GhostButton href="/portfolio">View the Studio reels</GhostButton>
    </DivisionPlaceholder>
  );
}

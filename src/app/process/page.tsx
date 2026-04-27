import type { Metadata } from "next";
import ProcessContent from "@/components/sections/ProcessContent";

export const metadata: Metadata = {
  title:
    "Process — How we engineer AI infrastructure that compounds. | Triseno Systems",
  description:
    "Diagnose, architect, build, deploy, compound. The Triseno Systems methodology for engineering AI infrastructure that gets more valuable over time.",
};

export default function ProcessPage() {
  return <ProcessContent />;
}

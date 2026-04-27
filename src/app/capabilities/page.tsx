import type { Metadata } from "next";
import CapabilitiesContent from "@/components/sections/CapabilitiesContent";

export const metadata: Metadata = {
  title:
    "Capabilities — Multi-agent orchestration, workflow compression, and decision automation. | Triseno Systems",
  description:
    "Multi-agent orchestration, workflow compression engines, decision-layer automation, product & catalog intelligence, broadcast AI, and revenue ops intelligence — engineered to compound.",
};

export default function CapabilitiesPage() {
  return <CapabilitiesContent />;
}

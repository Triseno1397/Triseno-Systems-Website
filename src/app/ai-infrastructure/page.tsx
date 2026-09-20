import type { Metadata } from "next";
import AiPage from "@/components/ai/AiPage";
import "../ai.css";

export const metadata: Metadata = {
  title: "AI Infrastructure · Triseno Systems",
  description:
    "Multi-agent orchestration, workflow compression and decision-layer automation. Triseno Systems designs and deploys the operational intelligence layer: consulting, architecture and implementation.",
  alternates: { canonical: "/ai-infrastructure" },
  openGraph: {
    title: "AI Infrastructure · Triseno Systems",
    description:
      "We build the operational intelligence layer: multi-agent orchestration, workflow compression engines and decision-layer automation.",
    url: "https://trisenosystems.com/ai-infrastructure",
  },
};

export default function AiInfrastructurePage() {
  return <AiPage />;
}

import type { Metadata } from "next";
import StudioContent from "@/components/studio/StudioContent";

export const metadata: Metadata = {
  title: "Triseno Studio — Video ads people actually stop for.",
  description:
    "Triseno Studio scripts, shoots, and edits performance-built video for paid social — from UGC to cinematic brand films. Agency-grade work without the agency timeline.",
};

export default function StudioPage() {
  return <StudioContent />;
}

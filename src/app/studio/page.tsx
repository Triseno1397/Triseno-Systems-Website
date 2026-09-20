import type { Metadata } from "next";
import StudioWorld from "@/components/studio/StudioWorld";
import ReelsProvider from "@/content/ReelsProvider";
import "../studio.css";

export const metadata: Metadata = {
  title: "Triseno Studio · video that sells",
  description:
    "Performance product ad creative for Instagram, TikTok, and YouTube. Scroll-stopping video, from UGC to cinematic brand films, delivered in days, not weeks.",
  alternates: {
    canonical: "/studio",
  },
};

// ReelsProvider stays the page root: it is the CMS contract. /edit loads this
// route with ?__draft=1 and pushes unsaved reel libraries into it over postMessage.
export default function StudioPage() {
  return (
    <ReelsProvider>
      <StudioWorld />
    </ReelsProvider>
  );
}

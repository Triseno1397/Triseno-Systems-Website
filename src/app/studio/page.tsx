import type { Metadata } from "next";
import StudioContent from "@/components/studio/StudioContent";
import ReelsProvider from "@/content/ReelsProvider";

export const metadata: Metadata = {
  title: "Triseno Studio · video that sells",
  description:
    "Performance product ad creative for Instagram, TikTok, and YouTube. Scroll-stopping video, from UGC to cinematic brand films, delivered in days, not weeks.",
  alternates: {
    canonical: "/studio",
  },
};

export default function StudioPage() {
  return (
    <ReelsProvider>
      <StudioContent />
    </ReelsProvider>
  );
}

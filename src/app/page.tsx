import type { Metadata } from "next";
import Portal from "@/components/portal/Portal";

export const metadata: Metadata = {
  title: "Triseno Systems — One studio, two divisions.",
  description:
    "Triseno Studio makes video ad content for paid social; the Web Design Division builds cinematic, conversion-built websites. One studio, two divisions.",
};

export default function Home() {
  return <Portal />;
}

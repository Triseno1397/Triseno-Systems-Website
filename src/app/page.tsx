import type { Metadata } from "next";
import Portal from "@/components/portal/Portal";

export const metadata: Metadata = {
  title: "Triseno Systems · One studio, two divisions",
  description:
    "Triseno Studio makes cinematic, scroll-stopping product ad creative for DTC brands running paid social. The Web Design Division builds conversion-built websites. One studio, two divisions.",
};

export default function Home() {
  return <Portal />;
}

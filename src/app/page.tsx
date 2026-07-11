import type { Metadata } from "next";
import Portal from "@/components/portal/Portal";

export const metadata: Metadata = {
  title: "Triseno Systems · premium ad creative and conversion-built websites",
  description:
    "Premium product ad creative for paid social plus cinematic, conversion-built websites for DTC brands. Days, not weeks. One studio, two divisions.",
};

export default function Home() {
  return <Portal />;
}

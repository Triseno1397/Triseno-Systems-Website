import type { Metadata } from "next";
import WorkPage from "@/components/work/WorkPage";
import "../work.css";

export const metadata: Metadata = {
  title: "Work · What Triseno can build",
  description:
    "An index of what Triseno Systems builds across its three divisions: ad creative formats, concept websites for fictional brands, and AI system concepts.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work · What Triseno can build",
    description: "Formats, concept sites and system concepts across Creative, Web Design and AI Infrastructure.",
    url: "https://trisenosystems.com/work",
  },
};

export default function WorkRoute() {
  return <WorkPage />;
}

import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import WorkPage from "@/components/work/WorkPage";
import "../work.css";

export const metadata: Metadata = pageMetadata("work");

export default function WorkRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("work")) }} />
      <WorkPage />
    </>
  );
}

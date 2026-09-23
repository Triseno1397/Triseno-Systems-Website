import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import AiPage from "@/components/ai/AiPage";
import "../ai.css";

export const metadata: Metadata = pageMetadata("ai");

export default function AiInfrastructurePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("ai")) }} />
      <AiPage />
    </>
  );
}

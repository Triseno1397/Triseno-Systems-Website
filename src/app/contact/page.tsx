import type { Metadata } from "next";
import { jsonLdHtml, pageJsonLd, pageMetadata } from "@/lib/seo";
import ContactPage from "@/components/contact/ContactPage";
import "../contact.css";

export const metadata: Metadata = pageMetadata("contact");

export default function ContactRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd("contact")) }} />
      <ContactPage />
    </>
  );
}

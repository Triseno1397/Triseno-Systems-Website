import type { Metadata } from "next";
import ContactContent from "@/components/sections/ContactContent";

export const metadata: Metadata = {
  title:
    "Contact — Start with a diagnostic or scope a custom build. | Triseno Systems",
  description:
    "Request an AI Operations Audit or start a conversation about a custom build. We respond within 24 hours, often sooner.",
};

export default function ContactPage() {
  return <ContactContent />;
}

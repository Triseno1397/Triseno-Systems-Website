import type { Metadata } from "next";
import ContactContent from "@/components/sections/ContactContent";

export const metadata: Metadata = {
  title: "Contact · Start a project | Triseno Systems",
  description:
    "Get in touch with Triseno. Email us, find us on Instagram, or send an inquiry: video content from the Content Studio, or a conversion-built site from the Web Design Division. We reply within one business day.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return <ContactContent />;
}

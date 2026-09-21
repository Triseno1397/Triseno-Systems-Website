import type { Metadata } from "next";
import ContactPage from "@/components/contact/ContactPage";
import "../contact.css";

export const metadata: Metadata = {
  title: "Contact · Start a Conversation | Triseno Systems",
  description:
    "Start a conversation with Triseno Systems: ad creative, conversion-built websites or AI infrastructure. One question at a time, or email and Instagram directly. We reply within one business day.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactRoute() {
  return <ContactPage />;
}

"use client";

import { useEffect } from "react";
import { EMAIL } from "@/components/contact/form";
import { SITE } from "@/lib/seo";

export interface Reservation {
  session: string;
  payment: string;
  amount: string;
  month: string;
  email: string;
  name: string;
  businessName: string;
  businessType: string;
  liveBy: string;
  offers: string;
  actions: string;
  currentSite: string;
  phone: string;
  instagram: string;
  test: boolean;
}

// FormSubmit takes posts from the visitor's browser only (Cloudflare blocks
// server-to-server posts from Vercel), the same inbox /contact uses.
const ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;

/**
 * Runs once per paid reservation, on the confirmation page: emails Tristen the
 * answers and sends the client FormSubmit's auto-reply as their confirmation.
 * localStorage keeps a reload from sending it twice. Stripe's own payment
 * email and the session metadata are the backup if this never runs.
 */
export default function LaunchNotify({ reservation: r }: { reservation: Reservation }) {
  useEffect(() => {
    const key = `triseno:launch-notified:${r.session}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* storage blocked: send anyway */
    }
    const first = r.name.trim().split(/\s+/)[0] || "there";
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `${r.test ? "[TEST] " : ""}Launch spot reserved: ${r.businessName} (${r.month}, ${r.amount})`,
        _replyto: r.email,
        _template: "table",
        _captcha: "false",
        _autoresponse: [
          `Hi ${first},`,
          "",
          `Your ${r.month} launch spot with Triseno Systems is reserved. Your ${r.amount} deposit is in and goes toward your site.`,
          "",
          `Next: we start on your custom preview for ${r.businessName}, and we'll reach out within one business day. If the preview isn't right for you, your deposit is refunded in full.`,
          "",
          `Questions? Reply to this email or call/text ${SITE.phone}.`,
          "",
          "Triseno Systems",
          "trisenosystems.com",
        ].join("\n"),
        email: r.email,
        "Launch month": r.month,
        Deposit: r.amount,
        Business: r.businessName,
        "Business type": r.businessType,
        Name: r.name,
        Phone: r.phone || "(none)",
        Instagram: r.instagram || "(none)",
        "Wants it live": r.liveBy,
        "What they offer": r.offers,
        "Site should let people": r.actions,
        "Current website": r.currentSite,
        "Stripe payment": r.payment || r.session,
      }),
    }).catch(() => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
  }, [r]);

  return null;
}

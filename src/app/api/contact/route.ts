import { NextResponse } from "next/server";
import { EMAIL, labelFor, validate } from "@/components/contact/form";

// The inquiry form posts here, and each inquiry is emailed to CONTACT_EMAIL
// (tristen@trisenosystems.com by default) through FormSubmit: no account or
// key needed, the inbox owner confirms once by clicking a link in the first
// email FormSubmit sends. An inquiry is never accepted and then dropped: if
// delivery fails the form says so and shows the email address.

const SITE = "https://trisenosystems.com";
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 });

  const values = {
    division: clip(body.division, 20) as "creative" | "web" | "ai" | "",
    name: clip(body.name, 120),
    email: clip(body.email, 200),
    message: clip(body.message, 5000),
  };
  const label = labelFor(values.division);
  if (!label || Object.keys(validate(values)).length) return NextResponse.json({ ok: false }, { status: 422 });
  // honeypot: tell bots it worked so they do not retry
  if (body.botcheck) return NextResponse.json({ ok: true });

  const to = process.env.CONTACT_EMAIL || EMAIL;
  const res = await fetch(`https://formsubmit.co/ajax/${to}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Origin: SITE, Referer: `${SITE}/contact` },
    body: JSON.stringify({
      _subject: `New ${label} inquiry — ${values.name}`,
      _replyto: values.email,
      _template: "table",
      _captcha: "false",
      Division: label,
      Name: values.name,
      Email: values.email,
      Message: values.message || "(none)",
    }),
  }).catch(() => null);

  const result = res ? await res.json().catch(() => null) : null;
  if (!res?.ok || String(result?.success) === "false") {
    console.error("[contact] delivery failed", res?.status, result?.message);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

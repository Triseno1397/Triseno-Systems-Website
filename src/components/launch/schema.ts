import { z } from "zod";

/**
 * /launch — the "reserve your launch spot" deposit. Shared by the form (client)
 * and the checkout route (server) so both validate the same answers.
 *
 * The page names the deposit only; the site price is talked through in
 * conversation (Tristen's call, 2026-11-09).
 */
export const DEPOSIT_CENTS = 10_000;
export const DEPOSIT_LABEL = "$100";

export const TIMING = [
  { key: "asap", label: "As soon as possible" },
  { key: "2w", label: "Within 2 weeks" },
  { key: "month", label: "Within a month" },
  { key: "date", label: "I have a date" },
] as const;
export type TimingKey = (typeof TIMING)[number]["key"];

export const BUSINESS = [
  "Photo booth",
  "Balloons & decor",
  "Party rentals",
  "Florist",
  "Event planner",
  "DJ / entertainment",
  "Food & drinks",
  "Something else",
] as const;

export const ACTIONS = [
  "Request a quote or book",
  "See my packages",
  "Browse my gallery",
  "Pay a deposit online",
  "Call, text or DM me fast",
] as const;

export const CURRENT_SITE = [
  { key: "none", label: "No website yet" },
  { key: "linkpage", label: "Just a link page" },
  { key: "redo", label: "Yes, it needs a redo" },
] as const;
export type CurrentSiteKey = (typeof CURRENT_SITE)[number]["key"];

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const launchSchema = z
  .object({
    timing: z.enum(["asap", "2w", "month", "date"], { message: "Pick when you want it live." }),
    date: z.string().trim().max(10).optional().default(""),
    business: z.enum(BUSINESS, { message: "Pick what kind of business it is." }),
    sells: z
      .string()
      .trim()
      .min(3, "A sentence about what you offer is plenty.")
      .max(400, "Keep it under 400 characters — we'll go deeper on the call."),
    actions: z.array(z.enum(ACTIONS)).min(1, "Pick at least one thing people should do.").max(ACTIONS.length),
    current: z.enum(["none", "linkpage", "redo"], { message: "Tell us what you have today." }),
    siteUrl: z.string().trim().max(200).optional().default(""),
    businessName: z.string().trim().min(1, "Your business name, please.").max(80),
    name: z.string().trim().min(1, "Your name, please.").max(80),
    email: z.string().trim().email("That email doesn't look right."),
    phone: z.string().trim().max(30).optional().default(""),
    instagram: z.string().trim().max(60).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.timing !== "date") return;
    if (!isoDate.test(v.date)) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Pick your launch date." });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (v.date < today) ctx.addIssue({ code: "custom", path: ["date"], message: "Pick a date that hasn't passed." });
  });

export type LaunchAnswers = z.infer<typeof launchSchema>;
export type LaunchField = keyof LaunchAnswers;

/** Field order a failed submit walks to find the first problem. */
export const LAUNCH_FIELD_ORDER: LaunchField[] = [
  "timing",
  "date",
  "business",
  "sells",
  "actions",
  "current",
  "businessName",
  "name",
  "email",
];

export function timingText(timing: string, date?: string): string {
  if (timing === "date" && date) {
    const d = new Date(`${date}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }
  return TIMING.find((t) => t.key === timing)?.label ?? timing;
}

export function currentSiteText(current: string, url?: string): string {
  const label = CURRENT_SITE.find((c) => c.key === current)?.label ?? current;
  return url ? `${label} (${url})` : label;
}

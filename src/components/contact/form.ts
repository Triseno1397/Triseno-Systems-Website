// The inquiry form — the short version: which division, a name, an email, and
// (optionally) a line about the project. Everything else we need we ask in the
// reply. The form posts to /api/contact, which emails tristen@trisenosystems.com.

export type ContactDivision = "creative" | "web" | "ai";

export const EMAIL = "tristen@trisenosystems.com";
export const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
export const INSTAGRAM_HANDLE = "@trisenosystems";

export const DIVISION_OPTIONS: {
  key: ContactDivision;
  /** shown on the card */
  name: string;
  line: string;
  /** the label the inbox filters on (goes in the subject line) */
  payloadLabel: string;
  messagePlaceholder: string;
}[] = [
  {
    key: "web",
    name: "Web Design",
    line: "Custom, conversion-built websites.",
    payloadLabel: "Web Design Division",
    messagePlaceholder: "New site or redesign? Your current site, if you have one...",
  },
  {
    key: "creative",
    name: "Creative",
    line: "Ad creative for paid social.",
    payloadLabel: "Content Studio",
    messagePlaceholder: "What you're selling and where the ads need to run...",
  },
  {
    key: "ai",
    name: "AI Infrastructure",
    line: "Consulting, architecture, implementation.",
    payloadLabel: "AI Infrastructure",
    messagePlaceholder: "The workflow you want automated and the tools it touches...",
  },
];

export const labelFor = (key: string) => DIVISION_OPTIONS.find((d) => d.key === key)?.payloadLabel ?? null;

export interface FormValues {
  division: ContactDivision | "";
  name: string;
  email: string;
  message: string;
}

export const EMPTY: FormValues = { division: "", name: "", email: "", message: "" };

/** the fields a message can fail on, in the order they appear */
export type FieldId = "division" | "name" | "email";

export const FIELD_ORDER: FieldId[] = ["division", "name", "email"];

export type Errors = Partial<Record<FieldId, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Everything wrong with the form right now. Shared by the page and /api/contact. */
export function validate(v: FormValues): Errors {
  const e: Errors = {};
  if (!v.division) e.division = "Pick the division this is for.";
  if (v.name.trim().length < 2) e.name = "Tell us your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email we can reply to, like you@company.com.";
  return e;
}

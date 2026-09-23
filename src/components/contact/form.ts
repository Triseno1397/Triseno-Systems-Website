// The inquiry form — one page, everything visible, tick what applies.
//
// Field names and the web3forms payload are the SAME as every earlier version
// (formerly the one-question-at-a-time flow, and the static form before that)
// so the studio inbox and any mail filters keep working: name, email, phone,
// preferred_contact, company, project_type, current_site (web only), timeline,
// message, botcheck, plus access_key / subject / from_name / division.
// `project_type` is now a comma-joined list, because more than one thing can be
// true; `best_time` is new and only sent when someone asks to be called.

export type ContactDivision = "creative" | "web" | "ai";

export const EMAIL = "tristen@trisenosystems.com";
export const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
export const INSTAGRAM_HANDLE = "@trisenosystems";

export const DIVISION_OPTIONS: {
  key: ContactDivision;
  /** shown on the card */
  name: string;
  line: string;
  /** the label the inbox already filters on (unchanged for Creative and Web) */
  payloadLabel: string;
  /** tick all that apply */
  projectTypes: string[];
  needLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
}[] = [
  {
    key: "creative",
    name: "Creative",
    line: "Ad creative for paid social.",
    payloadLabel: "Content Studio",
    projectTypes: [
      "HyperMotion Ads",
      "Product Hero",
      "Direct Response Ads",
      "Product Demo",
      "Brand Film",
      "UGC Ads",
      "Something else",
    ],
    needLabel: "What do you need made?",
    messageLabel: "Anything else we should know?",
    messagePlaceholder: "What you're selling, where it needs to run, anything you've already tried...",
  },
  {
    key: "web",
    name: "Web Design",
    line: "Custom, conversion-built websites.",
    payloadLabel: "Web Design Division",
    projectTypes: ["New website", "Redesign", "Landing page", "E-commerce store", "Web app", "Something else"],
    needLabel: "What do you need built?",
    messageLabel: "Anything else we should know?",
    messagePlaceholder: "Goals, the pages you need, sites you like...",
  },
  {
    key: "ai",
    name: "AI Infrastructure",
    line: "Consulting, architecture, implementation.",
    payloadLabel: "AI Infrastructure",
    projectTypes: [
      "Diagnostic",
      "Multi-agent orchestration",
      "Workflow compression",
      "Catalog intelligence",
      "Revenue operations",
      "Broadcast & production",
      "Retainer",
      "Something else",
    ],
    needLabel: "What do you need built?",
    messageLabel: "Anything else we should know?",
    messagePlaceholder: "The workflow you want compressed, the tools it touches, what done looks like...",
  },
];

export const TIMELINES = ["ASAP / rush", "2–4 weeks", "1–2 months", "Flexible"];
export const CALL_WINDOWS = ["Morning", "Afternoon", "Evening", "Anytime"];

export interface FormValues {
  division: ContactDivision | "";
  /** tick all that apply */
  project_types: string[];
  timeline: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  current_site: string;
  /** the "call me instead" option */
  wants_call: boolean;
  best_time: string;
  message: string;
}

export const EMPTY: FormValues = {
  division: "",
  project_types: [],
  timeline: "",
  name: "",
  email: "",
  company: "",
  phone: "",
  current_site: "",
  wants_call: false,
  best_time: "Anytime",
  message: "",
};

/** the fields a message can fail on, in the order they appear */
export type FieldId = "division" | "name" | "email" | "phone" | "current_site";

export const FIELD_ORDER: FieldId[] = ["division", "name", "email", "phone", "current_site"];

export type Errors = Partial<Record<FieldId, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SITE_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

/**
 * Everything wrong with the form right now, checked all at once.
 *
 * Deliberately short: the division (it routes the inquiry), a name, an email
 * we can reply to, and a number when someone has asked to be called. The rest
 * is there to help us prepare, not to gate the send.
 */
export function validate(v: FormValues): Errors {
  const e: Errors = {};
  if (!v.division) e.division = "Pick the division this is for.";
  if (v.name.trim().length < 2) e.name = "Tell us your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email we can reply to, like you@company.com.";
  const digits = v.phone.replace(/\D/g, "");
  if (v.wants_call && digits.length < 7) e.phone = "Add a number we can call.";
  else if (v.phone.trim() && digits.length < 7) e.phone = "That number looks too short.";
  if (v.current_site.trim() && !SITE_RE.test(v.current_site.trim()))
    e.current_site = "Enter a web address like yoursite.com, or leave it empty.";
  return e;
}

/** a bare domain gets a scheme, so the inbox shows a working link */
export function normaliseSite(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

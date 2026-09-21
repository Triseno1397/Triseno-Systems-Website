// The conversational contact form — one question per step.
// Field names and the web3forms payload are the SAME as the old form
// (formerly src/components/sections/ContactContent.tsx) so the studio inbox and
// any mail filters keep working: name, email, phone, preferred_contact, company,
// project_type, current_site (web only), timeline, message, botcheck, plus
// access_key / subject / from_name / division.

export type ContactDivision = "creative" | "web" | "ai";

export const EMAIL = "tristen@trisenosystems.com";
export const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
export const INSTAGRAM_HANDLE = "@trisenosystems";

export const DIVISION_OPTIONS: {
  key: ContactDivision;
  /** shown on the option */
  name: string;
  line: string;
  /** the label the inbox already filters on (unchanged for Creative and Web) */
  payloadLabel: string;
  projectTypes: string[];
  messageLabel: string;
  messagePlaceholder: string;
}[] = [
  {
    key: "creative",
    name: "Creative",
    line: "Ad creative for paid social, from UGC to brand films.",
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
    messageLabel: "What are you looking to make?",
    messagePlaceholder: "What you're selling, where it needs to run, and any timeline in mind...",
  },
  {
    key: "web",
    name: "Web Design",
    line: "Custom, conversion-built websites. New builds and redesigns.",
    payloadLabel: "Web Design Division",
    projectTypes: ["New website", "Redesign", "Landing page", "E-commerce store", "Web app", "Something else"],
    messageLabel: "Tell us about your website project",
    messagePlaceholder: "Goals, the pages you need, sites you like, and any timeline...",
  },
  {
    key: "ai",
    name: "AI Infrastructure",
    line: "Consulting, architecture and implementation of AI systems.",
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
    messageLabel: "What should the system do?",
    messagePlaceholder: "The workflow you want compressed, the tools it touches, and what done looks like...",
  },
];

export const TIMELINES = ["ASAP / rush", "2–4 weeks", "1–2 months", "Flexible / not sure"];
export const CONTACT_METHODS = ["Email", "Phone", "Text", "Other"];

export type StepId =
  | "division"
  | "name"
  | "email"
  | "phone"
  | "company"
  | "project_type"
  | "current_site"
  | "timeline"
  | "message";

export interface FormValues {
  division: ContactDivision | "";
  name: string;
  email: string;
  phone: string;
  preferred_contact: string;
  company: string;
  project_type: string;
  current_site: string;
  timeline: string;
  message: string;
}

export const EMPTY: FormValues = {
  division: "",
  name: "",
  email: "",
  phone: "",
  preferred_contact: "Email",
  company: "",
  project_type: "",
  current_site: "",
  timeline: "",
  message: "",
};

export const STEP_TITLE: Record<StepId, string> = {
  division: "Division",
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  project_type: "Project",
  current_site: "Current site",
  timeline: "Timeline",
  message: "Message",
};

/** The steps for a division — the current-site question exists only for Web. */
export function stepsFor(division: FormValues["division"]): StepId[] {
  const base: StepId[] = ["division", "name", "email", "phone", "company", "project_type"];
  if (division === "web") base.push("current_site");
  base.push("timeline", "message");
  return base;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SITE_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

/** null = valid; otherwise the message to announce */
export function validate(step: StepId, v: FormValues): string | null {
  switch (step) {
    case "division":
      return v.division ? null : "Choose the division this is for.";
    case "name":
      return v.name.trim().length >= 2 ? null : "Tell us your name.";
    case "email":
      return EMAIL_RE.test(v.email.trim()) ? null : "Enter an email address we can reply to, like you@company.com.";
    case "phone": {
      const digits = v.phone.replace(/\D/g, "");
      if (!v.phone.trim()) {
        return v.preferred_contact === "Phone" || v.preferred_contact === "Text"
          ? `Add a number, or choose another way to reach you.`
          : null;
      }
      return digits.length >= 7 ? null : "That number looks too short.";
    }
    case "company":
      return null;
    case "project_type":
      return v.project_type ? null : "Pick the closest project type.";
    case "current_site":
      return !v.current_site.trim() || SITE_RE.test(v.current_site.trim())
        ? null
        : "Enter a web address like yoursite.com, or leave it empty.";
    case "timeline":
      return v.timeline ? null : "Pick a timeline.";
    case "message":
      return v.message.trim().length >= 10 ? null : "A sentence or two about the project, please.";
  }
}

/** a bare domain gets a scheme, so the inbox shows a working link (the old field was type=url) */
export function normaliseSite(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

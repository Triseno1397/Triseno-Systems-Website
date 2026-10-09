// Copy for /ai-infrastructure. Positioning (owner, 2026-10-09): custom AI
// tools and software for businesses of any size, in plain English, no
// enterprise jargon, no specific client projects; the only ask is "Book a
// call". The owner's live-broadcast engineering background is the trust angle.
//
// D3 (divisions stay separate): website design and development is the Web
// Design Division's offer and is NOT listed here. The only route to it from
// this page is the cross-division link in the gate.

export const HERO = {
  label: "Custom AI tools / Software / Automation",
  headline: ["Tell Us the", "Problem.", "We Build", "the Tool."],
  sub: "Custom AI tools and software for businesses that have outgrown spreadsheets and copy-paste. Built fast, handed over, kept running.",
  /** the phone hero carries the same offer as a mono line */
  offers: ["Product finders", "Inbox automation", "Custom software"],
};

export type DiagramKind = "orchestration" | "catalog" | "compression" | "revenue" | "broadcast" | "retainer";

export interface Capability {
  id: DiagramKind;
  tag: string;
  title: string;
  body: string;
}

export const CAPABILITIES_INTRO = {
  title: "If It Eats Your Day, We Can Build It",
  body: "Six of the tools we build most. If yours is not here, ask anyway.",
};

/** One per frame. Bodies are capped at ~22 words on purpose. */
export const CAPABILITIES: Capability[] = [
  {
    id: "catalog",
    tag: "Answers in seconds",
    title: "Product Finders",
    body: "Which part fits, which size works, which model to buy: answered instantly from your own catalog, for your customers and your staff.",
  },
  {
    id: "revenue",
    tag: "Nothing slips",
    title: "Inbox & Lead Handlers",
    body: "Emails and form leads read, sorted and answered or routed to the right person, the minute they arrive.",
  },
  {
    id: "orchestration",
    tag: "Knows your business",
    title: "Assistants Trained on You",
    body: "An assistant that has read your docs, policies and prices, so it answers like your best employee, not like a search engine.",
  },
  {
    id: "compression",
    tag: "Lands on your phone",
    title: "Reports That Build Themselves",
    body: "Numbers pulled from your tools on a schedule and delivered as a clean summary, before you ask for it.",
  },
  {
    id: "broadcast",
    tag: "Made to fit",
    title: "Custom Internal Tools",
    body: "The dashboard, tracker or app your team keeps wishing existed, built around how you actually work.",
  },
  {
    id: "retainer",
    tag: "One system, not ten tabs",
    title: "Connect What You Already Use",
    body: "The software you already pay for, finally talking to each other, so nobody re-types the same thing twice.",
  },
];

export const COMPRESSION = {
  title: "Twelve Steps. One Run.",
  body: "Every morning someone copies forty orders from email into a spreadsheet. Here is that chore, done for them.",
  note: "An example chore, drawn to show the idea.",
  steps: [
    "Open the email",
    "Copy the order",
    "Paste to sheet",
    "Check the price",
    "Re-type to system",
    "Look up supplier",
    "Check stock",
    "Ask the manager",
    "Fix the totals",
    "Make the report",
    "Email the team",
    "File it away",
  ],
  /** which of the five system nodes each manual step collapses into (0 = orchestrator) */
  collapseTo: [0, 1, 2, 0, 1, 3, 2, 0, 3, 4, 0, 4],
  agents: ["Run", "Read", "Check", "Update", "Report"],
};

export interface ProcessStep {
  name: string;
  summary: string;
  happens: string[];
  deliverable: string;
}

export const PROCESS_INTRO = {
  title: "How It Works",
  body: "Four steps, every project. Drag the handle along the rail, or pick a step.",
};

export const PROCESS: ProcessStep[] = [
  {
    name: "Talk",
    summary: "Tell us the problem in plain words. We ask the right questions and find what is worth building.",
    happens: ["A short call about what eats your team's time", "We look at the tools you already use"],
    deliverable: "A clear picture of the tool that would help most.",
  },
  {
    name: "Sketch",
    summary: "We show you exactly what the tool will do, how it fits your day, and what it costs. Fixed price, no surprises.",
    happens: ["A simple plan you can read in five minutes", "One fixed quote before any work starts"],
    deliverable: "A plan and a price you approve.",
  },
  {
    name: "Build",
    summary: "We build it in weeks, not quarters, and you see it working along the way, not just at the end.",
    happens: ["Working previews as it comes together", "Tested on your real data before launch"],
    deliverable: "A working tool, set up in your business.",
  },
  {
    name: "Run",
    summary: "It is yours. We hand it over, show your team how to use it, and keep it running as you grow.",
    happens: ["You own it: no per-seat fees", "A real person to call when you need a change"],
    deliverable: "A tool you own, with someone looking after it.",
  },
];

export interface Industry {
  title: string;
  full: string;
  body: string;
  log: Array<[agent: string, message: string]>;
}

export const INDUSTRIES_INTRO = {
  title: "Built for Businesses Like Yours",
};

export const INDUSTRIES: Industry[] = [
  {
    title: "Media & Production",
    full: "Media & Production",
    body: "Studios, agencies and production teams: clips tagged, footage logged, deliverables checked and packaged without the late-night busywork.",
    log: [
      ["intake", "new footage arrived, logged by scene"],
      ["tagging", "clips tagged: who, what, where"],
      ["check", "audio and captions checked"],
      ["package", "deliverables named and packaged"],
      ["notify", "editor notified, ready to cut"],
    ],
  },
  {
    title: "Retail & Online Stores",
    full: "Retail & Online Stores",
    body: "Big catalogs and busy inboxes: a product finder customers trust, orders that update themselves, and fewer 'does this fit?' emails.",
    log: [
      ["question", "customer asks which part fits"],
      ["catalog", "matched against 4,200 products"],
      ["answer", "right part suggested with a reason"],
      ["order", "order added, stock updated"],
      ["follow-up", "thank-you email sent"],
    ],
  },
  {
    title: "Trades & Industrial",
    full: "Trades, Industrial & Supply",
    body: "Suppliers, contractors and manufacturers: quotes, purchase orders and job paperwork that move themselves from inbox to system.",
    log: [
      ["inbox", "purchase order read from email"],
      ["check", "prices checked against the price list"],
      ["fallback", "unusual order flagged for a person"],
      ["system", "order entered, nobody re-typed it"],
      ["report", "daily summary sent to the owner"],
    ],
  },
  {
    title: "Services & Offices",
    full: "Service Businesses & Offices",
    body: "Clinics, firms and service teams: bookings, intake forms, reminders and the questions your front desk answers fifty times a day.",
    log: [
      ["form", "new client intake received"],
      ["sort", "request sorted to the right person"],
      ["book", "appointment booked, calendar updated"],
      ["remind", "reminder text scheduled"],
      ["answer", "common question answered instantly"],
    ],
  },
];

/**
 * Why Triseno as a two-state comparison. The "vendor" column describes the
 * generic alternative a buyer is weighing, not any named company.
 */
export const WHY = {
  title: "Why Triseno",
  label: "Compare",
  lead: "Flip between what the usual software subscription gives you and what we build.",
  states: ["The usual way", "Triseno"] as const,
  /** phone labels: the long one does not fit half a 300px switch */
  statesShort: ["Usual", "Triseno"] as const,
  rows: [
    {
      topic: "Fit",
      vendor: "Software built for everyone",
      vendorNote: "You bend your business around someone else's idea of it.",
      triseno: "A tool built around how you work",
      trisenoNote: "Your steps, your words, your systems. Nothing you don't need.",
    },
    {
      topic: "Cost",
      vendor: "Per-seat fees forever",
      vendorNote: "The bill grows every time your team does.",
      triseno: "One fixed price, and you own it",
      trisenoNote: "No per-seat fees. Pay once for the build, keep it.",
    },
    {
      topic: "Support",
      vendor: "A ticket and a wait",
      vendorNote: "Somebody, somewhere, will get back to you.",
      triseno: "A real person who built it",
      trisenoNote: "Changes and fixes from the engineer who knows your tool.",
    },
    {
      topic: "Reliability",
      vendor: "It works, most of the time",
      vendorNote: "Downtime is just part of the deal.",
      triseno: "Built to live-TV standards",
      trisenoNote: "Engineered by someone who keeps live broadcasts on air. Nothing is allowed to break.",
    },
  ],
};

export const GATE = {
  title: "Tell Us What's Eating Your Day.",
  body: "Book a call. Fifteen minutes, plain talk, and you leave knowing whether a tool would help and what it would take.",
  primary: "Book a call",
  secondary: "Start a Conversation",
};

/** the trust section: who builds it (the owner's background, stated broadly) */
export const BUILT_BY = {
  label: "Built by",
  title: "Engineered Like Live TV",
  body: "Before Triseno: years of video engineering and systems reliability for some of the biggest live television in the world, where there is no second take and nothing is allowed to fail.",
  names: ["The Grammys", "The Oscars", "American Idol"],
  corporate: ["Google", "Meta"],
  more: "And many more live shows, broadcasts and corporate events. These are just a few.",
  close: "Every tool we build is held to the same standard.",
};

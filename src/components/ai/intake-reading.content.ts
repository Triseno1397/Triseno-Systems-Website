// Copy for 03 / Intake (IntakeReading.tsx). Kept beside the component rather
// than in content.ts so the section can be built without touching the shared
// file; the lead may fold it in. Voice: precise systems engineer. Every name,
// address and figure here is fictional.
//
// The chapter mark ("03" / "Intake") mirrors the plan's CHAPTERS table; when
// content.ts exports CHAPTERS the label below should read from it.

export type EntityId = "vendor" | "po" | "amount" | "site" | "due" | "terms" | "terms2";
export type RowId = "vendor" | "po" | "amount" | "site" | "due" | "terms" | "confidence";

/** A run of letter text: plain words, or a fact wrapped in <mark>. Facts may nest. */
export type Seg = string | { e: EntityId; t: Seg[] };

export const INTAKE = {
  chapter: ["03", "Intake"] as const,
  title: "First, it reads.",
  aside: "Every system starts with a message someone would have retyped. One letter, read once, kept as a record.",
  figcap: "One letter, one record. Values fictional.",
  /** the mono lines above the letter */
  meta: [
    ["From", "a.ravndal@halvorsen-marine.example"],
    ["To", "orders@northline-fittings.example"],
    ["Subject", "PO-8841 . cold-chain fittings, Dock 4"],
    ["Received", "09:14"],
  ] as const,
  /** five short paragraphs; the facts the reader keeps are marked */
  paragraphs: [
    [
      "Please find attached purchase order ",
      { e: "po", t: ["PO-8841"] },
      " for the fittings quoted in March, total ",
      { e: "amount", t: ["$18,420.00"] },
      " inclusive of freight. Line items are as per your quotation of 3 March; no substitutions, please.",
    ],
    [
      "Delivery is to ",
      { e: "site", t: ["Dock 4, Bergen"] },
      ", marked for the ",
      { e: "vendor", t: ["Halvorsen Marine Supply"] },
      " yard office. The gate is staffed 06:00 to 18:00 on weekdays.",
    ],
    ["Our standard terms are ", { e: "terms", t: ["net 30 from invoice"] }, "."],
    [
      "The vessel sails on the 16th, so we need the goods on site ",
      { e: "terms2", t: ["no later than ", { e: "due", t: ["14 May"] }] },
      ".",
    ],
    ["Please confirm by return."],
  ] as Seg[][],
  sign: ["A. Ravndal", "Procurement . Halvorsen Marine Supply"] as const,
  /** the record's own header */
  recordHead: ["Record", "schema v4 . 6 fields"] as const,
  note: "conflict . routed to Verify",
  hint: {
    fine: "Point at a row to find its source in the letter",
    touch: "Tap a row to find its source in the letter",
  },
  /** the sr-only description of what the figure shows */
  srDescription:
    "A procurement letter on the left; a record on the right with the vendor, purchase order, amount, site, due date and terms read out of it. The terms conflict: net 30 against a delivery no later than 14 May. Confidence 0.94 on five fields, 0.61 on the terms, below the 0.80 threshold, so the terms are routed to the Verify agent.",
};

export interface Entity {
  /** e1..e7, the mark's DOM id suffix and reading-order label */
  id: string;
  /** the chip's text and the record label it flies to */
  label: string;
  /** the record row this fact lands on */
  row: RowId;
  /** aria-description on the mark */
  desc: string;
  /** seconds the chip waits before lifting (the conflict follows the due date) */
  lead?: number;
}

export const ENTITIES: Record<EntityId, Entity> = {
  vendor: { id: "e1", label: "Vendor", row: "vendor", desc: "Vendor name" },
  po: { id: "e2", label: "PO", row: "po", desc: "Purchase order number" },
  amount: { id: "e3", label: "Amount", row: "amount", desc: "Order total" },
  site: { id: "e4", label: "Site", row: "site", desc: "Delivery site" },
  due: { id: "e5", label: "Due", row: "due", desc: "Date required on site" },
  terms: { id: "e6", label: "Terms", row: "terms", desc: "Payment terms, net 30" },
  terms2: { id: "e7", label: "Terms", row: "terms", desc: "Delivery deadline that conflicts with net 30", lead: 0.35 },
};

export interface RecordValue {
  /** the entity whose reading prints this value */
  by: EntityId;
  text: string;
  /** printed in the signal colour (a figure that failed a threshold) */
  signal?: boolean;
}

export interface RecordRow {
  id: RowId;
  label: string;
  values: RecordValue[];
  /** the entity whose reading flips this row to a conflict */
  conflict?: EntityId;
  note?: string;
  /** a derived row: no source in the letter, not focusable */
  derived?: boolean;
}

export const RECORD: RecordRow[] = [
  { id: "vendor", label: "Vendor", values: [{ by: "vendor", text: "Halvorsen Marine Supply" }] },
  { id: "po", label: "PO", values: [{ by: "po", text: "PO-8841" }] },
  { id: "amount", label: "Amount", values: [{ by: "amount", text: "$18,420.00" }] },
  { id: "site", label: "Site", values: [{ by: "site", text: "Dock 4, Bergen" }] },
  { id: "due", label: "Due", values: [{ by: "due", text: "14 May" }] },
  {
    id: "terms",
    label: "Terms",
    values: [
      { by: "terms", text: "Net 30" },
      { by: "terms2", text: " . 14 May" },
    ],
    conflict: "terms2",
    note: INTAKE.note,
  },
  {
    id: "confidence",
    label: "Confidence",
    values: [
      { by: "po", text: "0.94" },
      { by: "terms2", text: " . 0.61 < 0.80", signal: true },
    ],
    derived: true,
  },
];

/** every entity in the order the letter is read (for counts and tests) */
export const ENTITY_ORDER: EntityId[] = ["po", "amount", "site", "vendor", "terms", "terms2", "due"];

// Words and tables for the projection system of /ai-infrastructure: the
// chapter numbering every section's label and data-ch read from, the five
// chapter-frame loglines, the slate's labels, the operator-keys sheet, and
// the lookup the SPEC notes use into the build sheet (CREDITS in
// exit.content.ts, the table the credits roll prints), so the two can never
// disagree.
//
// Voice: precise systems engineer, numbers over adjectives. No emojis.
// (Kept out of content.ts by the build brief; the lead may fold it in.)

import { CREDITS, type Credit } from "./exit.content";

/* ── chapters ── */

/** [number, name] in page order. Questions keeps no number. */
export const CHAPTERS = [
  ["01", "Layer"],
  ["02", "Capabilities"],
  ["03", "Intake"],
  ["04", "Compression"],
  ["05", "Anatomy"],
  ["06", "Scale"],
  ["07", "Stack"],
  ["08", "Industries"],
  ["09", "Night"],
  ["10", "Process"],
  ["11", "Why"],
  ["12", "Gate"],
] as const;

export type ChapterName = (typeof CHAPTERS)[number][1];

/** "Compression" -> "04"; unknown or unnumbered (Questions) -> null. */
export function chapterNumber(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase();
  const hit = CHAPTERS.find(([, n]) => n.toLowerCase() === key);
  return hit ? hit[0] : null;
}

/** One logline per chapter frame; at most fourteen words each. */
export const LOGLINES: Readonly<Partial<Record<ChapterName, string>>> = {
  Intake: "A request arrives the way they always do. As a message.",
  Compression: "Twelve steps a person carried. Pressed into five that run themselves.",
  Scale: "Designed to scale, then photographed at scale.",
  Stack: "Four layers, one request, one thousand three hundred and ten milliseconds.",
  Night: "Eighteen hundred to oh six hundred. Nobody at the desk.",
};

/* ── the slate ── */

export const SLATE = {
  label: "Reel slate",
  tc: "TC",
  ch: "CH",
  chSr: "Chapter",
  fps: "FPS",
  spec: "SPEC",
  specLabel: "Spec notes",
  keys: "?",
  keysLabel: "Operator keys",
} as const;

/* ── operator keys ── */

export type KeyRow = { keys: readonly string[]; action: string };

export const KEYS = {
  title: "Operator keys",
  rows: [
    { keys: ["g", "s"], action: "stack" },
    { keys: ["g", "c"], action: "compression" },
    { keys: ["g", "n"], action: "night" },
    { keys: ["g", "i"], action: "industries" },
    { keys: ["g", "p"], action: "process" },
    { keys: ["g", "w"], action: "why" },
    { keys: ["."], action: "send a request through the stack" },
    { keys: ["/"], action: "filter the logs" },
    { keys: ["x"], action: "spec notes on, off" },
    { keys: ["space"], action: "dive, on the core" },
    { keys: ["esc"], action: "close" },
    { keys: ["?"], action: "this sheet" },
  ] as readonly KeyRow[],
  foot: "Keys are ignored while you type.",
  close: "Esc",
  /** touch devices: no chords; the sheet lists the gestures instead */
  touchTitle: "Gestures",
  gestures: [
    { keys: ["hold"], action: "the core . dive" },
    { keys: ["hold", "drag"], action: "a bead onto another . merge early" },
    { keys: ["tap"], action: "the scale plate . develop" },
    { keys: ["tap", "tap"], action: "a layer of the stack . inspect" },
    { keys: ["tap"], action: "approve or correct . the routing slip" },
    { keys: ["pull"], action: "the stub . tear the ticket" },
  ] as readonly KeyRow[],
  touchFoot: "Scroll drives the reel. The slate reads it back.",
  touchClose: "Close",
  /** the spec switch inside the sheet, where the slate has no SPEC button */
  specRow: "Spec notes",
  specHint: "every figure shows its working",
} as const;

/* ── the build sheet ── */

/*
 * SPEC notes read the same table the credits roll prints (exit.content.ts,
 * CREDITS), addressed by its `id`, so a margin note and its credits line can
 * never disagree. Nothing is duplicated here.
 */
export type { Credit } from "./exit.content";

/** The build-sheet row for a figure id ("01", "01b", "04", "amb" ...). */
export function creditFor(fig: string): Credit | undefined {
  return CREDITS.find((c) => c.id === fig);
}

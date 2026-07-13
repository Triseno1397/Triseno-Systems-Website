import { z } from "zod";

/**
 * The value types the CMS can store. Every editable field on the site bottoms out
 * in one of these.
 *
 * Design rule that runs through the whole file: store *meaning*, not *presentation*.
 * A colour is a token name, never a hex. A size is a step on a scale, never a pixel
 * count. That is what stops a non-technical editor from producing something
 * off-brand or unreadable on a phone — the schema cannot express the bad state.
 */

/* ─────────────────────────── Rich text ─────────────────────────── */

/**
 * Headlines on this site are not plain strings. They carry hard line breaks and a
 * `<span class="grad">` that paints the gradient fill:
 *
 *   <h1>Video that sells<br/><span class="grad">while it scrolls.</span></h1>
 *
 * Storing that as an HTML string would mean dangerouslySetInnerHTML (an injection
 * hole in a tool whose entire purpose is accepting untrusted input) and would give
 * the editor a raw-HTML textarea, which is exactly the UI a non-technical user
 * cannot use. So model it as typed inline nodes instead: safe to render, and the
 * inspector can present it as a row of labelled segments.
 */
export const inlineNodeSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("text"), v: z.string() }),
  z.object({ t: z.literal("grad"), v: z.string() }),
  z.object({ t: z.literal("br") }),
  z.object({ t: z.literal("em"), v: z.string() }),
  z.object({ t: z.literal("link"), v: z.string(), href: z.string() }),
]);

export const richTextSchema = z.array(inlineNodeSchema);

export type InlineNode = z.infer<typeof inlineNodeSchema>;
export type RichText = z.infer<typeof richTextSchema>;

/** Authoring helpers, so hand-written content JSON stays readable in TS. */
export const t = (v: string): InlineNode => ({ t: "text", v });
export const grad = (v: string): InlineNode => ({ t: "grad", v });
export const br = (): InlineNode => ({ t: "br" });

/** Flatten rich text to a plain string (for alt text, <title>, aria-labels). */
export function richTextToPlain(nodes: RichText): string {
  return nodes
    .map((n) => (n.t === "br" ? " " : "v" in n ? n.v : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────────────── Media ─────────────────────────── */

/**
 * Media is stored by reference, never inline. Uploads go browser → Cloudinary
 * (Vercel's 4.5MB request body limit makes routing a 14MB reel through an API
 * route impossible), and only the resulting URL is committed to git.
 *
 * `src` stays a bare path for the reels already in /public; new uploads are
 * absolute Cloudinary URLs. Both render through the same <Media> component.
 */
export const mediaRefSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "video", "sticker"]),
  src: z.string(),
  /** Poster frame. Cloudinary generates these; the legacy /public reels have none. */
  poster: z.string().nullable().default(null),
  alt: z.string().default(""),
  /** "9:16" | "16:9" | "1:1" … drives CSS aspect-ratio, so layout never depends on decode. */
  ratio: z.string().default("16:9"),
  /** Clip carries a soundtrack → the UI surfaces an unmute toggle. */
  audio: z.boolean().default(false),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
});
export type MediaRef = z.infer<typeof mediaRefSchema>;

/* ─────────────────────────── Design tokens ─────────────────────────── */

/**
 * Colour is a token name resolved to a CSS custom property at render:
 *   "studio-a" → var(--studio-a)
 *
 * The entire site already reads from these custom properties, so this buys two
 * things at once: the theme editor can restyle everything by rewriting one
 * variable, and an editor physically cannot strand an off-brand hex on a single
 * headline. The hex pickers live in the theme editor and nowhere else.
 */
export const COLOR_TOKENS = [
  "ink-1",
  "ink-2",
  "ink-3",
  "studio-a",
  "studio-b",
  "web-a",
  "web-b",
  "accent-primary",
  "accent-secondary",
  "bg",
  "bg-raised",
  "hairline",
] as const;
export const colorTokenSchema = z.enum(COLOR_TOKENS);
export type ColorToken = z.infer<typeof colorTokenSchema>;

/**
 * Type size is a step on a scale, never a number.
 *
 * This is the single most important guardrail in the CMS. A px input lets someone
 * set a 96px headline that looks perfect on their monitor and is unreadable at
 * 390px, and nothing in the system can prevent it. Each step maps to a `clamp()`
 * ramp in globals.css, so "make it bigger" stays responsive by construction.
 */
export const SIZE_STEPS = ["xs", "sm", "md", "lg", "xl", "2xl", "display"] as const;
export const sizeStepSchema = z.enum(SIZE_STEPS);
export type SizeStep = z.infer<typeof sizeStepSchema>;

export const WEIGHT_STEPS = ["regular", "medium", "semibold", "bold"] as const;
export const weightStepSchema = z.enum(WEIGHT_STEPS);

/** Geist Sans / Geist Mono only. CLAUDE.md forbids Inter, Roboto and system fonts, */
/** so there is deliberately no free-text font picker — the enum is the allowlist. */
export const FONT_TOKENS = ["sans", "mono"] as const;
export const fontTokenSchema = z.enum(FONT_TOKENS);

export const styleSchema = z
  .object({
    size: sizeStepSchema.optional(),
    weight: weightStepSchema.optional(),
    font: fontTokenSchema.optional(),
    color: colorTokenSchema.optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    /** Nudge only, in rem, clamped. Applied as a transform so it never causes reflow. */
    offsetX: z.number().min(-4).max(4).optional(),
    offsetY: z.number().min(-4).max(4).optional(),
  })
  .default({});
export type SectionStyle = z.infer<typeof styleSchema>;

/* ─────────────────────────── Animation ─────────────────────────── */

/** A preset id plus its tuned params. Resolved against the preset registry at render. */
export const animRefSchema = z
  .object({
    preset: z.string().default("none"),
    params: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).default({}),
  })
  .default({ preset: "none", params: {} });
export type AnimRef = z.infer<typeof animRefSchema>;

/* ─────────────────────────── Stickers ─────────────────────────── */

/**
 * The one place with genuinely free positioning.
 *
 * Coordinates are FRACTIONS of the section box (0.72 = 72% across), not pixels.
 * Pixel coordinates do not survive responsive reflow; fractions do. `hideOnMobile`
 * defaults to true because at 390px a free-floating sticker will collide with the
 * copy essentially every time.
 */
export const stickerSchema = z.object({
  id: z.string(),
  asset: z.string(),
  x: z.number().min(-0.2).max(1.2),
  y: z.number().min(-0.2).max(1.2),
  w: z.number().min(0.02).max(1),
  rotate: z.number().min(-180).max(180).default(0),
  opacity: z.number().min(0).max(1).default(1),
  z: z.enum(["above", "below"]).default("above"),
  blend: z.enum(["normal", "screen", "overlay"]).default("normal"),
  anim: animRefSchema,
  link: z.string().nullable().default(null),
  hideOnMobile: z.boolean().default(true),
});
export type Sticker = z.infer<typeof stickerSchema>;

/* ─────────────────────────── Sections & pages ─────────────────────────── */

export const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  /** Structure is fixed by code; only the content inside it is editable. */
  locked: z.boolean().default(false),
  data: z.record(z.string(), z.unknown()).default({}),
  style: styleSchema,
  anim: animRefSchema,
  stickers: z.array(stickerSchema).default([]),
});
export type Section = z.infer<typeof sectionSchema>;

export const pageSchema = z.object({
  version: z.number().default(1),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    canonical: z.string().optional(),
  }),
  sections: z.array(sectionSchema),
});
export type Page = z.infer<typeof pageSchema>;

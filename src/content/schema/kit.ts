import { z, type ZodTypeAny } from "zod";
import {
  animRefSchema,
  colorTokenSchema,
  mediaRefSchema,
  richTextSchema,
  sizeStepSchema,
} from "./primitives";

/**
 * A tiny schema DSL. One declaration per section produces three things that would
 * otherwise drift apart as the site grows:
 *
 *   1. a Zod validator  — the gate that stops a bad publish reaching `main`
 *   2. a TypeScript type — so the section component can't misread its own content
 *   3. a field list      — which the inspector renders into a form, generically
 *
 * The third is the point. The editor has no per-section UI code: it walks `fields`
 * and renders a control per entry. Making a new bit of the site editable is a line
 * in a schema file, not a new form component. Without this, the inspector becomes
 * ~40 bespoke forms that rot the moment anyone touches a section.
 */

export type Field =
  | { kind: "text"; label: string; max?: number; placeholder?: string; help?: string }
  | { kind: "textarea"; label: string; max?: number; help?: string }
  /** `allow` bounds which inline node types the segment editor offers. */
  | { kind: "richtext"; label: string; allow?: Array<"grad" | "br" | "em" | "link">; help?: string }
  | { kind: "media"; label: string; accept: "image" | "video" | "sticker"; help?: string }
  | { kind: "select"; label: string; options: Array<{ value: string; label: string }>; help?: string }
  | { kind: "toggle"; label: string; help?: string }
  | { kind: "number"; label: string; min: number; max: number; step?: number; help?: string }
  | { kind: "colorToken"; label: string; help?: string }
  | { kind: "scale"; label: string; help?: string }
  | { kind: "anim"; label: string; help?: string }
  /** Reference into a shared collection (e.g. the unified reel library). */
  | { kind: "ref"; label: string; collection: "reels" | "media"; help?: string }
  /** Repeatable rows. `itemLabel` names the child field to title each row with. */
  | {
      kind: "list";
      label: string;
      of: FieldMap;
      min?: number;
      max?: number;
      itemLabel?: string;
      help?: string;
    }
  | { kind: "group"; label: string; fields: FieldMap; help?: string };

export type FieldMap = Record<string, Field>;

/** Map one field descriptor onto its Zod validator. */
function fieldToZod(field: Field): ZodTypeAny {
  switch (field.kind) {
    case "text":
    case "textarea": {
      const base = z.string();
      return field.max ? base.max(field.max) : base;
    }
    case "richtext":
      return richTextSchema;
    case "media":
      return mediaRefSchema;
    case "select":
      return z.enum(field.options.map((o) => o.value) as [string, ...string[]]);
    case "toggle":
      return z.boolean();
    case "number":
      return z.number().min(field.min).max(field.max);
    case "colorToken":
      return colorTokenSchema;
    case "scale":
      return sizeStepSchema;
    case "anim":
      return animRefSchema;
    case "ref":
      return z.string();
    case "list":
      return z.array(fieldsToZod(field.of)).min(field.min ?? 0).max(field.max ?? 100);
    case "group":
      return fieldsToZod(field.fields);
  }
}

export function fieldsToZod(fields: FieldMap) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, field] of Object.entries(fields)) {
    shape[key] = fieldToZod(field);
  }
  return z.object(shape);
}

export type SectionDef = {
  /** Stable id used in page JSON (`"type": "studio.hero"`). Renaming breaks content. */
  id: string;
  name: string;
  /** Grouping in the "add section" palette. */
  group?: string;
  /**
   * Locked sections cannot be added, removed, reordered or restyled — only their
   * content is editable. Reserved for the hand-tuned GSAP islands (Portal's intro,
   * the marquee footer, the sticky reel preview), where the choreography is the
   * product and decomposing it into presets would cost more than it returns.
   */
  locked?: boolean;
  fields: FieldMap;
  /** Whether the section accepts a sticker overlay layer. */
  stickers?: boolean;
};

export type DefinedSection = SectionDef & {
  zod: ReturnType<typeof fieldsToZod>;
};

export function defineSection(def: SectionDef): DefinedSection {
  return { ...def, zod: fieldsToZod(def.fields) };
}

/* Terse constructors, so a schema file reads like a form and not like a type puzzle. */
export const text = (label: string, o: Partial<Extract<Field, { kind: "text" }>> = {}): Field => ({
  kind: "text",
  label,
  ...o,
});
export const textarea = (
  label: string,
  o: Partial<Extract<Field, { kind: "textarea" }>> = {}
): Field => ({ kind: "textarea", label, ...o });
export const richtext = (
  label: string,
  allow: Array<"grad" | "br" | "em" | "link"> = ["grad", "br"]
): Field => ({ kind: "richtext", label, allow });
export const media = (label: string, accept: "image" | "video" | "sticker" = "image"): Field => ({
  kind: "media",
  label,
  accept,
});
export const select = (label: string, options: string[] | Array<{ value: string; label: string }>): Field => ({
  kind: "select",
  label,
  options: options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
});
export const toggle = (label: string): Field => ({ kind: "toggle", label });
export const number = (label: string, min: number, max: number, step = 1): Field => ({
  kind: "number",
  label,
  min,
  max,
  step,
});
export const list = (
  label: string,
  of: FieldMap,
  o: { min?: number; max?: number; itemLabel?: string } = {}
): Field => ({ kind: "list", label, of, ...o });
export const group = (label: string, fields: FieldMap): Field => ({ kind: "group", label, fields });
export const ref = (label: string, collection: "reels" | "media"): Field => ({
  kind: "ref",
  label,
  collection,
});
export const anim = (label = "Animation"): Field => ({ kind: "anim", label });
export const colorToken = (label: string): Field => ({ kind: "colorToken", label });

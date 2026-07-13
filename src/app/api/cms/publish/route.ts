import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/cms/guard";
import { acquireLock, del, get, pushCapped, KEYS } from "@/lib/cms/store";
import { commitFiles } from "@/lib/cms/github";
import type { Draft } from "../draft/route";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Validation is the gate that keeps a broken build off main. The renderer is entirely
 * data-driven, so if the data is well-formed the page cannot fail to compile — which
 * is why we can afford to publish straight to production with no preview build.
 */
const clipSchema = z.object({
  src: z.string().min(1, "Every clip needs a video."),
  label: z.string().nullable(),
  caption: z.string(),
  audio: z.boolean(),
});

const formatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Every reel needs a title."),
  tagline: z.string(),
  description: z.string(),
  ratio: z.string().regex(/^\d+(\.\d+)?:\d+(\.\d+)?$/, "Ratio must look like 9:16."),
  tags: z.array(z.string()),
  hotspot: z.string(),
  clips: z.array(clipSchema),
});

const reelsSchema = z
  .object({
    version: z.number(),
    formats: z.array(formatSchema).min(1),
    studioOrder: z.array(z.string()),
    workTiles: z.array(
      z.object({
        reel: z.string(),
        clip: z.number().int().min(0),
        title: z.string().optional(),
        caption: z.string().optional(),
      })
    ),
  })
  // Referential integrity. Zod alone would happily accept a studioOrder pointing at a
  // reel that no longer exists — which renders as a silently missing section rather
  // than an error, and is exactly the sort of thing nobody notices until a client does.
  .superRefine((doc, ctx) => {
    const ids = new Set(doc.formats.map((f) => f.id));

    if (new Set(doc.formats.map((f) => f.id)).size !== doc.formats.length) {
      ctx.addIssue({ code: "custom", message: "Two reels share the same id." });
    }

    for (const id of doc.studioOrder) {
      if (!ids.has(id)) {
        ctx.addIssue({ code: "custom", message: `Studio order references a missing reel: ${id}` });
      }
    }

    for (const tile of doc.workTiles) {
      const format = doc.formats.find((f) => f.id === tile.reel);
      if (!format) {
        ctx.addIssue({ code: "custom", message: `Work gallery references a missing reel: ${tile.reel}` });
      } else if (!format.clips[tile.clip]) {
        ctx.addIssue({
          code: "custom",
          message: `Work gallery points at clip ${tile.clip + 1} of "${format.title}", which no longer exists.`,
        });
      }
    }
  });

export async function POST() {
  const guard = await requireSession({ mutating: true });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // Double-click on Publish would otherwise be two commits and two builds.
  const gotLock = await acquireLock(KEYS.publishLock, 120);
  if (!gotLock) {
    return NextResponse.json({ error: "A publish is already running." }, { status: 409 });
  }

  try {
    const draft = await get<Draft>(KEYS.draft);
    if (!draft) {
      return NextResponse.json({ error: "Nothing to publish." }, { status: 400 });
    }

    const parsed = reelsSchema.safeParse(draft.reels);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Some changes aren't valid yet.",
          issues: parsed.error.issues.map((i) => i.message),
        },
        { status: 422 }
      );
    }

    // Re-serialise from the validated object, not the raw draft: this strips anything
    // the editor may have carried along and guarantees the committed file is exactly
    // the shape the site's loader expects.
    const doc = parsed.data;
    const content =
      JSON.stringify(
        {
          version: doc.version,
          formats: doc.formats,
          studioOrder: doc.studioOrder,
          workTiles: doc.workTiles,
        },
        null,
        2
      ) + "\n";

    const result = await commitFiles(
      [{ path: "src/content/reels.json", content }],
      "content: publish reels via /edit"
    );

    if ("noop" in result) {
      await del(KEYS.draft);
      return NextResponse.json({ ok: true, noop: true });
    }

    await pushCapped(
      KEYS.publishes,
      {
        commitSha: result.commitSha,
        url: result.url,
        changed: result.changed,
        at: Date.now(),
        snapshot: doc,
      },
      50
    );

    // The draft has landed; clear it so the editor reads from published content again.
    await del(KEYS.draft);

    return NextResponse.json({
      ok: true,
      commitSha: result.commitSha,
      url: result.url,
      changed: result.changed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await del(KEYS.publishLock);
  }
}

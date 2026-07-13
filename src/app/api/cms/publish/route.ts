import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/cms/guard";
import { commitFiles } from "@/lib/cms/github";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Publish: validate the content, commit it to main, let Vercel deploy it.
 *
 * The content arrives in the request body rather than from a server-side draft store.
 * That is the whole reason this CMS needs no database: the draft lives in the browser
 * until he presses Publish, so there is nothing to host, nothing to sign up for, and no
 * extra secrets. The cost is that a draft does not follow him between devices — a fair
 * trade for a two-person tool, and revisitable later without changing anything here.
 *
 * There is deliberately no publish lock. A double-click cannot produce two commits:
 * commitFiles() skips files whose content is unchanged, so the second request finds
 * nothing to do and returns a no-op, and the underlying ref update is atomic on its
 * parent SHA, so a genuine race fails rather than clobbering.
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

/**
 * Validation is what makes it safe to publish straight to production with no preview
 * build: the renderer is entirely data-driven, so well-formed data cannot fail to
 * compile. The referential checks matter as much as the shape ones — a studioOrder
 * entry pointing at a deleted reel renders as a silently missing section rather than an
 * error, which is exactly the sort of thing nobody notices until a client does.
 */
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
  .superRefine((doc, ctx) => {
    const ids = new Set(doc.formats.map((f) => f.id));

    if (ids.size !== doc.formats.length) {
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
        ctx.addIssue({
          code: "custom",
          message: `Work gallery references a missing reel: ${tile.reel}`,
        });
      } else if (!format.clips[tile.clip]) {
        ctx.addIssue({
          code: "custom",
          message: `Work gallery points at clip ${tile.clip + 1} of "${format.title}", which no longer exists.`,
        });
      }
    }
  });

export async function POST(req: Request) {
  const guard = await requireSession({ mutating: true });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const parsed = reelsSchema.safeParse((body as { reels?: unknown })?.reels);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some changes aren't valid yet.",
        issues: parsed.error.issues.map((i) => i.message),
      },
      { status: 422 }
    );
  }

  // Re-serialise from the validated object, not the raw body: this strips anything the
  // editor may have carried along and guarantees the committed file is exactly the
  // shape the site's loader expects.
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

  try {
    const result = await commitFiles(
      [{ path: "src/content/reels.json", content }],
      "content: publish reels via /edit"
    );

    if ("noop" in result) {
      return NextResponse.json({ ok: true, noop: true });
    }

    return NextResponse.json({
      ok: true,
      commitSha: result.commitSha,
      url: result.url,
      changed: result.changed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    // The single most likely failure in a year's time: fine-grained PATs expire.
    const friendly = /bad credentials|401/i.test(message)
      ? "GitHub rejected the token — it has probably expired. Generate a new GITHUB_TOKEN."
      : message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}

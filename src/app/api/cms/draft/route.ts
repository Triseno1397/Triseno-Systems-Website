import { NextResponse } from "next/server";
import { requireSession } from "@/lib/cms/guard";
import { del, get, set, KEYS } from "@/lib/cms/store";
import { defaultReels } from "@/content/reels";

export const runtime = "nodejs";

export type Draft = {
  reels: unknown;
  updatedAt: number;
  /** The published commit this draft was forked from — lets us warn about staleness. */
  baseSha: string | null;
};

/** Load the working draft. Falls back to what is currently published. */
export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const draft = await get<Draft>(KEYS.draft);
  if (draft) return NextResponse.json({ draft, isDraft: true });

  return NextResponse.json({
    draft: { reels: defaultReels, updatedAt: 0, baseSha: null } satisfies Draft,
    isDraft: false,
  });
}

/** Autosave. Called on a debounce while he types. */
export async function PUT(req: Request) {
  const guard = await requireSession({ mutating: true });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: { reels?: unknown; baseSha?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!body.reels) {
    return NextResponse.json({ error: "Missing reels" }, { status: 400 });
  }

  const draft: Draft = {
    reels: body.reels,
    updatedAt: Date.now(),
    baseSha: body.baseSha ?? null,
  };

  await set(KEYS.draft, draft);
  return NextResponse.json({ ok: true, updatedAt: draft.updatedAt });
}

/** Discard the draft and fall back to what is published. ("Discard changes".) */
export async function DELETE() {
  const guard = await requireSession({ mutating: true });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  await del(KEYS.draft);
  return NextResponse.json({ ok: true });
}

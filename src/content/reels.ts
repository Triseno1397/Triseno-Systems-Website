import raw from "./reels.json";

/**
 * The reel library, and the two views the site takes of it.
 *
 * IMPORTANT: this is a *static import*, not a fetch. Next inlines the JSON at build
 * time, which keeps /, /studio, /portfolio and /contact prerendered as static HTML.
 * Fetching it at request time would silently turn all four marketing routes dynamic
 * — losing CDN caching and billing a serverless invocation on every pageview — while
 * looking, from the outside, like it still worked. Keep it an import.
 *
 * The selectors below are pure functions of a document rather than of the imported
 * module, so the editor can run the exact same projection over an unsaved draft. The
 * preview is therefore the real page, not a lookalike.
 */

export type Clip = {
  src: string;
  /** Cell caption in the Studio dual-clip showcase. null for single-clip formats. */
  label: string | null;
  /** Tile caption on the Work page. Deliberately different from the format tagline. */
  caption: string;
  audio: boolean;
};

export type Format = {
  id: string;
  title: string;
  /** One-liner under the format name on Studio. */
  tagline: string;
  description: string;
  /** "9:16" | "16:9" | "2.39:1" — split on ":" to drive CSS aspect-ratio. */
  ratio: string;
  tags: string[];
  /** Gradient focal point for the fallback thumb, so formats without a clip differ. */
  hotspot: string;
  /** Empty for formats with no reel yet (Brand Films) — these fall back to the thumb. */
  clips: Clip[];
};

export type WorkTile = {
  reel: string;
  clip: number;
  /** Optional per-tile title override; falls back to the format's title. */
  title?: string;
  /** Optional per-tile caption override; falls back to the clip's caption. */
  caption?: string;
};

export type ReelsDoc = {
  version: number;
  formats: Format[];
  studioOrder: string[];
  workTiles: WorkTile[];
};

/** The published library, inlined at build time. */
export const defaultReels: ReelsDoc = {
  version: raw.version,
  formats: raw.formats as Format[],
  studioOrder: raw.studioOrder as string[],
  workTiles: raw.workTiles as WorkTile[],
};

/** Studio's "What We Make", in order. The 01..09 numbering is positional. */
export function selectStudioFormats(doc: ReelsDoc): Format[] {
  const byId = new Map(doc.formats.map((f) => [f.id, f]));
  return doc.studioOrder
    .map((id) => byId.get(id))
    .filter((f): f is Format => Boolean(f));
}

/** One resolved tile of the Work gallery: a specific clip of a specific format. */
export type ResolvedTile = {
  key: string;
  title: string;
  caption: string;
  ratio: string;
  src: string;
  audio: boolean;
};

export function selectWorkTiles(doc: ReelsDoc): ResolvedTile[] {
  const byId = new Map(doc.formats.map((f) => [f.id, f]));
  return doc.workTiles
    .map((tile, i) => {
      const format = byId.get(tile.reel);
      const clip = format?.clips[tile.clip];
      // A tile pointing at a deleted reel or a removed clip simply drops out rather
      // than throwing — the editor can transiently produce that state mid-edit.
      if (!format || !clip) return null;
      return {
        key: `${tile.reel}-${tile.clip}-${i}`,
        title: tile.title ?? format.title,
        caption: tile.caption ?? clip.caption,
        ratio: format.ratio,
        src: clip.src,
        audio: clip.audio,
      };
    })
    .filter((t): t is ResolvedTile => t !== null);
}

/** The shape the Studio page's preview machinery already consumes. */
export type MakeItem = {
  n: string;
  title: string;
  sm: string;
  desc: string;
  ratio: string;
  tags: string[];
  hotspot: string;
  video?: string;
  audio?: boolean;
  videos?: { src: string; label: string }[];
};

export function selectMakeItems(doc: ReelsDoc): MakeItem[] {
  return selectStudioFormats(doc).map((f, i) => ({
    n: String(i + 1).padStart(2, "0"),
    title: f.title,
    sm: f.tagline,
    desc: f.description,
    ratio: f.ratio,
    tags: f.tags,
    hotspot: f.hotspot,
    ...(f.clips.length > 1
      ? { videos: f.clips.map((c) => ({ src: c.src, label: c.label ?? "" })) }
      : f.clips.length === 1
        ? { video: f.clips[0].src, audio: f.clips[0].audio }
        : {}),
  }));
}

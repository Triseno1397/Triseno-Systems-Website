import raw from "./reels.json";

/**
 * The reel library, and the two views the site takes of it.
 *
 * IMPORTANT: this is a *static import*, not a fetch. Next inlines the JSON at build
 * time, which keeps /, /studio, /portfolio and /contact prerendered as static HTML.
 * Fetching it at request time would silently turn all four marketing routes dynamic
 * — losing CDN caching and billing a serverless invocation on every pageview — while
 * looking, from the outside, like it still worked. Keep it an import.
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

const formats = raw.formats as Format[];

const byId = new Map(formats.map((f) => [f.id, f]));

export function getFormat(id: string): Format | undefined {
  return byId.get(id);
}

/** Studio's "What We Make", in order. The 01..09 numbering is positional. */
export function studioFormats(): Format[] {
  return (raw.studioOrder as string[])
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

export function workTiles(): ResolvedTile[] {
  return (raw.workTiles as WorkTile[])
    .map((tile) => {
      const format = byId.get(tile.reel);
      const clip = format?.clips[tile.clip];
      if (!format || !clip) return null;
      return {
        key: `${tile.reel}-${tile.clip}`,
        title: tile.title ?? format.title,
        caption: tile.caption ?? clip.caption,
        ratio: format.ratio,
        src: clip.src,
        audio: clip.audio,
      };
    })
    .filter((t): t is ResolvedTile => t !== null);
}

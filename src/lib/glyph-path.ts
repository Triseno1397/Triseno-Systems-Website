import type { GlyphKind } from "./divisions";

// Every glyph is a closed loop sampled to the same number of points, starting
// at the top-centre and running clockwise. Because the sampling is coherent,
// any glyph can morph into any other by lerping point i -> point i. Shared by
// the 3D signature object, the door frames, the SVG glyphs and the loader.

type Pt = [number, number];

function polygon(kind: GlyphKind): Pt[] {
  switch (kind) {
    case "circle": {
      const pts: Pt[] = [];
      const n = 96;
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 - (i / n) * Math.PI * 2;
        pts.push([Math.cos(a), Math.sin(a)]);
      }
      return pts;
    }
    case "square": {
      const s = 0.9;
      return [
        [0, s],
        [s, s],
        [s, -s],
        [-s, -s],
        [-s, s],
      ];
    }
    case "triangle": {
      const r = 1.2;
      const dy = -0.27;
      const v = (deg: number): Pt => {
        const a = (deg * Math.PI) / 180;
        return [Math.cos(a) * r, Math.sin(a) * r + dy];
      };
      return [v(90), v(-30), v(210)];
    }
    case "diamond": {
      const r = 1.15;
      return [
        [0, r],
        [r, 0],
        [0, -r],
        [-r, 0],
      ];
    }
    case "plus": {
      const w = 0.36;
      const e = 1.05;
      return [
        [0, e],
        [w, e],
        [w, w],
        [e, w],
        [e, -w],
        [w, -w],
        [w, -e],
        [-w, -e],
        [-w, -w],
        [-e, -w],
        [-e, w],
        [-w, w],
        [-w, e],
      ];
    }
  }
}

const cache = new Map<string, Float32Array>();

/** Flat [x0,y0,x1,y1,...] of `n` points evenly spaced along the glyph outline. */
export function glyphPoints(kind: GlyphKind, n: number): Float32Array {
  const key = `${kind}:${n}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const poly = polygon(kind);
  const count = poly.length;
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % count];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(len);
    total += len;
  }

  const out = new Float32Array(n * 2);
  let si = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (si < count - 1 && acc + seg[si] < target) {
      acc += seg[si];
      si++;
    }
    const a = poly[si];
    const b = poly[(si + 1) % count];
    const t = seg[si] > 0 ? (target - acc) / seg[si] : 0;
    out[i * 2] = a[0] + (b[0] - a[0]) * t;
    out[i * 2 + 1] = a[1] + (b[1] - a[1]) * t;
  }
  cache.set(key, out);
  return out;
}

/** SVG path `d` for a glyph, in a -1.3..1.3 box with y pointing up flipped for SVG. */
export function glyphSvgPath(kind: GlyphKind): string {
  if (kind === "circle") return "M0,-1 A1,1 0 1 1 0,1 A1,1 0 1 1 0,-1 Z";
  const poly = polygon(kind);
  return (
    poly.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(3)},${(-p[1]).toFixed(3)}`).join(" ") + " Z"
  );
}

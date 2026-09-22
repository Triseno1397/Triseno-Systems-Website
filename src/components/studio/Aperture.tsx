import type { Ref } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   The Creative division glyph drawn as a working aperture: the foundation's
   circle glyph (rim) plus iris blades. `open` 0..1 is the iris opening, so the
   same glyph can be static (cards, labels) or driven per frame (hero, gate)
   by writing aperturePath() straight into the path's `d`.
   ───────────────────────────────────────────────────────────────────────── */

const RIM = "M0,-1 A1,1 0 1 1 0,1 A1,1 0 1 1 0,-1 Z";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** SVG path for the aperture in a -1..1 box. */
export function aperturePath(open: number, blades = 6): string {
  const o = clamp01(open);
  const k = 0.14 + 0.66 * o; // radius of the iris opening
  const twist = (1 - o) * 0.9 - Math.PI / 2; // blades rotate as they stop down
  let d = RIM;
  for (let i = 0; i < blades; i++) {
    const a0 = twist + (i / blades) * Math.PI * 2;
    const a1 = twist + ((i + 1) / blades) * Math.PI * 2;
    const x0 = Math.cos(a0) * k;
    const y0 = Math.sin(a0) * k;
    const x1 = Math.cos(a1) * k;
    const y1 = Math.sin(a1) * k;
    // Each blade edge runs along one side of the iris polygon and on to the rim.
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const dx = (x1 - x0) / len;
    const dy = (y1 - y0) / len;
    const b = x0 * dx + y0 * dy;
    const t = -b + Math.sqrt(Math.max(0, b * b - (x0 * x0 + y0 * y0 - 1)));
    d += ` M${x0.toFixed(4)},${y0.toFixed(4)} L${(x0 + dx * t).toFixed(4)},${(y0 + dy * t).toFixed(4)}`;
  }
  return d;
}

interface ApertureProps {
  /** px number, or a CSS length such as "100%" when the parent sizes it. */
  size?: number | string;
  open?: number;
  color?: string;
  strokeWidth?: number;
  glow?: boolean;
  className?: string;
  /** For sections that drive the iris per frame. */
  pathRef?: Ref<SVGPathElement>;
}

export default function Aperture({
  size = 16,
  open = 0.55,
  color = "var(--hue)",
  strokeWidth = 1,
  glow = false,
  className,
  pathRef,
}: ApertureProps) {
  const d = aperturePath(open);
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="-1.2 -1.2 2.4 2.4"
      fill="none"
      style={{ overflow: "visible" }}
    >
      {/* the glow is drawn, not filtered: two soft under-strokes instead of a
          drop-shadow, which re-blurred the whole drawing on every frame the
          iris moved */}
      {glow ? (
        <>
          <path data-iris="" d={d} stroke={color} strokeWidth={strokeWidth * 9} strokeOpacity={0.07} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path data-iris="" d={d} stroke={color} strokeWidth={strokeWidth * 3.5} strokeOpacity={0.22} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>
      ) : null}
      <path
        ref={pathRef}
        data-iris=""
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

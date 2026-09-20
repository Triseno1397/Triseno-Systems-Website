import type { GlyphKind } from "@/lib/divisions";
import { glyphSvgPath } from "@/lib/glyph-path";

interface GlyphProps {
  kind: GlyphKind;
  /** px number, or any CSS length such as "100%" when the parent sizes it. */
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  /** Glow is allowed on the division glyph (design-system §2). */
  glow?: boolean;
  className?: string;
}

export default function Glyph({
  kind,
  size = 16,
  color = "currentColor",
  strokeWidth = 1,
  glow = false,
  className,
}: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="-1.4 -1.4 2.8 2.8"
      fill="none"
      style={{
        overflow: "visible",
        filter: glow ? `drop-shadow(0 0 ${typeof size === "number" ? Math.max(4, size / 5) : 14}px ${color})` : undefined,
      }}
    >
      <path
        d={glyphSvgPath(kind)}
        stroke={color}
        strokeLinejoin="miter"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

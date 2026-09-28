import { MARK_OUTLINE } from "@/components/portal/markOutline";

/* The Triseno TS mark as inline SVG, drawn from the same traced outlines the
   Operator's reactor uses, so every mark on the site is the one logo. Solid by
   default; `line` draws it as a hairline outline (UI line-work, §2). */

const PIECES = MARK_OUTLINE.map(
  (pts) => "M" + pts.map(([x, y]) => `${x.toFixed(4)} ${(-y).toFixed(4)}`).join("L") + "Z",
);

const xs = MARK_OUTLINE.flat().map(([x]) => x);
const ys = MARK_OUTLINE.flat().map(([, y]) => -y);
const PAD = 0.01;
const X0 = Math.min(...xs) - PAD;
const Y0 = Math.min(...ys) - PAD;
const W = Math.max(...xs) - X0 + PAD;
const H = Math.max(...ys) - Y0 + PAD;

/** width / height of the mark, for callers that size a box around it */
export const MARK_ASPECT = W / H;

interface TrisenoMarkProps {
  /** height in px, or any CSS length; width follows the mark's aspect */
  size?: number | string;
  variant?: "solid" | "line";
  /** hairline width in screen px for the line variant */
  strokeWidth?: number;
  color?: string;
  className?: string;
  /** set when the mark stands alone and must be announced */
  title?: string;
}

export default function TrisenoMark({
  size,
  variant = "solid",
  strokeWidth = 1,
  color = "currentColor",
  className,
  title,
}: TrisenoMarkProps) {
  const line = variant === "line";
  return (
    <svg
      className={className}
      viewBox={`${X0} ${Y0} ${W} ${H}`}
      height={size}
      width={typeof size === "number" ? Math.round(size * MARK_ASPECT * 10) / 10 : undefined}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {PIECES.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={line ? "none" : color}
          stroke={line ? color : "none"}
          strokeWidth={line ? strokeWidth : undefined}
          strokeLinejoin="round"
          vectorEffect={line ? "non-scaling-stroke" : undefined}
        />
      ))}
    </svg>
  );
}

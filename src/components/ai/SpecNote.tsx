"use client";

import { useId, useState } from "react";
import "@/app/ai-projection.css";
import { creditFor } from "./projection.content";
import { useSpec } from "./OperatorKeys";

/* ─────────────────────────────────────────────────────────────────────────
   SPEC NOTE — a figure showing its working. A cyan hairline box in Geist
   Mono with a 1px leader back to one corner of the figure, written by
   whoever built it and read from CREDITS (projection.content.ts), the same
   table the credits roll prints, so the two can never disagree.

   Hidden until html[data-spec] (the slate's SPEC button, or x); then it
   fades up 8px with a 40 ms stagger by note index. At most two notes per
   figure (n = 0 | 1), and never over a figure's interaction area: the
   caller chooses the corner and the offset.

   Place it inside a figure whose container is position: relative:

     <SpecNote fig="04" at="tr" dx={24} dy={28} />
     <SpecNote fig="04" n={1} at="bl" dx={24} dy={40} tone="dark" />

   dx / dy are measured inward from the anchor corner (positive = into the
   figure); the leader runs from that corner to the note's nearest corner.
   Phones (no hover): the note is a 28px "+" chip at the corner that opens
   the text on tap. Reduced motion: no translate.
   ───────────────────────────────────────────────────────────────────────── */

export type SpecNoteProps = {
  /** the credit's figure id: "01", "01b", "03", "04" ... */
  fig: string;
  /** which of the figure's two notes */
  n?: 0 | 1;
  /** the figure corner the leader starts from */
  at?: "tl" | "tr" | "bl" | "br";
  /** px inward from the corner, horizontally */
  dx?: number;
  /** px inward from the corner, vertically */
  dy?: number;
  /** "dark" inside a dark band (the stack film, the night, the gate) */
  tone?: "paper" | "dark";
  /** override the text (otherwise CREDITS[fig].notes[n]) */
  text?: string;
  className?: string;
};

export default function SpecNote({ fig, n = 0, at = "tr", dx = 24, dy = 24, tone = "paper", text, className }: SpecNoteProps) {
  const id = useId();
  const spec = useSpec();
  const [open, setOpen] = useState(false);
  const body = text ?? creditFor(fig)?.notes[n];
  if (!body) return null;

  // the leader: anchored at the corner, pointing along the figure's top or
  // bottom edge, rotated toward the note's nearest corner. CSS rotate is
  // clockwise: a right-pointing bar (left corners) dips on a positive angle,
  // a left-pointing bar (right corners) rises on one, so the sign flips per
  // corner: tl and br positive, tr and bl negative.
  const len = Math.hypot(dx, dy);
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const ang = at === "tl" || at === "br" ? deg : -deg;
  const shown = spec || open;

  return (
    <div
      className={`ai-spec ai-spec--${at}${tone === "dark" ? " ai-spec--dark" : ""}${className ? ` ${className}` : ""}`}
      data-n={n}
      data-open={open ? "" : undefined}
      aria-hidden={shown ? undefined : true}
      style={{
        ["--dx" as string]: `${dx}px`,
        ["--dy" as string]: `${dy}px`,
        ["--len" as string]: `${len.toFixed(1)}px`,
        ["--ang" as string]: `${ang.toFixed(2)}deg`,
        ["--n" as string]: n,
      }}
    >
      <span aria-hidden="true" className="ai-spec__dot" />
      <span aria-hidden="true" className="ai-spec__leader" />
      <button
        type="button"
        className="ai-spec__chip"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Spec note, figure ${fig}`}
        onClick={() => setOpen((o) => !o)}
      >
        +
      </button>
      <p id={id} className="ai-spec__note">
        <b>Fig. {fig}</b>
        {body}
      </p>
    </div>
  );
}

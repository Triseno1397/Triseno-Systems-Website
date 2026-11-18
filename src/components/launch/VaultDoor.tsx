import type { CSSProperties } from "react";

/**
 * The vault door: a brushed-gold disc ringed by one lock per launch spot.
 * A thrown (gold) bolt is a reserved spot; an empty socket with a lit lamp is
 * an open one. The dial reads the open count. Drawn in CSS only (launch.css);
 * the count is real (see lib/launch.ts). `sealed` throws every bolt and shows
 * a check mark instead of a number (the confirmation page).
 */
export default function VaultDoor({
  total,
  left,
  caption,
  sealed = false,
  unlocking = false,
}: {
  total: number;
  left: number;
  caption: string;
  sealed?: boolean;
  unlocking?: boolean;
}) {
  const booked = sealed ? total : total - left;
  const open = sealed ? 0 : left;
  return (
    <div
      className="vd"
      data-unlock={unlocking ? "" : undefined}
      data-sealed={sealed ? "" : undefined}
      style={{ ["--rest" as string]: `${open * -30}deg` } as CSSProperties}
      role="img"
      aria-label={
        sealed
          ? "The vault door, locked: your spot is held."
          : `The vault door: ${booked} of ${total} locks thrown, ${open} open.`
      }
    >
      <span className="vd__halo" />
      <span className="vd__frame" />
      <span className="vd__groove" />
      {Array.from({ length: total }, (_, i) => {
        const state = i < booked ? "reserved" : i === booked ? "next" : "open";
        return (
          <span
            key={i}
            className="vd__bolt"
            style={{ ["--a" as string]: `${(360 / total) * i}deg`, ["--i" as string]: i } as CSSProperties}
          >
            <span className="vd__slot" data-state={state}>
              <i className="vd__pin" />
            </span>
          </span>
        );
      })}
      <span className="vd__door">
        <span className="vd__rivets" />
        <span className="vd__glint" />
      </span>
      <span className="vd__dial">
        <span className="vd__ticks" />
        <span className="vd__read">
          <b className="vd__n">{sealed ? "✓" : open}</b>
          <span className="vd__l">{caption}</span>
        </span>
      </span>
      <span className="vd__index" />
    </div>
  );
}

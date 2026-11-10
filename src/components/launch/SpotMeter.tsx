import type { Spots } from "@/lib/launch";

/**
 * "4 of 6 November launch spots open": one cell per spot, booked cells filled.
 * The numbers come from launchSpots() (paid deposits + Tristen's own count).
 */
export default function SpotMeter({ spots }: { spots: Spots }) {
  // this month full: show it at 0, all cells taken, and point to the next month
  const full = Boolean(spots.fullMonth);
  const left = full ? 0 : spots.left;
  const month = spots.fullMonth ?? spots.label;
  const booked = spots.total - left;
  const label = full
    ? `0 of ${spots.total} ${month} launch spots open. ${spots.label} is open: ${spots.left} of ${spots.total} spots.`
    : `${left} of ${spots.total} ${month} launch spots open`;
  return (
    <div className="lf-meter" role="img" aria-label={label}>
      <div className="lf-meter__cells" aria-hidden="true">
        {Array.from({ length: spots.total }, (_, i) => (
          <span key={i} className="lf-meter__cell" data-taken={i < booked ? "" : undefined} />
        ))}
      </div>
      <p className="lf-meter__text" aria-hidden="true">
        <b className="font-display">{left}</b>
        <span>
          of {spots.total} {month} launch spots open
          {full ? <em>Fully booked · {spots.label} is open</em> : null}
        </span>
      </p>
    </div>
  );
}

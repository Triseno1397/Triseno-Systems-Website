import type { Spots } from "@/lib/launch";

/**
 * "4 of 6 November launch spots open": one cell per spot, booked cells filled.
 * The numbers come from launchSpots() (paid deposits + Tristen's own count).
 */
export default function SpotMeter({ spots }: { spots: Spots }) {
  const booked = spots.total - spots.left;
  return (
    <div className="lf-meter" role="img" aria-label={`${spots.left} of ${spots.total} ${spots.label} launch spots open`}>
      <div className="lf-meter__cells" aria-hidden="true">
        {Array.from({ length: spots.total }, (_, i) => (
          <span key={i} className="lf-meter__cell" data-taken={i < booked ? "" : undefined} />
        ))}
      </div>
      <p className="lf-meter__text" aria-hidden="true">
        <b className="font-display">{spots.left}</b>
        <span>
          of {spots.total} {spots.label} launch spots open
          {spots.fullMonth ? <em>{spots.fullMonth} is fully booked</em> : null}
        </span>
      </p>
    </div>
  );
}

"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import { WarpLink } from "./WarpProvider";
import { useLaunchSpots } from "@/lib/useLaunchSpots";

/**
 * The site-wide launch-spot ticker: a glass pill at the top centre of every
 * page. Six slot ticks show the month at a glance (booked ones filled, the
 * next open one breathing), a line of text rolls through the count, the
 * deposit and the reset date, and a white button takes you to /launch.
 * The count is real (see lib/launch.ts). Everything is transform / opacity;
 * under reduced motion it is one still line.
 */
export default function LaunchTicker() {
  const s = useLaunchSpots();
  if (!s) return null;

  const booked = s.total - s.left;
  const lines = s.full
    ? [`${s.month} is fully booked`, `Join ${s.next} · $100 deposit`, `${s.next} spots open now`]
    : [`${s.left} of ${s.total} ${s.month} spots open`, "$100 deposit · refundable", `Resets ${s.resetLabel} 1`];
  const label = s.full
    ? `${s.month} launch spots are fully booked. Join ${s.next} with a $100 deposit.`
    : `Reserve a launch spot: ${s.left} of ${s.total} ${s.month} spots open, $100 deposit.`;

  return (
    <div className="lt-wrap">
      <WarpLink href="/launch" aria-label={label} className="lt" data-low={!s.full && s.left <= 2 ? "" : undefined}>
        <span className="lt__pulse" aria-hidden="true">
          <i />
        </span>
        <span className="lt__slots" aria-hidden="true">
          {Array.from({ length: s.total }, (_, i) => (
            <i key={i} data-state={i < booked ? "booked" : i === booked ? "next" : "open"} style={{ ["--i" as string]: i }} />
          ))}
        </span>
        <span className="lt__roll" aria-hidden="true">
          {lines.map((t, i) => (
            <span key={t} style={{ ["--i" as string]: i }}>
              {t}
            </span>
          ))}
        </span>
        <span className="lt__short" aria-hidden="true">
          {s.full ? "Full" : `${s.left}/${s.total} open`}
        </span>
        <span className="lt__cta" aria-hidden="true">
          <span>Reserve</span>
          <ArrowUpRight size={14} weight="bold" />
          <i className="lt__sheen" />
        </span>
      </WarpLink>
    </div>
  );
}

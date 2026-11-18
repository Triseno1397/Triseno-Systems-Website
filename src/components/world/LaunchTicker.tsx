"use client";

import { useEffect, useState } from "react";
import { WarpLink } from "./WarpProvider";
import { useLaunchSpots } from "@/lib/useLaunchSpots";

/**
 * The launch vault plate: a small piece of brass hardware at the top of every
 * page. The open-spot count sits in a mechanical drum that rolls up to the
 * real number when the page arrives (and again every so often), a row of pins
 * shows the month (gold = locked, lit = open), and a foil key button opens
 * /launch. The count is real (lib/launch.ts). Transform and opacity only; one
 * still plate under reduced motion.
 */
export default function LaunchTicker() {
  const s = useLaunchSpots();
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (!s) return;
    const id = window.setInterval(() => setSpin((n) => n + 1), 14000);
    return () => window.clearInterval(id);
  }, [s]);
  if (!s) return null;

  const booked = s.total - s.left;
  const digits = Array.from({ length: s.total + 1 }, (_, i) => i);
  const label = s.full
    ? `Launch vault: ${s.month} is fully booked. Join ${s.next} with a $100 deposit.`
    : `Launch vault: ${s.left} of ${s.total} ${s.month} places open. Reserve one with a $100 deposit.`;

  return (
    <div className="vt-wrap">
      <WarpLink href="/launch" aria-label={label} className="vt">
        <span className="vt__plate" aria-hidden="true">
          <small>Launch vault</small>
          <b>
            <span className="vt__mo-full">{s.month}</span>
            <span className="vt__mo-short">{s.month.slice(0, 3)}</span>
          </b>
        </span>
        <span className="vt__window" aria-hidden="true">
          <span className="vt__digits">
            <ol key={spin} className="vt__drum" style={{ ["--n" as string]: s.left }}>
              {digits.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </span>
          <span className="vt__of">{s.full ? "full" : `of ${s.total} open`}</span>
          <span className="vt__pins">
            {Array.from({ length: s.total }, (_, i) => (
              <i key={i} data-on={i < booked ? "" : undefined} style={{ ["--i" as string]: i }} />
            ))}
          </span>
        </span>
        <span className="vt__key" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <circle cx="12" cy="8.6" r="4.4" />
            <path d="M10.1 12.2h3.8l1.5 8.3H8.6z" />
          </svg>
          <span>{s.full ? "Join" : "Unlock"}</span>
          <i className="vt__sheen" />
        </span>
      </WarpLink>
    </div>
  );
}

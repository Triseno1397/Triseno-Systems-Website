"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowDown } from "@phosphor-icons/react";
import GlassPanel from "@/components/world/GlassPanel";
import Glyph from "@/components/world/Glyph";
import { getLenis } from "@/components/world/SmoothScroll";
import { DEPOSIT_LABEL } from "@/components/launch/schema";
import type { Spots } from "@/lib/launch";

const HUE = "#9d5cff";

/**
 * The first screen of /launch: the month's launch spots as six physical slots.
 * Reserved slots fill white, the first open one is marked "Next up". The count
 * is real (paid deposits + Tristen's own count, see lib/launch.ts). Everything
 * plays once on arrival; nothing is tied to scroll.
 */
export default function LaunchHero({ spots, resetLabel }: { spots: Spots; resetLabel: string }) {
  const full = Boolean(spots.fullMonth);
  const month = spots.fullMonth ?? spots.label;
  const left = full ? 0 : spots.left;
  const booked = spots.total - left;

  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toForm = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("reserve");
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { offset: -24, duration: 1.2 });
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true }), 1300);
  };

  const cta = full ? `Join ${spots.label} · ${DEPOSIT_LABEL}` : `Reserve my spot · ${DEPOSIT_LABEL}`;
  const caption = full ? `${month} is fully booked` : `${month} launch spots open`;

  return (
    <section
      ref={ref}
      data-rail="Spots"
      data-in={inView ? "" : undefined}
      aria-labelledby="launch-title"
      className="contact-section lh"
    >
      <div className="lh__top">
        <p className="contact-label">
          <Glyph kind="square" size={12} color={HUE} strokeWidth={1.25} />
          <span>Launch spots · {month}</span>
        </p>
        <p className="contact-label lh__reset">
          {full ? `${spots.label} is open now` : `Resets ${resetLabel} 1`}
        </p>
      </div>

      <div className="lh__head">
        <h1 id="launch-title" className="lh__title font-display font-bold uppercase">
          <span>Reserve your</span>
          <span>launch spot</span>
        </h1>
        <p className="lh__count" aria-label={`${left} of ${spots.total} ${caption}`}>
          <span className="lh__num font-display" aria-hidden="true">
            {left}
            <small>/{spots.total}</small>
          </span>
          <span className="lh__caption" aria-hidden="true">
            {caption}
          </span>
        </p>
      </div>

      <GlassPanel world="portal" as="div" veil={0.42} className="lb">
        <ol className="lb__cells" aria-label={`${spots.total} ${month} launch spots`}>
          {Array.from({ length: spots.total }, (_, i) => {
            const state = i < booked ? "reserved" : i === booked ? "next" : "open";
            return (
              <li
                key={i}
                className="lb__cell"
                data-state={state}
                style={{ ["--i" as string]: i }}
                aria-label={`Spot ${i + 1}: ${state === "reserved" ? "reserved" : "open"}`}
              >
                <span className="lb__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="lb__state" aria-hidden="true">
                  {state === "next" ? (
                    <>
                      <i className="lb__dot" />
                      Next up
                    </>
                  ) : state === "reserved" ? (
                    "Reserved"
                  ) : (
                    "Open"
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </GlassPanel>

      <div className="lh__foot">
        <a href="#reserve" onClick={toForm} className="ghost-btn lh__cta">
          <span className="ghost-btn__layer">
            <span>{cta}</span>
            <ArrowDown size={16} weight="light" aria-hidden="true" />
          </span>
          <span className="ghost-btn__layer ghost-btn__fill" aria-hidden="true">
            <span>{cta}</span>
            <ArrowDown size={16} weight="light" />
          </span>
        </a>
        <p className="lh__note">
          {full
            ? `Every ${month} spot is taken. A ${DEPOSIT_LABEL} deposit holds one of the first ${spots.label} spots.`
            : `A ${DEPOSIT_LABEL} deposit holds your spot and goes toward your site. Refunded in full if you pass on the preview.`}
        </p>
      </div>
    </section>
  );
}

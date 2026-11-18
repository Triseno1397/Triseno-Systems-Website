"use client";

import { useState } from "react";
import { ArrowDown } from "@phosphor-icons/react";
import VaultDoor from "./VaultDoor";
import { DEPOSIT_LABEL } from "@/components/launch/schema";
import type { Spots } from "@/lib/launch";

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** The first screen of /launch: the headline, the door, and the way in. */
export default function VaultHero({ spots, resetLabel }: { spots: Spots; resetLabel: string }) {
  const [unlocking, setUnlocking] = useState(false);
  const full = Boolean(spots.fullMonth);
  const month = spots.fullMonth ?? spots.label;
  const left = full ? 0 : spots.left;
  const word = WORDS[spots.total] ?? String(spots.total);

  const go = () => {
    const target = document.getElementById("reserve");
    if (!target || unlocking) return;
    setUnlocking(true);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => {
        target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
        window.setTimeout(() => {
          target.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
          setUnlocking(false);
        }, calm ? 0 : 900);
      },
      calm ? 0 : 700,
    );
  };

  return (
    <section className="vh" aria-labelledby="vault-title">
      <div className="vh__head">
        <p className="v-eyebrow">
          <i aria-hidden="true" />
          <span>Launch Vault · {month}</span>
        </p>
        <h1 id="vault-title" className="vh__title">
          {full ? (
            <>
              <span>{month} is full.</span> <em>{spots.label} is open.</em>
            </>
          ) : (
            <>
              <span>{word} places.</span> <em>One of them is yours.</em>
            </>
          )}
        </h1>
      </div>

      <div className="vh__door">
        <VaultDoor
          total={spots.total}
          left={left}
          unlocking={unlocking}
          caption={full ? "all locked" : left === 1 ? "place open" : "places open"}
        />
        <p className="vh__legend" aria-hidden="true">
          <span>
            <i className="vh__sw vh__sw--on" />
            Locked, reserved
          </span>
          <span>
            <i className="vh__sw vh__sw--lit" />
            Lit, open
          </span>
        </p>
      </div>

      <div className="vh__body">
        <p className="vh__sub">
          {full
            ? `Every ${month} place is taken. A ${DEPOSIT_LABEL} deposit holds one of the first ${spots.label} places, and goes toward your site. Refunded in full if you pass on the preview.`
            : `Every month we take on ${word.toLowerCase()} launch projects, each a custom website built around one business. ${
                left === 1 ? "One place is" : `${WORDS[left] ?? left} places are`
              } still open in ${month}. A ${DEPOSIT_LABEL} deposit holds yours and goes toward your site. Refunded in full if you pass on the preview.`}
        </p>
        <div className="vh__cta">
          <a href="#reserve" onClick={(e) => (e.preventDefault(), go())} className="v-btn">
            <span>{full ? `Join ${spots.label}` : "Unlock a place"}</span>
            <b>{DEPOSIT_LABEL}</b>
            <ArrowDown size={16} weight="bold" aria-hidden="true" />
            <i className="v-btn__sheen" aria-hidden="true" />
          </a>
          <p className="vh__reset">{full ? `${spots.label} is open now` : `Resets ${resetLabel} 1`}</p>
        </div>
      </div>
    </section>
  );
}

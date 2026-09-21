"use client";

import { useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import GlassPanel from "@/components/world/GlassPanel";
import Aperture from "./Aperture";
import { useMediaQuery } from "./media";
import { TESTIMONIALS, type Testimonial } from "./testimonials";

/* ─────────────────────────────────────────────────────────────────────────
   /studio §4 — testimonials marquee (site-map.md), tailored: two
   counter-scrolling rows of 0-radius hairline cards. A row pauses while it is
   hovered or holds focus, the whole wall pauses from the toggle, and the
   hovered card's aperture opens and lifts its outcome readout.
   Reduced motion: the rows stop and become ordinary horizontal scrollers.
   ───────────────────────────────────────────────────────────────────────── */

const half = Math.ceil(TESTIMONIALS.length / 2);
const ROWS: Testimonial[][] = [TESTIMONIALS.slice(0, half), TESTIMONIALS.slice(half)];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Generated portrait; falls back to a monogram if the file is missing. */
function Portrait({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="sx-card__face" data-failed={failed ? "" : undefined}>
      <span className="sx-card__mono font-mono" aria-hidden="true">
        {initials(name)}
      </span>
      {failed ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/testimonials/${slug(name)}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

// The wall's second (looping) copy is aria-hidden at the set level.
function Card({ t }: { t: Testimonial }) {
  return (
    <GlassPanel world="creative" as="article" className="sx-card">
      <header className="sx-card__head font-mono">
        <span className="sx-card__glyph">
          <Aperture size={22} open={0.28} strokeWidth={1.25} className="sx-card__iris sx-card__iris--shut" />
          <Aperture size={22} open={0.92} strokeWidth={1.25} glow className="sx-card__iris sx-card__iris--open" />
        </span>
        <span>
          {t.format} <i>/</i> {t.platform}
        </span>
      </header>
      <blockquote className="sx-card__quote font-sans font-light">“{t.quote}”</blockquote>
      <div className="sx-card__by">
        <Portrait name={t.name} />
        <span className="sx-card__who">
          <span className="font-display font-medium uppercase">{t.name}</span>
          <span className="font-mono">
            {t.role} · {t.company}
          </span>
          <span className="sx-card__note font-mono">{t.note}</span>
        </span>
      </div>
    </GlassPanel>
  );
}

function Row({ row, dir }: { row: Testimonial[]; dir: "left" | "right" }) {
  return (
    <div className="sx-marquee" data-dir={dir}>
      <div className="sx-marquee__track">
        <div className="sx-marquee__set">
          {row.map((t) => (
            <Card key={t.name} t={t} />
          ))}
        </div>
        {/* Second copy closes the loop; hidden from assistive tech. */}
        <div className="sx-marquee__set" aria-hidden="true">
          {row.map((t) => (
            <Card key={t.name} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProofMarquee() {
  const [paused, setPaused] = useState(false);
  // Under 768px the rows are a snap scroller, not a marquee, so there is
  // nothing to pause — the wall is swiped a whole card at a time instead.
  const wide = useMediaQuery("(min-width: 768px)");

  return (
    <section data-rail="Proof" className="sx-proof" aria-labelledby="sx-proof-title">
      {/* The headline is set INTO the wall, between its two counter-running
          rows — not a heading-and-paragraph block above a component. */}
      <div className="sx-proof__wall" data-paused={paused ? "" : undefined}>
        <Row row={ROWS[0]} dir="left" />
        <header className="sx-proof__band">
          <p className="sx-kicker font-mono">
            <Aperture size={14} strokeWidth={1.25} glow />
            Proof — the Triseno edge
          </p>
          <h2 id="sx-proof-title" className="sx-proof__title font-display font-bold uppercase">
            Agency-grade work, without the agency timeline.
          </h2>
        </header>
        <Row row={ROWS[1]} dir="right" />
      </div>

      <div className="sx-proof__foot">
        <p className="sx-proof__lede font-sans font-light">
          Triseno was built on an AI-powered production pipeline, and that engine never left. It&apos;s how we generate
          more concepts, version creative for every placement, and turn briefs around in days.
        </p>
        <div className="sx-proof__aside font-mono">
          {wide ? (
            <button type="button" className="sx-sound" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? (
                <Play size={14} weight="light" aria-hidden="true" />
              ) : (
                <Pause size={14} weight="light" aria-hidden="true" />
              )}
              {paused ? "Resume wall" : "Hold the wall"}
            </button>
          ) : (
            <span className="sx-proof__swipe">Swipe a row</span>
          )}
          {/* Honest, and quiet: this wall demonstrates the component. */}
          <p className="sx-proof__note">
            An illustrative wall. The clients, their words and their portraits are fictional — set here to show how
            the component carries real ones.
          </p>
        </div>
      </div>
    </section>
  );
}

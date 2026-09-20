"use client";

import { useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import Aperture from "./Aperture";
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

function Card({ t, hidden }: { t: Testimonial; hidden?: boolean }) {
  return (
    <figure className="sx-card" aria-hidden={hidden || undefined}>
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
      <figcaption className="sx-card__by">
        <span className="font-display font-medium uppercase">{t.name}</span>
        <span className="font-mono">
          {t.role} · {t.company}
        </span>
        <span className="sx-card__note font-mono">{t.note}</span>
      </figcaption>
    </figure>
  );
}

export default function ProofMarquee() {
  const [paused, setPaused] = useState(false);

  return (
    <section data-rail="Proof" className="sx-proof" aria-labelledby="sx-proof-title">
      <div aria-hidden="true" className="sx-glow sx-glow--high" />

      <header className="sx-proof__head">
        <div>
          <p className="sx-kicker font-mono">
            <Aperture size={14} strokeWidth={1.25} glow />
            Proof — the Triseno edge
          </p>
          <h2 id="sx-proof-title" className="sx-h2 sx-h2--wide font-display font-semibold uppercase">
            Agency-grade work, without the agency timeline.
          </h2>
        </div>
        <div className="sx-proof__side">
          <p className="font-sans font-light">
            Triseno was built on an AI-powered production pipeline, and that engine never left. It&apos;s how we
            generate more concepts, version creative for every placement, and turn briefs around in days. You
            don&apos;t pay for the technology. You pay for the speed, the volume, and the edge it buys you.
          </p>
          <ul className="sx-tags font-mono">
            <li>AI-accelerated</li>
            <li>Concepts at volume</li>
            <li>Multi-placement</li>
            <li>Founder-led</li>
          </ul>
        </div>
      </header>

      <div className="sx-proof__wall" data-paused={paused ? "" : undefined}>
        {ROWS.map((row, r) => (
          <div key={r} className="sx-marquee" data-dir={r % 2 ? "right" : "left"}>
            <div className="sx-marquee__track">
              <div className="sx-marquee__set">
                {row.map((t) => (
                  <Card key={t.name} t={t} />
                ))}
              </div>
              {/* Second copy closes the loop; hidden from assistive tech. */}
              <div className="sx-marquee__set" aria-hidden="true">
                {row.map((t) => (
                  <Card key={t.name} t={t} hidden />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sx-proof__foot font-mono">
        <button type="button" className="sx-sound" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
          {paused ? (
            <Play size={14} weight="light" aria-hidden="true" />
          ) : (
            <Pause size={14} weight="light" aria-hidden="true" />
          )}
          {paused ? "Resume wall" : "Pause wall"}
        </button>
        <span>Hover a row to hold it</span>
        <span className="sx-proof__sample">Showcase set — sample client names</span>
      </div>
    </section>
  );
}

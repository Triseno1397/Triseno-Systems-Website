"use client";

import { useCallback, useState } from "react";
import WorldPlate from "@/components/world/WorldPlate";
import Glyph from "@/components/world/Glyph";
import GlassPanel from "@/components/world/GlassPanel";
import { DIVISIONS, WHITE } from "@/lib/divisions";
import InquiryForm from "./InquiryForm";
import HiddenPortalSeal from "./HiddenPortalSeal";
import { EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, type ContactDivision } from "./form";

/**
 * /contact — achromatic (white hexagon glyph), on the revamp foundation: the
 * world chrome, the portal's gallery plate through WorldPlate, ContentFade and
 * GlassPanel like every other page.
 *
 * The form is about ONE division once you say which: from then on the scene
 * takes that division's hue as light (the plate's grade + floor spill) and the
 * form's own accents light in it. The UI stays white (design-system §2).
 * Before the choice, and on a fresh visit, the world is colourless.
 *
 *   01 inquiry (one page, tick what applies)
 *   02 direct line (email, Instagram) + the hidden portal seal
 */
export default function ContactPage() {
  const [division, setDivision] = useState<ContactDivision | "">("");
  const onDivision = useCallback((d: ContactDivision | "") => setDivision(d), []);
  const hue = division ? DIVISIONS[division].hue : WHITE;

  return (
    <main
      className="contact-world relative text-white"
      data-tinted={division ? "" : undefined}
      style={{ ["--cf-scene-hue" as string]: hue }}
    >
      <div aria-hidden="true" data-world-layer="" className="contact-world__scene">
        <WorldPlate world="portal" stations={false} hue={hue} tint={0.55} />
        <span className="contact-world__scrim contact-world__scrim--top" />
        <span className="contact-world__scrim contact-world__scrim--bottom" />
      </div>

      <section data-rail="Inquiry" aria-labelledby="contact-title" className="contact-section contact-hero">
        <div className="contact-hero__intro">
          <p className="contact-label">
            <Glyph kind="hexagon" size={12} color="#ffffff" strokeWidth={1.25} />
            <span>Start a Conversation</span>
          </p>
          <h1 id="contact-title" className="contact-display font-display font-bold uppercase">
            <span>Let&apos;s</span>
            <span>talk</span>
          </h1>
          <p className="contact-body contact-hero__sub">
            Tick what applies — it takes about a minute. Prefer a phone call? Say so and we&apos;ll ring you instead.
            We reply within one business day.
          </p>
        </div>
        <InquiryForm onDivision={onDivision} />
      </section>

      <section data-rail="Direct" aria-labelledby="contact-direct-title" className="contact-section contact-direct">
        <GlassPanel world="portal" className="contact-direct__copy">
          <p className="contact-label">Or reach us directly</p>
          <h2 id="contact-direct-title" className="contact-h2 font-display font-semibold uppercase">
            No form required
          </h2>
          <ul className="contact-direct__lines">
            <li>
              <span className="contact-label contact-direct__kind">Email</span>
              <a href={`mailto:${EMAIL}`} className="contact-direct__link world-underline">
                {EMAIL}
              </a>
            </li>
            <li>
              <span className="contact-label contact-direct__kind">Instagram</span>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="contact-direct__link world-underline">
                {INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
          <p className="contact-body">
            Los Angeles, California — working with brands anywhere. We reply within one business day, often sooner.
          </p>
        </GlassPanel>
        <div className="contact-direct__seal">
          <HiddenPortalSeal />
        </div>
      </section>
    </main>
  );
}

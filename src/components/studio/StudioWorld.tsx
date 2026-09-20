import type { CSSProperties } from "react";
import { DIVISIONS } from "@/lib/divisions";
import StudioBackdrop from "./StudioBackdrop";
import ExpansionHero from "./ExpansionHero";
import Filmstrip from "./Filmstrip";
import BehindReveal from "./BehindReveal";
import ProofMarquee from "./ProofMarquee";
import StudioGate from "./StudioGate";

/**
 * Triseno Creative — the Creative division world (`/studio`, amber, aperture).
 * A complete standalone pitch (D3): hero -> offer -> founder/process -> proof -> gate.
 *
 * StudioBackdrop is the page: one lit soundstage rendered once, behind every
 * section, with page scroll as its camera (bar.md 1 + 3). Every section below
 * is transparent and sits inside that one continuous move — no section owns a
 * background, so there are no flat black bands and no hard cuts between blocks.
 *
 * Five sections, five different motion mechanics (M1, design-loop/site-map.md):
 *   1 Showreel  scroll-expansion hero
 *   2 Formats   pinned horizontal filmstrip scrub
 *   3 Behind    split-line mask reveal
 *   4 Proof     counter-scrolling testimonial marquee
 *   5 Gate      aperture stop-down around the single CTA
 * The global chrome (lockup `TRISENO / CREATIVE`, rail, cursor, warp) comes from
 * WorldShell; this file owns nothing fixed to the viewport except the world.
 * Styles: app/studio.css.
 */
export default function StudioWorld() {
  return (
    <main className="studio-world" style={{ ["--hue" as string]: DIVISIONS.creative.hue } as CSSProperties}>
      <StudioBackdrop />
      <div className="studio-world__stations">
        <ExpansionHero />
        <Filmstrip />
        <BehindReveal />
        <ProofMarquee />
        <StudioGate />
      </div>
    </main>
  );
}

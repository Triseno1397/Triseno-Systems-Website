"use client";

import { useEffect } from "react";
import { DIVISIONS } from "@/lib/divisions";
import AiHero from "./AiHero";
import SignalTicker from "./SignalTicker";
import Capabilities from "./Capabilities";
import Compression from "./Compression";
import Interlude from "./Interlude";
import AgentConsole from "./AgentConsole";
import ProcessRail from "./ProcessRail";
import WhyTriseno from "./WhyTriseno";
import AiGate from "./AiGate";
import Descent from "./Descent";
import FaqSection from "@/components/world/FaqSection";
import SignOff from "@/components/world/SignOff";

/**
 * /ai-infrastructure — the clean room.
 *
 * Every other page of the site is a dark world. This division is the one lit
 * room in it: paper, ink and a single signal colour (the division's cyan),
 * laid out as a numbered specification — seven sheets. Its world still
 * appears, but as figures: the cathedral nave printed as 1-bit negatives that
 * a lens develops back into the real frame. At the end an iris opens the paper
 * onto that dark world in full colour, and the gate stands in it, so leaving
 * the page returns you to the site's dark.
 *
 *   01 hero (decode + dither lens) · ticker · 02 capabilities (accordion)
 *   03 compression (scrubbed draw) · Fig. 02 interlude · 04 industries (agent
 *   trace) · 05 process (drag rail) · 06 compare (switch) · questions
 *   07 gate (iris descent) · sign-off
 *
 * `data-clean` on <html> flips the shared chrome (nav, rail, corner buttons,
 * cursor) to a difference blend while this page is mounted, so its white
 * line-work reads as ink on the paper and white again over the dark. Nothing
 * outside this page changes.
 */
export default function AiPage() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-clean", "");
    return () => root.removeAttribute("data-clean");
  }, []);

  return (
    <main className="ai-world ai-clean relative" style={{ ["--hue" as string]: DIVISIONS.ai.hue }}>
      <span aria-hidden="true" data-world-layer="" className="ai-paper" />
      <AiHero />
      <SignalTicker />
      <Capabilities />
      <Compression />
      <Interlude />
      <AgentConsole />
      <ProcessRail />
      <WhyTriseno />
      <FaqSection division="ai" />
      <Descent>
        <AiGate />
        <SignOff />
      </Descent>
    </main>
  );
}

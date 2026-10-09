"use client";

import { useEffect } from "react";
import { DIVISIONS } from "@/lib/divisions";
import AiHero from "./AiHero";
import SignalTicker from "./SignalTicker";
import FlowingCapabilities from "./FlowingCapabilities";
import IntakeReading from "./IntakeReading";
import MercuryCompression from "./MercuryCompression";
import AgentAnatomy from "./AgentAnatomy";
import NightWatch from "./NightWatch";
import Slate from "./Slate";
import OperatorKeys from "./OperatorKeys";
import ChapterFrame from "./ChapterFrame";
import Credits from "./Credits";
import { cleanDark } from "./cleanDark";
import ExpandInterlude from "./ExpandInterlude";
import StackFilm from "./StackFilm";
import AgentConsole from "./AgentConsole";
import ProcessRail from "./ProcessRail";
import WhyFlip from "./WhyFlip";
import AiAmbience from "./AiAmbience";
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
 *   01 hero (chrome core in a dotted globe, agent swarm; hold the core to dive
 *   through its skin into the nucleus and the liquid-chrome TS) · ticker
 *   02 capabilities (flowing menu) · 03 intake (the letter read into a record)
 *   04 compression (twelve mercury beads press into five agents; pull one)
 *   05 anatomy (push-in to one agent's floorplan) · 06 scale (scroll expand)
 *   07 stack (film + inspector, send request, trace waterfall) · 08 industries
 *   (scenes + console; the routing slip prints) · 09 night (twelve hours,
 *   unattended) · 10 process · 11 compare · questions · 12 gate (the ticket you
 *   tear) · credits roll · sign-off
 *   Page-wide: the slate (timecode, chapter, real fps), chapter frames, operator
 *   keys (?), SPEC notes, the session that the ticket prints back, and the
 *   ambience (grain, grid lens, label glint, gate streak on fast scroll).
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
    return () => {
      root.removeAttribute("data-clean");
      cleanDark.clear();
    };
  }, []);

  return (
    <main className="ai-world ai-clean relative" style={{ ["--hue" as string]: DIVISIONS.ai.hue }}>
      <span aria-hidden="true" data-world-layer="" className="ai-paper" />
      <span aria-hidden="true" data-world-layer="" className="ai-dive__dark" />
      <AiAmbience />
      <Slate />
      <OperatorKeys />
      <AiHero />
      <SignalTicker />
      <FlowingCapabilities />
      <ChapterFrame title="Intake" />
      <IntakeReading />
      <ChapterFrame title="Compression" />
      <MercuryCompression />
      <AgentAnatomy />
      <ChapterFrame title="Scale" />
      <ExpandInterlude />
      <ChapterFrame title="Stack" />
      <StackFilm />
      <AgentConsole />
      <ChapterFrame title="Night" />
      <NightWatch />
      <ProcessRail />
      <WhyFlip />
      <FaqSection division="ai" />
      <Descent>
        <AiGate />
        <Credits />
        <SignOff />
      </Descent>
    </main>
  );
}

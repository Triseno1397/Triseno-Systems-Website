"use client";

import { DIVISIONS } from "@/lib/divisions";
import AiWorld from "./AiWorld";
import AiHero from "./AiHero";
import Capabilities from "./Capabilities";
import Compression from "./Compression";
import OrbitalProcess from "./OrbitalProcess";
import Industries from "./Industries";
import WhyTriseno from "./WhyTriseno";
import AiGate from "./AiGate";

/**
 * /ai-infrastructure. One world (AiWorld) renders behind every section from the
 * first frame to the last — nothing here paints its own background, so there is
 * no seam between sections; the scene slides instead of cutting.
 *
 * Section order, one idea per frame:
 *   01 hero · 02 capabilities (six frames, one card each) · 03 compression
 *   04 process · 05 industries · 06 why · 07 gate
 */
export default function AiPage() {
  return (
    <main className="ai-world relative text-white" style={{ ["--hue" as string]: DIVISIONS.ai.hue }}>
      <AiWorld />

      <AiHero />
      <Capabilities />
      <Compression />
      <OrbitalProcess />
      <Industries />
      <WhyTriseno />
      <AiGate />
    </main>
  );
}

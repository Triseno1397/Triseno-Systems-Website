"use client";

import WorldPlate from "@/components/world/WorldPlate";
import WorkIndex from "./WorkIndex";
import WorkGate from "./WorkGate";

/**
 * /work — achromatic (white diamond glyph). An index of what the studio can
 * build across the three divisions; each entry takes its division's hue only
 * while it is active. The world is the portal's monolith gallery, through the
 * shared WorldPlate, colourless (design-system §1). Sections:
 *   01 index (hover-distortion list + reflowing division filter) · 02 gate
 */
export default function WorkPage() {
  return (
    <main className="work-world relative text-white">
      <div aria-hidden="true" data-world-layer="" className="work-world__scene">
        <WorldPlate world="portal" stations={false} />
        <span className="work-world__scrim work-world__scrim--top" />
        <span className="work-world__scrim work-world__scrim--bottom" />
      </div>

      <WorkIndex />
      <WorkGate />
    </main>
  );
}

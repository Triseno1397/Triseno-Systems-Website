import type { CSSProperties } from "react";
import { DIVISIONS } from "@/lib/divisions";
import ShutterHero from "./ShutterHero";
import DemoFrame from "./DemoFrame";
import CompareReveal from "./CompareReveal";
import StackCards from "./StackCards";
import RangeGallery from "./RangeGallery";
import WebGate from "./WebGate";

/**
 * Web Design Division — violet world, square / frame glyph.
 * One motion mechanic per section (design-loop/site-map.md):
 * 1 shutter text · 2 container scroll · 3 compare reveal ·
 * 4 sticky stacking cards · 5 hover-swap gallery · 6 gate.
 */
export default function WebDivisionPage({ fontClassName = "" }: { fontClassName?: string }) {
  return (
    <main
      className={`web-world relative bg-black text-white ${fontClassName}`}
      style={{ "--hue": DIVISIONS.web.hue } as CSSProperties}
    >
      {/* The world: a fixed violet-lit floor that every section sits on. */}
      <div aria-hidden="true" className="web-scene">
        <span className="web-scene__glow" />
        <span className="web-scene__floor">
          <span className="web-scene__plane" />
        </span>
        <span className="web-scene__horizon" />
      </div>

      <ShutterHero />
      <DemoFrame />
      <CompareReveal />
      <StackCards />
      <RangeGallery />
      <WebGate />
    </main>
  );
}

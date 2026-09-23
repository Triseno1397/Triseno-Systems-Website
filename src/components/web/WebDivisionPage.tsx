import type { CSSProperties } from "react";
import { DIVISIONS } from "@/lib/divisions";
import WebWorld from "./WebWorld";
import ShutterHero from "./ShutterHero";
import DemoFrame from "./DemoFrame";
import CompareReveal from "./CompareReveal";
import StackCards from "./StackCards";
import RangeGallery from "./RangeGallery";
import WebGate from "./WebGate";
import FaqSection from "@/components/world/FaqSection";

/**
 * Web Design Division — violet world, square / frame glyph.
 * One continuous camera-driven volume (WebWorld); every section below is an
 * object standing inside it, registered as a station so the scene's light
 * moves with the scroll instead of sitting still behind a document.
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
      <WebWorld />

      <ShutterHero />
      <DemoFrame />
      <CompareReveal />
      <StackCards />
      <RangeGallery />
      <FaqSection division="web" />
      <WebGate />
    </main>
  );
}

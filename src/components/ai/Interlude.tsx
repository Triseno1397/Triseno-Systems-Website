"use client";

import { useRef } from "react";
import DitherLens from "./DitherLens";

/**
 * An interlude between sheets: one cinematic plate across the full width of
 * the page, printed like the hero's (Fig. 02, further down the nave). It
 * carries no copy of its own beyond its caption; it is the breath between the
 * capability sheets and the working ones.
 */
export default function Interlude() {
  const readoutRef = useRef<HTMLSpanElement>(null);
  return (
    <section aria-label="Figure 02" className="ai-interlude relative z-10">
      <div className="ai-interlude__frame">
        <DitherLens
          src="/worlds/ai-station2.webp"
          srcMobile="/worlds/ai-station2-mobile.webp"
          lens={0.3}
          readout={readoutRef}
          label="Further down the nave: pillars and light filaments printed as a one-bit negative, with a lens that shows the real image"
          className="ai-interlude__lens"
        />
        <p className="ai-interlude__stamp" aria-hidden="true">
          <span>Fig. 02</span>
          <span>Inside the layer</span>
        </p>
      </div>
      <div className="ai-wrap">
        <p className="ai-figcap">
          <span>
            <b>Fig. 02</b> Further down the nave. The same world, three sheets in.
          </span>
          <span ref={readoutRef} className="ai-figcap__read" aria-hidden="true">
            X 0.620  Y 0.460
          </span>
        </p>
      </div>
    </section>
  );
}

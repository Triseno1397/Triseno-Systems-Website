import Glyph from "@/components/world/Glyph";
import { HERO } from "./content";

/**
 * A band of ink across the sheet: the division's offer on a slow, endless
 * belt (CSS only: one translate, two copies of the run). Hovering it slows
 * the belt; reduced motion stops it.
 */
const RUN = [...HERO.offers, "Agent pipelines", "Fallback logic", "Owned by you"];

export default function SignalTicker() {
  const run = (hidden: boolean) => (
    <span className="ai-ticker__run" aria-hidden={hidden || undefined}>
      {RUN.map((item) => (
        <span key={item} className="ai-ticker__item">
          <Glyph kind="triangle" size={10} color="#00b4d8" strokeWidth={1.6} />
          {item}
        </span>
      ))}
    </span>
  );
  return (
    <div className="ai-ticker relative z-10" role="note" aria-label={RUN.join(", ")}>
      <div className="ai-ticker__belt" aria-hidden="true">
        {run(true)}
        {run(true)}
      </div>
    </div>
  );
}

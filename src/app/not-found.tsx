import GhostButton from "@/components/ui/GhostButton";
import TrisenoMark from "@/components/world/TrisenoMark";

/* 404: the TS mark, drawn large in hairline, standing over an empty address. */
export default function NotFound() {
  return (
    <main className="lost relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black px-[var(--gutter)] text-white">
      <div aria-hidden="true" className="lost__mark">
        <TrisenoMark variant="line" strokeWidth={1} color="#ffffff" />
      </div>
      <div className="lost__copy relative text-center">
        <p className="lost__eyebrow font-mono uppercase">404 / Off the map</p>
        <h1 className="lost__title font-display font-bold uppercase">Nothing built here</h1>
        <p className="lost__body">This address doesn&apos;t lead anywhere. The portal does.</p>
        <GhostButton href="/" className="lost__cta">Back to the portal</GhostButton>
      </div>
    </main>
  );
}

import type { ReactNode } from "react";
import type { Division } from "@/lib/divisions";
import Glyph from "./Glyph";
import GhostButton from "@/components/ui/GhostButton";

/**
 * Minimal stand-in for a world that has not been rebuilt yet. Shows the
 * division name, glyph and hue (D1) and says plainly that it is in build, so
 * portal navigation and the warp can be demonstrated end to end.
 */
interface DivisionPlaceholderProps {
  division: Division;
  line: string;
  children?: ReactNode;
}

export default function DivisionPlaceholder({ division, line, children }: DivisionPlaceholderProps) {
  return (
    <main className="placeholder-world relative bg-black text-white">
      <div aria-hidden="true" className="placeholder-world__scene">
        <span className="placeholder-world__glyph">
          <Glyph kind={division.glyph} size="100%" color={division.hue} strokeWidth={1.5} glow />
        </span>
      </div>

      <section
        data-rail={division.name}
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-center px-[var(--gutter)] pb-[96px] pt-[120px]"
      >
        <p className="chrome-label mb-6 flex items-center gap-3 font-mono">
          <Glyph kind={division.glyph} size={14} color={division.hue} strokeWidth={1.25} glow />
          <span>Triseno / {division.name} — in build</span>
        </p>
        <h1 className="placeholder-world__title font-display font-bold uppercase">{division.name}</h1>
        <p className="mt-6 max-w-[48ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
          {line}
        </p>
      </section>

      <section
        data-rail="Gate"
        data-rail-next="Contact"
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col items-start justify-center px-[var(--gutter)] pb-[120px] pt-[96px]"
      >
        <p className="chrome-label mb-6 font-mono">Next — Contact</p>
        <h2 className="placeholder-world__title font-display font-bold uppercase">This world is in build</h2>
        <p className="mt-6 max-w-[48ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
          The full page is on its way. The division is open for work now — start with a conversation.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <GhostButton href="/contact">Start a Conversation</GhostButton>
          {children}
        </div>
      </section>
    </main>
  );
}

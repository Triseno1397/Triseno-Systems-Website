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
    <main className="placeholder-world relative bg-black text-white" style={{ ["--hue" as string]: division.hue }}>
      <div aria-hidden="true" className="placeholder-world__scene">
        <span className="placeholder-world__glow" />
        <span className="placeholder-world__glyph">
          <Glyph kind={division.glyph} size={520} color={division.hue} strokeWidth={2} glow />
        </span>
        <span className="placeholder-world__glyph placeholder-world__glyph--mirror">
          <Glyph kind={division.glyph} size={520} color={division.hue} strokeWidth={2} glow />
        </span>
        <span className="placeholder-world__floor" />
      </div>

      <section
        data-rail={division.name}
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-end px-[var(--gutter)] pb-[calc(var(--gutter-y)+88px)] pt-[140px]"
      >
        <p className="mb-6 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em]">
          <Glyph kind={division.glyph} size={14} color={division.hue} strokeWidth={1.25} glow />
          <span>Triseno / {division.name} — in build</span>
        </p>
        <h1 className="placeholder-world__title font-display font-bold uppercase">{division.name}</h1>
        <p className="mt-6 max-w-[56ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
          {line}
        </p>
      </section>

      <section
        data-rail="Gate"
        data-rail-next="Contact"
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col items-start justify-center px-[var(--gutter)] py-[140px]"
      >
        <p className="mb-6 font-mono text-[12px] uppercase tracking-[0.2em]">Next — Contact</p>
        <h2 className="font-display text-[length:var(--fs-mid)] font-semibold uppercase leading-[1.15] tracking-[0.06em]">
          This world is in build
        </h2>
        <p className="mt-5 max-w-[56ch] font-sans text-[length:var(--fs-body)] font-light leading-[1.5] text-[color:var(--ink-secondary)]">
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

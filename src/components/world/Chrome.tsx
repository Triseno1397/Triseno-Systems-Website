"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CaretLeft, CaretUp, EnvelopeSimple } from "@phosphor-icons/react";
import {
  DIVISIONS,
  MENU_LABEL,
  MENU_ORDER,
  divisionForPath,
  type Division,
  type DivisionKey,
} from "@/lib/divisions";
import Glyph from "./Glyph";
import { WarpLink, useWarp } from "./WarpProvider";
import { lockScroll, scrollToTop } from "./SmoothScroll";

/* ─────────────────────────────────────────────────────────────────────────
   Persistent chrome — exactly five elements (design-system §4):
   1 lockup (TL) · 2 menu trigger (TR) · 3 back/up chevron (BL)
   4 contact icon (BR) · 5 section progress rail (right edge)
   All 1px white line-work, no fills, radius 0.
   ───────────────────────────────────────────────────────────────────────── */

const CONTACT_EMAIL = "Tristen@trisenosystems.com";
const MORPH_AT = 80;

export default function Chrome() {
  const pathname = usePathname() ?? "/";
  const division = divisionForPath(pathname);
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      setCompact(window.scrollY > MORPH_AT);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    lockScroll(menuOpen);
    return () => lockScroll(false);
  }, [menuOpen]);

  // Marks the routes that carry the world chrome, so the chrome's reserved
  // lanes (world.css) only inset pages that actually have chrome on them.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-world-chrome", "");
    return () => root.removeAttribute("data-world-chrome");
  }, []);

  return (
    <>
      {/* Content never collides with chrome: page content fades out through
          these neutral edge bands before it can reach the lockup, the trigger,
          the chevron or the contact icon (world.css .chrome-fade). */}
      <div aria-hidden="true" className="chrome-fade chrome-fade--top" />
      <div aria-hidden="true" className="chrome-fade chrome-fade--bottom" />
      <MorphNav
        division={division}
        compact={compact && !menuOpen}
        menuOpen={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
      />
      <MenuOverlay open={menuOpen} current={division.key} onClose={() => setMenuOpen(false)} />
      <BackChevron division={division} scrolled={compact} />
      <ContactIcon />
      <ProgressRail pathname={pathname} />
    </>
  );
}

/* ── 1 + 2: morphing scroll navbar ─────────────────────────────────────── */

function MorphNav({
  division,
  compact,
  menuOpen,
  onToggle,
}: {
  division: Division;
  compact: boolean;
  menuOpen: boolean;
  onToggle: () => void;
}) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const divisionRef = useRef<HTMLSpanElement>(null);
  const [wordWidth, setWordWidth] = useState(110);
  const [divisionWidth, setDivisionWidth] = useState(90);

  useEffect(() => {
    const measure = () => {
      if (wordRef.current) setWordWidth(wordRef.current.offsetWidth);
      if (divisionRef.current) setDivisionWidth(divisionRef.current.offsetWidth);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [division.key]);

  const tinted = division.hue !== "#ffffff";

  return (
    <header
      className="morph-nav pointer-events-none fixed inset-x-0 top-0 z-[860]"
      data-compact={compact ? "" : undefined}
      style={{ ["--word-w" as string]: `${wordWidth}px`, ["--div-w" as string]: `${divisionWidth}px` }}
    >
      <div className="relative mx-auto flex items-start justify-between px-[var(--gutter)]">
        <WarpLink
          href="/"
          aria-label={`Triseno / ${division.name} — go to portal`}
          className="morph-nav__lockup pointer-events-auto relative block h-[72px] w-[300px] max-w-[70vw] text-white"
        >
          <span ref={wordRef} className="morph-nav__word font-display font-bold uppercase">
            Triseno
          </span>
          <span ref={divisionRef} className="morph-nav__division font-display font-medium uppercase">
            <span className="opacity-60">/</span>
            <span>{division.name}</span>
            {division.key !== "portal" ? (
              <Glyph kind={division.glyph} size={12} color={division.hue} glow={tinted} strokeWidth={1.25} />
            ) : null}
          </span>
          <span aria-hidden="true" className="morph-nav__rule" />
        </WarpLink>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={menuOpen}
          aria-controls="world-menu"
          className="morph-nav__trigger pointer-events-auto flex h-[44px] items-center gap-4 text-white"
          data-open={menuOpen ? "" : undefined}
        >
          <span className="hidden font-display font-medium uppercase tracking-[0.24em] sm:block">
            {menuOpen ? "Close" : "Menu"}
          </span>
          <span aria-hidden="true" className="morph-nav__bars">
            <i />
            <i />
          </span>
          <span className="sr-only sm:hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
    </header>
  );
}

/* ── full-screen overlay menu ──────────────────────────────────────────── */

function MenuOverlay({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: DivisionKey;
  onClose: () => void;
}) {
  const [hover, setHover] = useState<DivisionKey | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { travel } = useWarp();

  useEffect(() => {
    if (!open) {
      setHover(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(".morph-nav__trigger, #world-menu a, #world-menu button"),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const items: DivisionKey[] = ["portal", ...MENU_ORDER];
  const shown = hover ?? current;
  const shownDivision = DIVISIONS[shown];

  return (
    <div
      id="world-menu"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      aria-hidden={!open}
      data-open={open ? "" : undefined}
      className="world-menu fixed inset-0 z-[850] overflow-hidden bg-black"
      // `inert` keeps the closed menu out of the tab order.
      inert={!open}
    >
      {/* The hovered destination's glyph — the only saturated element. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[6vw] hidden items-center md:flex">
        {items.map((key) => {
          const d = DIVISIONS[key];
          return (
            <div
              key={key}
              className="world-menu__glyph absolute right-0"
              data-on={shown === key && key !== "portal" ? "" : undefined}
            >
              <Glyph kind={d.glyph} size={420} color={d.hue} strokeWidth={1.5} glow />
            </div>
          );
        })}
      </div>

      <nav className="relative flex min-h-[100dvh] flex-col justify-center px-[var(--gutter)] pb-[96px] pt-[120px]">
        <p className="mb-8 font-mono text-[12px] uppercase tracking-[0.2em] text-white">
          {String(items.indexOf(shown) + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")} —{" "}
          {shownDivision.name}
        </p>
        <ul className="flex flex-col gap-3 md:gap-4">
          {items.map((key, i) => {
            const d = DIVISIONS[key];
            const lit = shown === key;
            return (
              <li key={key} className="world-menu__item" style={{ ["--i" as string]: i }}>
                <a
                  href={d.route}
                  aria-current={current === key ? "page" : undefined}
                  onMouseEnter={() => setHover(key)}
                  onFocus={() => setHover(key)}
                  onMouseLeave={() => setHover(null)}
                  onBlur={() => setHover(null)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    onClose();
                    if (key !== current) travel(d.route);
                  }}
                  className="world-menu__link font-display font-semibold uppercase"
                  data-lit={lit ? "" : undefined}
                >
                  {MENU_LABEL[key]}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4 font-mono text-[12px] uppercase tracking-[0.2em] text-white">
          <a href={`mailto:${CONTACT_EMAIL}`} className="world-underline">
            {CONTACT_EMAIL}
          </a>
          <a
            href="https://instagram.com/trisenosystems"
            target="_blank"
            rel="noopener noreferrer"
            className="world-underline"
          >
            Instagram
          </a>
        </div>
      </nav>
    </div>
  );
}

/* ── 3: back / up chevron (bottom-left) ────────────────────────────────── */

function BackChevron({ division, scrolled }: { division: Division; scrolled: boolean }) {
  const { travel } = useWarp();
  const isPortal = division.key === "portal";
  const up = isPortal || scrolled;

  const onClick = useCallback(() => {
    if (up) scrollToTop();
    else travel("/");
  }, [up, travel]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={up ? "Back to top" : "Back to portal"}
      className="chrome-btn chrome-btn--bl fixed bottom-[var(--gutter-y)] left-[var(--gutter)] z-[800]"
    >
      {up ? <CaretUp size={24} weight="light" /> : <CaretLeft size={24} weight="light" />}
    </button>
  );
}

/* ── 4: contact icon (bottom-right) ────────────────────────────────────── */

function ContactIcon() {
  return (
    <WarpLink
      href="/contact"
      aria-label="Contact — start a conversation"
      className="chrome-btn chrome-btn--br fixed bottom-[var(--gutter-y)] right-[var(--gutter)] z-[800]"
    >
      <EnvelopeSimple size={24} weight="light" />
    </WarpLink>
  );
}

/* ── 5: section progress rail (right edge), labelled current → next ───── */

function ProgressRail({ pathname }: { pathname: string }) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const [labels, setLabels] = useState<{ current: string; next: string; index: number; total: number }>({
    current: "",
    next: "",
    index: 0,
    total: 0,
  });

  useEffect(() => {
    let raf = 0;
    let lastKey = "";

    const read = () => {
      raf = 0;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-rail]"));
      if (!sections.length) {
        if (lastKey !== "none") {
          lastKey = "none";
          setLabels({ current: "", next: "", index: 0, total: 0 });
        }
        return;
      }
      const probe = window.scrollY + window.innerHeight * 0.5;
      let idx = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top + window.scrollY <= probe) idx = i;
      });
      const el = sections[idx];
      const top = el.getBoundingClientRect().top + window.scrollY;
      const local = Math.min(1, Math.max(0, (probe - top) / Math.max(1, el.offsetHeight)));
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${local.toFixed(4)})`;

      const current = el.dataset.rail ?? "";
      const next = sections[idx + 1]?.dataset.rail ?? el.dataset.railNext ?? "";
      const key = `${idx}|${current}|${next}|${sections.length}`;
      if (key !== lastKey) {
        lastKey = key;
        setLabels({ current, next, index: idx + 1, total: sections.length });
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    const late = window.setTimeout(read, 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  if (!labels.total) return null;

  return (
    <div
      aria-hidden="true"
      className="progress-rail pointer-events-none fixed right-[var(--gutter)] top-1/2 z-[800] flex w-[44px] -translate-y-1/2 flex-col items-center gap-4 text-white"
    >
      <span aria-hidden="true" className="chrome-scrim chrome-scrim--rail" />
      <span className="font-mono text-[12px] tracking-[0.1em]">
        {String(labels.index).padStart(2, "0")}
      </span>
      <span className="progress-rail__label font-display text-[12px] font-medium uppercase tracking-[0.24em]">
        {labels.current}
      </span>
      <span className="relative block h-[clamp(72px,16dvh,160px)] w-px bg-white/25">
        <span ref={fillRef} className="absolute inset-0 origin-top bg-white" style={{ transform: "scaleY(0)" }} />
      </span>
      <span className="progress-rail__label font-display text-[12px] font-medium uppercase tracking-[0.24em] opacity-45">
        {labels.next}
      </span>
    </div>
  );
}

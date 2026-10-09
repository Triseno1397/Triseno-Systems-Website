"use client";

import "@/app/ai-capabilities.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CAPABILITIES, CAPABILITIES_INTRO } from "./content";

/**
 * 02 / Capabilities — a flowing index with decrypting titles.
 *
 * Six full-width rows, one per capability, ruled in ink on the paper. Point at
 * a row and a cyan signal band slides in from the edge the pointer crossed
 * (top or bottom) carrying a marquee: the capability's name, decoding as it
 * arrives, between triangle node marks and a short line from its brief. Leave
 * and the band exits through the edge you left by, and the row's own title
 * re-acquires: it scrambles through random glyphs and decodes left to right.
 * On first scroll into view every title decodes in, row by row.
 *
 * Click, tap or press a row to open its brief (one open at a time). Touch has
 * no hover, so a tap flashes the band for a beat and opens the row.
 *
 * Decrypting never reflows: each glyph is a fixed-width slot holding the real
 * character (kept for layout, hidden while unsettled) with a random glyph
 * painted over it. Only opacity and transforms animate; the brief's height
 * opens on grid-template-rows. Reduced motion: no band travel, no marquee
 * drift, no scramble; every title is simply set.
 */

const POOL = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>_#";

/** a short line per capability for the marquee (falls back to the brief's last sentence) */
const PHRASES: Record<string, string> = {
  orchestration: "Answers like your best employee.",
  compression: "On your phone before you ask.",
  catalog: "The right part, the first time.",
  revenue: "Every lead answered in minutes.",
  broadcast: "Built around how you work.",
  retainer: "Nobody re-types anything again.",
};

function phraseFor(id: string, body: string) {
  if (PHRASES[id]) return PHRASES[id];
  const parts = body.split(/(?<=\.)\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? body;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── decrypt ─────────────────────────────────────────────────────────── */

type Mode = "reveal" | "scramble";
interface DecryptOpts {
  /** seconds for a line to settle */
  duration?: number;
  /** seconds before it starts */
  delay?: number;
  /** reveal: glyphs start hidden and appear as noise; scramble: the set text breaks into noise */
  mode?: Mode;
}

/**
 * Runs one rAF loop over every glyph slot inside each given line. Each line
 * settles left to right; noise glyphs swap at ~30Hz. Returns a cancel that
 * snaps everything to the set text.
 */
function runDecrypt(lines: HTMLElement[], { duration = 0.8, delay = 0, mode = "scramble" }: DecryptOpts = {}) {
  const sets = lines.map((line) => Array.from(line.querySelectorAll<HTMLElement>("[data-ch]")));
  const all = sets.flat();
  const settle = () => {
    for (const ch of all) {
      ch.removeAttribute("data-s");
      const fake = ch.lastElementChild as HTMLElement | null;
      if (fake) fake.textContent = "";
    }
  };
  if (!all.length) return settle;
  if (mode === "reveal") for (const ch of all) ch.setAttribute("data-s", "h");

  let raf = 0;
  let start = 0;
  let lastSwap = 0;
  const frame = (now: number) => {
    if (!start) start = now + delay * 1000;
    const t = (now - start) / (duration * 1000);
    if (t >= 1) {
      settle();
      return;
    }
    const swap = now - lastSwap > 33;
    if (swap) lastSwap = now;
    if (t >= 0) {
      for (const chars of sets) {
        const n = chars.length;
        chars.forEach((ch, i) => {
          // reveal: each glyph wakes across the first 45% and holds noise for 50%;
          // scramble: the whole line breaks at once and settles in reading order
          const p = i / n;
          const wake = mode === "reveal" ? p * 0.45 : p * 0.08;
          const done = mode === "reveal" ? wake + 0.5 : 0.3 + p * 0.68;
          const fake = ch.lastElementChild as HTMLElement;
          if (t >= done) {
            if (ch.hasAttribute("data-s")) {
              ch.removeAttribute("data-s");
              fake.textContent = "";
            }
          } else if (t >= wake) {
            if (ch.getAttribute("data-s") !== "x") ch.setAttribute("data-s", "x");
            if (swap) fake.textContent = POOL[(Math.random() * POOL.length) | 0];
          }
        });
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    settle();
  };
}

/** a line of text cut into glyph slots, words kept whole so lines never break mid-word */
function Glyphs({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-hidden="true" data-line="">
      {words.map((word, w) => (
        <span key={w}>
          <span className="ai-flow-cap__w">
            {[...word].map((c, i) => (
              <span key={i} className="ai-flow-cap__ch" data-ch="">
                <span className="ai-flow-cap__real">{c}</span>
                <span className="ai-flow-cap__fake" />
              </span>
            ))}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

/* ── the row ─────────────────────────────────────────────────────────── */

interface Cap {
  id: string;
  tag: string;
  title: string;
  body: string;
}

const COPIES = 4;

function Row({
  cap,
  index,
  open,
  onToggle,
  revealAt,
}: {
  cap: Cap;
  index: number;
  open: boolean;
  onToggle: (i: number) => void;
  /** seconds; null until the list scrolls into view */
  revealAt: number | null;
}) {
  const headRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const bandRef = useRef<HTMLSpanElement>(null);
  const bandInnerRef = useRef<HTMLSpanElement>(null);
  const showing = useRef(false);
  const lastPointer = useRef<string>("mouse");
  const flashTimer = useRef<number>(0);
  const cancels = useRef<{ title?: () => void; band?: () => void }>({});

  const num = String(index + 1).padStart(2, "0");
  const phrase = phraseFor(cap.id, cap.body);
  const panelId = `ai-flow-cap-${cap.id}`;

  useEffect(() => {
    const band = bandRef.current;
    const inner = bandInnerRef.current;
    if (!band || !inner) return;
    gsap.set(band, { yPercent: 101 });
    gsap.set(inner, { yPercent: -101 });
    headRef.current?.setAttribute("data-ready", "");
    const c = cancels.current;
    return () => {
      gsap.killTweensOf([band, inner]);
      window.clearTimeout(flashTimer.current);
      c.title?.();
      c.band?.();
    };
  }, []);

  // the first-view decode, staggered by the list (layout effect: the glyphs are
  // hidden before the frame in which the armed mask lifts)
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || revealAt === null || reduced()) return;
    cancels.current.title?.();
    el.setAttribute("data-go", "");
    cancels.current.title = runDecrypt([el], { mode: "reveal", duration: 1.1, delay: revealAt });
  }, [revealAt]);

  const decodeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el || reduced()) return;
    cancels.current.title?.();
    cancels.current.title = runDecrypt([el], { duration: 0.7 });
  }, []);

  const enter = useCallback((fromTop: boolean) => {
    const band = bandRef.current;
    const inner = bandInnerRef.current;
    if (!band || !inner || showing.current) return;
    showing.current = true;
    band.setAttribute("data-on", "");
    if (reduced()) {
      gsap.set(band, { yPercent: 0 });
      gsap.set(inner, { yPercent: 0 });
      return;
    }
    gsap.fromTo(band, { yPercent: fromTop ? -101 : 101 }, { yPercent: 0, duration: 0.65, ease: "expo.out", overwrite: true });
    gsap.fromTo(inner, { yPercent: fromTop ? 101 : -101 }, { yPercent: 0, duration: 0.65, ease: "expo.out", overwrite: true });
    const lines = Array.from(inner.querySelectorAll<HTMLElement>("[data-line]"));
    cancels.current.band?.();
    cancels.current.band = runDecrypt(lines, { duration: 0.75 });
  }, []);

  const leave = useCallback(
    (toTop: boolean) => {
      const band = bandRef.current;
      const inner = bandInnerRef.current;
      if (!band || !inner || !showing.current) return;
      showing.current = false;
      const off = () => band.removeAttribute("data-on");
      if (reduced()) {
        gsap.set(band, { yPercent: 101 });
        off();
        return;
      }
      gsap.to(band, { yPercent: toTop ? -101 : 101, duration: 0.6, ease: "expo.out", overwrite: true, onComplete: off });
      gsap.to(inner, { yPercent: toTop ? 101 : -101, duration: 0.6, ease: "expo.out", overwrite: true });
      decodeTitle();
    },
    [decodeTitle],
  );

  const nearTop = (clientY: number) => {
    const r = headRef.current?.getBoundingClientRect();
    return r ? clientY < r.top + r.height / 2 : true;
  };

  return (
    <li className="ai-flow-cap__row" data-open={open ? "" : undefined}>
      <h3 className="ai-flow-cap__h">
        <button
          ref={headRef}
          type="button"
          className="ai-flow-cap__head"
          aria-expanded={open}
          aria-controls={panelId}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType;
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse" || e.pointerType === "pen") enter(nearTop(e.clientY));
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse" || e.pointerType === "pen") leave(nearTop(e.clientY));
          }}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) enter(true);
          }}
          onBlur={() => leave(false)}
          onClick={(e) => {
            if (lastPointer.current === "touch" && e.detail > 0) {
              window.clearTimeout(flashTimer.current);
              const top = nearTop(e.clientY);
              enter(top);
              flashTimer.current = window.setTimeout(() => leave(!top), 950);
            }
            lastPointer.current = "mouse";
            onToggle(index);
          }}
        >
          <span className="ai-flow-cap__meta">
            <span className="ai-flow-cap__num">
              <svg aria-hidden="true" viewBox="0 0 10 10" className="ai-flow-cap__node">
                <path d="M5 1 9.2 8.6H.8Z" />
              </svg>
              {num}
            </span>
            <span className="ai-flow-cap__tag">{cap.tag}</span>
          </span>
          <span className="ai-flow-cap__title font-display">
            <span className="sr-only">{cap.title}</span>
            <span ref={titleRef} className="ai-flow-cap__titleline">
              <Glyphs text={cap.title} />
            </span>
          </span>
          <span aria-hidden="true" className="ai-flow-cap__plus">
            <i />
            <i />
          </span>

          <span ref={bandRef} aria-hidden="true" className="ai-flow-cap__band">
            <span ref={bandInnerRef} className="ai-flow-cap__bandin">
              <span className="ai-flow-cap__track" style={{ ["--dur" as string]: `${Math.max(14, (cap.title.length + phrase.length) * 0.42)}s` }}>
                {[0, 1].map((run) => (
                  <span key={run} className="ai-flow-cap__run">
                    {Array.from({ length: COPIES }, (_, k) => (
                      <span key={k} className="ai-flow-cap__item">
                        <Glyphs text={cap.title} className="ai-flow-cap__mtitle font-display" />
                        <svg viewBox="0 0 10 10" className="ai-flow-cap__sep">
                          <path d="M5 1 9.2 8.6H.8Z" />
                        </svg>
                        <span className="ai-flow-cap__phrase">{phrase}</span>
                        <svg viewBox="0 0 10 10" className="ai-flow-cap__sep">
                          <path d="M5 1 9.2 8.6H.8Z" />
                        </svg>
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            </span>
          </span>
        </button>
      </h3>

      <div id={panelId} className="ai-flow-cap__panel" role="region" aria-label={cap.title} inert={!open}>
        <div className="ai-flow-cap__panelin">
          <div className="ai-flow-cap__brief">
            <p className="ai-label ai-flow-cap__live">
              <i aria-hidden="true" className="ai-live" /> {cap.tag}
            </p>
            <p className="ai-body ai-flow-cap__body">{cap.body}</p>
            <p className="ai-flow-cap__spec">
              <span>Spec 02.{num}</span>
              <span>{cap.id}</span>
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ── the section ─────────────────────────────────────────────────────── */

export default function FlowingCapabilities() {
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el || reduced()) return;
    // hide the titles before they decode in; without JS (or with reduced motion) they are simply set
    el.setAttribute("data-armed", "");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = useCallback((i: number) => setOpen((cur) => (cur === i ? null : i)), []);

  return (
    <section id="capabilities" data-rail="Capabilities" aria-labelledby="ai-cap-title" className="ai-section ai-flow-cap relative z-10">
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>02</b> / Capabilities
          </p>
          <h2 id="ai-cap-title" className="ai-h2 font-display font-semibold uppercase">
            {CAPABILITIES_INTRO.title}
          </h2>
          <p className="ai-body ai-head__aside">{CAPABILITIES_INTRO.body}</p>
        </header>

        <ul ref={listRef} className="ai-flow-cap__list">
          {CAPABILITIES.map((cap, i) => (
            <Row key={cap.id} cap={cap} index={i} open={open === i} onToggle={toggle} revealAt={seen ? 0.1 + i * 0.11 : null} />
          ))}
        </ul>
        <p className="ai-flow-cap__foot" aria-hidden="true">
          <span>06 systems</span>
          <span className="ai-flow-cap__hint">Select a row to open its brief</span>
        </p>
      </div>
    </section>
  );
}

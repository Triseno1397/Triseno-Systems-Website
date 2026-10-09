"use client";

import "@/app/ai-intake.css";
import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { session } from "./session";
import { ENTITIES, ENTITY_ORDER, INTAKE, RECORD, type EntityId, type RowId, type Seg } from "./intake-reading.content";

gsap.registerPlugin(ScrollTrigger);

/**
 * 03 / Intake — first, it reads: the letter and the record.
 *
 * A procurement letter sits on the paper at reading size, as if printed. A
 * single 1px line of cyan light descends it at exactly the visitor's scroll
 * pace. The letter is laid down twice: the copy in flow is set in a lighter
 * ink (unread), and an identical copy in full ink lies over it, clipped to
 * everything above the line, so the type darkens as the light passes and the
 * facts' underlines appear at the instant the light crosses them. Where the
 * line passes a fact a small mono chip lifts out of the sentence, crosses the
 * gutter and lands in the record on the right, where the value prints.
 *
 * Two sentences disagree (net 30 against "no later than 14 May"): when the
 * reader reaches the second, the TERMS row's filled dot becomes a hollow cyan
 * ring, a note prints "conflict . routed to Verify", and CONFIDENCE prints
 * 0.61 < 0.80 — the agent and the threshold the rest of the page pays off.
 * Scroll back and the letter un-reads itself, chips flying home at 1.6x.
 *
 * Point at a record row (tap, or Tab to it) and its source lights in the
 * letter; point at a fact and its row lights. Attribute toggles only.
 *
 * Mechanics: DOM + one ScrollTrigger (scrubbed through a proxy tween so the
 * line trails the wheel by 0.6 s), seven paused GSAP timelines built after a
 * single measurement pass (re-run on resize and fonts.ready, never per frame).
 * Per frame: one transform write (the line), one clip-path write (the read
 * copy), attribute toggles only on a threshold crossing. No canvas.
 * Reduced motion / no JS: the section is never armed, so every value, every
 * underline and the conflict are simply shown, with the reader parked at the
 * letter's foot.
 */

const TOTAL = ENTITY_ORDER.length;
const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** the entities whose reading touches a row (for aria-describedby and hover) */
function entitiesOfRow(row: RowId): EntityId[] {
  return ENTITY_ORDER.filter((e) => ENTITIES[e].row === row);
}

/* ── the letter's runs: plain text, or a fact in <mark> (facts may nest) ── */

function Runs({ segs, ghost }: { segs: Seg[]; ghost: boolean }) {
  return (
    <>
      {segs.map((s, i) => {
        if (typeof s === "string") return s;
        const ent = ENTITIES[s.e];
        return (
          <mark
            key={i}
            data-entity={s.e}
            id={ghost ? undefined : `ai-read-${ent.id}`}
            aria-description={ghost ? undefined : ent.desc}
          >
            <Runs segs={s.t} ghost={ghost} />
          </mark>
        );
      })}
    </>
  );
}

/** the whole letter; rendered once in flow (unread ink) and once over it (read ink) */
function Sheet({ ghost }: { ghost: boolean }) {
  return (
    <>
      <dl className="ai-read__meta">
        {INTAKE.meta.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="ai-read__body">
        {INTAKE.paragraphs.map((p, i) => (
          <p key={i}>
            <Runs segs={p} ghost={ghost} />
          </p>
        ))}
        <p className="ai-read__sign">
          <b>{INTAKE.sign[0]}</b>
          <span>{INTAKE.sign[1]}</span>
        </p>
      </div>
    </>
  );
}

/* ── the section ── */

export default function IntakeReading() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const recordRef = useRef<HTMLDListElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const reducedRef = useRef(false);

  // arm before first paint: hidden values, parked chips, clipped read copy.
  // Reduced motion never arms, so the CSS final state stands.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedRef.current) section.setAttribute("data-armed", "");
  }, []);

  // the figure reports itself to the session once
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          session.figure("intake");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // hover / focus linking: a row lights its facts, a fact lights its row
  useEffect(() => {
    const grid = gridRef.current;
    const base = baseRef.current;
    const record = recordRef.current;
    if (!grid || !base || !record) return;

    const rows = new Map<RowId, HTMLElement>();
    record.querySelectorAll<HTMLElement>(".ai-read__row[data-row]").forEach((el) => rows.set(el.dataset.row as RowId, el));
    const marksOf = (row: RowId) =>
      entitiesOfRow(row).flatMap((e) => Array.from(base.querySelectorAll<HTMLElement>(`mark[data-entity="${e}"]`)));

    let lit: RowId | null = null;
    const setLit = (row: RowId | null) => {
      if (row === lit) return;
      if (lit) {
        rows.get(lit)?.removeAttribute("data-lit");
        marksOf(lit).forEach((m) => m.removeAttribute("data-lit"));
      }
      lit = row;
      if (lit) {
        rows.get(lit)?.setAttribute("data-lit", "");
        marksOf(lit).forEach((m) => m.setAttribute("data-lit", ""));
      }
    };
    const rowUnder = (target: EventTarget | null): RowId | null => {
      const el = target instanceof Element ? target : null;
      if (!el) return null;
      const row = el.closest<HTMLElement>(".ai-read__row[data-row]:not([data-derived])");
      if (row) return row.dataset.row as RowId;
      const mark = el.closest<HTMLElement>("mark[data-entity]");
      if (mark) return ENTITIES[mark.dataset.entity as EntityId].row;
      return null;
    };
    const onOver = (e: PointerEvent) => setLit(rowUnder(e.target));
    const onLeave = () => setLit(null);
    const onFocusIn = (e: FocusEvent) => setLit(rowUnder(e.target));
    const onFocusOut = (e: FocusEvent) => {
      // leaving for another row: focusin will set it; leaving the grid: clear
      if (!rowUnder(e.relatedTarget)) setLit(null);
    };
    grid.addEventListener("pointerover", onOver);
    grid.addEventListener("pointerleave", onLeave);
    grid.addEventListener("focusin", onFocusIn);
    grid.addEventListener("focusout", onFocusOut);
    return () => {
      grid.removeEventListener("pointerover", onOver);
      grid.removeEventListener("pointerleave", onLeave);
      grid.removeEventListener("focusin", onFocusIn);
      grid.removeEventListener("focusout", onFocusOut);
      setLit(null);
    };
  }, []);

  // the reader: one scrubbed progress, seven timelines, one measurement pass
  useEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    const letter = letterRef.current;
    const base = baseRef.current;
    const overlay = overlayRef.current;
    const line = lineRef.current;
    const record = recordRef.current;
    const readout = readoutRef.current;
    if (!section || !grid || !letter || !base || !overlay || !line || !record) return;

    const allMarks = (e: EntityId) => Array.from(letter.querySelectorAll<HTMLElement>(`mark[data-entity="${e}"]`));

    if (reducedRef.current) {
      // final state, fully readable: every fact read, nothing scrubbed
      ENTITY_ORDER.forEach((e) => allMarks(e).forEach((m) => m.setAttribute("data-read", "")));
      if (readout) readout.textContent = `read ${pad2(TOTAL)} / ${pad2(TOTAL)}`;
      return;
    }

    const phone = window.matchMedia("(max-width: 767px)").matches;

    /* elements, looked up once */
    const marks: Partial<Record<EntityId, HTMLElement>> = {};
    const chips: Partial<Record<EntityId, HTMLElement>> = {};
    ENTITY_ORDER.forEach((e) => {
      marks[e] = base.querySelector<HTMLElement>(`mark[data-entity="${e}"]`) ?? undefined;
      chips[e] = grid.querySelector<HTMLElement>(`.ai-read__chip[data-chip="${e}"]`) ?? undefined;
    });
    const rows = new Map<RowId, HTMLElement>();
    record.querySelectorAll<HTMLElement>(".ai-read__row[data-row]").forEach((el) => rows.set(el.dataset.row as RowId, el));
    const vals = Array.from(record.querySelectorAll<HTMLElement>(".ai-read__val"));
    const part = (row: HTMLElement | undefined, sel: string) => row?.querySelector<HTMLElement>(sel) ?? null;

    /* state */
    const read: Record<EntityId, boolean> = { vendor: false, po: false, amount: false, site: false, due: false, terms: false, terms2: false };
    const at: Partial<Record<EntityId, number>> = {};
    const tls = new Map<EntityId, gsap.core.Timeline>();
    let H = 0;
    let count = -1;
    let p = 0;
    let measured = false;

    const setRead = (e: EntityId, on: boolean) => {
      for (const m of allMarks(e)) m.toggleAttribute("data-read", on);
    };

    /** the per-frame application of one progress value: two style writes, toggles only on a crossing */
    const apply = (next: number) => {
      p = next;
      line.style.transform = `translate3d(0, ${(p * H).toFixed(2)}px, 0)`;
      overlay.style.clipPath = `inset(0 0 ${((1 - p) * 100).toFixed(3)}% 0)`;
      if (!measured) return;
      let n = 0;
      for (const e of ENTITY_ORDER) {
        const tl = tls.get(e);
        const th = at[e];
        if (!tl || th === undefined) continue;
        const on = p >= th;
        if (on !== read[e]) {
          read[e] = on;
          setRead(e, on);
          if (on) tl.timeScale(1).play();
          else tl.timeScale(1.6).reverse();
        }
        if (on) n++;
      }
      if (n !== count) {
        count = n;
        if (readout) readout.textContent = `read ${pad2(n)} / ${pad2(TOTAL)}`;
      }
    };

    /** one timeline per fact: the chip lifts, crosses, lands; the value prints; the row fills */
    const build = (e: EntityId, g: { sx: number; sy: number; tx: number; ty: number }) => {
      const chip = chips[e];
      const ent = ENTITIES[e];
      const lead = ent.lead ?? 0;
      const land = lead + 0.9;
      const tl = gsap.timeline({ paused: true });
      if (chip) {
        gsap.set(chip, { x: g.sx, y: g.sy + 4, yPercent: -50, autoAlpha: 0 });
        tl.to(chip, { autoAlpha: 1, y: g.sy - 6, duration: 0.22, ease: "power2.out" }, lead);
        tl.to(chip, { x: g.tx, y: g.ty, duration: 0.7, ease: "power3.inOut" }, lead + 0.2);
        tl.to(chip, { autoAlpha: 0, duration: 0.2, ease: "power1.out" }, land);
      }
      const mine = vals.filter((v) => v.dataset.by === e);
      if (mine.length) {
        tl.fromTo(
          mine,
          { clipPath: "inset(0% 100% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.32, ease: "expo.out", immediateRender: false },
          land,
        );
      }
      for (const def of RECORD) {
        const row = rows.get(def.id);
        if (!row) continue;
        if (def.values[0]?.by === e) {
          // this fact opens the row: the blank goes, the dot fills
          const blank = part(row, ".ai-read__blank");
          const fill = part(row, ".ai-read__dot-fill");
          if (blank) tl.to(blank, { opacity: 0, duration: 0.2, ease: "power1.out" }, land);
          if (fill) tl.to(fill, { opacity: 1, duration: 0.3, ease: "power2.out" }, land);
        }
        if (def.conflict === e) {
          // the second reading disagrees: filled ink dot -> hollow cyan ring, and the note prints
          const fill = part(row, ".ai-read__dot-fill");
          const ring = part(row, ".ai-read__dot-ring");
          const note = part(row, ".ai-read__note");
          if (fill) tl.to(fill, { opacity: 0, duration: 0.25, ease: "power1.out" }, land + 0.05);
          if (ring) tl.to(ring, { opacity: 1, duration: 0.3, ease: "power2.out" }, land + 0.05);
          if (note) {
            tl.fromTo(
              note,
              { clipPath: "inset(0% 100% 0% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.32, ease: "expo.out", immediateRender: false },
              land + 0.12,
            );
          }
        }
      }
      return tl;
    };

    /** one layout read for everything, then the writes: thresholds, chip start and landing points */
    const measure = () => {
      const gr = grid.getBoundingClientRect();
      const lr = letter.getBoundingClientRect();
      H = lr.height || 1;
      const geo = ENTITY_ORDER.map((e) => {
        const m = marks[e];
        if (!m) return null;
        const rects = m.getClientRects();
        const last = rects.length ? rects[rects.length - 1] : m.getBoundingClientRect();
        const target = record.querySelector<HTMLElement>(`.ai-read__val[data-val="${ENTITIES[e].row}"][data-by="${e}"]`);
        const vr = target?.getBoundingClientRect();
        return {
          e,
          // read when the light passes under the fact (the underline's own edge)
          at: clamp01((last.bottom - lr.top) / H),
          sx: last.right - gr.left + 8,
          sy: (last.top + last.bottom) / 2 - gr.top,
          tx: vr ? vr.left - gr.left : last.right - gr.left,
          ty: vr ? (vr.top + vr.bottom) / 2 - gr.top : (last.top + last.bottom) / 2 - gr.top,
        };
      });
      // writes
      tls.forEach((tl) => tl.kill());
      tls.clear();
      for (const g of geo) {
        if (!g) continue;
        at[g.e] = g.at;
        const tl = build(g.e, g);
        tl.progress(read[g.e] ? 1 : 0);
        tls.set(g.e, tl);
      }
      measured = true;
      apply(p);
    };

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    /* the scrub: a proxy tween so progress arrives smoothed, the line trailing the wheel */
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: letter,
        start: phone ? "top 78%" : "top 72%",
        end: phone ? "bottom 30%" : "bottom 38%",
        scrub: 0.6,
      },
      onUpdate: () => apply(proxy.p),
    });

    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(letter);
    ro.observe(record);
    let alive = true;
    if (typeof document.fonts?.ready?.then === "function") {
      document.fonts.ready.then(() => {
        if (alive) schedule();
      });
    }

    return () => {
      alive = false;
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      tween.scrollTrigger?.kill();
      tween.kill();
      tls.forEach((tl) => tl.kill());
      tls.clear();
    };
  }, []);

  const [chNum, chName] = INTAKE.chapter;

  return (
    <section
      ref={sectionRef}
      id="intake"
      data-rail="Intake"
      data-ch="03"
      data-fig="intake"
      aria-labelledby="ai-read-title"
      className="ai-section ai-read relative z-10"
    >
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>{chNum}</b> / {chName}
          </p>
          <h2 id="ai-read-title" className="ai-h2 font-display font-semibold uppercase">
            {INTAKE.title}
          </h2>
          <p className="ai-body ai-head__aside">{INTAKE.aside}</p>
        </header>

        <p className="sr-only">{INTAKE.srDescription}</p>

        <div ref={gridRef} className="ai-read__grid">
          {/* the letter: the copy in flow is the unread ink; the overlay is the read ink, clipped by the light */}
          <article ref={letterRef} className="ai-read__letter" aria-label="The letter">
            <div ref={baseRef} className="ai-read__sheet">
              <Sheet ghost={false} />
            </div>
            <div ref={overlayRef} aria-hidden="true" className="ai-read__sheet ai-read__sheet--read">
              <Sheet ghost />
            </div>
            <span ref={lineRef} aria-hidden="true" className="ai-read__line" />
          </article>

          {/* the record */}
          <div className="ai-frame ai-read__frame">
            <span aria-hidden="true" className="ai-frame__crop" data-c="tl" />
            <span aria-hidden="true" className="ai-frame__crop" data-c="tr" />
            <span aria-hidden="true" className="ai-frame__crop" data-c="bl" />
            <span aria-hidden="true" className="ai-frame__crop" data-c="br" />
            <p className="ai-read__rhead" aria-hidden="true">
              <b>{INTAKE.recordHead[0]}</b>
              <span>{INTAKE.recordHead[1]}</span>
            </p>
            <dl ref={recordRef} className="ai-read__record" aria-label="The record">
              {RECORD.map((row) => {
                const sources = row.derived ? [] : entitiesOfRow(row.id);
                return (
                  <div
                    key={row.id}
                    className="ai-read__row"
                    data-row={row.id}
                    data-derived={row.derived ? "" : undefined}
                    data-conflict={row.conflict ? "" : undefined}
                    role={row.derived ? undefined : "group"}
                    tabIndex={row.derived ? undefined : 0}
                    aria-labelledby={`ai-read-dt-${row.id}`}
                    aria-describedby={sources.length ? sources.map((e) => `ai-read-${ENTITIES[e].id}`).join(" ") : undefined}
                  >
                    <span aria-hidden="true" className="ai-read__dot">
                      <i className="ai-read__dot-fill" />
                      <i className="ai-read__dot-ring" />
                    </span>
                    <dt id={`ai-read-dt-${row.id}`}>{row.label}</dt>
                    <dd>
                      <span aria-hidden="true" className="ai-read__blank">
                        —
                      </span>
                      {row.values.map((v, i) => (
                        <span key={i} className="ai-read__val" data-val={row.id} data-by={v.by} data-signal={v.signal ? "" : undefined}>
                          {v.text}
                        </span>
                      ))}
                      {row.note ? <span className="ai-read__note">{row.note}</span> : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="ai-read__hint" aria-hidden="true">
              <span className="ai-read__hint-fine">{INTAKE.hint.fine}</span>
              <span className="ai-read__hint-touch">{INTAKE.hint.touch}</span>
            </p>
          </div>

          {/* the chips in flight: positioned in the grid's own coordinates */}
          <div aria-hidden="true" className="ai-read__chips">
            {ENTITY_ORDER.map((e) => (
              <span key={e} className="ai-read__chip" data-chip={e}>
                {ENTITIES[e].label}
              </span>
            ))}
          </div>
        </div>

        <p className="ai-figcap">
          <span>
            <b>Fig. {chNum}</b>
            {INTAKE.figcap}
          </span>
          <span ref={readoutRef} className="ai-figcap__read" aria-hidden="true">
            read {pad2(TOTAL)} / {pad2(TOTAL)}
          </span>
        </p>
      </div>
    </section>
  );
}

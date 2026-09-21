"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import Glyph from "@/components/world/Glyph";
import GlassPanel from "@/components/world/GlassPanel";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import { FILTERS, INTRO, WORK, type WorkDivision, type WorkItem } from "./content";
import WorkPreview, { type PreviewTarget } from "./WorkPreview";

gsap.registerPlugin(Flip);

type FilterKey = "all" | WorkDivision;

const pad = (n: number) => String(n).padStart(2, "0");
const DESKTOP = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

/**
 * /work — the index. Section mechanic (site-map.md): a display-type list whose
 * hovered row pulls a velocity-distorted media preview after the cursor
 * (WorkPreview), with a division filter whose change REFLOWS the list:
 * leaving rows are wiped out sideways by clip-path, the survivors glide to
 * their new places (FLIP, transform only), and arriving rows wipe in from
 * the left, staggered — the running numbers re-count with them.
 *
 * Phone (no cursor): every row is a disclosure button; opening one reveals
 * its media inline with a clip-path wipe. The filter works the same way.
 */
export default function WorkIndex() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [fine, setFine] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<PreviewTarget>({ dock: null });
  const flipRef = useRef<gsap.core.Timeline | null>(null);
  // a row that is leaving keeps its old number while it wipes out
  const lastNum = useRef(new Map<string, number>());

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? WORK : WORK.filter((w) => w.division === filter)),
    [filter],
  );
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: WORK.length, creative: 0, web: 0, ai: 0 };
    WORK.forEach((w) => (c[w.division] += 1));
    return c;
  }, []);

  const activeItem = fine ? (visible.find((w) => w.id === active) ?? null) : null;
  const activeOrder = activeItem ? visible.indexOf(activeItem) : 0;

  const changeFilter = useCallback(
    (key: FilterKey) => {
      if (key === filter) return;
      const list = listRef.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      flipRef.current?.progress(1).kill();
      if (!list || reduced) {
        setFilter(key);
        setActive(null);
        setOpen(null);
        return;
      }
      const rows = Array.from(list.querySelectorAll<HTMLElement>(".work-row"));
      const state = Flip.getState(rows);
      flushSync(() => {
        setFilter(key);
        setActive(null);
        setOpen(null);
      });
      flipRef.current = Flip.from(state, {
        duration: 0.9,
        ease: "expo.out",
        absolute: true,
        nested: false,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { clipPath: "inset(0% 100% 0% 0%)", opacity: 0 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              opacity: 1,
              duration: 0.9,
              ease: "expo.out",
              delay: 0.12,
              stagger: 0.045,
              clearProps: "clipPath,opacity",
            },
          ),
        onLeave: (els) =>
          gsap.to(els, {
            clipPath: "inset(0% 0% 0% 100%)",
            opacity: 0,
            duration: 0.45,
            ease: "power3.out",
            stagger: 0.02,
          }),
      });
    },
    [filter],
  );

  // keyboard focus docks the preview beside the row, since there is no cursor to follow
  const dockTo = useCallback((row: HTMLElement | null) => {
    const stage = stageRef.current;
    if (!row || !stage) {
      targetRef.current.dock = null;
      return;
    }
    const s = stage.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    targetRef.current.dock = { x: s.width * 0.74, y: r.top - s.top + r.height / 2 };
  }, []);

  return (
    <section data-rail="Index" aria-labelledby="work-title" className="work-section work-index">
      <header className="work-index__head">
        <p className="work-label">
          <Glyph kind="diamond" size={12} color="#ffffff" strokeWidth={1.25} />
          <span>{INTRO.label}</span>
        </p>
        <h1 id="work-title" className="work-display font-display font-bold uppercase">
          {INTRO.title.map((line) => (
            <span key={line} className="work-display__line">
              {line}
            </span>
          ))}
        </h1>
        <GlassPanel world="portal" className="work-index__panel">
        <p className="work-body">{INTRO.body}</p>

        <div className="work-filter" role="group" aria-label="Filter the index by division">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            const d = f.key === "all" ? null : DIVISIONS[f.key];
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => changeFilter(f.key)}
                className="work-filter__btn"
                data-on={on ? "" : undefined}
                style={d ? { ["--row-hue" as string]: d.hue } : undefined}
              >
                {d ? (
                  <Glyph kind={d.glyph} size={11} color={on ? d.hue : "#ffffff"} strokeWidth={1.25} />
                ) : (
                  <Glyph kind="diamond" size={11} color="#ffffff" strokeWidth={1.25} />
                )}
                <span className="font-display">{f.label}</span>
                <span className="work-filter__count">{pad(counts[f.key])}</span>
              </button>
            );
          })}
        </div>
        </GlassPanel>
        <p className="sr-only" aria-live="polite">
          {`Showing ${visible.length} entries${filter === "all" ? "" : ` from ${DIVISIONS[filter].name}`}`}
        </p>
      </header>

      <div
        ref={stageRef}
        className="work-index__stage"
        onPointerLeave={() => fine && setActive(null)}
      >
        {fine ? <WorkPreview stageRef={stageRef} item={activeItem} order={activeOrder} targetRef={targetRef} /> : null}

        <ol ref={listRef} className="work-list" data-hot={activeItem ? "" : undefined}>
          {WORK.map((item) => {
            const idx = visible.indexOf(item);
            const hidden = idx < 0;
            if (!hidden) lastNum.current.set(item.id, idx + 1);
            return (
              <WorkRow
                key={item.id}
                item={item}
                number={hidden ? (lastNum.current.get(item.id) ?? 0) : idx + 1}
                hidden={hidden}
                fine={fine}
                lit={activeItem?.id === item.id}
                open={open === item.id}
                onHover={() => {
                  targetRef.current.dock = null;
                  setActive(item.id);
                }}
                onFocusRow={(el) => {
                  setActive(item.id);
                  dockTo(el);
                }}
                onBlurRow={() => {
                  targetRef.current.dock = null;
                }}
                onToggle={() => setOpen((v) => (v === item.id ? null : item.id))}
              />
            );
          })}
        </ol>
      </div>
    </section>
  );
}

interface WorkRowProps {
  item: WorkItem;
  number: number;
  hidden: boolean;
  fine: boolean;
  lit: boolean;
  open: boolean;
  onHover: () => void;
  onFocusRow: (el: HTMLElement) => void;
  onBlurRow: () => void;
  onToggle: () => void;
}

function WorkRow({ item, number, hidden, fine, lit, open, onHover, onFocusRow, onBlurRow, onToggle }: WorkRowProps) {
  const d = DIVISIONS[item.division];
  const panelId = `work-panel-${item.id}`;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (open) v.play().catch(() => {});
    else v.pause();
  }, [open]);

  const inner = (
    <>
      <span className="work-row__num">{pad(number)}</span>
      <span className="work-row__glyph" aria-hidden="true">
        <Glyph kind={d.glyph} size="100%" color={lit || open ? d.hue : "#ffffff"} strokeWidth={1.25} glow={lit || open} />
      </span>
      <span className="work-row__title font-display">{item.title}</span>
      <span className="work-row__meta">
        <span>{d.name}</span>
        <span className="work-row__kind">{item.kind}</span>
      </span>
      <span className="work-row__icon" aria-hidden="true">
        {fine ? <ArrowUpRight size={22} weight="light" /> : <Plus size={20} weight="light" />}
      </span>
    </>
  );

  return (
    <li
      className="work-row"
      data-division={item.division}
      data-lit={lit ? "" : undefined}
      data-open={open ? "" : undefined}
      hidden={hidden}
      style={{ ["--row-hue" as string]: d.hue }}
    >
      {fine ? (
        <WarpLink
          href={d.route}
          className="work-row__head"
          aria-label={`${item.title} — ${item.kind}, ${d.name}. Open the ${d.name} division.`}
          onPointerEnter={onHover}
          onFocus={(e) => onFocusRow(e.currentTarget)}
          onBlur={onBlurRow}
        >
          {inner}
        </WarpLink>
      ) : (
        <>
          <button
            type="button"
            className="work-row__head"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {inner}
          </button>
          <div id={panelId} className="work-row__panel" hidden={!open}>
            <div className="work-row__media">
              {item.media.kind === "video" ? (
                <video
                  ref={videoRef}
                  src={open ? item.media.src : undefined}
                  poster={item.media.poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  style={{ objectPosition: item.media.position }}
                />
              ) : open ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.media.src} alt="" decoding="async" style={{ objectPosition: item.media.position }} />
              ) : null}
            </div>
            <p className="work-body work-row__line">{item.line}</p>
            <WarpLink href={d.route} className="work-row__go">
              <span>Open {d.name}</span>
              <ArrowUpRight size={16} weight="light" aria-hidden="true" />
            </WarpLink>
          </div>
        </>
      )}
    </li>
  );
}

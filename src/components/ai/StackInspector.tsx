"use client";

import "@/app/ai-inspector.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { STACK_COPY, STACK_LAYERS } from "./stackInstrument.content";
import {
  BUDGET_DEFAULT,
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  CODE,
  LAYER_KEYS,
  LAYER_NAMES,
  SCALE,
  codeText,
  fmtMs,
  logsFor,
  spanDepth,
  stamp,
  type Config,
  type LiveKey,
  type Token,
  type TraceResult,
} from "./stackTrace";

/**
 * The inspector sheet of the stack bench: paper docked at the right edge of
 * the dark film (a bottom sheet on phones) with one layer's header and spec
 * and three tabs.
 *
 *   CODE   the layer's config, tokenised at build time; three declarations
 *          are live (a mechanical rocker on `fallback`, hairline checkboxes
 *          on `cache` and `stream`) and change what the next SEND generates.
 *   TRACE  the span waterfall. Its bars are scheduled into the SAME GSAP
 *          timeline the film's packet rides (StackFilm builds it, hands it
 *          down as `run`; this component adds its tweens in a layout effect
 *          before the film plays it), so the packet and the bars can never
 *          disagree. A draggable budget flag hatches everything past it; a
 *          drag on the axis zooms a range, with breadcrumbs; W A S D while
 *          the plot is focused.
 *   LOGS   the layer's lines, each revealed at its own timestamp during a
 *          run; a filter dims what does not match.
 *
 * Only transform, opacity and clip-path move. Nothing reads layout in a
 * frame: the flag and selection drags measure the plot once on pointerdown.
 */

export type InspectorTab = "code" | "trace" | "logs";

export type StackRun = {
  tl: gsap.core.Timeline;
  trace: TraceResult;
  seq: number;
  /** seconds before the request's clock starts: the packet's climb into Data */
  lead: number;
};

type Range = { a: number; b: number };

type Props = {
  open: boolean;
  layer: number;
  onLayer: (i: number) => void;
  tab: InspectorTab;
  onTab: (t: InspectorTab) => void;
  onClose: (returnFocus: boolean) => void;
  trace: TraceResult;
  run: StackRun | null;
  running: boolean;
  config: Config;
  onConfig: (c: Config) => void;
  budget: number;
  onBudget: (ms: number) => void;
  /** the film's hovered layer: its rows lift, the others sit back */
  liftLayer: number | null;
  /** a row is hovered or focused: light that layer's hotspot in the film */
  onLit: (layer: number | null) => void;
  onReplay: () => void;
  /** bump to open LOGS and focus the filter (the "/" chord) */
  focusLogsSeq: number;
};

const TABS: InspectorTab[] = ["code", "trace", "logs"];
const TICK_STEPS = [10, 20, 50, 100, 200, 500, 1000];

function niceStep(span: number): number {
  const want = span / 6;
  return TICK_STEPS.find((s) => s >= want) ?? 1000;
}

const snap = (ms: number): number => Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(ms / BUDGET_STEP) * BUDGET_STEP));

const isTyping = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

function Tok({ t }: { t: Token }) {
  return <span className={`ai-code__t-${t.c}`}>{t.s}</span>;
}

export default function StackInspector({
  open,
  layer,
  onLayer,
  tab,
  onTab,
  onClose,
  trace,
  run,
  running,
  config,
  onConfig,
  budget,
  onBudget,
  liftLayer,
  onLit,
  onReplay,
  focusLogsSeq,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filterRef = useRef<HTMLInputElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLElement>(null);
  const barRefs = useRef(new Map<string, HTMLSpanElement>());
  const labelRefs = useRef(new Map<string, HTMLSpanElement>());
  const lineRefs = useRef<HTMLLIElement[]>([]);
  const lastMs = useRef(-1);
  const copy = STACK_COPY.inspector;
  const L = STACK_LAYERS[layer];

  /* ── range zoom ── */
  // the axis always holds the 2 s budget flag and the whole trace, rounded to 100 ms
  const axisMax = Math.ceil(Math.max(BUDGET_DEFAULT + 200, trace.totalMs + 100) / 100) * 100;
  const root = useMemo<Range>(() => ({ a: 0, b: axisMax }), [axisMax]);
  // the zoom stack belongs to one trace: a new trace reads as the full range
  const [crumbState, setCrumbState] = useState<{ t: TraceResult; c: Range[] }>({ t: trace, c: [] });
  const crumbs = crumbState.t === trace ? crumbState.c : [];
  const setCrumbs = useCallback((f: (c: Range[]) => Range[]) => setCrumbState((s) => ({ t: trace, c: f(s.t === trace ? s.c : []) })), [trace]);
  const cur = crumbs[crumbs.length - 1] ?? root;
  const span = cur.b - cur.a;
  const zoom = axisMax / span;
  const xOf = (ms: number) => ((ms - cur.a) / span) * 100;

  const setRange = (r: Range, replace: boolean) => {
    const a = Math.max(0, Math.min(r.a, r.b));
    const b = Math.min(axisMax, Math.max(r.a, r.b));
    if (b - a < 50) return;
    const next = { a, b };
    setCrumbs((c) => (replace && c.length ? [...c.slice(0, -1), next] : [...c, next]));
  };

  /* ── the clock: bars and the counter ride the film's timeline ── */
  const revealLogs = useCallback((ms: number) => {
    for (const el of lineRefs.current) {
      if (!el || el.hasAttribute("data-on")) continue;
      if (Number(el.dataset.t) <= ms) {
        el.setAttribute("data-now", "");
        el.setAttribute("data-on", "");
      }
    }
  }, []);

  useLayoutEffect(() => {
    const bars = barRefs.current;
    const labels = labelRefs.current;
    const total = totalRef.current;
    if (!run) {
      for (const s of trace.spans) {
        const b = bars.get(s.id);
        const l = labels.get(s.id);
        if (b) {
          gsap.set(b, { scaleX: 1 });
          b.removeAttribute("data-run");
        }
        if (l) {
          l.textContent = fmtMs(s.dur);
          l.setAttribute("data-done", "");
        }
      }
      if (total) total.textContent = fmtMs(trace.totalMs);
      lastMs.current = -1;
      return;
    }
    const { tl, lead } = run;
    const T = (ms: number) => lead + ms * SCALE;
    const added: gsap.core.Tween[] = [];
    if (total) total.textContent = "0";
    lastMs.current = 0;
    for (const s of run.trace.spans) {
      const b = bars.get(s.id);
      const l = labels.get(s.id);
      if (!b) continue;
      gsap.set(b, { scaleX: 0 });
      b.removeAttribute("data-run");
      l?.removeAttribute("data-done");
      const tw = gsap.to(b, {
        scaleX: 1,
        duration: Math.max(s.dur * SCALE, 0.02),
        ease: "none",
        onStart: () => b.setAttribute("data-run", ""),
        onComplete: () => {
          b.removeAttribute("data-run");
          if (l) {
            l.textContent = fmtMs(s.dur);
            l.setAttribute("data-done", "");
          }
        },
      });
      tl.add(tw, T(s.start));
      added.push(tw);
    }
    const clock = { ms: 0 };
    let last = -1;
    const ct = gsap.to(clock, {
      ms: run.trace.totalMs,
      duration: run.trace.totalMs * SCALE,
      ease: "none",
      onUpdate: () => {
        const v = Math.round(clock.ms);
        if (v === last) return;
        last = v;
        lastMs.current = v;
        if (total) total.textContent = fmtMs(v);
        revealLogs(v);
      },
    });
    tl.add(ct, lead);
    added.push(ct);
    return () => added.forEach((t) => t.kill());
  }, [run, trace, revealLogs]);

  /* ── logs ── */
  const [query, setQuery] = useState("");
  const debounce = useRef(0);
  const lines = useMemo(() => logsFor(trace).filter((l) => l.layer === layer), [trace, layer]);
  const q = query.trim().toLowerCase();
  const matches = q ? lines.filter((l) => (l.src + " " + l.msg).toLowerCase().includes(q)).length : lines.length;
  // the list remounts whenever the tab is (re)opened for a layer, so its lines wipe in staggered
  const logsKey = `${layer}:${tab === "logs" && open ? "on" : "off"}`;
  // a layer switched mid-run: lines already past the clock show at once
  useEffect(() => {
    if (running && lastMs.current >= 0) revealLogs(lastMs.current);
  }, [layer, tab, running, revealLogs]);
  useEffect(() => () => window.clearTimeout(debounce.current), []);
  useEffect(() => {
    if (!focusLogsSeq) return;
    const id = window.setTimeout(() => filterRef.current?.focus(), 300);
    return () => window.clearTimeout(id);
  }, [focusLogsSeq]);

  /* ── focus: into the sheet on open ── */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const id = window.setTimeout(() => tabRefs.current[TABS.indexOf(tab)]?.focus({ preventScroll: true }), 60);
      wasOpen.current = true;
      return () => window.clearTimeout(id);
    }
    wasOpen.current = open;
  }, [open, tab]);

  /* ── keys ── */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (crumbs.length) {
        e.stopPropagation();
        setCrumbs(() => []);
        return;
      }
      e.stopPropagation();
      onClose(true);
      return;
    }
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      onReplay();
    } else if (e.key === "1" || e.key === "2" || e.key === "3") {
      e.preventDefault();
      onTab(TABS[Number(e.key) - 1]);
    } else if (e.key === "/") {
      e.preventDefault();
      onTab("logs");
      window.setTimeout(() => filterRef.current?.focus(), 200);
    }
  };
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % 3;
    else if (e.key === "ArrowLeft") next = (i + 2) % 3;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 2;
    if (next < 0) return;
    e.preventDefault();
    onTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };
  const onPlotKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!"wsad".includes(k) || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const mid = (cur.a + cur.b) / 2;
    const replace = crumbs.length > 0;
    if (k === "w") setRange({ a: mid - span / 3, b: mid + span / 3 }, replace);
    else if (k === "s") {
      if (span * 1.5 >= axisMax) setCrumbs(() => []);
      else setRange({ a: mid - span * 0.75, b: mid + span * 0.75 }, replace);
    } else if (k === "a") setRange({ a: Math.max(0, cur.a - span * 0.1), b: Math.max(span, cur.b - span * 0.1) }, replace);
    else if (k === "d") setRange({ a: Math.min(axisMax - span, cur.a + span * 0.1), b: Math.min(axisMax, cur.b + span * 0.1) }, replace);
  };

  /* ── drags: the axis selection, the budget flag (one rect read on down) ── */
  const drag = useRef<{ kind: "sel" | "flag"; left: number; width: number; x0: number; x1: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const longest = useMemo(() => trace.spans.reduce((m, s) => (s.dur > m.dur ? s : m), trace.spans[0]), [trace]);
  const onSelDown = (from: "axis" | "plot") => (e: React.PointerEvent<HTMLDivElement>) => {
    const plot = plotRef.current;
    if (!plot || e.button !== 0) return;
    const coarse = e.pointerType === "touch" || window.matchMedia("(hover: none)").matches;
    if (coarse) {
      // phones: no drag-zoom (the plot scrolls the page); a tap on the axis
      // zooms the longest span's window, a second tap fits the whole trace
      if (from !== "axis") return;
      if (crumbs.length) setCrumbs(() => []);
      else if (longest) setRange({ a: longest.start - 80, b: longest.start + longest.dur + 80 }, false);
      return;
    }
    const r = plot.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    drag.current = { kind: "sel", left: r.left, width: r.width, x0: x, x1: x };
    e.currentTarget.setPointerCapture(e.pointerId);
    const sel = selRef.current;
    if (sel) {
      sel.style.setProperty("--sl", `${x * 100}%`);
      sel.style.setProperty("--sr", `${(1 - x) * 100}%`);
      sel.setAttribute("data-on", "");
    }
  };
  const onAxisMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.kind !== "sel") return;
    d.x1 = Math.min(1, Math.max(0, (e.clientX - d.left) / d.width));
    const sel = selRef.current;
    if (!sel) return;
    const lo = Math.min(d.x0, d.x1);
    const hi = Math.max(d.x0, d.x1);
    sel.style.setProperty("--sl", `${lo * 100}%`);
    sel.style.setProperty("--sr", `${(1 - hi) * 100}%`);
  };
  const onAxisUp = () => {
    const d = drag.current;
    if (!d || d.kind !== "sel") return;
    drag.current = null;
    selRef.current?.removeAttribute("data-on");
    const lo = Math.min(d.x0, d.x1);
    const hi = Math.max(d.x0, d.x1);
    if (hi - lo < 0.02) return;
    setRange({ a: cur.a + lo * span, b: cur.a + hi * span }, false);
  };
  const onFlagDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    const plot = plotRef.current;
    if (!plot) return;
    const r = plot.getBoundingClientRect();
    drag.current = { kind: "flag", left: r.left, width: r.width, x0: 0, x1: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    setDragging(true);
  };
  const onFlagMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.kind !== "flag") return;
    const x = Math.min(1, Math.max(0, (e.clientX - d.left) / d.width));
    onBudget(Math.min(snap(cur.a + x * span), Math.floor(axisMax / BUDGET_STEP) * BUDGET_STEP));
  };
  const onFlagUp = () => {
    if (drag.current?.kind === "flag") drag.current = null;
    setDragging(false);
  };
  const onFlagKey = (e: React.KeyboardEvent) => {
    let next = budget;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = budget - BUDGET_STEP;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = budget + BUDGET_STEP;
    else if (e.key === "Home") next = BUDGET_MIN;
    else if (e.key === "End") next = Math.min(BUDGET_MAX, axisMax);
    else return;
    e.preventDefault();
    onBudget(Math.min(snap(next), Math.floor(axisMax / BUDGET_STEP) * BUDGET_STEP));
  };

  /* ── the bottom sheet: swipe down to close ── */
  const swipe = useRef<{ y: number; id: number } | null>(null);
  const onBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return;
    swipe.current = { y: e.clientY, id: e.pointerId };
  };
  const onBarUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (s && e.pointerId === s.id && e.clientY - s.y > 80) onClose(false);
  };

  /* ── copy ── */
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText(layer, config));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // clipboard blocked: the button stays as it was
    }
  };

  /* ── derived for render ── */
  const fx = xOf(budget);
  const over = trace.totalMs > budget;
  const step = niceStep(span);
  const ticks: number[] = [];
  for (let t = Math.ceil(cur.a / step) * step; t <= cur.b; t += step) ticks.push(t);
  const laneTransform = `translate3d(${(-(cur.a / axisMax) * zoom * 100).toFixed(4)}%, 0, 0) scaleX(${zoom.toFixed(5)})`;
  /** a number (percent of the plot) for the unscaled layers, which glide by transform in cqw */
  const nx = (ms: number) => Number(xOf(ms).toFixed(3));
  const tabIndex = TABS.indexOf(tab);
  const live = (key: LiveKey) => config[key];
  const setLive = (key: LiveKey, v: boolean) => onConfig({ ...config, [key]: v });

  return (
    <aside
      ref={rootRef}
      className="ai-insp"
      role="region"
      aria-label={copy.region}
      aria-hidden={!open}
      inert={!open}
      data-open={open ? "" : undefined}
      data-running={running ? "" : undefined}
      onKeyDown={onKey}
    >
      <span aria-hidden="true" className="ai-insp__grip" />
      <div className="ai-insp__bar" onPointerDown={onBarDown} onPointerUp={onBarUp} onPointerCancel={onBarUp}>
        <p className="ai-insp__n">
          Layer {L.n} / 04
        </p>
        <div className="ai-insp__layers" role="group" aria-label="Layer">
          {STACK_LAYERS.map((l, i) => (
            <button
              key={l.n}
              type="button"
              className="ai-insp__layer"
              aria-current={i === layer ? "true" : undefined}
              aria-label={`Layer ${l.n}, ${l.name}`}
              onClick={() => onLayer(i)}
            >
              {l.n}
            </button>
          ))}
        </div>
        <button type="button" className="ai-insp__close" onClick={() => onClose(false)} aria-label={copy.close}>
          <i aria-hidden="true" />
        </button>
      </div>
      <h3 className="ai-insp__title font-display">{L.name}</h3>
      <p className="ai-insp__sub">{L.sub}</p>
      <p className="ai-insp__body">{L.body}</p>
      <dl className="ai-insp__spec">
        {L.spec.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="ai-insp__tabs" role="tablist" aria-label="Inspector" onKeyDown={onTabKey} style={{ ["--t" as string]: tabIndex }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`ai-insp-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`ai-insp-panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            className="ai-insp__tab"
            onClick={() => onTab(t)}
          >
            {copy.tabs[i]}
          </button>
        ))}
        <span aria-hidden="true" className="ai-insp__ink" />
      </div>

      <div className="ai-insp__panels">
        {/* CODE */}
        <div
          id="ai-insp-panel-code"
          role="tabpanel"
          aria-labelledby="ai-insp-tab-code"
          className="ai-insp__panel ai-code"
          data-on={tab === "code" ? "" : undefined}
          inert={tab !== "code"}
        >
          <div className="ai-code__bar">
            <span>{LAYER_KEYS[layer]}.yaml</span>
            <button type="button" className="ai-code__copy" onClick={doCopy} data-done={copied ? "" : undefined} aria-live="polite">
              {copied ? copy.copied : copy.copy}
            </button>
          </div>
          <pre className="ai-code__pre">
            {CODE[layer].map((ln, i) => {
              const n = String(i + 1).padStart(2, "0");
              if (ln.live === "fallback") {
                const on = live("fallback");
                return (
                  <span key={i} className="ai-code__ln" data-n={n} data-live="fallback">
                    <span className="ai-code__ln-in">
                      {ln.tokens.slice(0, 2).map((t, k) => (
                        <Tok key={k} t={t} />
                      ))}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`fallback: ${on ? ln.on : ln.off}. Live: the next request runs with it.`}
                        className="ai-rocker"
                        onClick={() => setLive("fallback", !on)}
                      >
                        <span className="ai-rocker__plate" aria-hidden="true">
                          <span className="ai-rocker__face ai-rocker__face--on">{ln.on}</span>
                          <span className="ai-rocker__face ai-rocker__face--off">{ln.off}</span>
                        </span>
                      </button>
                    </span>
                  </span>
                );
              }
              if (ln.live) {
                const key = ln.live;
                const on = live(key);
                return (
                  <span key={i} className="ai-code__ln" data-n={n} data-live={key}>
                    <span className="ai-code__ln-in">
                      <label className="ai-chk">
                        <input type="checkbox" checked={on} onChange={(e) => setLive(key, e.target.checked)} aria-label={`${key}: ${on ? ln.on : ln.off}. Live: the next request runs with it.`} />
                        <span className="ai-chk__box" aria-hidden="true" />
                      </label>
                      {ln.tokens.slice(0, 2).map((t, k) => (
                        <Tok key={k} t={t} />
                      ))}
                      <span className={on && ln.on === "true" ? "ai-code__t-num" : "ai-code__t-val"}>{on ? ln.on : ln.off}</span>
                    </span>
                  </span>
                );
              }
              return (
                <span key={i} className="ai-code__ln" data-n={n}>
                  <span className="ai-code__ln-in">
                    {ln.tokens.map((t, k) => (
                      <Tok key={k} t={t} />
                    ))}
                  </span>
                </span>
              );
            })}
          </pre>
        </div>

        {/* TRACE */}
        <div
          id="ai-insp-panel-trace"
          role="tabpanel"
          aria-labelledby="ai-insp-tab-trace"
          className="ai-insp__panel ai-wf"
          data-on={tab === "trace" ? "" : undefined}
          data-lift={liftLayer !== null ? "" : undefined}
          inert={tab !== "trace"}
        >
          <div className="ai-wf__top">
            <nav className="ai-wf__crumbs" aria-label="Zoom">
              {[root, ...crumbs].map((r, i, arr) => (
                <span key={i}>
                  {i > 0 ? <i>&gt; </i> : null}
                  <button
                    type="button"
                    className="ai-wf__crumb"
                    aria-current={i === arr.length - 1 ? "true" : undefined}
                    onClick={() => setCrumbs((c) => c.slice(0, i))}
                    disabled={i === arr.length - 1}
                  >
                    {fmtMs(r.a)}-{fmtMs(r.b)} ms
                  </button>
                </span>
              ))}
            </nav>
            <p className="ai-wf__total">
              {copy.total} <b ref={totalRef}>{fmtMs(trace.totalMs)}</b> ms
            </p>
          </div>
          <div className="ai-wf__grid" style={{ ["--rows" as string]: trace.spans.length }}>
            <ol className="ai-wf__names">
              {trace.spans.map((s) => (
                <li
                  key={s.id}
                  className="ai-wf__name"
                  style={{ ["--d" as string]: spanDepth(s, trace.spans) }}
                  title={`${s.name} . ${fmtMs(s.dur)} ms . ${LAYER_NAMES[s.layer]}`}
                  tabIndex={0}
                  data-mine={s.layer === layer ? "" : undefined}
                  data-failed={s.failed ? "" : undefined}
                  data-lift={liftLayer === s.layer ? "" : undefined}
                  onPointerEnter={() => onLit(s.layer)}
                  onPointerLeave={() => onLit(null)}
                  onFocus={() => onLit(s.layer)}
                  onBlur={() => onLit(null)}
                >
                  {s.name}
                </li>
              ))}
            </ol>
            <div className="ai-wf__plotwrap" data-drag={dragging ? "" : undefined}>
              <div
                className="ai-wf__axis"
                aria-label={copy.axisLabel}
                onPointerDown={onSelDown("axis")}
                onPointerMove={onAxisMove}
                onPointerUp={onAxisUp}
                onPointerCancel={onAxisUp}
              >
                {ticks.map((t) => (
                  <span key={t} className="ai-wf__tick" data-end={nx(t) > 88 ? "" : undefined} style={{ ["--lx" as string]: nx(t) }}>
                    <span>{fmtMs(t)}</span>
                  </span>
                ))}
              </div>
              <div
                ref={plotRef}
                className="ai-wf__plot"
                role="group"
                tabIndex={0}
                aria-label={`${copy.waterfallLabel}. W and S zoom, A and D pan, Escape resets.`}
                onKeyDown={onPlotKey}
                onPointerDown={onSelDown("plot")}
                onPointerMove={onAxisMove}
                onPointerUp={onAxisUp}
                onPointerCancel={onAxisUp}
              >
                {ticks.map((t) => (
                  <span key={t} aria-hidden="true" className="ai-wf__tickline" style={{ ["--lx" as string]: nx(t) }} />
                ))}
                <div className="ai-wf__lanes" style={{ transform: laneTransform, ["--z" as string]: zoom.toFixed(5) }}>
                  {trace.spans.map((s, i) => (
                    <span
                      key={s.id}
                      ref={(el) => {
                        if (el) barRefs.current.set(s.id, el);
                        else barRefs.current.delete(s.id);
                      }}
                      className="ai-wf__bar"
                      style={{ ["--i" as string]: i, ["--l" as string]: `${(s.start / axisMax) * 100}%`, ["--w" as string]: `${(s.dur / axisMax) * 100}%` }}
                      data-lift={liftLayer === s.layer ? "" : undefined}
                      data-failed={s.failed ? "" : undefined}
                      data-zero={s.dur === 0 ? "" : undefined}
                      data-async={s.async ? "" : undefined}
                      data-over={s.start + s.dur > budget ? "" : undefined}
                      onPointerEnter={(e) => e.pointerType !== "touch" && onLit(s.layer)}
                      onPointerLeave={() => onLit(null)}
                    />
                  ))}
                </div>
                <div className="ai-wf__labels" aria-hidden="true">
                  {trace.spans.map((s, i) => (
                    <span
                      key={s.id}
                      ref={(el) => {
                        if (el) labelRefs.current.set(s.id, el);
                        else labelRefs.current.delete(s.id);
                      }}
                      className="ai-wf__ms"
                      data-flip={nx(s.start + s.dur) > 90 ? "" : undefined}
                      data-out={nx(s.start + s.dur) < 1 || nx(s.start) > 99 ? "" : undefined}
                      style={{ ["--i" as string]: i, ["--lx" as string]: nx(s.start + s.dur), ["--lx0" as string]: nx(s.start) }}
                    >
                      {fmtMs(s.dur)}
                    </span>
                  ))}
                </div>
                <span aria-hidden="true" className="ai-wf__over" data-on={over ? "" : undefined} style={{ ["--fx" as string]: Math.min(100, Math.max(0, fx)).toFixed(3) }} />
                <span ref={selRef} aria-hidden="true" className="ai-wf__sel" />
              </div>
              <span
                className="ai-wf__flag"
                role="slider"
                tabIndex={0}
                aria-label="Latency budget"
                aria-valuemin={BUDGET_MIN}
                aria-valuemax={Math.min(BUDGET_MAX, axisMax)}
                aria-valuenow={budget}
                aria-valuetext={copy.flagText(fmtMs(budget))}
                aria-orientation="horizontal"
                data-hide={fx < 0 || fx > 100 ? "" : undefined}
                data-edge={fx > 72 ? "" : undefined}
                style={{ ["--fx" as string]: fx.toFixed(3) }}
                onPointerDown={onFlagDown}
                onPointerMove={onFlagMove}
                onPointerUp={onFlagUp}
                onPointerCancel={onFlagUp}
                onKeyDown={onFlagKey}
              >
                <span aria-hidden="true">{budget === 2000 ? copy.flag : `${fmtMs(budget)} ms`}</span>
              </span>
            </div>
          </div>
          <p className="ai-wf__hint">{copy.hint}</p>
          <p className="ai-wf__hint ai-wf__hint--touch">{copy.hintTouch}</p>
        </div>

        {/* LOGS */}
        <div
          id="ai-insp-panel-logs"
          role="tabpanel"
          aria-labelledby="ai-insp-tab-logs"
          className="ai-insp__panel ai-logs"
          data-on={tab === "logs" ? "" : undefined}
          inert={tab !== "logs"}
        >
          <input
            ref={filterRef}
            type="text"
            className="ai-logs__filter"
            placeholder={copy.logsPlaceholder}
            aria-label={copy.logsPlaceholder}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              const v = e.target.value;
              window.clearTimeout(debounce.current);
              debounce.current = window.setTimeout(() => setQuery(v), 120);
            }}
          />
          <ol key={logsKey} className="ai-logs__list">
            {lines.map((l, i) => {
              const hit = !q || (l.src + " " + l.msg).toLowerCase().includes(q);
              return (
                <li
                  key={`${l.t}-${i}`}
                  ref={(el) => {
                    if (el) lineRefs.current[i] = el;
                    else delete lineRefs.current[i];
                  }}
                  className="ai-logs__line"
                  data-t={l.t}
                  data-on={running ? undefined : ""}
                  data-dim={hit ? undefined : ""}
                  style={{ ["--i" as string]: i }}
                >
                  <span className="ai-logs__t">{stamp(l.t)}</span>
                  <span>
                    <span className="ai-logs__src">{l.src}</span>
                    <span className="ai-logs__msg">{l.msg}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {q && matches === 0 ? <p className="ai-logs__empty">no lines match</p> : null}
        </div>
      </div>
    </aside>
  );
}

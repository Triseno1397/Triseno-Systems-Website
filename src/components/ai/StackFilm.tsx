"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "@/app/ai-stackfilm.css";
import { getLenis } from "@/components/world/SmoothScroll";
import { cleanDark } from "./cleanDark";
import { session } from "./session";
import StackInspector, { type InspectorTab, type StackRun } from "./StackInspector";
import { STACK_CH, STACK_COPY, STACK_LAYERS } from "./stackInstrument.content";
import {
  BUDGET_DEFAULT,
  CONTRACTS,
  CX,
  DEFAULT_CONFIG,
  LABEL_X,
  LAYER_Y,
  PRESETS,
  QUAD_H,
  QUAD_HW,
  SCALE,
  SRC_AR,
  fmtMs,
  frameQuad,
  generate,
  type Config,
  type PresetId,
  type TraceResult,
} from "./stackTrace";

gsap.registerPlugin(ScrollTrigger);

/**
 * 07 / Stack — the stack bench. The film stays the image: a rendered AI
 * infrastructure core (four floating layers, light rising through them; a
 * Kling 3.0 loop from a GPT Image 2.5 still) with a HUD drawn over it and a
 * live hotspot pinned to each layer. Now it does the thing it depicts.
 *
 *   SEND     a request leaves the bottom of the frame as a 6px cyan packet,
 *            climbs the stack's centre line through Data, Models, Agents and
 *            Interface, each hotspot flaring as it is entered, a hairline
 *            trail behind it. The same GSAP timeline carries the span
 *            waterfall in the inspector (StackInspector schedules its bars
 *            into it), so the packet and the waterfall agree to the frame.
 *   INSPECT  the pointer becomes DevTools: a layer's slab gets a box, rulers
 *            to the frame's edges print its frame coordinates, and a chip
 *            prints the layer's contract; click pins and opens the inspector.
 *   The paper inspector docks at the right edge of the dark (a bottom sheet
 *   on phones) with CODE / TRACE / LOGS for the layer.
 *
 * The stage keeps the film's aspect (16:9; 4:5 on phones, cropped to the
 * centre) so every overlay stays registered to the layers at every width:
 * sx() remaps source x under the crop, and the packet rides a stage-tall
 * column by yPercent so a resize never rebuilds the run. The band owns the
 * chrome's dark through cleanDark("stack") while it holds the viewport. The
 * loop plays only while on screen; reduced motion keeps the still and paints
 * a sent request's final state at once.
 */

type RunState = "idle" | "running" | "done";

/** seconds for the packet's climb from the frame's edge into Data, before the request's clock starts */
const LEAD = 0.45;
/** seconds of each hop between layers */
const HOP = 0.5;
/** seconds a hotspot stays flared after the packet enters it */
const FLARE = 0.5;

/** the trail column spans these frame y's (ai-stackfilm.css: top 22%, height 74%) */
const TRAIL_TOP = 0.22;
const TRAIL_BOTTOM = 0.96;
/** the trail's clip inset (% of its own height) that leaves its head at frame y */
const trailInset = (y: number) => `inset(${(((y - TRAIL_TOP) / (TRAIL_BOTTOM - TRAIL_TOP)) * 100).toFixed(2)}% 0% 0% 0%)`;

export default function StackFilm() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  const msRef = useRef<HTMLElement>(null);
  const spotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const tagRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduced = useRef(false);
  const lastPointer = useRef("mouse");

  const [ar, setAr] = useState(SRC_AR);
  const [hover, setHover] = useState<number | null>(null);
  const [lit, setLit] = useState<number | null>(null);
  const [layer, setLayer] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<InspectorTab>("code");
  const [inspect, setInspect] = useState(false);
  const [half, setHalf] = useState(false);
  const [preset, setPreset] = useState<PresetId>("intake");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [budget, setBudget] = useState(BUDGET_DEFAULT);
  const [trace, setTrace] = useState<TraceResult>(() => generate("intake", DEFAULT_CONFIG));
  const [run, setRun] = useState<StackRun | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [focusLogsSeq, setFocusLogsSeq] = useState(0);
  const seq = useRef(0);

  const open = sheet ? layer : null;
  const shown = hover ?? open;
  const running = runState === "running";

  /* ── the stage's aspect decides how much of the frame is cropped at the sides ── */
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    const ro = new ResizeObserver(() => {
      const r = st.getBoundingClientRect();
      if (r.width && r.height) setAr(r.width / r.height);
    });
    ro.observe(st);
    return () => ro.disconnect();
  }, []);

  /* ── the loop plays only on screen; data-saver and reduced motion keep the still ── */
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const v = videoRef.current;
    if (!v) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced.current || conn?.saveData) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  /* ── the band owns the dark while it holds the viewport; the figure is counted once ── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 12%",
      end: "bottom 12%",
      onToggle: (t) => cleanDark("stack", t.isActive),
    });
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          session.figure("stack");
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      st.kill();
      io.disconnect();
      cleanDark.leave("stack");
    };
  }, []);

  /* ── the packet and the trail start parked (GSAP owns their transforms from here) ── */
  useEffect(() => {
    if (packetRef.current) gsap.set(packetRef.current, { yPercent: 96, y: 0, opacity: 0 });
    if (trailRef.current) gsap.set(trailRef.current, { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 });
  }, []);

  /* ── a request: one timeline carries the packet, the trail, the flares,
     the status clock and (added by the inspector) the waterfall ── */
  const send = useCallback(() => {
    const packet = packetRef.current;
    const trail = trailRef.current;
    const next = generate(preset, config);
    seq.current += 1;
    spotRefs.current.forEach((s) => s?.removeAttribute("data-flare"));

    const tl = gsap.timeline({ paused: true });
    const T = (ms: number) => LEAD + ms * SCALE;
    const flare = (k: number, on: boolean): void => {
      spotRefs.current[k]?.toggleAttribute("data-flare", on);
    };

    if (packet && trail) {
      tl.set(packet, { yPercent: 96, opacity: 1 }, 0);
      tl.set(trail, { clipPath: "inset(100% 0% 0% 0%)", opacity: 1 }, 0);
      // the climb into Data
      tl.to(packet, { yPercent: LAYER_Y[0] * 100, duration: LEAD, ease: "power2.inOut" }, 0);
      tl.to(trail, { clipPath: trailInset(LAYER_Y[0]), duration: LEAD, ease: "power2.inOut" }, 0);
      tl.call(flare, [0, true], LEAD);
      tl.call(flare, [0, false], LEAD + FLARE);
      // each hop lands as the layer's first span starts
      for (let k = 1; k < 4; k++) {
        const first = next.layerFirst[k];
        if (first < 0) break;
        const arrive = T(first);
        const depart = Math.max(arrive - HOP, T(next.layerFirst[k - 1]) + 0.15);
        tl.to(packet, { yPercent: LAYER_Y[k] * 100, duration: arrive - depart, ease: "power2.inOut" }, depart);
        tl.to(trail, { clipPath: trailInset(LAYER_Y[k]), duration: arrive - depart, ease: "power2.inOut" }, depart);
        tl.call(flare, [k, true], arrive);
        tl.call(flare, [k, false], arrive + FLARE);
      }
      // delivered: the packet leaves through the interface; blocked: it sits in Agents, dimmed
      const end = T(next.totalMs);
      if (next.state === "done") tl.to(packet, { opacity: 0, duration: 0.4, ease: "power2.out" }, end);
      else tl.to(packet, { opacity: 0.35, duration: 0.4, ease: "power2.out" }, end);
      tl.to(trail, { opacity: 0.55, duration: 0.6, ease: "power2.out" }, end);
    }
    // the status clock: one text write per changed millisecond
    const clock = { ms: 0 };
    let last = -1;
    tl.to(
      clock,
      {
        ms: next.totalMs,
        duration: next.totalMs * SCALE,
        ease: "none",
        onUpdate: () => {
          const v = Math.round(clock.ms);
          if (v === last) return;
          last = v;
          if (msRef.current) msRef.current.textContent = `${fmtMs(v)} ms`;
        },
      },
      LEAD,
    );
    tl.eventCallback("onComplete", () => {
      setRunState("done");
      session.bump("requests");
      session.setTrace({
        preset: next.label,
        totalMs: next.totalMs,
        spans: next.spans,
        state: next.state === "blocked" ? "blocked" : next.totalMs > budget ? "breached" : "done",
      });
    });

    setTrace(next);
    setRun({ tl, trace: next, seq: seq.current, lead: LEAD });
    setRunState("running");
    setSheet(true);
    setTab("trace");
  }, [preset, config, budget]);

  // play after the inspector has added its bars (its layout effect runs before
  // this effect); the previous run dies in this effect's cleanup
  useEffect(() => {
    if (!run) return;
    const { tl } = run;
    if (reduced.current) tl.progress(1);
    else tl.play(0);
    return () => {
      tl.kill();
    };
  }, [run]);
  useEffect(() => {
    run?.tl.timeScale(half ? 0.5 : 1);
  }, [run, half]);

  /* ── open / close ── */
  const openLayer = useCallback((i: number, t: InspectorTab) => {
    setLayer(i);
    setTab(t);
    setSheet(true);
  }, []);
  const close = useCallback(
    (returnFocus: boolean) => {
      setSheet(false);
      if (returnFocus) tagRefs.current[layer]?.focus({ preventScroll: true });
    },
    [layer],
  );

  /* ── keys and the page's operator events ── */
  useEffect(() => {
    const el = sectionRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !sheet) return;
      close(true);
    };
    const onSend = () => {
      if (el) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(el, { duration: 1.2 });
        else el.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth" });
      }
      send();
    };
    const onLogs = () => {
      setSheet(true);
      setTab("logs");
      setFocusLogsSeq((s) => s + 1);
    };
    const onEscape = () => {
      if (sheet) close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("ai:send", onSend);
    window.addEventListener("ai:focus-logs", onLogs);
    window.addEventListener("ai:escape", onEscape);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ai:send", onSend);
      window.removeEventListener("ai:focus-logs", onLogs);
      window.removeEventListener("ai:escape", onEscape);
    };
  }, [sheet, close, send]);

  /* ── geometry: source x -> stage x under object-fit: cover ── */
  const sx = (x: number) => (ar >= SRC_AR ? x : 0.5 + (x - 0.5) * (SRC_AR / ar));
  const x = sx(CX);
  const labelX = Math.min(sx(LABEL_X), 0.94);
  // while the inspector is docked at the right the tags swing to the left of the stack
  const labelXm = Math.max(x - (labelX - x), 0.04);
  const quadW = sx(CX + QUAD_HW) - sx(CX - QUAD_HW);
  const quadVars = (i: number) => ({
    ["--bx" as string]: `${(x - quadW / 2) * 100}%`,
    ["--by" as string]: `${(LAYER_Y[i] - QUAD_H / 2) * 100}%`,
    ["--bw" as string]: `${quadW * 100}%`,
    ["--bh" as string]: `${QUAD_H * 100}%`,
  });
  const q = shown !== null ? frameQuad(shown) : null;

  /* ── status ── */
  const stateKey =
    runState === "idle" ? "idle" : runState === "running" ? "running" : trace.state === "blocked" ? "blocked" : trace.totalMs > budget ? "breached" : "done";
  const statusText =
    stateKey === "idle"
      ? STACK_COPY.status.idle
      : stateKey === "running"
        ? `${STACK_COPY.status.running} .`
        : stateKey === "blocked"
          ? STACK_COPY.status.blocked
          : stateKey === "breached"
            ? STACK_COPY.status.breached(fmtMs(trace.totalMs - budget))
            : `${STACK_COPY.status.done} . ${fmtMs(trace.totalMs)} ms`;

  /* ── hotspot interaction: hover previews, click opens; Inspect adds the box ── */
  const enter = (i: number) => setHover(i);
  const leave = () => setHover(null);
  // touch fires pointerleave right after pointerup; the tapped layer must stay shown
  const pointerLeave = (e: React.PointerEvent) => e.pointerType !== "touch" && leave();
  const choosePreset = (p: PresetId) => {
    setPreset(p);
    // the idle example follows the selected preset; a sent trace stays until the next SEND
    if (runState === "idle") setTrace(generate(p, config));
  };
  const onTagClick = (i: number) => {
    if (lastPointer.current === "touch" && inspect && hover !== i) {
      setHover(i);
      return;
    }
    if (sheet && layer === i && !inspect) {
      close(false);
      return;
    }
    openLayer(i, "code");
  };

  return (
    <section
      ref={sectionRef}
      data-rail="Stack"
      data-ch={STACK_CH}
      data-fig="stack"
      data-sheet={sheet ? "" : undefined}
      aria-labelledby="ai-stackfilm-title"
      className="ai-sf relative z-10"
    >
      <div className="ai-sf__head">
        <p className="ai-sf__eyebrow">{STACK_COPY.eyebrow}</p>
        <h2 id="ai-stackfilm-title" className="ai-sf__title font-display">
          {STACK_COPY.title[0]}
          <br />
          {STACK_COPY.title[1]}
        </h2>
        <p className="ai-sf__lede">{STACK_COPY.lede}</p>
      </div>

      <div ref={stageRef} className="ai-sf__stage" data-dim={shown !== null ? "" : undefined} data-inspect={inspect ? "" : undefined}>
        <video
          ref={videoRef}
          className="ai-sf__film"
          src="/videos/ai-stack.mp4"
          poster="/worlds/ai-stack.webp"
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <span aria-hidden="true" className="ai-sf__veil" />
        {shown !== null ? (
          <span aria-hidden="true" className="ai-sf__focus" style={{ left: `${x * 100}%`, top: `${LAYER_Y[shown] * 100}%` }} />
        ) : null}
        <span aria-hidden="true" className="ai-sf__scan" />
        <span ref={trailRef} aria-hidden="true" className="ai-sf__trail" style={{ ["--x" as string]: `${x * 100}%` }} />
        <span ref={packetRef} aria-hidden="true" className="ai-sf__packet" style={{ ["--x" as string]: `${x * 100}%` }} />

        {/* HUD frame */}
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--tl" />
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--tr" />
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--bl" />
        <span aria-hidden="true" className="ai-sf__corner ai-sf__corner--br" />
        <span aria-hidden="true" className="ai-sf__hud ai-sf__hud--tr">
          <i className="ai-sf__live" /> {STACK_COPY.hud}
        </span>

        {/* hotspots: a pulse on the layer, a leader out to its label, a slab-sized hit while inspecting */}
        {STACK_LAYERS.map((l, i) => {
          const on = shown === i;
          return (
            <div
              key={l.n}
              ref={(el) => {
                spotRefs.current[i] = el;
              }}
              className="ai-sf__spot"
              data-on={on ? "" : undefined}
              data-open={open === i ? "" : undefined}
              data-lit={lit === i ? "" : undefined}
              style={{
                ["--x" as string]: `${x * 100}%`,
                ["--y" as string]: `${LAYER_Y[i] * 100}%`,
                ["--lx" as string]: `${labelX * 100}%`,
                ["--lxm" as string]: `${labelXm * 100}%`,
              }}
            >
              <span aria-hidden="true" className="ai-sf__flare" />
              <span aria-hidden="true" className="ai-sf__pulse" />
              <span aria-hidden="true" className="ai-sf__leader" />
              <div
                aria-hidden="true"
                className="ai-sf__hit"
                style={quadVars(i)}
                onPointerEnter={(e) => e.pointerType !== "touch" && enter(i)}
                onPointerLeave={pointerLeave}
                onPointerDown={(e) => {
                  lastPointer.current = e.pointerType;
                }}
                onClick={() => onTagClick(i)}
              />
              <button
                ref={(el) => {
                  tagRefs.current[i] = el;
                }}
                type="button"
                className="ai-sf__tag"
                aria-expanded={open === i}
                aria-controls="ai-insp-panel-code"
                aria-label={STACK_COPY.sr.hotspot(l.name)}
                onPointerDown={(e) => {
                  lastPointer.current = e.pointerType;
                }}
                onPointerEnter={(e) => e.pointerType !== "touch" && enter(i)}
                onPointerLeave={pointerLeave}
                onFocus={() => enter(i)}
                onBlur={leave}
                onClick={() => onTagClick(i)}
              >
                <b>{l.n}</b>
                <span>{l.name}</span>
              </button>
            </div>
          );
        })}

        {/* inspect overlay: the box on the slab, rulers to the frame's edges, the contract chip */}
        <div
          className="ai-sf__inspect"
          aria-hidden="true"
          data-show={shown !== null ? "" : undefined}
          data-pinned={inspect && open !== null && shown === open ? "" : undefined}
          style={shown !== null ? quadVars(shown) : undefined}
        >
          <span className="ai-sf__ruler ai-sf__ruler--l" />
          <span className="ai-sf__ruler ai-sf__ruler--r" />
          <span className="ai-sf__ruler ai-sf__ruler--t" />
          <span className="ai-sf__ruler ai-sf__ruler--b" />
          <span className="ai-sf__box" />
          {q ? (
            <>
              <p className="ai-sf__read ai-sf__read--x">x {q.x}</p>
              <p className="ai-sf__read ai-sf__read--y">y {q.y}</p>
              <p className="ai-sf__read ai-sf__read--wh">
                {q.w} x {q.h}
              </p>
            </>
          ) : null}
          {shown !== null ? (
            <p className="ai-sf__chip">
              {CONTRACTS[shown].split("->").map((part, k) => (
                <span key={k}>
                  {k > 0 ? <b> {"->"} </b> : null}
                  {part.trim()}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        {shown !== null && inspect ? <span className="sr-only">{STACK_COPY.sr.box(STACK_LAYERS[shown].name, frameQuad(shown).w, frameQuad(shown).h)}</span> : null}

        <p aria-hidden="true" className="ai-sf__hud ai-sf__hud--bl">
          {STACK_COPY.headline}
        </p>

        <StackInspector
          open={sheet}
          layer={layer}
          onLayer={setLayer}
          tab={tab}
          onTab={setTab}
          onClose={close}
          trace={trace}
          run={run}
          running={running}
          config={config}
          onConfig={setConfig}
          budget={budget}
          onBudget={setBudget}
          liftLayer={hover}
          onLit={setLit}
          onReplay={send}
          focusLogsSeq={focusLogsSeq}
        />
      </div>

      {/* the control row: send, preset, speed, inspect, status */}
      <div className="ai-sf__ctl" role="group" aria-label={STACK_COPY.controls.group}>
        <button type="button" className="ai-sf__send" onClick={send} aria-describedby="ai-sf-status">
          <span>{STACK_COPY.controls.send}</span>
          <span aria-hidden="true" className="ai-sf__send__fill">
            {STACK_COPY.controls.send}
          </span>
        </button>
        <label className="ai-sf__field">
          <span>{STACK_COPY.controls.trace}</span>
          <select className="ai-sf__select" value={preset} onChange={(e) => choosePreset(e.target.value as PresetId)} aria-label="Trace preset">
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ai-sf__tog" aria-pressed={half} aria-label="Half speed" onClick={() => setHalf((h) => !h)}>
          <b data-on={half ? undefined : ""}>{STACK_COPY.controls.speed[0]}</b>
          <i>.</i>
          <b data-on={half ? "" : undefined}>{STACK_COPY.controls.speed[1]}</b>
        </button>
        <button type="button" className="ai-sf__tog" aria-pressed={inspect} onClick={() => setInspect((v) => !v)}>
          {STACK_COPY.controls.inspect}
        </button>
        <p id="ai-sf-status" className="ai-sf__status" data-state={stateKey}>
          <span aria-live="polite">{statusText}</span>
          {running ? (
            <em ref={msRef} aria-hidden="true">
              0 ms
            </em>
          ) : null}
        </p>
        <p className="ai-sf__foot">{STACK_COPY.foot}</p>
      </div>
    </section>
  );
}

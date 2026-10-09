"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "@/app/ai-stackfilm.css";
import { getLenis } from "@/components/world/SmoothScroll";
import { cleanDark } from "./cleanDark";
import { session } from "./session";
import StackInspector, { type InspectorTab, type StackRun } from "./StackInspector";
import { STACK_CH, STACK_COPY, STACK_LAYERS } from "./stackInstrument.content";
import {
  BOXES,
  BUDGET_DEFAULT,
  CONTRACTS,
  CX,
  DEFAULT_CONFIG,
  ENTRY_Y,
  EXIT_Y,
  LABEL_X,
  LAYER_Y,
  PRESETS,
  SCALE,
  SRC_AR,
  fmtMs,
  frameQuad,
  generate,
  presetById,
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
 *   SEND     a request leaves the floor of the frame as a 6px cyan packet,
 *            climbs the light column through Data, Models, Agents and
 *            Interface, each hotspot flaring as it is entered, a hairline
 *            trail behind it. The same GSAP timeline carries the span
 *            waterfall in the inspector (StackInspector schedules its bars
 *            into it), so the packet and the waterfall agree to the frame.
 *   INSPECT  the pointer becomes DevTools: a layer's slab gets a box, rulers
 *            to the frame's edges print its frame coordinates, and a chip
 *            prints the layer's contract; click pins and opens the inspector.
 *   The paper inspector docks at the right edge of the dark (>= 1024px), or
 *   opens in the flow under the film on tablets and phones, with CODE /
 *   TRACE / LOGS for the layer.
 *
 * Registration: the stage keeps the film's aspect where it can (16:9; 4:5 on
 * phones) but is clamped by min/max heights, so object-fit: cover crops the
 * frame at the sides OR top and bottom. sx()/sy() remap source-frame
 * fractions to stage fractions under either crop, and every overlay (the
 * hotspots, the inspect box, the packet, the trail) is placed through them.
 * The packet's climb is tweened in FRAME coordinates and painted through the
 * current remap on every update, so a resize mid-run never misregisters it
 * and nothing has to be rebuilt.
 *
 * The band owns the chrome's dark through cleanDark("stack") while it holds
 * the viewport. The loop plays only while on screen; reduced motion keeps the
 * still and paints a sent request's final state at once.
 */

type RunState = "idle" | "running" | "done";
type Reveal = "send" | "open" | null;

/** seconds for the packet's climb from the floor into Data, before the request's clock starts */
const LEAD = 0.45;
/** seconds of each hop between layers (the hop lands as the layer's first span starts) */
const HOP = 0.5;
/** seconds a hotspot stays flared after the packet enters it */
const FLARE = 0.5;
/** the inspector docks over the film at and above this width; below it opens in the flow */
const DOCK_MIN = 1024;

/** stage geometry: source-frame fraction -> stage fraction under object-fit: cover */
type Geo = { ar: number };
const sxOf = (g: Geo, x: number) => (g.ar >= SRC_AR ? x : 0.5 + (x - 0.5) * (SRC_AR / g.ar));
const syOf = (g: Geo, y: number) => (g.ar <= SRC_AR ? y : 0.5 + (y - 0.5) * (g.ar / SRC_AR));
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

export default function StackFilm() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const packetMsRef = useRef<HTMLElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  const msRef = useRef<HTMLElement>(null);
  const spotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const tagRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduced = useRef(false);
  const lastPointer = useRef("mouse");
  /** touch + Inspect: the layer whose box the first tap drew (the second tap opens it) */
  const armed = useRef<number | null>(null);
  /** the packet's head and the trail's foot, in frame y; painted through the live remap */
  const climb = useRef({ y: ENTRY_Y, from: ENTRY_Y });
  const geo = useRef<Geo>({ ar: SRC_AR });

  const [ar, setAr] = useState(SRC_AR);
  const [hover, setHover] = useState<number | null>(null);
  const [lit, setLit] = useState<number | null>(null);
  const [layer, setLayer] = useState(0);
  const [sheet, setSheet] = useState(false);
  /** the sheet was opened ON a layer (a hotspot, the inspect box): that layer is focused in the film */
  const [focusOpen, setFocusOpen] = useState(false);
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
  const [reveal, setReveal] = useState<{ kind: Reveal; n: number }>({ kind: null, n: 0 });
  const seq = useRef(0);
  /** a SEND opened the sheet and nobody has picked a layer since: the header follows the packet */
  const follow = useRef(false);
  const budgetRef = useRef(budget);
  useEffect(() => {
    budgetRef.current = budget;
  }, [budget]);

  const open = sheet ? layer : null;
  const shown = hover ?? (focusOpen ? open : null);
  const running = runState === "running";

  /* ── paint the packet and the trail from frame y through the current remap (writes only) ── */
  const paint = useCallback(() => {
    const p = packetRef.current;
    const t = trailRef.current;
    const g = geo.current;
    const head = syOf(g, climb.current.y);
    const foot = syOf(g, climb.current.from);
    if (p) p.style.transform = `translate3d(0, ${pct(head)}, 0)`;
    if (t) t.style.clipPath = `inset(${pct(head)} 0% ${pct(Math.max(0, 1 - foot))} 0%)`;
  }, []);

  /* ── the stage's aspect decides how much of the frame is cropped ── */
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setAr(width / height);
    });
    ro.observe(st);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    geo.current = { ar };
    paint();
  }, [ar, paint]);

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

  /* ── below DOCK_MIN the sheet opens in the flow and the band grows: every
     trigger after this one must re-measure. Window resizes are ScrollTrigger's
     own business, so only a height change at an unchanged viewport refreshes. ── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let h = -1;
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let id = 0;
    const ro = new ResizeObserver(([e]) => {
      const nh = Math.round(e.contentRect.height);
      const sameViewport = window.innerWidth === vw && window.innerHeight === vh;
      vw = window.innerWidth;
      vh = window.innerHeight;
      if (h >= 0 && nh !== h && sameViewport) {
        window.clearTimeout(id);
        id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
      }
      h = nh;
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(id);
    };
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
    const c = climb.current;
    const flare = (k: number, on: boolean): void => {
      spotRefs.current[k]?.toggleAttribute("data-flare", on);
      if (on && follow.current) setLayer(k);
    };
    const hop = (y: number, at: number, duration: number) =>
      tl.to(c, { y, duration, ease: "power2.inOut", onUpdate: paint }, at);

    if (packet && trail) {
      tl.set(packet, { opacity: 1 }, 0);
      tl.set(trail, { opacity: 1 }, 0);
      // the climb from the floor into Data (fromTo: a restart always starts on the floor)
      tl.fromTo(c, { y: ENTRY_Y, from: ENTRY_Y }, { y: LAYER_Y[0], from: ENTRY_Y, duration: LEAD, ease: "power2.inOut", onUpdate: paint }, 0);
      tl.call(flare, [0, true], LEAD);
      tl.call(flare, [0, false], LEAD + FLARE);
      // each hop lands as the layer's first span starts
      for (let k = 1; k < 4; k++) {
        const first = next.layerFirst[k];
        if (first < 0) break;
        const arrive = T(first);
        const depart = Math.max(arrive - HOP, T(next.layerFirst[k - 1]) + 0.15);
        hop(LAYER_Y[k], depart, arrive - depart);
        tl.call(flare, [k, true], arrive);
        tl.call(flare, [k, false], arrive + FLARE);
      }
      // delivered: the packet leaves through the screens; blocked: it parks in Agents, dimmed
      const end = T(next.totalMs);
      if (next.state === "done") {
        hop(EXIT_Y, end, 0.6);
        tl.to(packet, { opacity: 0, duration: 0.6, ease: "power2.in" }, end);
      } else {
        tl.to(packet, { opacity: 0.4, duration: 0.6, ease: "power3.out" }, end);
      }
      tl.to(trail, { opacity: 0.5, duration: 0.8, ease: "power3.out" }, end);
    }
    // the status clock (and the packet's own readout): one text write per changed millisecond
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
          const text = `${fmtMs(v)} ms`;
          if (msRef.current) msRef.current.textContent = text;
          if (packetMsRef.current) packetMsRef.current.textContent = text;
        },
      },
      LEAD,
    );
    // the request is done when its last span ends, not when the packet has finished fading
    tl.call(
      () => {
        setRunState("done");
        session.bump("requests");
        session.setTrace({
          preset: next.label,
          totalMs: next.totalMs,
          spans: next.spans,
          state: next.state === "blocked" ? "blocked" : next.totalMs > budgetRef.current ? "breached" : "done",
        });
      },
      [],
      T(next.totalMs),
    );

    setTrace(next);
    setRun({ tl, trace: next, seq: seq.current, lead: LEAD });
    setRunState("running");
    // a layer the visitor opened stays put; otherwise the header follows the packet
    follow.current = !(sheet && focusOpen);
    if (follow.current) setFocusOpen(false);
    setSheet(true);
    setHover(null);
    armed.current = null;
    setTab("trace");
    setReveal((r) => ({ kind: "send", n: r.n + 1 }));
  }, [preset, config, paint, sheet, focusOpen]);

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

  /* ── below DOCK_MIN the sheet is in the flow: bring what matters into view ── */
  useEffect(() => {
    if (!reveal.kind || window.innerWidth >= DOCK_MIN) return;
    // after the sheet has laid out and the band's ScrollTrigger refresh (120 ms) has run
    const id = window.setTimeout(() => {
      const target = reveal.kind === "send" ? stageRef.current : sectionRef.current?.querySelector<HTMLElement>(".ai-insp");
      if (!target) return;
      const top = target.getBoundingClientRect().top;
      const vh = window.innerHeight;
      // send: the film's top at the top of the viewport so the climb and the first rows share it;
      // open: the sheet's top at a third of the viewport, unless it is already comfortably in view
      const offset = reveal.kind === "send" ? -8 : -Math.round(vh * 0.32);
      if (reveal.kind === "send" ? Math.abs(top) < 40 : top > 0 && top < vh * 0.62) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { offset, duration: reduced.current ? 0 : 1, immediate: reduced.current });
      else window.scrollTo({ top: window.scrollY + top + offset, behavior: reduced.current ? "auto" : "smooth" });
    }, 180);
    return () => window.clearTimeout(id);
  }, [reveal]);

  /* ── open / close ── */
  const openLayer = useCallback((i: number, t: InspectorTab) => {
    follow.current = false;
    setLayer(i);
    setTab(t);
    setSheet(true);
    setFocusOpen(true);
    setReveal((r) => ({ kind: "open", n: r.n + 1 }));
  }, []);
  const close = useCallback(
    (returnFocus: boolean) => {
      setSheet(false);
      setFocusOpen(false);
      setHover(null);
      armed.current = null;
      if (returnFocus) tagRefs.current[layer]?.focus({ preventScroll: true });
    },
    [layer],
  );

  const pickLayer = useCallback((i: number) => {
    follow.current = false;
    setLayer(i);
    setFocusOpen(true);
  }, []);

  /* ── keys and the page's operator events ── */
  useEffect(() => {
    const el = sectionRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape unpins the inspect box first, then closes the sheet
      if (inspect && hover !== null && !sheet) {
        setHover(null);
        return;
      }
      if (sheet) close(true);
    };
    const onSend = () => {
      if (el) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(el, { duration: reduced.current ? 0 : 1.2, immediate: reduced.current });
        else el.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth" });
      }
      send();
    };
    const onLogs = () => {
      setSheet(true);
      setTab("logs");
      setFocusLogsSeq((s) => s + 1);
      setReveal((r) => ({ kind: "open", n: r.n + 1 }));
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
  }, [sheet, close, send, inspect, hover]);

  /* ── geometry ── */
  const g: Geo = { ar };
  const sx = (v: number) => sxOf(g, v);
  const sy = (v: number) => syOf(g, v);
  const x = sx(CX);
  const labelX = Math.min(sx(LABEL_X), 0.94);
  // while the inspector is docked at the right the tags swing to the left of the stack
  const labelXm = Math.max(x - (labelX - x), 0.04);
  const boxVars = (i: number) => {
    const b = BOXES[i];
    const l = sx(b.x);
    const t = sy(b.y);
    return {
      ["--bx" as string]: pct(l),
      ["--by" as string]: pct(t),
      ["--bw" as string]: pct(sx(b.x + b.w) - l),
      ["--bh" as string]: pct(sy(b.y + b.h) - t),
    };
  };
  const q = shown !== null ? frameQuad(shown) : null;
  const subject = presetById(preset).subject;

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
    // touch + Inspect: tap 1 draws the box and the chip, tap 2 opens the inspector
    // (a tap also focuses the tag, so the armed layer is tracked apart from hover)
    if (lastPointer.current === "touch" && inspect && armed.current !== i) {
      armed.current = i;
      setHover(i);
      return;
    }
    armed.current = null;
    if (sheet && layer === i && tab === "code" && !inspect) {
      close(false);
      return;
    }
    openLayer(i, "code");
  };
  // a touch outside the layers drops a tapped-but-unopened box
  const onStageDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || hover === null) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".ai-sf__tag, .ai-sf__hit")) {
      armed.current = null;
      setHover(null);
    }
  };

  return (
    <section
      ref={sectionRef}
      data-rail="Stack"
      data-ch={STACK_CH}
      data-fig="stack"
      data-sheet={sheet ? "" : undefined}
      data-boxed={inspect && shown !== null ? "" : undefined}
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

      <div className="ai-sf__bench">
        <div
          ref={stageRef}
          className="ai-sf__stage"
          data-dim={shown !== null ? "" : undefined}
          data-inspect={inspect ? "" : undefined}
          data-running={running ? "" : undefined}
          onPointerDown={onStageDown}
        >
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
            <span key={shown} aria-hidden="true" className="ai-sf__focus" style={{ left: pct(x), top: pct(sy(LAYER_Y[shown])) }} />
          ) : null}
          <span aria-hidden="true" className="ai-sf__scan" />
          <span ref={trailRef} aria-hidden="true" className="ai-sf__trail" style={{ ["--x" as string]: pct(x) }} />
          <span ref={packetRef} aria-hidden="true" className="ai-sf__packet" style={{ ["--x" as string]: pct(x) }}>
            <span className="ai-sf__pk">
              <span>{subject.doc}</span>
              <em ref={packetMsRef}>0 ms</em>
            </span>
          </span>

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
                  ["--x" as string]: pct(x),
                  ["--y" as string]: pct(sy(LAYER_Y[i])),
                  ["--lx" as string]: pct(labelX),
                  ["--lxm" as string]: pct(labelXm),
                }}
              >
                <span aria-hidden="true" className="ai-sf__flare" />
                <span aria-hidden="true" className="ai-sf__pulse" />
                <span aria-hidden="true" className="ai-sf__leader" />
                <div
                  aria-hidden="true"
                  className="ai-sf__hit"
                  style={boxVars(i)}
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
            data-pinned={inspect && focusOpen && open !== null && shown === open ? "" : undefined}
            data-low={shown !== null && BOXES[shown].y > 0.6 ? "" : undefined}
            style={shown !== null ? boxVars(shown) : undefined}
          >
            <span className="ai-sf__ruler ai-sf__ruler--l" />
            <span className="ai-sf__ruler ai-sf__ruler--r" />
            <span className="ai-sf__ruler ai-sf__ruler--t" />
            <span className="ai-sf__ruler ai-sf__ruler--b" />
            <span className="ai-sf__box">
              <i className="ai-sf__h ai-sf__h--tl" />
              <i className="ai-sf__h ai-sf__h--tr" />
              <i className="ai-sf__h ai-sf__h--bl" />
              <i className="ai-sf__h ai-sf__h--br" />
            </span>
            {q ? (
              <>
                <p className="ai-sf__read ai-sf__read--x">x {q.x}</p>
                <p className="ai-sf__read ai-sf__read--y">y {q.y}</p>
                <p className="ai-sf__read ai-sf__read--wh">
                  {q.w} <i>x</i> {q.h}
                </p>
              </>
            ) : null}
            {shown !== null ? (
              <p className="ai-sf__chip">
                <span className="ai-sf__chip-n">
                  {STACK_LAYERS[shown].n} . {STACK_LAYERS[shown].name}
                </span>
                {CONTRACTS[shown].split("->").map((part, k) => (
                  <span key={k}>
                    {k > 0 ? <b> {"->"} </b> : null}
                    {part.trim()}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          {shown !== null && inspect ? (
            <span className="sr-only" aria-live="polite">
              {STACK_COPY.sr.box(STACK_LAYERS[shown].name, frameQuad(shown).w, frameQuad(shown).h)}. {CONTRACTS[shown]}
            </span>
          ) : null}

          <p aria-hidden="true" className="ai-sf__hud ai-sf__hud--bl">
            {STACK_COPY.headline}
          </p>
        </div>

        <StackInspector
          open={sheet}
          layer={layer}
          onLayer={pickLayer}
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
          <i aria-hidden="true" className="ai-sf__send-glyph" />
          <span>{STACK_COPY.controls.send}</span>
          <span aria-hidden="true" className="ai-sf__send__fill">
            <i className="ai-sf__send-glyph" />
            <span>{STACK_COPY.controls.send}</span>
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
        <button type="button" className="ai-sf__tog ai-sf__tog--inspect" aria-pressed={inspect} onClick={() => setInspect((v) => !v)}>
          <i aria-hidden="true" className="ai-sf__cross" />
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
        {/* one line under the controls: the footnote, swapped for the inspect hint while inspecting */}
        <div className="ai-sf__notes" data-inspect={inspect ? "" : undefined}>
          <p className="ai-sf__hint" aria-hidden={!inspect}>
            <span className="ai-sf__hint-fine">{STACK_COPY.hint.fine}</span>
            <span className="ai-sf__hint-touch">{STACK_COPY.hint.touch}</span>
          </p>
          <p className="ai-sf__foot">{STACK_COPY.foot}</p>
        </div>
      </div>
    </section>
  );
}

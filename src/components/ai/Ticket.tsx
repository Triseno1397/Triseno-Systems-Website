"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Glyph from "@/components/world/Glyph";
import { useWarp } from "@/components/world/WarpProvider";
import { session, useSession, type SessionState } from "./session";
import { DIAGNOSTIC_HREF, TICKET } from "./exit.content";
import "@/app/ai-ticket.css";

/**
 * Fig. 12 — the diagnostic ticket.
 *
 * A paper receipt lying on the dark arrival plate, listing this session and
 * nobody else's: the request the visitor minted inside the core with their
 * own clock, the steps pressed into agents, the trace they sent, the slip
 * they approved or the vendor they corrected, the night's count, how many
 * figures rendered, and `cookies . 0`. Across its bottom runs a perforation
 * and a stub that says TEAR TO START.
 *
 * The tear is the mechanic. Put a pointer on the stub and pull: it hinges
 * on the perforation corner across from the pointer (the one a real tear
 * reaches last), the paper bridges stretch as fibres and snap one by one
 * from under the finger toward the hinge, and past a certain angle the stub
 * comes free, drops with a
 * little gravity, fades, and the diagnostic warp fires — the very same
 * `travel(href)` the ghost button beside it carries. Let go early and the
 * stub eases back, the snapped fibres staying snapped. A tap tugs the stub
 * so a click is never nothing. Keyboard tears instantly.
 *
 * Everything moves by transform and opacity; the physics run only during a
 * drag, in one rAF loop, and the rest of the ticket is static DOM.
 */

/* the perforation: eleven notches bitten out of both edges, ten fibres on the bridges between */
const NOTCHES = 11;
const NOTCH_W = 1.5; // % of the edge
const NOTCH_D = 3; // px
const FIBRES = NOTCHES - 1;
const FIBRE_H = 6; // px, the fibre's base height (scaled to the gap)

/* the tear */
const MAX_DEG = 48;
const DETACH_DEG = 38;
const PULL_DEG = 8; // past this the gate's glyph morphs toward the plus
const FOLLOW = 0.92;
const TAP_MS = 250;
const TAP_PX = 6;
const GRAVITY = 2400; // px/s^2
const TUMBLE_MIN = 110; // deg/s: a still hand still gets a tumble
const TUMBLE_MAX = 260; // deg/s: a fast rip does not spin like a coin
const FALL_MS = 700;
const FADE_AT = 160;
const KEY_STAGGER = 30;

const STUB_H = 56;

function perforation(side: "body" | "stub"): string {
  const pts: string[] = [];
  const notch = (k: number): [string, string] => {
    const c = ((k + 0.5) / NOTCHES) * 100;
    return [`${(c - NOTCH_W / 2).toFixed(3)}%`, `${(c + NOTCH_W / 2).toFixed(3)}%`];
  };
  if (side === "body") {
    pts.push("0 0", "100% 0", "100% 100%");
    for (let k = NOTCHES - 1; k >= 0; k--) {
      const [xl, xr] = notch(k);
      pts.push(`${xr} 100%`, `${xr} calc(100% - ${NOTCH_D}px)`, `${xl} calc(100% - ${NOTCH_D}px)`, `${xl} 100%`);
    }
    pts.push("0 100%");
  } else {
    pts.push("0 0");
    for (let k = 0; k < NOTCHES; k++) {
      const [xl, xr] = notch(k);
      pts.push(`${xl} 0`, `${xl} ${NOTCH_D}px`, `${xr} ${NOTCH_D}px`, `${xr} 0`);
    }
    pts.push("100% 0", "100% 100%", "0 100%");
  }
  return `polygon(${pts.join(", ")})`;
}
const BODY_CLIP = perforation("body");
const STUB_CLIP = perforation("stub");

/* a deterministic 1.5px of grain per fibre, so they never all give at once */
const jitter = (i: number) => (((i * 7919) % 13) / 13) * 3 - 1.5;

type Row = { key: string; label: string; value: string; live: boolean };

const num = (n: number) => n.toLocaleString("en-US");

function buildRows(s: SessionState): Row[] {
  const steps = (() => {
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].src === "compression") return s.events[i].line;
    return null;
  })();
  const t = s.lastTrace;
  const slip = s.slip;
  const r = (key: keyof typeof TICKET.rows, value: string | null): Row => ({
    key,
    label: TICKET.rows[key],
    value: value ?? TICKET.blank,
    live: value !== null,
  });
  return [
    r("req", s.req ? s.req.id : null),
    r("minted", s.req ? `${s.req.local}${s.req.tz ? ` ${s.req.tz}` : ""} . ${TICKET.mintedTail}` : null),
    // the compression line reads "12 steps -> 05 agents . 2 layers"; under STEPS the word is already said
    r("steps", steps ? steps.replace(/^(\d+)\s+steps\b/i, "$1") : null),
    r("trace", t ? `${num(t.totalMs)} ms . ${t.spans.length} spans . ${t.state}` : null),
    r(
      "slip",
      slip
        ? slip.outcome === "approved"
          ? `approved${slip.to ? ` . ${slip.to}` : ""}`
          : `corrected${slip.value ? ` . ${slip.value}` : ""}`
        : null,
    ),
    r("night", s.night ? `${num(s.night.tasks)} tasks . ${num(s.night.escalations)} escalations` : null),
    r("figures", `${s.figures.length} ${TICKET.rendered}`),
    r("cookies", TICKET.cookies),
  ];
}

function plainText(rows: Row[]): string {
  const w = Math.max(...rows.map((r) => r.label.length)) + 2;
  return [TICKET.head.toUpperCase(), TICKET.sub, "", ...rows.map((r) => `${r.label.padEnd(w)}${r.value}`)].join("\n");
}

/* a hairline code strip derived from the ticket's own text: it changes with the session */
function codeBars(seed: string, n = 44): { w: number; g: number }[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: { w: number; g: number }[] = [];
  for (let i = 0; i < n; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const v = h >>> 0;
    out.push({ w: 1 + (v & 1), g: 1 + ((v >> 1) & 1) + ((v >> 3) & 1) });
  }
  return out;
}

type Fibre = { el: HTMLElement; dist: number; tol: number; snapped: boolean; len: number; phi: number };

interface TicketProps {
  className?: string;
  /** true while the stub is pulled past 8deg (the gate plays its CTA morph), false when it returns */
  onPull?: (on: boolean) => void;
}

export default function Ticket({ className = "", onPull }: TicketProps) {
  const rootRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLButtonElement>(null);
  const fibresRef = useRef<HTMLDivElement>(null);
  const { travel } = useWarp();
  const travelRef = useRef(travel);
  const onPullRef = useRef(onPull);
  useEffect(() => {
    travelRef.current = travel;
    onPullRef.current = onPull;
  }, [travel, onPull]);

  const s = useSession();
  const rows = useMemo(() => buildRows(s), [s]);
  const operated = !!(s.req || s.lastTrace || s.slip || s.night || s.dives || s.requests || s.events.length);
  const text = useMemo(() => plainText(rows), [rows]);
  const bars = useMemo(() => codeBars(text), [text]);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no clipboard (insecure context, permissions): the link simply does nothing
    }
  };

  // the rows print in once the Descent's iris has opened (its data-open, the
  // same 55% threshold that fades the gate's copy in); scrolling back
  // un-prints them with the copy
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const descent = root.closest<HTMLElement>(".ai-descent");
    if (!descent) {
      root.setAttribute("data-print", "");
      return;
    }
    const sync = () => root.toggleAttribute("data-print", descent.hasAttribute("data-open"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(descent, { attributes: true, attributeFilter: ["data-open"] });
    return () => mo.disconnect();
  }, []);

  // the tear
  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const stub = stubRef.current;
    const wrap = fibresRef.current;
    if (!root || !body || !stub || !wrap) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fibreEls = Array.from(wrap.children) as HTMLElement[];

    const d = {
      active: false,
      detached: false,
      s: 1, // +1 hinge at the left corner, -1 at the right
      hx: 0,
      hy: 0,
      W: 0,
      a: 0, // the stub's angle from the perforation, deg, 0..MAX_DEG
      target: 0,
      omega: 0, // deg/s
      lastT: 0,
      y: 0,
      vy: 0,
      at: 0,
      x0: 0,
      y0: 0,
      t0: 0,
      moved: 0,
      fib: [] as Fibre[],
    };
    let raf = 0;
    const timers: number[] = [];
    let fired = false;
    let pullOn = false;

    const pull = (on: boolean) => {
      if (on === pullOn) return;
      pullOn = on;
      onPullRef.current?.(on);
    };

    /** the same navigation as the ghost button, once */
    const fire = () => {
      if (fired) return;
      fired = true;
      session.log("gate", `ticket torn . ${session.get().figures.length} figures rendered`);
      travelRef.current(DIAGNOSTIC_HREF);
    };

    /** hingeLeft: the stub pivots on its top-left corner (the pointer is on the right half) */
    const setup = (hingeLeft: boolean, r: DOMRect) => {
      d.s = hingeLeft ? 1 : -1;
      d.hx = hingeLeft ? r.left : r.right;
      d.hy = r.top;
      d.W = r.width;
      d.fib = fibreEls.map((el, i) => {
        const x = ((i + 1) * d.W) / NOTCHES;
        const dist = hingeLeft ? x : d.W - x;
        return {
          el,
          dist,
          // the fibres under the finger give at the first tug; the one by the hinge holds until ~30deg
          tol: 8 + 8 * (1 - dist / d.W) + jitter(i),
          snapped: el.hasAttribute("data-snap"),
          len: 0,
          phi: 0,
        };
      });
      stub.style.transformOrigin = hingeLeft ? "0 0" : "100% 0";
      stub.style.setProperty("--tug", `${d.s * 6}deg`);
      body.style.transformOrigin = hingeLeft ? "0 100%" : "100% 100%";
      stub.removeAttribute("data-return");
      stub.removeAttribute("data-tug");
      body.removeAttribute("data-settle");
      wrap.removeAttribute("data-return");
      d.active = true;
      d.detached = false;
      d.a = 0;
      d.target = 0;
      d.omega = 0;
      d.moved = 0;
      d.lastT = d.t0 = performance.now();
      root.setAttribute("data-drag", "");
    };

    const paint = () => {
      const rad = (d.a * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      stub.style.transform = `rotate(${(d.s * d.a).toFixed(3)}deg)`;
      // the body tugs a fraction with the stub, so the whole ticket feels held
      body.style.transform = `rotate(${(-d.s * d.a * 0.05).toFixed(3)}deg)`;
      for (const f of d.fib) {
        if (f.snapped) continue;
        // the stub-edge point, rotated about the hinge, relative to the fibre's rest point
        const vx = d.s * f.dist * (cos - 1);
        const vy = f.dist * sin;
        f.len = Math.hypot(vx, vy);
        f.phi = (Math.atan2(-vx, vy) * 180) / Math.PI;
        f.el.style.transform = `rotate(${f.phi.toFixed(2)}deg) scaleY(${(f.len / FIBRE_H).toFixed(3)})`;
      }
      pull(d.a > PULL_DEG);
    };

    const snap = (f: Fibre) => {
      if (f.snapped) return;
      f.snapped = true;
      f.el.setAttribute("data-snap", "");
      f.el.style.transform = `rotate(${f.phi.toFixed(2)}deg) scaleY(0)`;
    };

    const finish = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      d.active = false;
      root.removeAttribute("data-drag");
      root.setAttribute("data-torn", "");
    };

    const detach = (t: number) => {
      d.detached = true;
      d.at = t;
      d.y = 0;
      d.vy = 0;
      // keep turning the way it was pulled, within reason
      d.omega = Math.min(TUMBLE_MAX, Math.max(TUMBLE_MIN, Math.abs(d.omega)));
      for (const f of d.fib) snap(f);
      root.setAttribute("data-detached", "");
      body.setAttribute("data-settle", "");
      body.style.transform = "";
      pull(true);
      fire();
    };

    const step = (t: number) => {
      if (!d.active) return;
      const dt = Math.min(0.05, Math.max(0, (t - d.lastT) / 1000));
      d.lastT = t;
      if (!d.detached) {
        const prev = d.a;
        d.a += (d.target - d.a) * (1 - Math.exp(-dt * 24));
        if (dt > 0) d.omega = d.omega * 0.6 + ((d.a - prev) / dt) * 0.4;
        paint();
        let holding = 0;
        for (const f of d.fib) {
          if (f.snapped) continue;
          if (f.len > f.tol) snap(f);
          else holding++;
        }
        if (d.a >= DETACH_DEG || holding === 0) detach(t);
      } else {
        const age = t - d.at;
        d.vy += GRAVITY * dt;
        d.y += d.vy * dt;
        d.a += d.omega * dt;
        d.omega *= Math.exp(-dt * 1.5);
        stub.style.transform = `translate3d(0, ${d.y.toFixed(1)}px, 0) rotate(${(d.s * d.a).toFixed(2)}deg)`;
        stub.style.opacity = age < FADE_AT ? "1" : String(Math.max(0, 1 - (age - FADE_AT) / (FALL_MS - FADE_AT)));
        if (age >= FALL_MS) {
          finish();
          return;
        }
      }
      raf = requestAnimationFrame(step);
    };

    /** let go before the stub came free: it eases back, the snapped fibres stay snapped */
    const release = () => {
      if (!d.active || d.detached) return;
      cancelAnimationFrame(raf);
      raf = 0;
      d.active = false;
      root.removeAttribute("data-drag");
      const tap = performance.now() - d.t0 < TAP_MS && d.moved < TAP_PX;
      stub.setAttribute("data-return", "");
      stub.style.transform = "";
      if (tap) stub.setAttribute("data-tug", "");
      body.setAttribute("data-settle", "");
      body.style.transform = "";
      wrap.setAttribute("data-return", "");
      for (const f of d.fib) if (!f.snapped) f.el.style.transform = `rotate(0deg) scaleY(0)`;
      pull(false);
    };

    const tearInstantly = () => {
      root.setAttribute("data-torn", "");
      pull(true);
      fire();
    };

    /** keyboard: the fibres give one after another, then the stub drops */
    const tearNow = () => {
      if (d.active || fired) return;
      if (reduced) {
        tearInstantly();
        return;
      }
      setup(true, stub.getBoundingClientRect());
      d.a = d.target = 6;
      paint();
      const order = [...d.fib].filter((f) => !f.snapped).sort((p, q) => q.dist - p.dist);
      order.forEach((f, i) => timers.push(window.setTimeout(() => snap(f), i * KEY_STAGGER)));
      timers.push(window.setTimeout(() => d.active && !d.detached && detach(performance.now()), order.length * KEY_STAGGER + 40));
      d.lastT = performance.now();
      raf = requestAnimationFrame(step);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (d.active || fired) return;
      if (reduced) {
        e.preventDefault();
        tearInstantly();
        return;
      }
      e.preventDefault();
      const r = stub.getBoundingClientRect();
      // the stub pivots on the corner across from the finger: the tear starts
      // under the pointer and runs to the far corner, which lets go last
      setup(e.clientX - r.left >= r.width / 2, r);
      d.x0 = e.clientX;
      d.y0 = e.clientY;
      try {
        stub.setPointerCapture(e.pointerId);
      } catch {
        // a synthetic pointer without capture still drags while it stays over the stub
      }
      raf = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      if (!d.active || d.detached) return;
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x0, e.clientY - d.y0));
      const dx = e.clientX - d.hx;
      const dy = e.clientY - d.hy;
      // the signed angle from the hinge to the pointer, measured off the
      // perforation: a lever the width of the stub, so a thumb pulls ~150 px to tear
      const raw = (Math.atan2(dy, d.s * dx) * 180) / Math.PI;
      d.target = Math.min(MAX_DEG, Math.max(0, raw)) * FOLLOW;
    };
    const onUp = () => release();
    const onContext = (e: Event) => {
      if (d.active) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      // a keyboard activation arrives as a click with no pointer behind it
      if (e.detail === 0) tearNow();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") release();
    };
    const onTugEnd = () => stub.removeAttribute("data-tug");

    stub.addEventListener("pointerdown", onDown);
    stub.addEventListener("pointermove", onMove);
    stub.addEventListener("pointerup", onUp);
    stub.addEventListener("pointercancel", onUp);
    stub.addEventListener("lostpointercapture", onUp);
    stub.addEventListener("contextmenu", onContext);
    stub.addEventListener("click", onClick);
    stub.addEventListener("animationend", onTugEnd);
    window.addEventListener("blur", onUp);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      stub.removeEventListener("pointerdown", onDown);
      stub.removeEventListener("pointermove", onMove);
      stub.removeEventListener("pointerup", onUp);
      stub.removeEventListener("pointercancel", onUp);
      stub.removeEventListener("lostpointercapture", onUp);
      stub.removeEventListener("contextmenu", onContext);
      stub.removeEventListener("click", onClick);
      stub.removeEventListener("animationend", onTugEnd);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  let i = 0;
  const idx = () => ({ ["--i" as string]: i++ });

  return (
    <article ref={rootRef} className={`ai-ticket ${className}`} aria-labelledby="ai-ticket-title" data-empty={operated ? undefined : ""}>
      <div ref={bodyRef} className="ai-ticket__body" style={{ clipPath: BODY_CLIP }}>
        <header className="ai-ticket__head" style={idx()}>
          <h3 id="ai-ticket-title" className="ai-ticket__title">
            {TICKET.head}
          </h3>
          <p className="ai-ticket__sub">{TICKET.sub}</p>
        </header>
        <dl className="ai-ticket__rows">
          {rows.map((r) => (
            <div key={r.key} className="ai-ticket__row" data-live={r.live ? "" : undefined} style={idx()}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        {!operated ? (
          <p className="ai-ticket__empty" style={idx()}>
            {TICKET.empty}
          </p>
        ) : null}
        <div className="ai-ticket__code" aria-hidden="true" style={idx()}>
          {bars.map((b, k) => (
            <i key={k} style={{ width: b.w, marginRight: b.g }} />
          ))}
        </div>
        <div className="ai-ticket__foot" style={idx()}>
          <button type="button" className="ai-ticket__copy" onClick={copy} data-copied={copied ? "" : undefined} aria-live="polite">
            {copied ? TICKET.copied : TICKET.copy}
          </button>
          <span>{s.req ? s.req.id : "no . 0000"}</span>
        </div>
      </div>

      {/* the fibres straddle the perforation; each is stretched to the gap during a pull */}
      <div ref={fibresRef} className="ai-ticket__fibres" aria-hidden="true" style={{ bottom: STUB_H }}>
        {Array.from({ length: FIBRES }, (_, k) => (
          <i key={k} className="ai-ticket__fibre" style={{ left: `${(((k + 1) / NOTCHES) * 100).toFixed(3)}%` }} />
        ))}
      </div>

      <button
        ref={stubRef}
        type="button"
        className="ai-ticket__stub"
        style={{ clipPath: STUB_CLIP, height: STUB_H }}
        aria-label={TICKET.stubSr}
      >
        <span className="ai-ticket__stub-in" aria-hidden="true" style={idx()}>
          <Glyph kind="triangle" size={12} className="ai-ticket__glyph" />
          <span>{TICKET.stub}</span>
          <span className="ai-ticket__arrow">&gt;</span>
        </span>
      </button>
    </article>
  );
}

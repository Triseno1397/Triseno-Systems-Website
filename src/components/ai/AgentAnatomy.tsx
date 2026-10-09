"use client";

import "@/app/ai-anatomy.css";
import { useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { session } from "./session";
import { COMPRESSION } from "./content";
import { ANATOMY, type AnatomyBlockId } from "./agent-anatomy.content";
import SpecNote from "./SpecNote";
import {
  REQUEST_AT,
  buildPlan,
  fitCamera,
  frameAt,
  packetAt,
  segAt,
  segClip,
  segEnd,
  segIndexAt,
  segStart,
  typeSizes,
  type AnatomyPlan,
  type Camera,
} from "./anatomyPlan";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fig. 05 — inside one agent: the push-in to the floorplan.
 *
 * The five agents from the previous sheet, redrawn as a hairline plan the size
 * of a hand in the middle of an empty page. Scrolling pushes the camera
 * straight into Verify: brackets lock on, the other four agents fall away, and
 * at three times the circle fills the brackets and its interior resolves into
 * a drafted floorplan (planner, memory, tool router, guardrails, evaluator on
 * a square die, a ring bus, three ports). By thirteen times the specs print;
 * at fourteen a single cyan trace lights segment by segment, the path
 * PO-8841 takes across the die, until the evaluator's 0.80 threshold catches
 * the 0.61 and routes it out through the human port. The HUD narrates.
 *
 * One scrubbed progress p is the only state; every frame is a pure function
 * of it (anatomyPlan.frameAt). Per changed frame: one transform write on the
 * zoom group, at most three opacity writes (the windows are staggered so no
 * more than three overlap), one clip-path on the lit segment, one transform
 * on the packet; text only when its value changes. Geometry and type sizes
 * are solved on resize only. Every stroke is non-scaling, so a hairline is
 * 1px at 1x and at 14x. Reduced motion: no pin, the die at 14x with the trace
 * lit end to end. Pointer: hover a block (tap, on touch) to light it and read
 * its line in the HUD.
 */

/* ── media, hydration-safe (the server renders the desktop sheet) ── */
const PHONE_Q = "(max-width: 767px)";
function subscribeMedia(cb: () => void) {
  const mq = window.matchMedia(PHONE_Q);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const phoneSnapshot = () => window.matchMedia(PHONE_Q).matches;
const serverSnapshot = () => false;

/** the figure box the server assumes before the first measure */
const SSR_BOX = { desktop: { w: 1300, h: 640 }, phone: { w: 350, h: 310 } };
const ssrCamera = (plan: AnatomyPlan): Camera => {
  const b = plan.phone ? SSR_BOX.phone : SSR_BOX.desktop;
  return fitCamera(plan, b.w, b.h);
};

/**
 * Wires one rendered sheet to its progress. Exported for the standalone
 * harness; the component calls it once per layout.
 */
export function bindAnatomy(
  section: HTMLElement,
  plan: AnatomyPlan,
  opts: { phone: boolean; reduced: boolean; fine: boolean },
) {
  const q = <T extends Element>(a: string) => section.querySelector<T>(`[data-a="${a}"]`);
  const fig = q<HTMLElement>("fig");
  const svg = q<SVGSVGElement>("svg");
  const zoomG = q<SVGGElement>("zoom");
  const place = q<SVGGElement>("place");
  const head = q<HTMLElement>("head");
  const reticle = q<SVGElement>("reticle");
  const vname = q<SVGGElement>("vname");
  const others = q<SVGGElement>("others");
  const die = q<SVGGElement>("die");
  const lvBlocks = q<SVGGElement>("lv-blocks");
  const lvSpecs = q<SVGGElement>("lv-specs");
  const packet = q<SVGGElement>("packet");
  const zoomText = q<HTMLElement>("zoom-text");
  const walk = q<HTMLElement>("walk");
  if (!fig || !svg || !zoomG || !place || !head || !reticle || !vname || !others || !die || !lvBlocks || !lvSpecs || !packet || !zoomText || !walk) {
    return null;
  }
  const segs = Array.from(section.querySelectorAll<SVGGElement>("[data-seg]"));
  const trace = plan.die.trace;
  const v = plan.agents[plan.verify];

  /* marks: one-off states that CSS eases in (opacity transitions, 500 ms) */
  const marks: Array<{ el: Element; at: number; on: boolean | null }> = [];
  section.querySelectorAll<SVGElement>("[data-mark]").forEach((el) => {
    marks.push({ el, at: Number(el.dataset.mark), on: null });
  });

  let cam: Camera = ssrCamera(plan);
  const st = { p: opts.reduced ? 1 : 0, hot: null as AnatomyBlockId | null };
  const last = {
    zoom: "",
    zoomText: "",
    op: new Map<Element, string>(),
    seg: new Array<string>(segs.length).fill(""),
    packet: "",
    packetOn: null as boolean | null,
    walk: -2,
    locked: null as boolean | null,
    live: null as boolean | null,
  };

  const setOp = (el: Element & ElementCSSInlineStyle, o: number) => {
    const s = o.toFixed(3);
    if (last.op.get(el) === s) return;
    last.op.set(el, s);
    el.style.opacity = s;
  };
  const flag = (name: string, on: boolean, prev: boolean | null) => {
    if (on !== prev) section.toggleAttribute(name, on);
    return on;
  };

  const measure = () => {
    const r = fig.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    cam = fitCamera(plan, r.width, r.height);
    place.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${cam.k.toFixed(5)})`);
    const fs = typeSizes(plan, cam);
    svg.style.setProperty("--fs-agent", String(fs.agent));
    svg.style.setProperty("--fs-block", String(fs.block));
    svg.style.setProperty("--fs-spec", String(fs.spec));
    svg.style.setProperty("--fs-tiny", String(fs.tiny));
    svg.style.setProperty("--fs-trace", String(fs.trace));
    svg.style.setProperty("--halo", String(fs.halo));
    last.zoom = "";
  };

  const walkLine = (i: number) => (i < 0 ? "" : ANATOMY.walk[Math.min(i, ANATOMY.walk.length - 1)]);
  const showWalk = (i: number) => {
    if (st.hot) return;
    walk.textContent = walkLine(i);
  };

  /* ── a block under the pointer (or a tap) lights, and the HUD reads its line ── */
  const setHot = (id: AnatomyBlockId | null) => {
    if (id === st.hot) return;
    st.hot = id;
    if (id) {
      section.setAttribute("data-hot", id);
      const b = ANATOMY.blocks.find((x) => x.id === id);
      walk.textContent = b ? b.line : "";
    } else {
      section.removeAttribute("data-hot");
      walk.textContent = walkLine(last.walk);
    }
  };
  const apply = () => {
    const p = st.p;
    const fr = frameAt(p, plan, cam);
    if (fr.zoom !== last.zoom) {
      last.zoom = fr.zoom;
      zoomG.setAttribute("transform", fr.zoom);
    }
    // phones set the head above the figure, and reduced motion keeps it: it never leaves
    setOp(head, opts.phone || opts.reduced ? 1 : fr.copy);
    setOp(reticle, fr.reticle);
    setOp(vname, fr.vname);
    setOp(others, fr.others);
    setOp(die, fr.die);
    setOp(lvBlocks, fr.blocks);
    setOp(lvSpecs, fr.specs);

    if (fr.zoomText !== last.zoomText) {
      last.zoomText = fr.zoomText;
      zoomText.textContent = fr.zoomText;
    }
    last.locked = flag("data-locked", fr.locked, last.locked);
    last.live = flag("data-live", fr.live, last.live);
    if (!fr.live && st.hot) setHot(null);

    // the trace: one clip per segment, written only when its share changed
    for (let i = 0; i < segs.length; i++) {
      const c = segAt(i, p);
      const key = c.toFixed(4);
      if (key === last.seg[i]) continue;
      last.seg[i] = key;
      segs[i].style.clipPath = segClip(trace[i], c);
    }
    // the request itself, at the head of the lit trace
    const pk = packetAt(plan, p);
    const on = pk !== null;
    if (on !== last.packetOn) {
      last.packetOn = on;
      packet.toggleAttribute("data-on", on);
    }
    if (pk) {
      const t = `translate(${pk.x.toFixed(2)} ${pk.y.toFixed(2)})`;
      if (t !== last.packet) {
        last.packet = t;
        packet.setAttribute("transform", t);
      }
    }
    for (const m of marks) {
      const mon = p >= m.at;
      if (mon !== m.on) {
        m.on = mon;
        m.el.toggleAttribute("data-on", mon);
      }
    }
    // the HUD narrates the walk, one line per segment
    const si = segIndexAt(p, trace.length);
    if (si !== last.walk) {
      last.walk = si;
      section.toggleAttribute("data-walk", si >= 0);
      showWalk(si);
    }
  };

  const blockOf = (e: Event) => (e.currentTarget as Element).getAttribute("data-block") as AnatomyBlockId | null;
  const onEnter = (e: PointerEvent) => {
    if (e.pointerType === "touch" || !section.hasAttribute("data-live")) return;
    setHot(blockOf(e));
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setHot(null);
  };
  const onTap = (e: Event) => {
    if (opts.fine || !section.hasAttribute("data-live")) return;
    const id = blockOf(e);
    setHot(st.hot === id ? null : id);
  };
  const onEscape = () => setHot(null);
  const hits = Array.from(section.querySelectorAll<SVGElement>("[data-block]"));
  for (const h of hits) {
    h.addEventListener("pointerenter", onEnter);
    h.addEventListener("pointerleave", onLeave);
    h.addEventListener("click", onTap);
  }
  window.addEventListener("ai:escape", onEscape);

  return {
    st,
    measure,
    apply,
    setP(p: number) {
      st.p = p;
      apply();
    },
    destroy() {
      for (const h of hits) {
        h.removeEventListener("pointerenter", onEnter);
        h.removeEventListener("pointerleave", onLeave);
        h.removeEventListener("click", onTap);
      }
      window.removeEventListener("ai:escape", onEscape);
      for (const a of ["data-hot", "data-live", "data-locked", "data-walk"]) section.removeAttribute(a);
    },
  };
}

export default function AgentAnatomy() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phone = useSyncExternalStore(subscribeMedia, phoneSnapshot, serverSnapshot);
  const plan = useMemo(() => buildPlan(phone), [phone]);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const ctl = bindAnatomy(section, plan, { phone, reduced, fine });
    if (!ctl) return;

    let figured = false;
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting || figured) return;
        figured = true;
        session.figure("anatomy");
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(section);

    const fig = section.querySelector<HTMLElement>('[data-a="fig"]');
    const ro = new ResizeObserver(() => {
      ctl.measure();
      ctl.apply();
    });
    if (fig) ro.observe(fig);

    const gctx = gsap.context(() => {
      if (reduced) return;
      gsap.to(ctl.st, {
        p: 1,
        ease: "none",
        onUpdate: ctl.apply,
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          // phones: the pin stays well under two viewport heights (M5)
          end: phone ? "+=110%" : "+=160%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: () => {
            ctl.measure();
            ctl.apply();
          },
        },
      });
    }, section);

    ctl.measure();
    ctl.apply();

    return () => {
      gctx.revert();
      io.disconnect();
      ro.disconnect();
      ctl.destroy();
    };
  }, [phone, plan]);

  return (
    <section
      ref={sectionRef}
      data-rail="Anatomy"
      data-ch={ANATOMY.n}
      data-fig="anatomy"
      aria-labelledby="ai-anat-title"
      className="ai-anat relative z-10"
    >
      <div ref={stageRef} className="ai-anat__stage">
        <header data-a="head" className="ai-anat__head">
          <p className="ai-label ai-anat__eyebrow">
            <b>{ANATOMY.n}</b> / {ANATOMY.label}
          </p>
          <h2 id="ai-anat-title" className="ai-anat__title">
            {ANATOMY.title}
          </h2>
          <p className="ai-body ai-anat__aside">{ANATOMY.aside}</p>
        </header>
        <p className="ai-label ai-anat__ch" aria-hidden="true">
          <b>{ANATOMY.n}</b> / {ANATOMY.label}
        </p>

        <figure data-a="fig" className="ai-anat__fig">
          <span aria-hidden="true" className="ai-frame__crop" data-c="tl" />
          <span aria-hidden="true" className="ai-frame__crop" data-c="tr" />
          <span aria-hidden="true" className="ai-frame__crop" data-c="bl" />
          <span aria-hidden="true" className="ai-frame__crop" data-c="br" />
          <Sheet plan={plan} />
          <SpecNote fig={ANATOMY.n} n={0} at="tr" dx={28} dy={phone ? 28 : 56} />
          <SpecNote fig={ANATOMY.n} n={1} at="br" dx={28} dy={phone ? 28 : 72} />
        </figure>

        <p className="ai-anat__hud">
          <span className="ai-anat__hud-row">
            <i aria-hidden="true" />
            {ANATOMY.hud.zoom}
            <b data-a="zoom-text" className="ai-anat__hud-zoom">
              1.0x
            </b>
          </span>
          <span className="ai-anat__hud-swap">
            <span className="ai-anat__hud-plan">{ANATOMY.hud.plan}</span>
            <span className="ai-anat__hud-agent">{ANATOMY.hud.agent}</span>
          </span>
          <span className="ai-anat__hud-swap">
            <span className="ai-anat__hud-hint">
              <span className="ai-anat__hint-fine">{ANATOMY.hint.fine}</span>
              <span className="ai-anat__hint-touch">{ANATOMY.hint.touch}</span>
            </span>
            <span data-a="walk" className="ai-anat__walk" />
          </span>
        </p>

        <p className="ai-figcap ai-anat__cap">
          <b>{ANATOMY.figcap.fig}</b>
          <span>{ANATOMY.figcap.text}</span>
        </p>

        <ol className="sr-only">
          {ANATOMY.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── the drawing ───────────────────────────────────────────────────────── */
function Sheet({ plan }: { plan: AnatomyPlan }) {
  const { vb, agents, r, die, phone } = plan;
  const v = agents[plan.verify];
  // the first paint, before measure: the server's guess at the figure box
  const cam = ssrCamera(plan);
  const fs = typeSizes(plan, cam);
  const f0 = frameAt(0, plan, cam);
  const names = COMPRESSION.agents;
  const blockCopy = (id: AnatomyBlockId) => ANATOMY.blocks.find((b) => b.id === id)!;
  const port = (id: "in" | "out" | "human") => die.ports.find((p) => p.id === id)!;
  const human = port("human");

  return (
    <svg
      data-a="svg"
      className="ai-anat__svg"
      viewBox={`0 0 ${vb.w} ${vb.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ANATOMY.aria}
      style={
        {
          "--fs-agent": fs.agent,
          "--fs-block": fs.block,
          "--fs-spec": fs.spec,
          "--fs-tiny": fs.tiny,
          "--fs-trace": fs.trace,
          "--halo": fs.halo,
        } as CSSProperties
      }
    >
      <g data-a="zoom" className="ai-anat__zoom" transform={f0.zoom}>
        {/* the plan: the system from the previous sheet */}
        <g data-a="others">
          <path className="ai-anat__hair ai-anat__hair--2" d={plan.bus} />
          {agents.map((a, i) =>
            i === plan.verify ? null : (
              <g key={i}>
                <circle className="ai-anat__ring ai-anat__ring--agent" cx={a.x} cy={a.y} r={r} />
                <text className="ai-anat__num" x={a.x} y={a.y} textAnchor="middle" dominantBaseline="central">
                  {String(i).padStart(2, "0")}
                </text>
                <text className="ai-anat__name" x={plan.names[i].x} y={plan.names[i].y} textAnchor={plan.names[i].anchor}>
                  {names[i]}
                </text>
              </g>
            ),
          )}
        </g>
        <circle className="ai-anat__ring" cx={v.x} cy={v.y} r={r} />
        <circle className="ai-anat__ring ai-anat__ring--lock" cx={v.x} cy={v.y} r={r} />
        <g data-a="vname">
          <text className="ai-anat__num" x={v.x} y={v.y} textAnchor="middle" dominantBaseline="central">
            {String(plan.verify).padStart(2, "0")}
          </text>
          <text className="ai-anat__name ai-anat__name--verify" x={plan.names[plan.verify].x} y={plan.names[plan.verify].y} textAnchor="middle">
            {names[plan.verify]}
          </text>
        </g>

        {/* the die, inside Verify: placed (k) on measure */}
        <g data-a="place" transform={`translate(${v.x} ${v.y}) scale(${cam.k.toFixed(5)})`}>
          <g data-a="die" className="ai-anat__die" style={{ opacity: 0 }}>
            <path className="ai-anat__hair ai-anat__grid" d={die.grid} />
            <rect className="ai-anat__diebody" x={-die.half} y={-die.half} width={die.size} height={die.size} />
            <path className="ai-anat__hair ai-anat__hair--2" d={die.pins} />
            <rect className="ai-anat__hair ai-anat__hair--3" x={-die.ring} y={-die.ring} width={die.ring * 2} height={die.ring * 2} />
            <path className="ai-anat__hair ai-anat__hair--2" d={die.wires} />
            <path className="ai-anat__pin1" d={die.pin1} />

            {die.blocks.map((b) => (
              <g key={b.id} className="ai-anat__block">
                <rect className="ai-anat__blockbody" x={b.x} y={b.y} width={b.w} height={b.h} />
                <rect className="ai-anat__wash" data-for={b.id} x={b.x} y={b.y} width={b.w} height={b.h} />
                {b.detail ? <path className="ai-anat__hair ai-anat__hair--2" d={b.detail} /> : null}
                {b.lit ? <path className="ai-anat__lit" data-mark={segStart(b.litAt)} d={b.lit} /> : null}
                <rect className="ai-anat__hair" x={b.x} y={b.y} width={b.w} height={b.h} />
              </g>
            ))}

            {/* the evaluator's gauge: 0.0 to 1.0, the 0.80 threshold, and where 0.61 lands */}
            <path className="ai-anat__hair ai-anat__hair--2" d={die.gauge.ticks} />
            <path className="ai-anat__hair" d={die.gauge.tick80} />
            <path className="ai-anat__value" data-mark={segStart(9)} d={die.gauge.tickValue} />

            {die.ports.map((p) => (
              <rect key={p.id} className="ai-anat__port" x={p.x} y={p.y} width={p.w} height={p.h} />
            ))}
            <rect className="ai-anat__portlit" data-mark={segEnd(10)} x={human.x + 3 * (die.size / 400)} y={human.y + 3 * (die.size / 400)} width={human.w - 6 * (die.size / 400)} height={human.h - 6 * (die.size / 400)} />

            {/* level 1: the block labels and ports */}
            <g data-a="lv-blocks" style={{ opacity: 0 }}>
              {die.blocks.map((b) => {
                const c = blockCopy(b.id);
                const label = phone ? c.labelShort : c.label;
                return (
                  <g key={b.id}>
                    <text className="ai-anat__blocklabel" x={b.lx} y={b.ly}>
                      {label}
                    </text>
                    <text className="ai-anat__blocklabel ai-anat__blocklabel--hot" data-for={b.id} x={b.lx} y={b.ly}>
                      {label}
                    </text>
                  </g>
                );
              })}
              {die.ports.map((p) => (
                <text key={p.id} className="ai-anat__tiny ai-anat__portlabel" x={p.lx} y={p.ly} textAnchor={p.anchor}>
                  {ANATOMY.ports[p.id]}
                </text>
              ))}
            </g>

            {/* level 2: the specs, the tool rows, the gauge's figures, the title block */}
            <g data-a="lv-specs" style={{ opacity: 0 }}>
              {die.blocks.map((b) => {
                const c = blockCopy(b.id);
                return (
                  <text key={b.id} className="ai-anat__spec" x={b.sx} y={b.sy} textAnchor={b.sAnchor}>
                    {phone ? c.short : c.spec}
                  </text>
                );
              })}
              {phone
                ? null
                : die.toolRows.map((t, i) => (
                    <text key={i} className="ai-anat__tiny" x={t.tx} y={t.ty}>
                      {ANATOMY.tools[i]}
                    </text>
                  ))}
              <text className="ai-anat__tiny" x={die.gauge.lo.x} y={die.gauge.lo.y} textAnchor={die.gauge.lo.anchor}>
                {ANATOMY.gauge.lo}
              </text>
              <text className="ai-anat__tiny" x={die.gauge.hi.x} y={die.gauge.hi.y} textAnchor={die.gauge.hi.anchor}>
                {ANATOMY.gauge.hi}
              </text>
              <text className="ai-anat__tiny ai-anat__tiny--ink" x={die.gauge.label80.x} y={die.gauge.label80.y} textAnchor="middle">
                {ANATOMY.gauge.threshold}
              </text>
              {phone ? null : (
                <text className="ai-anat__tiny ai-anat__title-block" x={die.labels.title.x} y={die.labels.title.y} textAnchor={die.labels.title.anchor}>
                  {ANATOMY.titleBlock}
                </text>
              )}
            </g>

            {/* the walk: eleven segments, each revealed along its own axis */}
            {die.trace.map((g, i) => (
              <g key={i} data-seg={i} className="ai-anat__seg" style={{ clipPath: segClip(g, 0) }}>
                <rect className="ai-anat__segbox" x={g.box.x} y={g.box.y} width={g.box.w} height={g.box.h} />
                <line className="ai-anat__trace" x1={g.x} y1={g.y} x2={g.x2} y2={g.y2} />
              </g>
            ))}
            <path className="ai-anat__arrow" data-mark={segEnd(10)} d={die.arrow} />

            {/* the trace's words */}
            {phone ? null : (
              <text className="ai-anat__tlabel" data-mark={REQUEST_AT} x={die.labels.request.x} y={die.labels.request.y} textAnchor={die.labels.request.anchor}>
                {ANATOMY.trace.request}
              </text>
            )}
            <text className="ai-anat__tlabel" data-mark={segStart(9)} x={die.labels.readout.x} y={die.labels.readout.y} textAnchor={die.labels.readout.anchor}>
              {ANATOMY.trace.readout}
            </text>
            <text className="ai-anat__tlabel" data-mark={segEnd(10)} x={die.labels.exit.x} y={die.labels.exit.y} textAnchor={die.labels.exit.anchor}>
              {ANATOMY.trace.exit}
            </text>

            {/* the request itself */}
            <g data-a="packet" className="ai-anat__packet">
              <rect className="ai-anat__packet-ring" x={-6} y={-6} width={12} height={12} />
              <rect className="ai-anat__packet-core" x={-2.5} y={-2.5} width={5} height={5} />
            </g>

            {/* hit areas last, so a block answers wherever the pointer is on it */}
            {die.blocks.map((b) => (
              <rect key={b.id} className="ai-anat__hit" data-block={b.id} x={b.x} y={b.y} width={b.w} height={b.h} />
            ))}
          </g>
        </g>
      </g>

      {/* the lock-on brackets: screen-fixed, the size Verify reaches at 3x */}
      <path data-a="reticle" className="ai-anat__reticle" d={plan.reticle} style={{ opacity: 0 }} />
    </svg>
  );
}

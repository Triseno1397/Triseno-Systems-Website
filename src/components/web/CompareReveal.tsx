"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import gsap from "gsap";
import ConceptPhoto from "./ConceptPhoto";
import GlassPanel from "@/components/world/GlassPanel";

/**
 * Triseno compare reveal — section 03, an object standing in the world.
 *
 * Mechanical starting point: 21st.dev "compare" — two layers and a drag line.
 * Tailored, and split by input:
 *
 * DESKTOP / fine pointer — the drag line. A hairline with a slim grip (no box
 * floating on the split); role="slider", arrow / Page / Home / End keys,
 * pointer capture, vertical scroll preserved. "What changed" is annotated with
 * 1px violet REGION OUTLINES that light with their note — no badge is ever
 * dropped on the mock's own words, and the Before / After legend sits above
 * the stage, never on it.
 *
 * PHONE — the same drag line, with the affordance said out loud: a wider grip
 * with arrows, a DRAG label riding on the divider until the first drag, and an
 * opening sweep that shows the thing moving before anyone touches it. The
 * two-state switch stays underneath — it names both sides, and one tap takes
 * the divider all the way over. Vertical scrolling is untouched: the stage and
 * the handle are touch-action: pan-y, so the page still scrolls under a thumb
 * that moves up and down and only the sideways part is ours.
 *
 * Position is written straight to one CSS custom property — no React re-render
 * per pointer move; only clip-path and transform change.
 */

/**
 * Resting split. The REBUILT site is uncovered to the LEFT of the handle, so
 * at rest its whole first screen — headline, promise, both actions — reads
 * clearly, and the old template shows on the right.
 */
const START = 62;

interface Note {
  /** region on the stage, in % of the stage box */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  body: string;
}

/** Regions sit over the rebuilt (left) layer; see AfterMock's layout. */
const NOTES: Note[] = [
  {
    x: 3.5,
    y: 24,
    w: 46,
    h: 44,
    title: "One job for the first screen",
    body: "The welcome slider is gone. The headline states the promise and leaves two actions: book or call.",
  },
  {
    x: 3.5,
    y: 82,
    w: 93,
    h: 13,
    title: "Prices on the page",
    body: "Rates and response time are stated up front. The old site hid them behind a contact form.",
  },
  {
    x: 56,
    y: 26,
    w: 40,
    h: 46,
    title: "Booking starts in the hero",
    body: "Two fields, live slots, thumb-sized targets. The phone number no longer lives in the footer.",
  },
];

/** A region's note lights once the handle has uncovered most of it. */
const LIT_AT = NOTES.map((n) => n.x + n.w * 0.7);

export default function CompareReveal() {
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const regionsRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLOListElement>(null);
  const posRef = useRef(START);
  const dragging = useRef(false);
  const sweep = useRef<gsap.core.Timeline | null>(null);

  /** Which side the divider is favouring — only for the switch's own state. */
  const [view, setView] = useState<"before" | "after">("after");
  const [fine, setFine] = useState(true);
  const touched = useRef(false);

  const apply = useCallback((value: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = Math.min(100, Math.max(0, value));
    posRef.current = pos;
    // Written straight to the three things that move. As a custom property on
    // the stage it restyled both concept mocks underneath it on every frame of
    // the sweep and every move of a thumb — about 290ms of style work a second
    // on a phone, on the very component being dragged.
    const cut = `inset(0 ${(100 - pos).toFixed(3)}% 0 0)`;
    if (afterRef.current) afterRef.current.style.clipPath = cut;
    if (regionsRef.current) regionsRef.current.style.clipPath = cut;
    const handle = handleRef.current;
    if (handle) {
      handle.style.transform = `translate3d(${pos.toFixed(3)}cqw, 0, 0)`;
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
      handle.setAttribute(
        "aria-valuetext",
        `${Math.round(pos)} percent of the rebuilt site shown`,
      );
    }
    setView(pos < 50 ? "before" : "after");
    NOTES.forEach((note, i) => {
      const lit = pos >= LIT_AT[i];
      stage
        .querySelector<HTMLElement>(`[data-region="${i}"]`)
        ?.toggleAttribute("data-lit", lit);
      notesRef.current?.children[i]?.toggleAttribute("data-lit", lit);
    });
  }, []);

  useEffect(() => {
    // Matches the CSS drag-mode query exactly: a fine pointer AND enough room
    // for two sites side by side. Anything narrower gets the switch.
    const mq = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (pointer: fine)",
    );
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    apply(posRef.current);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const proxy = { v: posRef.current };
        const paint = () => apply(proxy.v);
        sweep.current = gsap
          .timeline({ defaults: { onUpdate: paint } })
          .to(proxy, { v: 12, duration: 0.7, ease: "power3.inOut" })
          .to(proxy, { v: 94, duration: 1.2, ease: "power3.inOut" })
          .to(proxy, { v: START, duration: 0.9, ease: "expo.out" });
      },
      { threshold: 0.55 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      sweep.current?.kill();
    };
  }, [apply]);

  /** Phone: every note is relevant, so all of them read at full strength. */
  useEffect(() => {
    if (fine) return;
    NOTES.forEach((_, i) =>
      notesRef.current?.children[i]?.toggleAttribute("data-lit", true),
    );
  }, [fine]);

  const fromPointer = (clientX: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    apply(((clientX - rect.left) / rect.width) * 100);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    sweep.current?.kill();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    stageRef.current?.setAttribute("data-dragging", "");
    // the label has done its job the moment someone takes hold of the divider
    if (!touched.current) {
      touched.current = true;
      stageRef.current?.setAttribute("data-touched", "");
    }
    fromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    stageRef.current?.removeAttribute("data-dragging");
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  /** The switch takes the divider all the way across, in one move. */
  const slideTo = (target: number) => {
    sweep.current?.kill();
    const proxy = { v: posRef.current };
    sweep.current = gsap.timeline().to(proxy, {
      v: target,
      duration: 0.55,
      ease: "power3.inOut",
      onUpdate: () => apply(proxy.v),
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowLeft: -2,
      ArrowDown: -2,
      ArrowRight: 2,
      ArrowUp: 2,
      PageDown: -10,
      PageUp: 10,
    };
    let next: number | null = null;
    if (e.key in step) next = posRef.current + step[e.key];
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    sweep.current?.kill();
    apply(next);
  };

  return (
    <section
      data-rail="Before / After"
      data-station="compare"
      className="web-section web-compare"
    >
      <header className="web-compare__head">
        <div>
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            03 — Before / after
          </p>
          <h2 className="web-h2">Same business. Rebuilt.</h2>
        </div>
        <p className="web-body">
          The template a local trade firm usually starts with, and the same
          offer rebuilt around one action.
          <span className="web-hover-only">
            {" "}
            Drag the frame, or use the arrow keys.
          </span>
          <span className="web-touch-only">
            {" "}
            Drag the divider across the frame.
          </span>
        </p>
      </header>

      <div className="web-compare__main">
        <div className="web-compare__stack">
          {/* Legend OUTSIDE the stage, so no tag ever sits on the concept's own
              logo or headline. Drag mode only; the phone switch names the site. */}
          <p className="web-compare__legend" aria-hidden="true">
            <span>After — rebuilt</span>
            <span>Before — template</span>
          </p>
          <GlassPanel world="web" className="web-bezel">
            <div
              ref={stageRef}
              className="web-compare__stage"
              data-view={view}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div
                className="web-compare__layer"
                aria-label="Before: dated template layout"
                role="img"
              >
                <BeforeMock />
              </div>
              <div
                ref={afterRef}
                className="web-compare__layer web-compare__layer--after"
                aria-label="After: rebuilt layout"
                role="img"
              >
                <AfterMock />
              </div>

              {/* Region brackets, clipped to the same edge as the rebuilt layer. */}
              <div ref={regionsRef} aria-hidden="true" className="web-compare__regions">
                {NOTES.map((note, i) => (
                  <span
                    key={note.title}
                    data-region={i}
                    className="web-compare__region"
                    style={
                      {
                        "--x": `${note.x}%`,
                        "--y": `${note.y}%`,
                        "--w": `${note.w}%`,
                        "--h": `${note.h}%`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              <div
                ref={handleRef}
                className="web-compare__handle"
                role="slider"
                tabIndex={0}
                aria-label="Before and after divider"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={START}
                onKeyDown={onKeyDown}
              >
                <span aria-hidden="true" className="web-compare__line" />
                <span aria-hidden="true" className="web-compare__grip" />
                {/* says what the thing is, and rides on it, until it is used */}
                <span aria-hidden="true" className="web-compare__hint">
                  <i />
                  Drag
                  <i />
                </span>
              </div>
            </div>
          </GlassPanel>

          {/* Phone control, directly under the site it switches. Hidden on a fine
              pointer, where the drag line rules. */}
          <div
            className="web-compare__switch"
            role="group"
            aria-label="Show the old site or the rebuild"
          >
            {(["before", "after"] as const).map((v) => (
              <button
                key={v}
                type="button"
                data-on={view === v ? "" : undefined}
                aria-pressed={view === v}
                onClick={() => slideTo(v === "before" ? 0 : 100)}
              >
                {v === "before" ? "Before — template" : "After — rebuilt"}
              </button>
            ))}
          </div>
          <p className="web-fineprint">
            Concept rebuild for a fictional business. It shows layout decisions,
            not client results.
          </p>
        </div>

        <div className="web-compare__side">
          <ol ref={notesRef} className="web-compare__notes">
            {NOTES.map((note, i) => (
              <li key={note.title} className="web-compare__note">
                <span className="web-compare__note-n">
                  <i aria-hidden="true" />
                  {String(i + 1).padStart(2, "0")} — what changed
                </span>
                <span className="web-compare__note-t">{note.title}</span>
                <span className="web-compare__note-b">{note.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ── BEFORE: a deliberately dated template ─────────────────────────────── */
function BeforeMock() {
  return (
    <div className="bm">
      <div className="bm-wrap">
        <div className="bm-header">
          <span className="bm-title">
            Fennick &amp; Rowe Plumbing and Heating
          </span>
          <span className="bm-tag">
            Your Local Friendly Plumbers Since 1998!!
          </span>
          <span className="bm-phone">Tel: (555) 014-2200</span>
        </div>
        <div className="bm-nav">
          <span>Home</span>
          <span>About Us</span>
          <span>Services</span>
          <span>Gallery</span>
          <span>Testimonials</span>
          <span>Contact Us</span>
        </div>
        <div className="bm-slider">
          <span className="bm-arrow">&lsaquo;</span>
          <span className="bm-welcome">Welcome To Our Website</span>
          <span className="bm-arrow">&rsaquo;</span>
          <span className="bm-dots">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="bm-notice">
          *** CALL NOW FOR A FREE NO OBLIGATION QUOTE ***
        </div>
        <div className="bm-boxes">
          <div>
            <i />
            <b>Our Services</b>
            <span>
              We offer a wide range of plumbing and heating services to suit all
              of your needs. Click here to read more.
            </span>
          </div>
          <div>
            <i />
            <b>About Us</b>
            <span>
              We are a family run business with many years of experience in the
              trade. Click here to read more.
            </span>
          </div>
          <div>
            <i />
            <b>Contact Us</b>
            <span>
              Please fill in the form on our contact page and we will get back
              to you as soon as possible.
            </span>
          </div>
        </div>
        <div className="bm-footer">
          Visitors: 004,381 · Best viewed at 1024 × 768 · Site by TemplateKing
        </div>
      </div>
    </div>
  );
}

/* ── AFTER: the rebuilt concept ────────────────────────────────────────── */
function AfterMock() {
  return (
    <div className="am">
      <ConceptPhoto
        slug="fennick-rowe-engineer"
        className="am-photo"
        position="50% 30%"
      />
      <span className="am-shade" aria-hidden="true" />
      <div className="am-nav">
        <span className="am-logo">
          <i />
          Fennick &amp; Rowe
        </span>
        <span className="am-links">
          <span>Heating</span>
          <span>Plumbing</span>
          <span>Bathrooms</span>
          <span>Prices</span>
        </span>
        <span className="am-call">Call (555) 014-2200</span>
      </div>
      <div className="am-body">
        <div className="am-copy">
          <span className="am-kicker">
            Heating + plumbing · Northgate and 12 miles around
          </span>
          <span className="am-h">
            Boiler out? An engineer at your door in 90 minutes.
          </span>
          <span className="am-p">
            Fixed prices, no call-out fee, and a named engineer who texts before
            arriving.
          </span>
          <span className="am-actions">
            <span className="am-btn am-btn--solid">Book a visit</span>
            <span className="am-btn">Call now</span>
          </span>
          <span className="am-trust">
            <span>
              <b>4.9 / 5</b>1,240 reviews
            </span>
            <span>
              <b>24 / 7</b>emergency line
            </span>
            <span>
              <b>12 mo</b>work guarantee
            </span>
          </span>
        </div>
        <div className="am-card">
          <span className="am-card__t">Book an engineer</span>
          <span className="am-field">
            <b>What is wrong?</b>No heating or hot water
          </span>
          <span className="am-field">
            <b>Postcode</b>NG4 2__
          </span>
          <span className="am-btn am-btn--solid am-btn--wide">
            See today&apos;s slots
          </span>
          <span className="am-slot">
            <i />
            Next slot: 14:30 today
          </span>
        </div>
      </div>
      <div className="am-prices">
        <span>
          <b>Boiler service</b>from 79
        </span>
        <span>
          <b>Emergency call-out</b>0 call-out fee
        </span>
        <span>
          <b>Bathroom install</b>fixed quote in 24 h
        </span>
      </div>
    </div>
  );
}

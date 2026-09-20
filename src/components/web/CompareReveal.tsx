"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";

/**
 * Triseno compare reveal — section 03, an object standing in the world.
 *
 * Mechanical starting point: 21st.dev "compare" — two layers and a drag line.
 * Tailored, and split by input:
 *
 * DESKTOP / fine pointer — the drag line. Hairline handle carrying the
 * division's square glyph; role="slider", arrow / Page / Home / End keys,
 * pointer capture, vertical scroll preserved. "What changed" is annotated with
 * 1px violet REGION BRACKETS, not badges dropped on top of the mock's own
 * words: the bracket outlines the area that changed and its number sits on the
 * bracket's top edge, outside the region.
 *
 * PHONE — a drag line over two full-width sites does not communicate anything
 * at 390px, so there is no drag line. The stage shows ONE site at a time at
 * full width, and a ghost two-state switch (or a tap anywhere on the stage)
 * cuts between them, with the numbered changes listed underneath. The same
 * information, read the way a phone can read it.
 *
 * Position is written straight to one CSS custom property — no React re-render
 * per pointer move; only clip-path and transform change.
 */

/** Resting split: the rebuilt booking card shows whole on the right. */
const START = 60;

interface Note {
  /** region on the stage, in % of the stage box */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  body: string;
}

/** Regions sit over the rebuilt (right) layer; see AfterMock's layout. */
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

/** The handle has to clear a region before that region's note lights. */
const LIT_AT = [46, 28, 88];

export default function CompareReveal() {
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLOListElement>(null);
  const posRef = useRef(START);
  const dragging = useRef(false);
  const sweep = useRef<gsap.core.Timeline | null>(null);

  /** Phone: which site is on the stage. Ignored on a fine pointer. */
  const [view, setView] = useState<"before" | "after">("before");
  const [fine, setFine] = useState(true);

  const apply = useCallback((value: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = Math.min(100, Math.max(0, value));
    posRef.current = pos;
    stage.style.setProperty("--n", pos.toFixed(3));
    const handle = handleRef.current;
    if (handle) {
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
      handle.setAttribute("aria-valuetext", `${Math.round(100 - pos)} percent of the rebuilt site shown`);
    }
    NOTES.forEach((note, i) => {
      const lit = pos <= LIT_AT[i];
      stage.querySelector<HTMLElement>(`[data-region="${i}"]`)?.toggleAttribute("data-lit", lit);
      notesRef.current?.children[i]?.toggleAttribute("data-lit", lit);
    });
  }, []);

  useEffect(() => {
    // Matches the CSS drag-mode query exactly: a fine pointer AND enough room
    // for two sites side by side. Anything narrower gets the switch.
    const mq = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !fine) return;
    apply(posRef.current);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const proxy = { v: posRef.current };
        const paint = () => apply(proxy.v);
        sweep.current = gsap
          .timeline({ defaults: { onUpdate: paint } })
          .to(proxy, { v: 88, duration: 0.7, ease: "power3.inOut" })
          .to(proxy, { v: 10, duration: 1.2, ease: "power3.inOut" })
          .to(proxy, { v: START, duration: 0.9, ease: "expo.out" });
      },
      { threshold: 0.55 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      sweep.current?.kill();
    };
  }, [apply, fine]);

  /** Phone: every note is relevant, so all of them read at full strength. */
  useEffect(() => {
    if (fine) return;
    NOTES.forEach((_, i) => notesRef.current?.children[i]?.toggleAttribute("data-lit", true));
  }, [fine]);

  /**
   * Phone: the first time the stage is properly on screen, show the old site
   * for a beat and then cut to the rebuild by itself, so the change is SEEN
   * even by someone who never touches the switch.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || fine) return;
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        timer = window.setTimeout(() => setView("after"), 1400);
      },
      { threshold: 0.6 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [fine]);

  const fromPointer = (clientX: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    apply(((clientX - rect.left) / rect.width) * 100);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!fine || e.button !== 0) return;
    sweep.current?.kill();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    stageRef.current?.setAttribute("data-dragging", "");
    fromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (fine && dragging.current) fromPointer(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    stageRef.current?.removeAttribute("data-dragging");
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
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
    <section data-rail="Before / After" data-station="compare" className="web-section web-compare">
      <header className="web-compare__head">
        <div>
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            03 — Before / after
          </p>
          <h2 className="web-h2">Same business. Rebuilt.</h2>
        </div>
        <p className="web-body">
          The template a local trade firm usually starts with, and the same offer rebuilt around one action.
          <span className="web-hover-only"> Drag the frame, or use the arrow keys.</span>
          <span className="web-touch-only"> Tap to cut between them.</span>
        </p>
      </header>

      <div className="web-compare__main">
        <div className="web-compare__stack">
          <div
            ref={stageRef}
            className="web-compare__stage"
            data-view={view}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => {
              if (!fine) setView((v) => (v === "before" ? "after" : "before"));
            }}
          >
            <div className="web-compare__layer" aria-label="Before: dated template layout" role="img">
              <BeforeMock />
              <span className="web-compare__label web-compare__label--before">Before — template</span>
            </div>
            <div
              className="web-compare__layer web-compare__layer--after"
              aria-label="After: rebuilt layout"
              role="img"
            >
              <AfterMock />
              <span className="web-compare__label web-compare__label--after">After — rebuilt</span>
            </div>

            {/* Region brackets, clipped to the same edge as the rebuilt layer. */}
            <div aria-hidden="true" className="web-compare__regions">
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
                >
                  <i>{String(i + 1).padStart(2, "0")}</i>
                </span>
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
              <span aria-hidden="true" className="web-compare__knob">
                <i />
              </span>
            </div>
          </div>

          {/* Phone control, directly under the site it switches. Hidden on a fine
              pointer, where the drag line rules. */}
          <div className="web-compare__switch" role="group" aria-label="Show the old site or the rebuild">
            {(["before", "after"] as const).map((v) => (
              <button
                key={v}
                type="button"
                data-on={view === v ? "" : undefined}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v === "before" ? "Before — template" : "After — rebuilt"}
              </button>
            ))}
          </div>

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
          <p className="web-fineprint">
            Concept rebuild for a fictional business. It shows layout decisions, not client results.
          </p>
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
          <span className="bm-title">Fennick &amp; Rowe Plumbing and Heating</span>
          <span className="bm-tag">Your Local Friendly Plumbers Since 1998!!</span>
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
        <div className="bm-notice">*** CALL NOW FOR A FREE NO OBLIGATION QUOTE ***</div>
        <div className="bm-boxes">
          <div>
            <i />
            <b>Our Services</b>
            <span>
              We offer a wide range of plumbing and heating services to suit all of your needs. Click here to
              read more.
            </span>
          </div>
          <div>
            <i />
            <b>About Us</b>
            <span>
              We are a family run business with many years of experience in the trade. Click here to read
              more.
            </span>
          </div>
          <div>
            <i />
            <b>Contact Us</b>
            <span>
              Please fill in the form on our contact page and we will get back to you as soon as possible.
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
          <span className="am-kicker">Heating + plumbing · Northgate and 12 miles around</span>
          <span className="am-h">Boiler out? An engineer at your door in 90 minutes.</span>
          <span className="am-p">
            Fixed prices, no call-out fee, and a named engineer who texts before arriving.
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
          <span className="am-btn am-btn--solid am-btn--wide">See today&apos;s slots</span>
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

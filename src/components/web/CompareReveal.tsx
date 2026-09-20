"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";

/**
 * Triseno compare reveal.
 *
 * Mechanical starting point: 21st.dev "compare" — two layers and a drag line.
 * Tailored:
 * - hairline handle carrying the division's square glyph; role="slider",
 *   arrow / Page / Home / End keys, pointer capture, vertical scroll preserved;
 * - an intro sweep the first time the stage is on screen;
 * - both sides are live HTML/CSS mocks of one fictional business, not images;
 * - three "what changed" callouts are pinned to the rebuilt layout and light
 *   up (marker + note) as the handle uncovers them.
 * Position is written straight to one CSS custom property (container units
 * turn it into the clip and the handle offset) — no React re-render
 * per pointer move; only clip-path and transform change.
 */

const START = 50;

interface Note {
  /** marker position on the stage, in % */
  x: number;
  y: number;
  /** y on the stacked mobile layout */
  ym: number;
  title: string;
  body: string;
}

const NOTES: Note[] = [
  {
    x: 22,
    y: 37,
    ym: 27,
    title: "One job for the first screen",
    body: "The welcome slider is gone. The headline states the promise and leaves two actions: book or call.",
  },
  {
    x: 47,
    y: 86,
    ym: 84,
    title: "Prices on the page",
    body: "Rates and response time are stated up front. The old site hid them behind a contact form.",
  },
  {
    x: 79,
    y: 30,
    ym: 52,
    title: "Booking starts in the hero",
    body: "Two fields, live slots, thumb-sized targets. The phone number no longer lives in the footer.",
  },
];

export default function CompareReveal() {
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLOListElement>(null);
  const posRef = useRef(START);
  const dragging = useRef(false);
  const sweep = useRef<gsap.core.Timeline | null>(null);

  const apply = useCallback((value: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = Math.min(100, Math.max(0, value));
    posRef.current = pos;
    stage.style.setProperty("--n", pos.toFixed(3));
    const handle = handleRef.current;
    if (handle) {
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
      handle.setAttribute(
        "aria-valuetext",
        `${Math.round(100 - pos)} percent of the rebuilt site shown`,
      );
    }
    // The rebuilt layer is uncovered to the right of the handle.
    NOTES.forEach((note, i) => {
      const lit = pos <= note.x;
      stage
        .querySelector<HTMLElement>(`[data-marker="${i}"]`)
        ?.toggleAttribute("data-lit", lit);
      notesRef.current?.children[i]?.toggleAttribute("data-lit", lit);
    });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    apply(posRef.current);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let io: IntersectionObserver | null = null;
    if (!reduced) {
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
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
    }
    return () => {
      io?.disconnect();
      sweep.current?.kill();
    };
  }, [apply]);

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
    <section data-rail="Before / After" className="web-section web-compare">
      <header className="web-compare__head">
        <div>
          <p className="web-eyebrow">
            <span className="web-sq" aria-hidden="true" />
            03 — Before / after
          </p>
          <h2 className="web-h2">Same business. Rebuilt.</h2>
        </div>
        <p className="web-body">
          Left: the template a local trade firm usually starts with. Right: the
          same offer, rebuilt around one action. Drag the frame, or use the
          arrow keys.
        </p>
      </header>

      <div className="web-compare__main">
        <div
          ref={stageRef}
          className="web-compare__stage"
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
            <span className="web-compare__label web-compare__label--before">
              Before<span className="web-compare__label-x"> — template</span>
            </span>
          </div>
          <div
            className="web-compare__layer web-compare__layer--after"
            aria-label="After: rebuilt layout"
            role="img"
          >
            <AfterMock />
            <span className="web-compare__label web-compare__label--after">
              After<span className="web-compare__label-x"> — rebuilt</span>
            </span>
          </div>

          {NOTES.map((note, i) => (
            <span
              key={note.title}
              aria-hidden="true"
              data-marker={i}
              className="web-compare__marker"
              style={{ "--x": `${note.x}%`, "--y": `${note.y}%`, "--ym": `${note.ym}%` } as CSSProperties}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
          ))}

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
            Concept rebuild for a fictional business. It shows layout decisions,
            not client results.
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

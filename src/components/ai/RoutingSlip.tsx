"use client";

import "@/app/ai-slip.css";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CONSOLE_SLIP } from "./console-slip.content";

/**
 * The routing slip: the console's payoff. When the Enterprise cycle halts on
 * a 0.61 confidence, this paper slip prints out of a slot under the console
 * glass, line by line like a receipt, addressed to a named person with the
 * item and the last four trail entries. Two printed boxes: APPROVE tears the
 * slip along its perforation and the halves fall away while the console
 * resumes; CORRECT turns the vendor's name into a field, and what you type
 * is what the console prints when it resumes.
 *
 * The component owns its own life: `open` asks it to print; it reports the
 * visitor's decision through onResolve (with how long they took, in ms) and
 * takes itself off the page after the tear or the close. It renders nothing
 * while idle, so the rig's layout is only touched while a slip exists; a
 * ScrollTrigger refresh follows each of those two moments so the sections
 * below stay registered.
 *
 * Reduced motion: the slip appears fully printed; the tear and the close are
 * a 1 ms fade. Everything animates by clip-path, transform and opacity.
 */

export type SlipOutcome = "approve" | "correct";

type Phase = "idle" | "print" | "up" | "edit" | "tear" | "close";

type Props = {
  /** true while the console is halted and wants the slip on the page */
  open: boolean;
  /** the visitor's decision; decisionMs is measured from the slip being fully printed */
  onResolve: (kind: SlipOutcome, decisionMs: number, value?: string) => void;
};

const PRINT_MS = 1100;
const TEAR_MS = 700;
const CLOSE_MS = 240;

const S = CONSOLE_SLIP.slip;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function RoutingSlip({ open, onResolve }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seenOpen, setSeenOpen] = useState(open);
  const rootRef = useRef<HTMLFormElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const correctRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const readyAt = useRef(0);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  /* open asks for a print; closing while printed (a tab change, Replay) pulls
     the slip back into the slot. A tear or a close already under way finishes
     on its own. Adjusted during render, the way derived state from a prop is. */
  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open && phase === "idle") setPhase("print");
    else if (!open && (phase === "print" || phase === "up" || phase === "edit")) setPhase("close");
  }

  /* the phase clock */
  useEffect(() => {
    const reduced = reducedMotion();
    let t = 0;
    if (phase === "print") {
      t = window.setTimeout(() => setPhase("up"), reduced ? 0 : PRINT_MS);
    } else if (phase === "up") {
      if (readyAt.current === 0) {
        readyAt.current = performance.now();
        // printing complete: focus APPROVE, but only when the slip is on screen
        // and the visitor is not typing somewhere else
        const el = rootRef.current;
        const btn = approveRef.current;
        const ae = document.activeElement as HTMLElement | null;
        const typing = !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
        if (el && btn && !typing) {
          const r = el.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight) btn.focus({ preventScroll: true });
        }
      }
    } else if (phase === "edit") {
      const input = inputRef.current;
      if (input) {
        input.focus({ preventScroll: true });
        input.select();
      }
    } else if (phase === "tear") {
      t = window.setTimeout(() => setPhase("idle"), reduced ? 1 : TEAR_MS);
    } else if (phase === "close") {
      t = window.setTimeout(() => setPhase("idle"), reduced ? 1 : CLOSE_MS);
    } else {
      readyAt.current = 0;
    }
    return () => window.clearTimeout(t);
  }, [phase]);

  /* the slip adds height to the rig while it exists: let ScrollTrigger
     re-measure the sections below, once on arrival and once on departure */
  const mounted = phase !== "idle";
  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 80);
    return () => window.clearTimeout(id);
  }, [mounted]);

  const decisionMs = () => (readyAt.current ? performance.now() - readyAt.current : 0);
  const editing = phase === "edit";
  const live = phase === "up" || editing;

  const approve = useCallback(() => {
    if (!live) return;
    setPhase("tear");
    onResolve("approve", decisionMs());
  }, [live, onResolve]);

  const correct = () => {
    if (phase !== "up") return;
    setPhase("edit");
  };

  const keep = () => {
    if (!editing) return;
    setPhase("up");
    correctRef.current?.focus({ preventScroll: true });
  };

  const resume = () => {
    if (!editing) return;
    const typed = (inputRef.current?.value ?? "").replace(/\s+/g, " ").trim().slice(0, S.vendorMax);
    setPhase("close");
    onResolve("correct", decisionMs(), typed || S.item.vendor);
  };

  /* Escape from the page's operator keys (dispatched for every open drawer,
     slip and sheet) approves a printed slip; while typing, the field's own
     Escape keeps the original name instead, and the keys never see it. */
  useEffect(() => {
    if (phase !== "up") return;
    window.addEventListener("ai:escape", approve);
    return () => window.removeEventListener("ai:escape", approve);
  }, [phase, approve]);

  if (!mounted) return null;

  return (
    <form
      ref={rootRef}
      className="ai-slip"
      data-phase={phase}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-hidden={!live}
      inert={!live}
      onSubmit={(e) => {
        e.preventDefault();
        if (editing) resume();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        if (editing) {
          e.preventDefault();
          e.stopPropagation();
          keep();
        } else if (phase === "up") {
          e.preventDefault();
          e.stopPropagation();
          approve();
        }
      }}
    >
      <span aria-hidden="true" className="ai-slip__slot" />
      <p id={descId} className="sr-only">
        {S.description}
      </p>
      <div className="ai-slip__sheet">
        <div className="ai-slip__body">
          <header className="ai-slip__head ai-slip__line" style={{ ["--i" as string]: 0 }}>
            <h3 id={titleId} className="ai-slip__title">
              {S.title}
            </h3>
            <span className="ai-slip__cycle">{S.cycle}</span>
          </header>
          <dl className="ai-slip__rows">
            <div className="ai-slip__row ai-slip__line" style={{ ["--i" as string]: 1 }}>
              <dt>To</dt>
              <dd>
                {S.person} <i>. {S.role}</i>
              </dd>
            </div>
            <div className="ai-slip__row ai-slip__line" style={{ ["--i" as string]: 2 }}>
              <dt>Why</dt>
              <dd>
                {S.why.lead} <b>{S.why.cmp}</b> . {S.why.tail}
              </dd>
            </div>
            <div className="ai-slip__row ai-slip__line" style={{ ["--i" as string]: 3 }}>
              <dt>Item</dt>
              <dd>
                {S.item.po} .{" "}
                {editing ? (
                  <input
                    ref={inputRef}
                    className="ai-slip__input"
                    type="text"
                    name="vendor"
                    defaultValue={S.item.vendor}
                    maxLength={S.vendorMax}
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    aria-label={S.vendorLabel}
                  />
                ) : (
                  <span className="ai-slip__vendor">{S.item.vendor}</span>
                )}{" "}
                . {S.item.amount}
              </dd>
            </div>
            <div className="ai-slip__row ai-slip__line" style={{ ["--i" as string]: 4 }}>
              <dt>Trail</dt>
              <dd className="ai-slip__trail">
                {S.trail.map(([step, at]) => (
                  <span key={step}>
                    {step} <time>{at}</time>
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>
        <div className="ai-slip__stub">
          <span aria-hidden="true" className="ai-slip__tear">
            {S.tear}
          </span>
          <div className="ai-slip__acts ai-slip__line" style={{ ["--i" as string]: 5 }}>
            {editing ? (
              <>
                <button type="submit" className="ai-slip__btn" data-act="resume">
                  <span>{S.resume}</span>
                </button>
                <span className="ai-slip__hint" aria-hidden="true">
                  {S.keep}
                </span>
              </>
            ) : (
              <>
                <button ref={approveRef} type="button" className="ai-slip__btn" data-act="approve" onClick={approve}>
                  <span>{S.approve}</span>
                </button>
                <button ref={correctRef} type="button" className="ai-slip__btn" data-act="correct" onClick={correct}>
                  <span>{S.correct}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

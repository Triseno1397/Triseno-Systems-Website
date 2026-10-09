"use client";

import "@/app/ai-slip.css";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CONSOLE_SLIP } from "./console-slip.content";

/**
 * The routing slip: the console's payoff. When the Enterprise cycle halts on
 * a 0.61 confidence, this paper slip prints out of a slot under the console
 * glass, line by line like a receipt, addressed to a named person with the
 * item and the last four trail entries. Two printed boxes: APPROVE inks an
 * APPROVED stamp on it and tears it along its perforation, the halves falling
 * away while the console resumes; CORRECT turns the vendor's name into a
 * field, and what you type is what the console prints when it resumes (the
 * slip is stamped CORRECTED and drawn back into the slot).
 *
 * The bay: while the console runs a cycle that can halt, the parent passes
 * `reserve`, and the slip's full height is held under the glass with only the
 * slot showing ("slot 01 . standby"). The rig therefore grows when the tab is
 * picked, never at the halt, and never shrinks after the tear (the bay reads
 * "slip 0418 . filed to the audit trail" until the next run). A ScrollTrigger
 * refresh follows the bay arriving and leaving so the sections below stay
 * registered.
 *
 * The component owns its own life: `open` asks it to print; it reports the
 * visitor's decision through onResolve (with how long they took, in ms) and
 * calls returnFocus when the decision took focus out of the page's flow.
 *
 * Reduced motion: the slip appears fully printed; the tear and the filing are
 * a 1 ms fade. Everything animates by clip-path, transform and opacity.
 */

export type SlipOutcome = "approve" | "correct";

type Phase = "idle" | "print" | "up" | "edit" | "tear" | "file" | "close";

type Props = {
  /** true while the console is halted and wants the slip on the page */
  open: boolean;
  /** hold the bay (the slip's height, slot showing) while a halting cycle runs */
  reserve: boolean;
  /** the visitor's decision; decisionMs is measured from the slip being fully printed */
  onResolve: (kind: SlipOutcome, decisionMs: number, value?: string) => void;
  /** where keyboard focus goes when the slip's controls leave the page */
  returnFocus?: () => void;
};

const PRINT_MS = 1100;
/** stamp lands (440 ms), a beat, then the halves fall (700 ms) */
const TEAR_MS = 1220;
/** stamp lands, a beat, then the sheet is drawn back into the slot (560 ms) */
const FILE_MS = 1180;
const CLOSE_MS = 240;

const S = CONSOLE_SLIP.slip;
const B = CONSOLE_SLIP.bay;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function RoutingSlip({ open, reserve, onResolve, returnFocus }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seenOpen, setSeenOpen] = useState(open);
  const [seenReserve, setSeenReserve] = useState(reserve);
  const [filed, setFiled] = useState(false);
  const [stamp, setStamp] = useState<SlipOutcome | null>(null);
  const [vendor, setVendor] = useState<string>(S.item.vendor);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const correctRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const readyAt = useRef(0);
  /** set when the field is abandoned, so the CORRECT box takes focus back once it is on the page again */
  const backToCorrect = useRef(false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const cycleId = `${uid}-cycle`;
  const descId = `${uid}-desc`;

  /* open asks for a print; closing while printed (a tab change, Replay) pulls
     the slip back into the slot. A tear or a filing already under way
     finishes on its own. Adjusted during render, the way derived state from a
     prop is. */
  const startPrint = () => {
    setPending(false);
    setPhase("print");
    setFiled(false);
    setStamp(null);
    setVendor(S.item.vendor);
  };
  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) {
      // asked again while the last slip is still leaving: print once it is in
      if (phase === "idle") startPrint();
      else setPending(true);
    } else {
      setPending(false);
      if (phase === "print" || phase === "up" || phase === "edit") setPhase("close");
    }
  } else if (pending && phase === "idle") startPrint();
  /* the bay is released with the run that reserved it; the next one starts clean */
  if (reserve !== seenReserve) {
    setSeenReserve(reserve);
    if (!reserve) setFiled(false);
  }

  /* the phase clock */
  useEffect(() => {
    const reduced = reducedMotion();
    let t = 0;
    const settle = (ms: number, file: boolean) => {
      t = window.setTimeout(() => {
        if (file) setFiled(true);
        setPhase("idle");
      }, ms);
    };
    if (phase === "print") {
      t = window.setTimeout(() => setPhase("up"), reduced ? 0 : PRINT_MS);
    } else if (phase === "up") {
      if (backToCorrect.current) {
        backToCorrect.current = false;
        correctRef.current?.focus({ preventScroll: true });
      }
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
      settle(reduced ? 1 : TEAR_MS, true);
    } else if (phase === "file") {
      settle(reduced ? 1 : FILE_MS, true);
    } else if (phase === "close") {
      settle(reduced ? 1 : CLOSE_MS, false);
    } else {
      readyAt.current = 0;
    }
    return () => window.clearTimeout(t);
  }, [phase]);

  /* the bay adds height to the rig while it exists: let ScrollTrigger
     re-measure the sections below, once on arrival and once on departure */
  const present = reserve || phase !== "idle";
  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 80);
    return () => window.clearTimeout(id);
  }, [present]);

  const editing = phase === "edit";
  const live = phase === "up" || editing;

  /** did the decision happen with focus on the slip (so it must be handed back)? */
  const holdsFocus = () => !!rootRef.current && rootRef.current.contains(document.activeElement);

  const approve = useCallback(() => {
    if (phase !== "up") return;
    const had = !!rootRef.current && rootRef.current.contains(document.activeElement);
    const ms = readyAt.current ? performance.now() - readyAt.current : 0;
    setStamp("approve");
    setPhase("tear");
    onResolve("approve", ms);
    if (had) returnFocus?.();
  }, [phase, onResolve, returnFocus]);

  const correct = () => {
    if (phase !== "up") return;
    setPhase("edit");
  };

  const keep = () => {
    if (!editing) return;
    backToCorrect.current = true;
    setPhase("up");
  };

  const resume = () => {
    if (!editing) return;
    const had = holdsFocus();
    const typed = (inputRef.current?.value ?? "").replace(/\s+/g, " ").trim().slice(0, S.vendorMax);
    const value = typed || S.item.vendor;
    const ms = readyAt.current ? performance.now() - readyAt.current : 0;
    setVendor(value);
    setStamp("correct");
    setPhase("file");
    onResolve("correct", ms, value);
    if (had) returnFocus?.();
  };

  /* Escape from the page's operator keys (dispatched for every open drawer,
     slip and sheet) approves a printed slip; while typing, the field's own
     Escape keeps the original name instead, and the keys never see it. */
  useEffect(() => {
    if (phase !== "up") return;
    window.addEventListener("ai:escape", approve);
    return () => window.removeEventListener("ai:escape", approve);
  }, [phase, approve]);

  if (!present) return null;

  const ink = stamp ? S.stamp[stamp] : null;

  return (
    <div className="ai-slip" data-phase={phase} data-filed={filed ? "" : undefined}>
      {/* the slot: the console's mouth, with a print head that lights while it feeds */}
      <span aria-hidden="true" className="ai-slip__slot">
        <i />
      </span>
      <span aria-hidden="true" className="ai-slip__bay">
        {filed ? B.filed : B.standby}
      </span>
      <form
        ref={rootRef}
        className="ai-slip__form"
        role="dialog"
        aria-labelledby={`${titleId} ${cycleId}`}
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
        <p id={descId} className="sr-only">
          {S.description}
        </p>
        <div className="ai-slip__sheet">
          <div className="ai-slip__body">
            <header className="ai-slip__head ai-slip__line" style={{ ["--i" as string]: 0 }}>
              <h3 id={titleId} className="ai-slip__title">
                {S.title}
              </h3>
              <span id={cycleId} className="ai-slip__cycle">
                <span className="sr-only">. </span>
                {S.cycle}
              </span>
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
                <dd className="ai-slip__item">
                  <span>
                    {S.item.po} . {S.item.amount}
                  </span>
                  {editing ? (
                    <input
                      ref={inputRef}
                      className="ai-slip__input"
                      type="text"
                      name="vendor"
                      defaultValue={vendor}
                      maxLength={S.vendorMax}
                      inputMode="text"
                      enterKeyHint="done"
                      autoComplete="off"
                      autoCapitalize="words"
                      spellCheck={false}
                      aria-label={S.vendorLabel}
                    />
                  ) : (
                    <span className="ai-slip__vendor" data-amended={vendor !== S.item.vendor ? "" : undefined}>
                      {vendor}
                    </span>
                  )}
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
            {ink ? (
              <span aria-hidden="true" className="ai-slip__stamp" data-kind={stamp}>
                <b>{ink.word}</b>
                <span>{ink.line}</span>
              </span>
            ) : null}
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
    </div>
  );
}

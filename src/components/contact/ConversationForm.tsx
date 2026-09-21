"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight, CaretLeft, CircleNotch } from "@phosphor-icons/react";
import Glyph from "@/components/world/Glyph";
import GlassPanel from "@/components/world/GlassPanel";
import GhostButton from "@/components/ui/GhostButton";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import {
  CONTACT_METHODS,
  DIVISION_OPTIONS,
  EMAIL,
  EMPTY,
  STEP_TITLE,
  TIMELINES,
  normaliseSite,
  stepsFor,
  validate,
  type ContactDivision,
  type FormValues,
  type StepId,
} from "./steps";

// Same delivery as before: Web3Forms straight to the studio inbox. The key is
// set in Vercel as NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY (inlined at build time).
const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";
const ENDPOINT = "https://api.web3forms.com/submit";

type Status = "idle" | "sending" | "sent" | "error";

const pad = (n: number) => String(n).padStart(2, "0");
const isDivision = (v: string | null): v is ContactDivision => v === "creative" || v === "web" || v === "ai";

/**
 * /contact — the conversational form (site-map.md): ONE question on screen at
 * a time, a line that draws itself forward through a hexagon node per step,
 * and the whole scene taking the chosen division's hue as light once the
 * first question is answered (the UI itself stays white, design-system §2).
 *
 * Keyboard: Enter answers and advances (Ctrl/Cmd + Enter in the message);
 * the Back control sits before the field, so Shift+Tab reaches it; every step
 * validates before it lets you on. Each new step is announced (aria-live) and
 * focus moves to its field. The payload is identical to the old form's.
 */
export default function ConversationForm({ onDivision }: { onDivision: (d: ContactDivision | "") => void }) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLInputElement>(null);
  const interacted = useRef(false);
  const autoTimer = useRef(0);

  const steps = useMemo(() => stepsFor(values.division), [values.division]);
  const step: StepId = steps[Math.min(index, steps.length - 1)];
  const last = index === steps.length - 1;
  const option = DIVISION_OPTIONS.find((d) => d.key === values.division) ?? null;

  // ?division=creative|web|ai preselects the division and opens on the name
  useLayoutEffect(() => {
    const q = new URLSearchParams(window.location.search).get("division");
    if (isDivision(q)) {
      setValues((v) => ({ ...v, division: q }));
      setIndex(1);
    }
  }, []);

  useEffect(() => {
    onDivision(values.division);
  }, [values.division, onDivision]);

  // focus follows the conversation: the new step's field, never on first paint
  useEffect(() => {
    if (!interacted.current) return;
    const root = stepRef.current;
    if (!root) return;
    const target =
      root.querySelector<HTMLElement>("input:not([type=radio]):not([type=checkbox]), textarea") ??
      root.querySelector<HTMLElement>("input[type=radio]:checked") ??
      root.querySelector<HTMLElement>("input[type=radio], [tabindex='-1']");
    target?.focus({ preventScroll: true });
  }, [index, status]);

  useEffect(() => () => window.clearTimeout(autoTimer.current), []);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setError(null);
  };

  const submit = useCallback(async () => {
    if (status === "sending") return;
    setSendError(null);
    if (!option) return;
    if (!WEB3FORMS_ACCESS_KEY) {
      setStatus("error");
      setSendError(`The form isn't connected yet — please email us directly at ${EMAIL}.`);
      return;
    }
    setStatus("sending");
    const entries: Record<string, string> = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      preferred_contact: values.preferred_contact,
      company: values.company.trim(),
      project_type: values.project_type,
      ...(values.division === "web" ? { current_site: normaliseSite(values.current_site) } : {}),
      timeline: values.timeline,
      message: values.message.trim(),
    };
    // honeypot: bots tick it, people never see it (sent only when ticked, as before)
    if (botRef.current?.checked) entries.botcheck = "on";
    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `New ${option.payloadLabel} inquiry — Triseno`,
      from_name: "Triseno website",
      division: option.payloadLabel,
      ...entries,
    };
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("sent");
      } else {
        setStatus("error");
        setSendError(`Something went wrong — please email us directly at ${EMAIL}.`);
      }
    } catch {
      setStatus("error");
      setSendError(`Couldn't send right now — please email us directly at ${EMAIL}.`);
    }
  }, [option, status, values]);

  const next = useCallback(() => {
    interacted.current = true;
    window.clearTimeout(autoTimer.current);
    const problem = validate(step, values);
    if (problem) {
      setError(problem);
      stepRef.current
        ?.querySelector<HTMLElement>("input:not([type=radio]):not([type=checkbox]), textarea, input[type=radio]")
        ?.focus({ preventScroll: true });
      return;
    }
    setError(null);
    if (last) {
      void submit();
      return;
    }
    setDir("fwd");
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [last, step, steps.length, submit, values]);

  const back = useCallback(() => {
    interacted.current = true;
    window.clearTimeout(autoTimer.current);
    if (index === 0 || status === "sending") return;
    setError(null);
    setDir("back");
    setIndex((i) => Math.max(0, i - 1));
  }, [index, status]);

  // a pointer click on a choice answers it: advance once the selection has registered
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const indexRef = useRef(index);
  indexRef.current = index;
  const choose = (key: keyof FormValues, value: string, e: MouseEvent<HTMLInputElement>) => {
    interacted.current = true;
    if (e.detail === 0) return; // keyboard (arrow keys fire click with detail 0): wait for Enter
    window.clearTimeout(autoTimer.current);
    const at = indexRef.current;
    const atStep = step;
    autoTimer.current = window.setTimeout(() => {
      if (indexRef.current !== at) return;
      const nv = { ...valuesRef.current, [key]: value } as FormValues;
      if (validate(atStep, nv)) return;
      setError(null);
      setDir("fwd");
      setIndex(Math.min(at + 1, stepsFor(nv.division).length - 1));
    }, 460);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const t = e.target as HTMLElement;
    if (t.tagName === "BUTTON" || t.tagName === "A") return;
    if (t.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    next();
  };

  const sent = status === "sent";
  const progress = sent ? 1 : steps.length > 1 ? index / (steps.length - 1) : 0;
  const hue = option ? DIVISIONS[option.key].hue : "#ffffff";
  const errId = `cf-err-${step}`;

  return (
    <GlassPanel world="portal" className="cf-panel" veil={0.55}>
      <div className="cf" style={{ ["--cf-hue" as string]: hue }}>
        <ProgressLine count={steps.length} index={index} progress={progress} sent={sent} />

        <p className="sr-only" aria-live="polite">
          {sent
            ? "Message sent."
            : `Step ${index + 1} of ${steps.length}: ${STEP_TITLE[step]}${step === "company" || step === "current_site" ? ", optional" : ""}`}
        </p>

        {sent ? (
          <div ref={stepRef} className="cf-step cf-done" data-dir="fwd">
            <span className="cf-done__glyph" aria-hidden="true">
              <Glyph kind="hexagon" size="100%" color="#ffffff" strokeWidth={1.5} glow />
            </span>
            <h2 className="cf-q font-display" tabIndex={-1}>
              Message sent
            </h2>
            <p className="cf-body">
              Thanks, {values.name.trim().split(" ")[0] || "and welcome"}. The {option?.name ?? "right"} team reads every
              inquiry and replies within one business day, usually sooner.
            </p>
            <div className="cf-done__actions">
              {option ? (
                <GhostButton href={DIVISIONS[option.key].route}>{`Back to ${option.name}`}</GhostButton>
              ) : null}
              <WarpLink href="/" className="cf-textlink">
                <span>Portal</span>
              </WarpLink>
            </div>
          </div>
        ) : (
          <form
            className="cf-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            onKeyDown={onKeyDown}
            aria-label="Start a conversation"
          >
            {/* Honeypot — bots fill this, humans never see it. */}
            <input
              ref={botRef}
              type="checkbox"
              name="botcheck"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div className="cf-bar">
              <button
                type="button"
                className="cf-back"
                onClick={back}
                disabled={index === 0}
                aria-label={index === 0 ? "Back (this is the first question)" : `Back to ${STEP_TITLE[steps[index - 1]]}`}
              >
                <CaretLeft size={16} weight="light" aria-hidden="true" />
                <span>Back</span>
              </button>
              <p className="cf-count" aria-hidden="true">
                <b>{pad(index + 1)}</b>/{pad(steps.length)} — {STEP_TITLE[step]}
              </p>
            </div>

            <div ref={stepRef} key={step} className="cf-step" data-dir={dir}>
              <StepBody step={step} values={values} set={set} choose={choose} error={error} errId={errId} />
            </div>

            <p id={errId} className="cf-error" role="alert">
              {error ?? ""}
            </p>

            <div className="cf-controls">
              <button type="submit" className="ghost-btn cf-next" disabled={status === "sending"}>
                <span className="ghost-btn__layer">
                  <span>{status === "sending" ? "Sending" : last ? "Send" : "Next"}</span>
                  {status === "sending" ? (
                    <CircleNotch size={16} weight="light" aria-hidden="true" className="cf-spin" />
                  ) : (
                    <ArrowRight size={16} weight="light" aria-hidden="true" />
                  )}
                </span>
                <span className="ghost-btn__layer ghost-btn__fill" aria-hidden="true">
                  <span>{status === "sending" ? "Sending" : last ? "Send" : "Next"}</span>
                  <ArrowRight size={16} weight="light" />
                </span>
              </button>
              <p className="cf-hint" aria-hidden="true">
                {step === "message" ? "Ctrl + Enter to send" : "Enter to continue"}
              </p>
            </div>

            {status === "error" && sendError ? (
              <p className="cf-senderror" role="alert">
                {sendError}{" "}
                <a href={`mailto:${EMAIL}`} className="world-underline">
                  {EMAIL}
                </a>
              </p>
            ) : null}
          </form>
        )}
      </div>
    </GlassPanel>
  );
}

/* ── the line: one hexagon node per step, drawn forward (scaleX), lit in the
      chosen division's hue — a data readout of where the conversation is ── */
function ProgressLine({ count, index, progress, sent }: { count: number; index: number; progress: number; sent: boolean }) {
  return (
    <div className="cf-line" aria-hidden="true">
      <span className="cf-line__track" />
      <span className="cf-line__draw" style={{ transform: `scaleX(${progress.toFixed(4)})` }} />
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="cf-line__node"
          data-state={sent || i < index ? "done" : i === index ? "now" : undefined}
          style={{ left: `${count > 1 ? (i / (count - 1)) * 100 : 0}%` }}
        >
          <Glyph kind="hexagon" size="100%" color="currentColor" strokeWidth={1.25} />
        </span>
      ))}
    </div>
  );
}

interface StepBodyProps {
  step: StepId;
  values: FormValues;
  set: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  choose: (key: keyof FormValues, value: string, e: MouseEvent<HTMLInputElement>) => void;
  error: string | null;
  errId: string;
}

function StepBody({ step, values, set, choose, error, errId }: StepBodyProps) {
  const invalid = error ? true : undefined;
  const described = error ? errId : undefined;
  const option = DIVISION_OPTIONS.find((d) => d.key === values.division);

  switch (step) {
    case "division":
      return (
        <fieldset className="cf-fieldset" aria-describedby={described}>
          <legend className="cf-q font-display">Which division is this for?</legend>
          <div className="cf-options cf-options--division">
            {DIVISION_OPTIONS.map((d) => {
              const div = DIVISIONS[d.key];
              const on = values.division === d.key;
              return (
                <label key={d.key} className="cf-option cf-option--division" data-on={on ? "" : undefined}>
                  <input
                    type="radio"
                    name="cf-division"
                    value={d.key}
                    checked={on}
                    onChange={() => set("division", d.key)}
                    onClick={(e) => choose("division", d.key, e)}
                  />
                  <span className="cf-option__glyph" aria-hidden="true">
                    <Glyph kind={div.glyph} size="100%" color={on ? div.hue : "#ffffff"} strokeWidth={1.25} glow={on} />
                  </span>
                  <span className="cf-option__name font-display">{d.name}</span>
                  <span className="cf-option__line">{d.line}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    case "name":
      return (
        <TextStep id="cf-name" label="What should we call you?" value={values.name} onChange={(v) => set("name", v)}
          autoComplete="name" invalid={invalid} described={described} placeholder="Your name" />
      );
    case "email":
      return (
        <TextStep id="cf-email" type="email" inputMode="email" label="Where do we reply?" value={values.email}
          onChange={(v) => set("email", v)} autoComplete="email" invalid={invalid} described={described} placeholder="you@company.com" />
      );
    case "phone":
      return (
        <>
          <TextStep id="cf-phone" type="tel" inputMode="tel" label="A number, if you'd like a call." optional
            value={values.phone} onChange={(v) => set("phone", v)} autoComplete="tel" invalid={invalid} described={described}
            placeholder="(555) 000-0000" />
          <fieldset className="cf-fieldset cf-fieldset--inline">
            <legend className="cf-sub">Best way to reach you</legend>
            <div className="cf-options cf-options--chips">
              {CONTACT_METHODS.map((m) => (
                <label key={m} className="cf-chip" data-on={values.preferred_contact === m ? "" : undefined}>
                  <input type="radio" name="cf-preferred" value={m} checked={values.preferred_contact === m}
                    onChange={() => set("preferred_contact", m)} />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      );
    case "company":
      return (
        <TextStep id="cf-company" label="Company or brand?" optional value={values.company}
          onChange={(v) => set("company", v)} autoComplete="organization" invalid={invalid} described={described}
          placeholder="Your company or brand" />
      );
    case "project_type":
      return (
        <ChoiceStep name="cf-project" legend="What are we building?" options={option?.projectTypes ?? []}
          value={values.project_type} onPick={(v) => set("project_type", v)} onClickPick={(v, e) => choose("project_type", v, e)}
          invalid={invalid} described={described} />
      );
    case "current_site":
      return (
        <TextStep id="cf-site" inputMode="url" label="Your current site, if there is one." optional value={values.current_site}
          onChange={(v) => set("current_site", v)} autoComplete="url" invalid={invalid} described={described}
          placeholder="yoursite.com" />
      );
    case "timeline":
      return (
        <ChoiceStep name="cf-timeline" legend="When does it need to be live?" options={TIMELINES} value={values.timeline}
          onPick={(v) => set("timeline", v)} onClickPick={(v, e) => choose("timeline", v, e)} invalid={invalid} described={described} />
      );
    case "message":
      return (
        <div className="cf-field">
          <label htmlFor="cf-message" className="cf-q font-display">
            {option?.messageLabel ?? "Tell us about the project"}
          </label>
          <textarea
            id="cf-message"
            className="cf-input cf-input--area"
            rows={4}
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder={option?.messagePlaceholder}
            aria-invalid={invalid}
            aria-describedby={described}
            required
            data-lenis-prevent=""
          />
        </div>
      );
  }
}

function TextStep({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  optional,
  invalid,
  described,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  placeholder?: string;
  optional?: boolean;
  invalid?: boolean;
  described?: string;
}) {
  return (
    <div className="cf-field">
      <label htmlFor={id} className="cf-q font-display">
        {label}
        {optional ? <span className="cf-optional">Optional — Enter to skip</span> : null}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        className="cf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={described}
        required={!optional}
        spellCheck={false}
      />
    </div>
  );
}

function ChoiceStep({
  name,
  legend,
  options,
  value,
  onPick,
  onClickPick,
  invalid,
  described,
}: {
  name: string;
  legend: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
  onClickPick: (v: string, e: MouseEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  described?: string;
}) {
  return (
    <fieldset className="cf-fieldset" aria-describedby={described}>
      <legend className="cf-q font-display">{legend}</legend>
      <div className="cf-options">
        {options.map((o, i) => (
          <label key={o} className="cf-option" data-on={value === o ? "" : undefined}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onPick(o)}
              onClick={(e) => onClickPick(o, e)} />
            <span className="cf-option__num" aria-hidden="true">{pad(i + 1)}</span>
            <span className="cf-option__label">{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

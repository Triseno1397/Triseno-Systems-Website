"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import TrisenoMark from "@/components/world/TrisenoMark";
import Glyph from "@/components/world/Glyph";
import GlassPanel from "@/components/world/GlassPanel";
import GhostButton from "@/components/ui/GhostButton";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import {
  DIVISION_OPTIONS,
  EMAIL,
  EMPTY,
  FIELD_ORDER,
  validate,
  type ContactDivision,
  type Errors,
  type FieldId,
  type FormValues,
} from "./form";

// FormSubmit takes the post straight from the visitor's browser (it sits behind
// Cloudflare, which blocks server-to-server posts from Vercel). No key needed;
// the inbox confirms once via the first email FormSubmit sends.
const ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;

type Status = "idle" | "sending" | "sent" | "error";

const isDivision = (v: string | null): v is ContactDivision => v === "creative" || v === "web" || v === "ai";

/**
 * /contact — the inquiry form, cut to what we need to reply: which division,
 * a name, an email, and an optional line about the project. Everything else
 * (budget, timeline, phone) we ask in the reply. It emails the inquiry to
 * tristen@trisenosystems.com through FormSubmit.
 *
 * Choosing a division still takes the whole scene into that division's light
 * (the plate grade, the floor spill, the glass that frosts it); the UI itself
 * stays white (design-system §2). Validation happens once, on send; focus
 * moves to the first field that needs a second look.
 */
export default function InquiryForm({ onDivision }: { onDivision: (d: ContactDivision | "") => void }) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const botRef = useRef<HTMLInputElement>(null);

  const option = DIVISION_OPTIONS.find((d) => d.key === values.division) ?? null;

  // ?division=creative|web|ai preselects (the division CTAs and the chrome
  // contact icon pass it), so arriving from a division page skips a click
  useLayoutEffect(() => {
    const q = new URLSearchParams(window.location.search).get("division");
    if (isDivision(q)) setValues((v) => ({ ...v, division: q }));
  }, []);

  useEffect(() => {
    onDivision(values.division);
  }, [values.division, onDivision]);

  useEffect(() => {
    if (status === "sent") doneRef.current?.focus({ preventScroll: true });
  }, [status]);

  const set = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  }, []);

  const pickDivision = useCallback((key: ContactDivision) => {
    setValues((v) => ({ ...v, division: key }));
    setErrors((e) => ({ ...e, division: undefined }));
  }, []);

  const submit = useCallback(async () => {
    if (status === "sending") return;
    setSendError(null);
    const problems = validate(values);
    const first = FIELD_ORDER.find((f) => problems[f]);
    if (first) {
      setErrors(problems);
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setStatus("sending");
    // honeypot: a bot ticked it — act sent, send nothing
    if (botRef.current?.checked) {
      setStatus("sent");
      return;
    }
    const label = DIVISION_OPTIONS.find((d) => d.key === values.division)?.payloadLabel ?? "";
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New ${label} inquiry — ${values.name.trim()}`,
          _replyto: values.email.trim(),
          _template: "table",
          _captcha: "false",
          Division: label,
          Name: values.name.trim(),
          Email: values.email.trim(),
          Message: values.message.trim() || "(none)",
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && String(data?.success) !== "false") setStatus("sent");
      else {
        setStatus("error");
        setSendError(`Something went wrong — please email us directly at`);
      }
    } catch {
      setStatus("error");
      setSendError(`Couldn't send right now — please email us directly at`);
    }
  }, [status, values]);

  const hue = option ? DIVISIONS[option.key].hue : "#ffffff";
  const problemCount = Object.values(errors).filter(Boolean).length;

  if (status === "sent") {
    return (
      <GlassPanel world="portal" className="cf-panel" veil={0.55}>
        <div className="cf cf-done" style={{ ["--cf-hue" as string]: hue }}>
          <span className="cf-done__glyph" aria-hidden="true">
            <TrisenoMark title="Triseno Systems" />
          </span>
          <h2 ref={doneRef} className="cf-legend font-display" tabIndex={-1}>
            Message sent
          </h2>
          <p className="cf-body">
            Thanks, {values.name.trim().split(" ")[0] || "and welcome"}. The {option?.name ?? "right"} team reads every
            inquiry and replies within one business day, usually sooner.
          </p>
          <div className="cf-done__actions">
            {option ? <GhostButton href={DIVISIONS[option.key].route}>{`Back to ${option.name}`}</GhostButton> : null}
            <WarpLink href="/" className="cf-textlink">
              <span>Portal</span>
            </WarpLink>
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel world="portal" className="cf-panel" veil={0.55}>
      <form
        ref={formRef}
        className="cf cf-form"
        style={{ ["--cf-hue" as string]: hue }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        aria-label="Project inquiry"
      >
        {/* Honeypot — bots fill this, humans never see it. */}
        <input ref={botRef} type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-legend font-display">What can we help with?</span>
          </legend>
          <div className="cf-divisions" role="group" aria-describedby={errors.division ? "cf-e-division" : undefined}>
            {DIVISION_OPTIONS.map((d) => {
              const div = DIVISIONS[d.key];
              const on = values.division === d.key;
              return (
                <label key={d.key} className="cf-div" data-on={on ? "" : undefined}>
                  <input
                    type="radio"
                    name="cf-division"
                    value={d.key}
                    checked={on}
                    data-field={d.key === DIVISION_OPTIONS[0].key ? "division" : undefined}
                    onChange={() => pickDivision(d.key)}
                  />
                  <span className="cf-div__glyph" aria-hidden="true">
                    <Glyph kind={div.glyph} size="100%" color={on ? div.hue : "#ffffff"} strokeWidth={1.25} glow={on} />
                  </span>
                  <span className="cf-div__name font-display">{d.name}</span>
                  <span className="cf-div__line">{d.line}</span>
                </label>
              );
            })}
          </div>
          <FieldError id="cf-e-division" message={errors.division} />

          <div className="cf-grid">
            <Field id="cf-name" field="name" label="Name" value={values.name} onChange={(v) => set("name", v)}
              autoComplete="name" placeholder="Your name" error={errors.name} required />
            <Field id="cf-email" field="email" type="email" inputMode="email" label="Email" value={values.email}
              onChange={(v) => set("email", v)} autoComplete="email" placeholder="you@company.com" error={errors.email} required />
          </div>

          <div className="cf-sub">
            <label htmlFor="cf-message" className="cf-label">
              What do you need?
              <em>Optional</em>
            </label>
            <textarea
              id="cf-message"
              className="cf-input cf-input--area"
              rows={3}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={option?.messagePlaceholder ?? "A sentence or two is plenty..."}
              data-lenis-prevent=""
            />
          </div>
        </fieldset>

        <div className="cf-foot">
          <button type="submit" className="ghost-btn cf-next" disabled={status === "sending"}>
            <span className="ghost-btn__layer">
              <span>{status === "sending" ? "Sending" : "Send inquiry"}</span>
              {status === "sending" ? (
                <CircleNotch size={16} weight="light" aria-hidden="true" className="cf-spin" />
              ) : (
                <ArrowRight size={16} weight="light" aria-hidden="true" />
              )}
            </span>
            <span className="ghost-btn__layer ghost-btn__fill" aria-hidden="true">
              <span>{status === "sending" ? "Sending" : "Send inquiry"}</span>
              <ArrowRight size={16} weight="light" />
            </span>
          </button>
          <p className="cf-note">We reply within one business day.</p>
        </div>

        <p className="sr-only" aria-live="polite">
          {problemCount ? `${problemCount} ${problemCount === 1 ? "field needs" : "fields need"} a second look.` : ""}
        </p>

        {status === "error" && sendError ? (
          <p className="cf-senderror" role="alert">
            {sendError}{" "}
            <a href={`mailto:${EMAIL}`} className="world-underline">
              {EMAIL}
            </a>
          </p>
        ) : null}
      </form>
    </GlassPanel>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="cf-error" role="alert">
      {message ?? ""}
    </p>
  );
}

function Field({
  id,
  field,
  label,
  hint,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  error,
  required,
  wide,
}: {
  id: string;
  /** marks the input so a failed send can focus it */
  field?: FieldId;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  wide?: boolean;
}) {
  const errId = `${id}-error`;
  return (
    <div className="cf-field" data-wide={wide ? "" : undefined}>
      <label htmlFor={id} className="cf-label">
        {label}
        {hint ? <em>{hint}</em> : null}
      </label>
      <input
        id={id}
        data-field={field}
        type={type}
        inputMode={inputMode}
        className="cf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        required={required}
        spellCheck={false}
      />
      <FieldError id={errId} message={error} />
    </div>
  );
}

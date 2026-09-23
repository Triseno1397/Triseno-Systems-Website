"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleNotch, PhoneCall } from "@phosphor-icons/react";
import Glyph from "@/components/world/Glyph";
import GlassPanel from "@/components/world/GlassPanel";
import GhostButton from "@/components/ui/GhostButton";
import { WarpLink } from "@/components/world/WarpProvider";
import { DIVISIONS } from "@/lib/divisions";
import {
  CALL_WINDOWS,
  DIVISION_OPTIONS,
  EMAIL,
  EMPTY,
  FIELD_ORDER,
  TIMELINES,
  normaliseSite,
  validate,
  type ContactDivision,
  type Errors,
  type FieldId,
  type FormValues,
} from "./form";

// Same delivery as before: Web3Forms straight to the studio inbox. The key is
// set in Vercel as NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY (inlined at build time).
const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";
const ENDPOINT = "https://api.web3forms.com/submit";

type Status = "idle" | "sending" | "sent" | "error";

const pad = (n: number) => String(n).padStart(2, "0");
const isDivision = (v: string | null): v is ContactDivision => v === "creative" || v === "web" || v === "ai";

/**
 * /contact — the inquiry form: ONE page, everything on screen, tick what
 * applies. It replaced a one-question-at-a-time flow, which read well and
 * asked too much of someone who just wants to send a note: nine screens, no
 * way to see what was coming, no way to say two things at once.
 *
 * The shape of it does the explaining. Four numbered blocks — what you need,
 * when, who you are, how to reach you — with the project types as checkboxes
 * (more than one is usually true) and a plain "I'd rather you call me" option
 * that makes the phone number the thing we reply to.
 *
 * Choosing a division still takes the whole scene into that division's light
 * (the plate grade, the floor spill, the glass that frosts it); the UI itself
 * stays white (design-system §2). Validation happens once, on send, and only
 * on what we genuinely need; focus moves to the first field that needs a
 * second look. The payload is identical to the old form's.
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
  const shownTypes = useMemo(() => option?.projectTypes ?? [], [option]);

  // ?division=creative|web|ai preselects (the division CTAs and the chrome
  // contact icon pass it), so arriving from a division page starts a block in
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

  // the division decides which project types exist, so changing it clears them
  const pickDivision = useCallback((key: ContactDivision) => {
    setValues((v) => (v.division === key ? v : { ...v, division: key, project_types: [] }));
    setErrors((e) => ({ ...e, division: undefined }));
  }, []);

  const toggleType = useCallback((t: string) => {
    setValues((v) => ({
      ...v,
      project_types: v.project_types.includes(t) ? v.project_types.filter((x) => x !== t) : [...v.project_types, t],
    }));
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
    const div = DIVISION_OPTIONS.find((d) => d.key === values.division);
    if (!div) return;
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
      preferred_contact: values.wants_call ? "Phone call" : "Email",
      company: values.company.trim(),
      project_type: values.project_types.join(", "),
      ...(values.division === "web" ? { current_site: normaliseSite(values.current_site) } : {}),
      timeline: values.timeline,
      ...(values.wants_call ? { best_time: values.best_time } : {}),
      message: values.message.trim(),
    };
    // honeypot: bots tick it, people never see it (sent only when ticked, as before)
    if (botRef.current?.checked) entries.botcheck = "on";
    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `New ${div.payloadLabel} inquiry — Triseno`,
      from_name: "Triseno website",
      division: div.payloadLabel,
      ...entries,
    };
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) setStatus("sent");
      else {
        setStatus("error");
        setSendError(`Something went wrong — please email us directly at ${EMAIL}.`);
      }
    } catch {
      setStatus("error");
      setSendError(`Couldn't send right now — please email us directly at ${EMAIL}.`);
    }
  }, [status, values]);

  const hue = option ? DIVISIONS[option.key].hue : "#ffffff";
  const problemCount = Object.values(errors).filter(Boolean).length;

  if (status === "sent") {
    return (
      <GlassPanel world="portal" className="cf-panel" veil={0.55}>
        <div className="cf cf-done" style={{ ["--cf-hue" as string]: hue }}>
          <span className="cf-done__glyph" aria-hidden="true">
            <Glyph kind="hexagon" size="100%" color="#ffffff" strokeWidth={1.5} glow />
          </span>
          <h2 ref={doneRef} className="cf-legend font-display" tabIndex={-1}>
            Message sent
          </h2>
          <p className="cf-body">
            Thanks, {values.name.trim().split(" ")[0] || "and welcome"}. The {option?.name ?? "right"} team reads every
            inquiry and replies within one business day
            {values.wants_call ? `. We'll call the number you left, ${values.best_time.toLowerCase()}.` : ", usually sooner."}
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

        {/* ── 01 what ── */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num" aria-hidden="true">
              {pad(1)}
            </span>
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

          <div className="cf-sub">
            <span className="cf-label" id="cf-types-label">
              {option ? option.needLabel : "What do you need?"}
              <em>Tick all that apply</em>
            </span>
            {option ? (
              <div className="cf-checks" role="group" aria-labelledby="cf-types-label">
                {shownTypes.map((t) => {
                  const on = values.project_types.includes(t);
                  return (
                    <label key={t} className="cf-check" data-on={on ? "" : undefined}>
                      <input type="checkbox" checked={on} onChange={() => toggleType(t)} />
                      <span className="cf-box" aria-hidden="true">
                        <Check size={12} weight="bold" />
                      </span>
                      <span>{t}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="cf-waiting">Pick a division above and the options appear here.</p>
            )}
          </div>
        </fieldset>

        {/* ── 02 when ── */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num" aria-hidden="true">
              {pad(2)}
            </span>
            <span className="cf-legend font-display">When do you need it?</span>
          </legend>
          <div className="cf-chips">
            {TIMELINES.map((t) => (
              <label key={t} className="cf-chip" data-on={values.timeline === t ? "" : undefined}>
                <input type="radio" name="cf-timeline" value={t} checked={values.timeline === t} onChange={() => set("timeline", t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── 03 you ── */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num" aria-hidden="true">
              {pad(3)}
            </span>
            <span className="cf-legend font-display">Who are we replying to?</span>
          </legend>
          <div className="cf-grid">
            <Field id="cf-name" field="name" label="Name" value={values.name} onChange={(v) => set("name", v)}
              autoComplete="name" placeholder="Your name" error={errors.name} required />
            <Field id="cf-email" field="email" type="email" inputMode="email" label="Email" value={values.email}
              onChange={(v) => set("email", v)} autoComplete="email" placeholder="you@company.com" error={errors.email} required />
            <Field id="cf-company" label="Company" hint="Optional" value={values.company} onChange={(v) => set("company", v)}
              autoComplete="organization" placeholder="Company or brand" />
            <Field id="cf-phone" field="phone" type="tel" inputMode="tel" label="Phone" hint={values.wants_call ? undefined : "Optional"}
              value={values.phone} onChange={(v) => set("phone", v)} autoComplete="tel" placeholder="(555) 000-0000"
              error={errors.phone} required={values.wants_call} />
            {values.division === "web" ? (
              <Field id="cf-site" field="current_site" inputMode="url" label="Current site" hint="Optional" wide
                value={values.current_site} onChange={(v) => set("current_site", v)} autoComplete="url"
                placeholder="yoursite.com" error={errors.current_site} />
            ) : null}
          </div>
        </fieldset>

        {/* ── 04 how ── */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num" aria-hidden="true">
              {pad(4)}
            </span>
            <span className="cf-legend font-display">How should we reach you?</span>
          </legend>

          <label className="cf-call" data-on={values.wants_call ? "" : undefined}>
            <input type="checkbox" checked={values.wants_call} onChange={(e) => set("wants_call", e.target.checked)} />
            <span className="cf-box" aria-hidden="true">
              <Check size={12} weight="bold" />
            </span>
            <span className="cf-call__text">
              <b>
                <PhoneCall size={15} weight="light" aria-hidden="true" />
                I&apos;d rather you call me
              </b>
              <span>We&apos;ll ring the number above instead of emailing.</span>
            </span>
          </label>

          {values.wants_call ? (
            <div className="cf-sub cf-when">
              <span className="cf-label" id="cf-when-label">
                Best time to call
              </span>
              <div className="cf-chips" role="group" aria-labelledby="cf-when-label">
                {CALL_WINDOWS.map((w) => (
                  <label key={w} className="cf-chip" data-on={values.best_time === w ? "" : undefined}>
                    <input type="radio" name="cf-when" value={w} checked={values.best_time === w} onChange={() => set("best_time", w)} />
                    <span>{w}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="cf-sub">
            <label htmlFor="cf-message" className="cf-label">
              {option?.messageLabel ?? "Anything else we should know?"}
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

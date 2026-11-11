"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleNotch, LockSimple } from "@phosphor-icons/react";
import GlassPanel from "@/components/world/GlassPanel";
import { EMAIL } from "@/components/contact/form";
import {
  ACTIONS,
  BUSINESS,
  CURRENT_SITE,
  DEPOSIT_LABEL,
  LAUNCH_FIELD_ORDER,
  TIMING,
  launchSchema,
  type CurrentSiteKey,
  type LaunchField,
  type TimingKey,
} from "./schema";

type Values = {
  timing: TimingKey | "";
  date: string;
  business: string;
  sells: string;
  actions: string[];
  current: CurrentSiteKey | "";
  siteUrl: string;
  businessName: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
};

const EMPTY: Values = {
  timing: "",
  date: "",
  business: "",
  sells: "",
  actions: [],
  current: "",
  siteUrl: "",
  businessName: "",
  name: "",
  email: "",
  phone: "",
  instagram: "",
};

type Errors = Partial<Record<LaunchField, string>>;
type Status = "idle" | "sending" | "error";

const HUE = "#9d5cff";

/** Local date "YYYY-MM-DD" (the date input's min). */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The /launch form: three questions, then who you are, then the deposit.
 * Validation runs once on submit (same schema as the server); the server opens
 * a Stripe Checkout Session and we hand the browser to it.
 */
export default function LaunchForm({ monthLabel, ready, nextMonth = false }: { monthLabel: string; ready: boolean; nextMonth?: boolean }) {
  // when this month is full the button joins next month instead
  const cta = nextMonth ? `Join ${monthLabel} · ${DEPOSIT_LABEL}` : `Reserve my spot · ${DEPOSIT_LABEL}`;
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);
  const [minDate, setMinDate] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const botRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMinDate(todayLocal());
    if (new URLSearchParams(window.location.search).get("canceled")) setCanceled(true);
    // the browser's back button from Stripe restores this page from bfcache
    // with the button still spinning
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setStatus("idle");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setV((s) => ({ ...s, [key]: value }));
    setErrors((e) => (key in e ? { ...e, [key]: undefined } : e));
  }, []);

  const toggleAction = useCallback((a: string) => {
    setV((s) => ({ ...s, actions: s.actions.includes(a) ? s.actions.filter((x) => x !== a) : [...s.actions, a] }));
    setErrors((e) => ({ ...e, actions: undefined }));
  }, []);

  const focusFirst = useCallback((problems: Errors) => {
    const first = LAUNCH_FIELD_ORDER.find((f) => problems[f]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const submit = useCallback(async () => {
    if (status === "sending") return;
    setSendError(null);
    const parsed = launchSchema.safeParse(v);
    if (!parsed.success) {
      const problems: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as LaunchField;
        problems[k] ??= issue.message;
      }
      setErrors(problems);
      focusFirst(problems);
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const res = await fetch("/api/launch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, website_url: botRef.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string; errors?: Errors } | null;
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      if (data?.errors) {
        setErrors(data.errors);
        focusFirst(data.errors);
      }
      setStatus("error");
      setSendError(data?.error ?? "Checkout couldn't open right now.");
    } catch {
      setStatus("error");
      setSendError("Checkout couldn't open right now.");
    }
  }, [status, v, focusFirst]);

  const count = Object.values(errors).filter(Boolean).length;

  return (
    <GlassPanel world="portal" className="cf-panel" veil={0.55}>
      <form
        ref={formRef}
        className="cf cf-form"
        style={{ ["--cf-hue" as string]: HUE }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        aria-label="Reserve a launch spot"
      >
        {/* honeypot: a field only bots fill */}
        <input ref={botRef} type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        {canceled ? (
          <p className="lf-notice" role="status">
            Checkout was closed before paying, so nothing was charged. Your spot isn&apos;t held yet. Pick up where you left off below.
          </p>
        ) : null}

        {/* 01 — when */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num">01</span>
            <span className="cf-legend font-display">When do you want it live?</span>
          </legend>
          <div className="cf-chips" role="radiogroup" aria-label="Launch timing">
            {TIMING.map((t, i) => {
              const on = v.timing === t.key;
              return (
                <label key={t.key} className="cf-chip" data-on={on ? "" : undefined}>
                  <input
                    type="radio"
                    name="lf-timing"
                    value={t.key}
                    checked={on}
                    data-field={i === 0 ? "timing" : undefined}
                    onChange={() => set("timing", t.key)}
                  />
                  {t.label}
                </label>
              );
            })}
          </div>
          <FieldError id="lf-e-timing" message={errors.timing} />
          {v.timing === "date" ? (
            <div className="cf-field lf-date">
              <label htmlFor="lf-date" className="cf-label">
                Target launch date
              </label>
              <input
                id="lf-date"
                data-field="date"
                type="date"
                className="cf-input"
                min={minDate || undefined}
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
                aria-invalid={errors.date ? true : undefined}
              />
              <FieldError id="lf-e-date" message={errors.date} />
            </div>
          ) : null}
        </fieldset>

        {/* 02 — what */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num">02</span>
            <span className="cf-legend font-display">What do you offer?</span>
          </legend>
          <div className="cf-chips" role="radiogroup" aria-label="Type of business">
            {BUSINESS.map((b, i) => {
              const on = v.business === b;
              return (
                <label key={b} className="cf-chip" data-on={on ? "" : undefined}>
                  <input
                    type="radio"
                    name="lf-business"
                    value={b}
                    checked={on}
                    data-field={i === 0 ? "business" : undefined}
                    onChange={() => set("business", b)}
                  />
                  {b}
                </label>
              );
            })}
          </div>
          <FieldError id="lf-e-business" message={errors.business} />
          <div className="cf-sub">
            <label htmlFor="lf-sells" className="cf-label">
              In a sentence or two, what do you sell?
            </label>
            <textarea
              id="lf-sells"
              data-field="sells"
              className="cf-input cf-input--area"
              rows={3}
              maxLength={400}
              value={v.sells}
              onChange={(e) => set("sells", e.target.value)}
              placeholder="360 booths and print packages for weddings and quinceañeras across the Valley..."
              aria-invalid={errors.sells ? true : undefined}
              data-lenis-prevent=""
            />
            <FieldError id="lf-e-sells" message={errors.sells} />
          </div>
          <div className="cf-sub">
            <p className="cf-label" id="lf-actions-label">
              On your site, people should be able to
              <em>Pick any</em>
            </p>
            <div className="cf-checks" role="group" aria-labelledby="lf-actions-label">
              {ACTIONS.map((a, i) => {
                const on = v.actions.includes(a);
                return (
                  <label key={a} className="cf-check" data-on={on ? "" : undefined}>
                    <input
                      type="checkbox"
                      checked={on}
                      data-field={i === 0 ? "actions" : undefined}
                      onChange={() => toggleAction(a)}
                    />
                    <span className="cf-box" aria-hidden="true">
                      <Check size={11} weight="bold" />
                    </span>
                    {a}
                  </label>
                );
              })}
            </div>
            <FieldError id="lf-e-actions" message={errors.actions} />
          </div>
        </fieldset>

        {/* 03 — today */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num">03</span>
            <span className="cf-legend font-display">Do you have a website today?</span>
          </legend>
          <div className="cf-chips" role="radiogroup" aria-label="Current website">
            {CURRENT_SITE.map((c, i) => {
              const on = v.current === c.key;
              return (
                <label key={c.key} className="cf-chip" data-on={on ? "" : undefined}>
                  <input
                    type="radio"
                    name="lf-current"
                    value={c.key}
                    checked={on}
                    data-field={i === 0 ? "current" : undefined}
                    onChange={() => set("current", c.key)}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>
          <FieldError id="lf-e-current" message={errors.current} />
          {v.current && v.current !== "none" ? (
            <Field id="lf-site" label="Link" hint="Optional" value={v.siteUrl} onChange={(x) => set("siteUrl", x)}
              inputMode="url" placeholder="yourbusiness.com" />
          ) : null}
        </fieldset>

        {/* 04 — who */}
        <fieldset className="cf-block">
          <legend className="cf-head">
            <span className="cf-num">04</span>
            <span className="cf-legend font-display">Who&apos;s it for?</span>
          </legend>
          <div className="cf-grid">
            <Field id="lf-biz" field="businessName" label="Business name" value={v.businessName}
              onChange={(x) => set("businessName", x)} autoComplete="organization" placeholder="Your business" error={errors.businessName} />
            <Field id="lf-name" field="name" label="Your name" value={v.name} onChange={(x) => set("name", x)}
              autoComplete="name" placeholder="First and last" error={errors.name} />
            <Field id="lf-email" field="email" type="email" inputMode="email" label="Email" value={v.email}
              onChange={(x) => set("email", x)} autoComplete="email" placeholder="you@business.com" error={errors.email} />
            <Field id="lf-phone" type="tel" inputMode="tel" label="Phone" hint="Optional" value={v.phone}
              onChange={(x) => set("phone", x)} autoComplete="tel" placeholder="(555) 555-5555" />
            <Field id="lf-ig" label="Instagram" hint="Optional" value={v.instagram} onChange={(x) => set("instagram", x)}
              placeholder="@yourbusiness" wide />
          </div>
        </fieldset>

        {/* the deposit */}
        <div className="lf-pay">
          <div className="lf-pay__row">
            <span className="lf-pay__what">
              <span className="contact-label">Launch spot deposit</span>
              <span className="lf-pay__month">{nextMonth ? `${monthLabel} · this month is fully booked` : monthLabel}</span>
            </span>
            <span className="lf-pay__amount font-display">{DEPOSIT_LABEL}</span>
          </div>
          <ul className="lf-pay__terms">
            <li>Goes toward your site, in full</li>
            <li>Refunded in full if you pass on the preview</li>
          </ul>
          <div className="cf-foot">
            <button type="submit" className="ghost-btn cf-next" disabled={status === "sending" || !ready}>
              <span className="ghost-btn__layer">
                <span>{status === "sending" ? "Opening checkout" : cta}</span>
                {status === "sending" ? (
                  <CircleNotch size={16} weight="light" aria-hidden="true" className="cf-spin" />
                ) : (
                  <ArrowRight size={16} weight="light" aria-hidden="true" />
                )}
              </span>
              <span className="ghost-btn__layer ghost-btn__fill" aria-hidden="true">
                <span>{status === "sending" ? "Opening checkout" : cta}</span>
                <ArrowRight size={16} weight="light" />
              </span>
            </button>
            <p className="cf-note lf-secure">
              <LockSimple size={12} weight="light" aria-hidden="true" />
              Secure checkout by Stripe
            </p>
          </div>
          {!ready ? (
            <p className="cf-senderror">
              Online reservations open shortly. To reserve now, email{" "}
              <a href={`mailto:${EMAIL}`} className="world-underline">
                {EMAIL}
              </a>
            </p>
          ) : null}
        </div>

        <p className="sr-only" aria-live="polite">
          {count ? `${count} ${count === 1 ? "answer needs" : "answers need"} a second look.` : ""}
        </p>

        {status === "error" && sendError ? (
          <p className="cf-senderror" role="alert">
            {sendError} Nothing was charged. Try again, or email{" "}
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
  wide,
}: {
  id: string;
  field?: LaunchField;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  placeholder?: string;
  error?: string;
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
        spellCheck={false}
      />
      <FieldError id={errId} message={error} />
    </div>
  );
}

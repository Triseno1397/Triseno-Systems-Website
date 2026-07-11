"use client";

import { useState } from "react";
import {
  PaperPlaneTilt,
  CheckCircle,
  EnvelopeSimple,
  InstagramLogo,
  CircleNotch,
} from "@phosphor-icons/react";
import PageHero from "@/components/layout/PageHero";
import ScrollReveal from "@/components/animations/ScrollReveal";
import HiddenPortalSeal from "@/components/contact/HiddenPortalSeal";

// Direct-contact identity — shown prominently and used as the fallback everywhere.
const EMAIL = "tristen@trisenosystems.com";
const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
const INSTAGRAM_HANDLE = "@trisenosystems";

// Submissions post straight to the studio inbox via Web3Forms — no mail client
// opens, no server needed, works on Vercel. Set the free access key in Vercel as
// NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY (or paste it into the fallback below). Get one
// in ~30s at https://web3forms.com by entering tristen@trisenosystems.com.
const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";

type DivisionKey = "studio" | "web";

const DIVISIONS: Record<
  DivisionKey,
  {
    label: string;
    tagline: string;
    projectTypes: string[];
    messageLabel: string;
    messagePlaceholder: string;
  }
> = {
  studio: {
    label: "Content Studio",
    tagline: "Video & creative for paid social — UGC to cinematic brand films.",
    projectTypes: [
      "HyperMotion Ads",
      "Product Hero",
      "Direct Response Ads",
      "Product Demo",
      "Brand Film",
      "UGC Ads",
      "Something else",
    ],
    messageLabel: "What are you looking to make?",
    messagePlaceholder:
      "What you're selling, where it needs to run, and any timeline in mind...",
  },
  web: {
    label: "Web Design Division",
    tagline: "Conversion-built websites — new builds, redesigns, and stores.",
    projectTypes: [
      "New website",
      "Redesign",
      "Landing page",
      "E-commerce store",
      "Web app",
      "Something else",
    ],
    messageLabel: "Tell us about your website project",
    messagePlaceholder:
      "Goals, the pages you need, sites you like, and any timeline...",
  },
};

const TIMELINES = ["ASAP / rush", "2–4 weeks", "1–2 months", "Flexible / not sure"];

export default function ContactContent() {
  const [division, setDivision] = useState<DivisionKey>("studio");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWeb = division === "web";
  const active = DIVISIONS[division];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!WEB3FORMS_ACCESS_KEY) {
      setError(
        `The form isn't connected yet — please email us directly at ${EMAIL}.`
      );
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `New ${active.label} inquiry — Triseno`,
      from_name: "Triseno website",
      division: active.label,
      ...Object.fromEntries(formData.entries()),
    };

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(`Something went wrong — please email us directly at ${EMAIL}.`);
      }
    } catch {
      setError(`Couldn't send right now — please email us directly at ${EMAIL}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = `w-full bg-navy-800/50 border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none transition-all duration-300 font-sans text-sm ${
    isWeb
      ? "focus:border-[#9d5cff]/40 focus:ring-1 focus:ring-[#9d5cff]/20"
      : "focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
  }`;

  const labelClasses =
    "block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-2";

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Let's start a project."
        subtitle="Email us, find us on Instagram, or send an inquiry below — pick the team you need and we'll take it from there."
      />

      <section className="relative py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-16">
            {/* Toggle + form */}
            <ScrollReveal>
              <div>
                {/* Division toggle */}
                <div className="mb-8">
                  <span className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-3">
                    What can we help with?
                  </span>
                  <div
                    role="tablist"
                    aria-label="Choose a division"
                    className="inline-flex flex-wrap gap-3"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!isWeb}
                      onClick={() => setDivision("studio")}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 border ${
                        !isWeb
                          ? "bg-cyan-400 text-navy-950 border-cyan-400"
                          : "border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-cyan-400/40"
                      }`}
                    >
                      Content Studio
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isWeb}
                      onClick={() => setDivision("web")}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 border ${
                        isWeb
                          ? "bg-[#9d5cff] text-white border-[#9d5cff]"
                          : "border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-[#9d5cff]/40"
                      }`}
                    >
                      Web Design Division
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-text-tertiary">{active.tagline}</p>
                </div>

                {/* Form card */}
                <div className="relative rounded-2xl border border-white/[0.06] bg-navy-800/20 backdrop-blur-sm p-8 md:p-10">
                  <div
                    className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                      isWeb ? "via-[#9d5cff]/50" : "via-cyan-400/40"
                    }`}
                  />

                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <CheckCircle
                        size={48}
                        weight="duotone"
                        className={isWeb ? "text-[#b57cff] mb-6" : "text-cyan-400 mb-6"}
                      />
                      <h3 className="text-2xl font-bold text-text-primary mb-3">
                        Message sent
                      </h3>
                      <p className="text-text-secondary max-w-md">
                        Thanks for reaching out. We&apos;ll review your inquiry and get
                        back to you within one business day.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Honeypot — bots fill this, humans never see it. */}
                      <input
                        type="checkbox"
                        name="botcheck"
                        tabIndex={-1}
                        autoComplete="off"
                        className="hidden"
                        aria-hidden="true"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="name" className={labelClasses}>
                            Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            className={inputClasses}
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className={labelClasses}>
                            Email
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            className={inputClasses}
                            placeholder="you@company.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="company" className={labelClasses}>
                          Company{" "}
                          <span className="text-text-tertiary">(optional)</span>
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          className={inputClasses}
                          placeholder="Your company or brand"
                        />
                      </div>

                      <div>
                        <label htmlFor="project-type" className={labelClasses}>
                          Project type
                        </label>
                        <select
                          key={division}
                          id="project-type"
                          name="project_type"
                          className={`${inputClasses} appearance-none cursor-pointer`}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Select one
                          </option>
                          {active.projectTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Web Design only — makes the two forms obviously different. */}
                      {isWeb && (
                        <div>
                          <label htmlFor="current-site" className={labelClasses}>
                            Current website{" "}
                            <span className="text-text-tertiary">(optional)</span>
                          </label>
                          <input
                            type="url"
                            id="current-site"
                            name="current_site"
                            className={inputClasses}
                            placeholder="https://yoursite.com"
                          />
                        </div>
                      )}

                      <div>
                        <label htmlFor="timeline" className={labelClasses}>
                          Timeline
                        </label>
                        <select
                          id="timeline"
                          name="timeline"
                          className={`${inputClasses} appearance-none cursor-pointer`}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Select one
                          </option>
                          {TIMELINES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="message" className={labelClasses}>
                          {active.messageLabel}
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          className={`${inputClasses} resize-none`}
                          placeholder={active.messagePlaceholder}
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-400" role="alert">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className={`group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-lg font-semibold text-sm tracking-wide transition-colors duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          isWeb
                            ? "bg-[#9d5cff] text-white hover:bg-[#b57cff]"
                            : "bg-cyan-400 text-navy-950 hover:bg-cyan-300"
                        }`}
                      >
                        {submitting ? (
                          <>
                            <span>Sending</span>
                            <CircleNotch
                              size={18}
                              weight="bold"
                              className="animate-spin"
                            />
                          </>
                        ) : (
                          <>
                            <span>Send inquiry</span>
                            <PaperPlaneTilt
                              size={18}
                              weight="bold"
                              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
                            />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </ScrollReveal>

            {/* Direct contact — email + Instagram, front and center. */}
            <ScrollReveal delay={0.15}>
              <div className="space-y-6 lg:pt-2">
                <h4 className="text-sm font-mono text-text-secondary/80 uppercase tracking-wider">
                  Reach us directly
                </h4>

                <a
                  href={`mailto:${EMAIL}`}
                  className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-navy-800/20 p-5 hover:border-cyan-400/40 transition-colors duration-200"
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-navy-800/60 border border-white/[0.06] flex items-center justify-center">
                    <EnvelopeSimple
                      size={20}
                      weight="duotone"
                      className="text-cyan-400"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1">
                      Email
                    </span>
                    <span className="block text-text-primary group-hover:text-[#00e5ff] transition-colors duration-200 break-words">
                      {EMAIL}
                    </span>
                  </span>
                </a>

                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-navy-800/20 p-5 hover:border-cyan-400/40 transition-colors duration-200"
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-navy-800/60 border border-white/[0.06] flex items-center justify-center">
                    <InstagramLogo
                      size={20}
                      weight="duotone"
                      className="text-cyan-400"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1">
                      Instagram
                    </span>
                    <span className="block text-text-primary group-hover:text-[#00e5ff] transition-colors duration-200">
                      {INSTAGRAM_HANDLE}
                    </span>
                  </span>
                </a>

                <p className="text-sm text-text-tertiary leading-relaxed">
                  We reply within one business day — often sooner.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <HiddenPortalSeal />
    </>
  );
}

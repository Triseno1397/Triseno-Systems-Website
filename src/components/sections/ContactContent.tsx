"use client";

import { useRef, useState } from "react";
import {
  PaperPlaneTilt,
  CheckCircle,
  ChatDots,
  Handshake,
  FileText,
  MagnifyingGlass,
  Wrench,
  ArrowRight,
} from "@phosphor-icons/react";
import PageHero from "@/components/layout/PageHero";
import ScrollReveal from "@/components/animations/ScrollReveal";
import HiddenPortalSeal from "@/components/contact/HiddenPortalSeal";

const howDidYouFindUs = [
  "Instagram",
  "Referral",
  "Search",
  "LinkedIn",
  "Other",
];

const nextSteps = [
  {
    icon: ChatDots,
    label: "We respond within 24 hours, often sooner.",
  },
  {
    icon: Handshake,
    label: "Discovery call to scope your needs",
  },
  {
    icon: FileText,
    label: "Proposal with architecture & pricing",
  },
];

type Path = "audit" | "build";

export default function ContactContent() {
  const formRef = useRef<HTMLDivElement>(null);
  const projectTypeRef = useRef<HTMLSelectElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [path, setPath] = useState<Path>("build");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData as unknown as Record<string, string>).toString(),
    })
      .then(() => setSubmitted(true))
      .catch(() => setSubmitted(true));
  };

  const choosePath = (next: Path) => {
    setPath(next);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (projectTypeRef.current) {
        projectTypeRef.current.value = next === "audit" ? "AI Operations Audit" : "Custom Build";
      }
    });
  };

  const inputClasses =
    "w-full bg-navy-800/50 border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 focus:outline-none transition-all duration-300 font-sans text-sm";

  return (
    <>
      <PageHero
        eyebrow="Get started"
        title="Let's talk architecture."
        subtitle="Whether you need a diagnostic audit, a full system build, or just want to explore what's possible — start here."
      />

      {/* Two-path entry */}
      <section className="relative py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <ScrollReveal>
              <button
                type="button"
                onClick={() => choosePath("audit")}
                className="group relative h-full text-left rounded-2xl border border-cyan-400/30 bg-navy-800/40 backdrop-blur-sm p-8 md:p-10 hover:border-cyan-400/60 transition-colors duration-300 cursor-pointer w-full"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -top-3 left-8">
                  <span className="inline-block px-3 py-1 rounded-full bg-cyan-400 text-navy-950 text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
                    Recommended
                  </span>
                </div>
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-700/60 border border-white/[0.06] mb-8">
                  <MagnifyingGlass size={28} weight="duotone" className="text-cyan-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-4 tracking-tight">
                  AI operations audit
                </h3>
                <p className="text-text-secondary leading-relaxed mb-8">
                  The fastest way in. A focused diagnostic that identifies your highest-leverage compression opportunities before you commit to a full build.
                </p>
                <span className="inline-flex items-center gap-2 text-sm text-cyan-400 font-medium group-hover:text-[#00e5ff] transition-colors duration-200">
                  Request audit
                  <ArrowRight size={14} weight="bold" className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </button>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <button
                type="button"
                onClick={() => choosePath("build")}
                className="group relative h-full text-left rounded-2xl border border-white/[0.06] bg-navy-800/30 backdrop-blur-sm p-8 md:p-10 hover:border-cyan-400/30 transition-colors duration-300 cursor-pointer w-full"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-700/60 border border-white/[0.06] mb-8">
                  <Wrench size={28} weight="duotone" className="text-cyan-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-4 tracking-tight">
                  Custom build conversation
                </h3>
                <p className="text-text-secondary leading-relaxed mb-8">
                  Ready to scope a system? Tell us what you&apos;re building.
                </p>
                <span className="inline-flex items-center gap-2 text-sm text-cyan-400 font-medium group-hover:text-[#00e5ff] transition-colors duration-200">
                  Start a conversation
                  <ArrowRight size={14} weight="bold" className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </button>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section ref={formRef} className="relative py-16 md:py-24 scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-16">
            <ScrollReveal>
              <div className="relative rounded-2xl border border-white/[0.06] bg-navy-800/20 backdrop-blur-sm p-8 md:p-10">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle size={48} weight="duotone" className="text-cyan-400 mb-6" />
                    <h3 className="text-2xl font-bold text-text-primary mb-3">Message sent</h3>
                    <p className="text-text-secondary max-w-md">
                      We&apos;ll review your message and get back to you within 24 hours. Looking forward to the conversation.
                    </p>
                  </div>
                ) : (
                  <form
                    name="contact"
                    method="POST"
                    data-netlify="true"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <input type="hidden" name="form-name" value="contact" />
                    <input type="hidden" name="entry-path" value={path} />

                    <div>
                      <span className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-3">
                        I&apos;m here for
                      </span>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setPath("audit")}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 border ${
                            path === "audit"
                              ? "bg-cyan-400 text-navy-950 border-cyan-400"
                              : "border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-cyan-400/40"
                          }`}
                        >
                          AI operations audit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPath("build")}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 border ${
                            path === "build"
                              ? "bg-cyan-400 text-navy-950 border-cyan-400"
                              : "border-white/[0.08] text-text-secondary hover:text-text-primary hover:border-cyan-400/40"
                          }`}
                        >
                          Custom build
                        </button>
                      </div>
                      <select
                        ref={projectTypeRef}
                        name="project-type"
                        defaultValue={path === "audit" ? "AI Operations Audit" : "Custom Build"}
                        className="hidden"
                        aria-hidden
                      >
                        <option value="AI Operations Audit">AI Operations Audit</option>
                        <option value="Custom Build">Custom Build</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-2">
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
                        <label htmlFor="email" className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-2">
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
                      <label htmlFor="company" className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-2">
                        Company <span className="text-text-tertiary">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        className={inputClasses}
                        placeholder="Your company"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-2">
                        What are you looking to build?
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        className={`${inputClasses} resize-none`}
                        placeholder="Tell us about your project, operational challenges, or what you'd like to explore..."
                      />
                    </div>

                    <div>
                      <label htmlFor="source" className="block text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-2">
                        How did you find us?
                      </label>
                      <select
                        id="source"
                        name="source"
                        className={`${inputClasses} appearance-none cursor-pointer`}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select one
                        </option>
                        {howDidYouFindUs.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-lg bg-cyan-400 text-navy-950 font-semibold text-sm tracking-wide hover:bg-cyan-300 transition-colors duration-300 cursor-pointer"
                    >
                      <span>Send message</span>
                      <PaperPlaneTilt
                        size={18}
                        weight="bold"
                        className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
                      />
                    </button>
                  </form>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="space-y-10 lg:pt-4">
                <div>
                  <h4 className="text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-3">
                    Direct
                  </h4>
                  <a
                    href="mailto:Tristen@trisenosystems.com"
                    className="text-lg text-text-primary hover:text-[#00e5ff] transition-colors duration-200"
                  >
                    Tristen@trisenosystems.com
                  </a>
                </div>

                <div>
                  <h4 className="text-sm font-mono text-text-secondary/80 uppercase tracking-wider mb-6">
                    What happens next
                  </h4>
                  <div className="space-y-6">
                    {nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="relative flex-shrink-0 mt-0.5">
                          {i < nextSteps.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-6 bg-white/[0.06]" />
                          )}
                          <div className="w-8 h-8 rounded-lg bg-navy-800/60 border border-white/[0.06] flex items-center justify-center">
                            <step.icon size={16} weight="duotone" className="text-cyan-400" />
                          </div>
                        </div>
                        <p className="text-sm text-text-secondary pt-1.5">
                          {step.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <HiddenPortalSeal />
    </>
  );
}

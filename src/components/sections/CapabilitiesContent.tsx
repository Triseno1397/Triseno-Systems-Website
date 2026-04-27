"use client";

import {
  CirclesThreePlus,
  Lightning,
  Brain,
  Package,
  Broadcast,
  ChartLineUp,
  Storefront,
  Buildings,
  FilmSlate,
  Code,
} from "@phosphor-icons/react";
import PageHero from "@/components/layout/PageHero";
import CtaBar from "@/components/layout/CtaBar";
import CapabilityCard from "@/components/sections/CapabilityCard";
import IndustryBlock from "@/components/sections/IndustryBlock";
import ScrollReveal from "@/components/animations/ScrollReveal";

const capabilities = [
  {
    id: "orchestration",
    icon: CirclesThreePlus,
    label: "Core Platform",
    title: "Multi-agent orchestration",
    body: [
      "Coordinated AI agent systems that divide complex workflows into parallel execution paths — research, analysis, generation, and validation running simultaneously. Not one bot. An entire operations team.",
      "Each agent has a defined role, defined fallbacks, and defined handoffs. They work in sequence when sequence matters, and in parallel when speed does. Your operational throughput stops being limited by the slowest human in the chain.",
      "Built to be observable. Every decision is logged, every handoff is traceable, every output is testable. Your team gains a system they can audit, tune, and extend — not a black box that ships answers without context.",
    ],
    bullets: [
      "Role-defined agents with explicit handoff logic",
      "Parallel and sequential execution graphs",
      "Per-agent monitoring, retries, and fallbacks",
      "Human-in-the-loop checkpoints where they matter",
      "Production-grade observability and logging",
    ],
  },
  {
    id: "compression",
    icon: Lightning,
    label: "Automation",
    title: "Workflow compression engines",
    body: [
      "We identify the 40-hour processes buried in your operations and engineer them down to minutes. Document processing, approval chains, data reconciliation — compressed, automated, and monitored end to end.",
      "The starting point is a forensic look at where your team's hours actually go. We don't automate what looks fragile; we automate what's quietly draining capacity. The output is a compression engine sized to the bottleneck, not a generic productivity tool.",
      "Once deployed, the engine becomes infrastructure. It scales with volume, surfaces anomalies, and frees the team that used to run it manually to focus on judgment work that actually moves the business forward.",
    ],
    bullets: [
      "End-to-end document and contract processing",
      "Approval chain automation with audit trails",
      "Data reconciliation across disconnected systems",
      "Exception handling routed to the right human",
      "Throughput dashboards with anomaly alerting",
    ],
  },
  {
    id: "decision-intelligence",
    icon: Brain,
    label: "Intelligence",
    title: "Decision-layer automation",
    body: [
      "AI systems that don't just surface data — they make recommendations, flag anomalies, and execute decisions within parameters you define. Your judgment, operating at machine speed.",
      "We build the layer between raw data and the people who act on it. Models tuned to your operating rules, thresholds tied to your risk tolerance, and decision logic that escalates the moments that genuinely require a human.",
      "The result is a system that handles the routine 90% with confidence — and surfaces the 10% that's worth your attention with the context already attached.",
    ],
    bullets: [
      "Recommendation engines tuned to operational policy",
      "Real-time anomaly detection with severity scoring",
      "Bounded autonomous decisioning with audit logs",
      "Escalation routing with full decision context",
      "Continuous calibration against outcomes",
    ],
  },
  {
    id: "catalog-intelligence",
    icon: Package,
    label: "Commerce",
    title: "Product & catalog intelligence",
    body: [
      "Transform sprawling product catalogs into intelligent systems that understand specifications, compatibility, and context. Your customers get expert-level guidance. Your team gets freed from repetitive inquiries.",
      "We turn static SKU tables into structured, queryable knowledge. Compatibility graphs, specification reasoning, and merchandising signals that compose into experiences your customers actually find useful — and your support team stops having to translate.",
      "Plugged into your storefront, search, and support tooling, the same intelligence powers conversion, deflection, and operations from a single source of truth.",
    ],
    bullets: [
      "Specification extraction and normalization at scale",
      "Compatibility and cross-sell graphs",
      "Conversational product guidance for customers",
      "Internal tooling for support and operations teams",
      "Search and merchandising powered by the same model",
    ],
  },
  {
    id: "broadcast-ai",
    icon: Broadcast,
    label: "Media",
    title: "Broadcast & production AI",
    body: [
      "Production automation built by someone who's lived in the control room. Metadata intelligence, content routing, asset orchestration, and real-time decision systems for broadcast, film, live events, and media production workflows.",
      "Broadcast environments don't tolerate flakiness. We engineer systems with the same posture as the rest of the broadcast stack — redundant, observable, and built to fail gracefully when something upstream goes sideways.",
      "From pre-production planning through live show automation to post-production asset management, the underlying intelligence layer threads everything together so the team isn't stitching tools by hand.",
    ],
    bullets: [
      "Automated metadata generation and tagging",
      "Real-time routing for live and event production",
      "Asset orchestration across pre, live, and post",
      "Show automation tuned to control-room workflow",
      "Hardened for broadcast-grade reliability",
    ],
  },
  {
    id: "revenue-ops",
    icon: ChartLineUp,
    label: "Revenue",
    title: "Revenue operations intelligence",
    body: [
      "Lead qualification, pipeline acceleration, and conversion optimization powered by AI that understands your sales process. Outcome-tied pricing means we only win when you do.",
      "We instrument the parts of the funnel where attention and capital actually leak — qualification noise, slow handoffs, dormant accounts — and replace the manual triage with systems that score, route, and follow up at machine speed.",
      "Built into your CRM and outreach stack, the system compounds: every cycle sharpens its scoring, every interaction becomes signal, and your reps focus on the conversations that close.",
    ],
    bullets: [
      "AI-driven lead scoring and qualification",
      "Pipeline acceleration with stalled-deal detection",
      "Automated follow-up tuned to your playbook",
      "Conversion analytics and win/loss attribution",
      "Outcome-tied engagements where it fits",
    ],
  },
];

const industries = [
  {
    icon: Broadcast,
    title: "Broadcast & production",
    body:
      "The broadcast control room is one of the most complex operational environments in any industry. We bring domain expertise from inside the broadcast world combined with frontier AI architecture — real-time decision-making, multi-source routing, metadata management, and workflow compression across pre-production, live, and post.",
  },
  {
    icon: Storefront,
    title: "E-commerce & large-catalog",
    body:
      "Companies with hundreds or thousands of SKUs, complex product relationships, and technical specifications that overwhelm both customers and internal teams. We build intelligent catalog systems that turn static data into revenue-generating infrastructure.",
  },
  {
    icon: Buildings,
    title: "Enterprise operations",
    body:
      "Complex operational workflows in logistics, supply chain, manufacturing, and large-scale service delivery. Agent systems and workflow compression engines for environments where operational throughput and decision accuracy directly impact revenue.",
  },
  {
    icon: FilmSlate,
    title: "Creative production & media tech",
    body:
      "AI infrastructure for creative teams at scale — asset management intelligence, production pipeline automation, creative deployment engines, and systems that accelerate creative throughput without sacrificing quality.",
  },
  {
    icon: Code,
    title: "Technology & SaaS",
    body:
      "AI-native infrastructure for tech companies looking to embed intelligence deeper into their products and operations. From internal tooling automation to customer onboarding compression to intelligent support architecture.",
  },
];

export default function CapabilitiesContent() {
  return (
    <>
      <PageHero
        eyebrow="What we build"
        title="Infrastructure that thinks."
        subtitle="We don't build chatbots. We build the operational intelligence layer underneath — the systems that compress decisions, orchestrate agents, and turn complexity into leverage."
      />

      {/* Capabilities grid */}
      <section className="relative py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div
            data-animate="capabilities-grid"
            className="grid grid-cols-1 gap-6 md:gap-8"
          >
            {capabilities.map((cap, i) => (
              <CapabilityCard
                key={cap.id}
                id={cap.id}
                label={cap.label}
                title={cap.title}
                body={cap.body}
                bullets={cap.bullets}
                icon={cap.icon}
                delay={Math.min(i * 0.05, 0.2)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section
        id="industries"
        className="relative py-20 md:py-28 border-t border-white/[0.06] scroll-mt-32"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl mb-16">
              <span className="inline-block font-mono text-sm tracking-[0.2em] uppercase text-cyan-400 mb-4">
                Industries
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight mb-6">
                Built for complex operations.
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                We work across industries — anywhere operational complexity, large data sets, or manual workflows are costing you money and time.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, i) => (
              <IndustryBlock
                key={industry.title}
                title={industry.title}
                body={industry.body}
                icon={industry.icon}
                delay={Math.min(i * 0.08, 0.24)}
              />
            ))}
          </div>
        </div>
      </section>

      <CtaBar
        heading="See how we engineer it."
        buttonLabel="See how we engineer it"
        buttonHref="/process"
      />
    </>
  );
}

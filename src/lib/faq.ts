/**
 * The questions a buyer actually types, answered in plain words.
 *
 * Two jobs, one block of copy. Search engines rank a page on what a visitor
 * can read, and until now the terms people search for ("UGC ads", "custom
 * website design", "AI automation") lived only in this site's metadata while
 * the visible headlines stayed short and abstract. Answer engines — ChatGPT,
 * Claude, Perplexity, Google's AI Overviews — go further: they cite a handful
 * of sources per answer, and they favour pages that put a direct answer right
 * under a question-shaped heading. That is exactly this shape.
 *
 * Rules for anything added here:
 *   · the question is phrased the way someone would type it;
 *   · the first sentence answers it outright — no preamble;
 *   · nothing is promised that the studio has not already promised elsewhere
 *     on the site. No invented prices, guarantees, team sizes or timelines.
 */
/** the three divisions that sell something, and so get asked questions */
export type FaqDivision = "creative" | "web" | "ai";

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: Record<FaqDivision, FaqItem[]> = {
  creative: [
    {
      q: "What kind of ad creative does Triseno Studio make?",
      a: "Paid-social ad creative for Instagram, TikTok, YouTube and Meta: UGC-style ads, product demos, ASMR and unboxing, direct-response reels, hyper-motion product hero spots, and cinematic brand films. Everything is cut for the feed it runs in, in the aspect ratios and lengths each platform rewards.",
    },
    {
      q: "How fast is the turnaround on a batch of ads?",
      a: "Days rather than weeks for a batch of paid-social cuts. The exact schedule depends on the scope and whether we are shooting new footage or working with yours, and it is agreed before anything starts.",
    },
    {
      q: "Do you make UGC ads?",
      a: "Yes. Creator-style UGC is one of the formats we produce, alongside studio product work, demos and brand film. Most accounts run a mix, because UGC and polished product work fail and win in different placements.",
    },
    {
      q: "Can you work with footage we already have?",
      a: "Yes. We edit, grade and re-cut existing footage as well as producing new material, and often the fastest first win on an account is re-cutting what is already sitting in the drive.",
    },
    {
      q: "Do you deliver variations for creative testing?",
      a: "Yes. Paid social is a testing exercise, so work is delivered as variations — different hooks, lengths and aspect ratios off the same shoot — built to be run against each other rather than as one hero file.",
    },
    {
      q: "What do you need from us to start?",
      a: "The product or access to it, your brand guidelines if you have them, and where the ads will run. If you have an ad account with history, what has already worked and failed is the most useful thing you can send.",
    },
  ],
  web: [
    {
      q: "What does a Triseno website build include?",
      a: "Strategy, design, build and launch: custom design with no templates, a performance score of 90 or higher, SEO-ready structure, the integrations the business needs, and iteration after launch. The site you are reading is the demonstration of what that produces.",
    },
    {
      q: "Do you use templates, themes or page builders?",
      a: "No. Every site is designed and built custom. Templates put a ceiling on both speed and distinctiveness, and they are the reason most sites in a category look like each other.",
    },
    {
      q: "Do you redesign existing websites?",
      a: "Yes. Redesigns are as common as new builds, and they start the same way: what the site is meant to make happen, and where the current one loses people.",
    },
    {
      q: "Will the site be fast and SEO-ready?",
      a: "Yes, and both are part of the build rather than an add-on. A performance target of 90 or higher, clean heading structure, metadata and structured data on every page, a sitemap, and pages that are indexable rather than locked behind script.",
    },
    {
      q: "Can you build an ecommerce store?",
      a: "Yes. Ecommerce is one of the build types, designed around the product and the checkout rather than dropped onto a stock storefront.",
    },
    {
      q: "What happens after launch?",
      a: "Ongoing iteration. A site is a conversion instrument, not a deliverable — the useful work starts once there is real traffic to learn from.",
    },
  ],
  ai: [
    {
      q: "What does AI infrastructure actually mean?",
      a: "The operational layer a business runs on, built with AI rather than talked about: multi-agent orchestration, workflow automation and compression, catalog and revenue operations, and decision-layer systems. It is the plumbing between your tools, your data and the decisions your team makes every day.",
    },
    {
      q: "Do you consult, or do you build it?",
      a: "Both, and the building is the point. Consulting and architecture come first because a system designed around the wrong workflow is expensive to unbuild, but the engagement ends with something deployed and running, not a deck.",
    },
    {
      q: "What kinds of problems is this for?",
      a: "Repetitive multi-step work that a person currently holds together: catalog and content operations, revenue operations, production and broadcast pipelines, reporting, and any process where the same judgement is made hundreds of times a week.",
    },
    {
      q: "How does an engagement start?",
      a: "With a diagnostic. We map the workflow as it actually runs, find where the time and the errors go, and come back with what is worth automating and what is not — because some of it is not.",
    },
    {
      q: "Which AI models and tools do you work with?",
      a: "Whichever fits the problem. The orchestration layer is built so a model can be swapped without rebuilding the system around it, which matters in a field where the best option changes every few months.",
    },
    {
      q: "Do you support the system after it ships?",
      a: "Yes, on a retainer. An automated workflow touches live tools and real data, so it needs someone watching it the way any production system does.",
    },
  ],
};

import type { FaqDivision } from "./faq";

/**
 * /answers/… — one page per question a prospect types before they buy.
 *
 * Why these exist: the division pages say what we make; they do not answer
 * the question someone is actually searching. Comparison and "what does this
 * really mean" pages are what ranks for buying-stage queries, and they are
 * disproportionately what answer engines quote — an assistant asked "should
 * I run UGC or studio ads" needs a page that answers it in the first line.
 *
 * Rules, same as the FAQ: the answer comes first, the headings are phrased
 * the way a person asks, and nothing is claimed about how Triseno works that
 * the site does not already claim. These pages give opinions about the craft,
 * which is ours to give — not facts about pricing, staffing or results.
 *
 * They are rendered by src/app/answers/[slug]/page.tsx inside the ordinary
 * world (plate, glass, chrome), so they read as part of the site rather than
 * as a blog bolted onto it.
 */

export interface AnswerBlock {
  /** a subheading, phrased as the question it answers */
  h: string;
  p: string[];
  /** an optional labelled list under the paragraphs */
  list?: { t: string; d: string }[];
}

export interface Answer {
  slug: string;
  division: FaqDivision;
  /** the search, as a page title (under 60 characters before the brand) */
  title: string;
  h1: string;
  /** the question in plain form, for structured data */
  question: string;
  /** the whole answer in one or two sentences, printed above everything */
  answer: string;
  description: string;
  keywords: string[];
  /** ISO date, shown and given to search engines as dateModified */
  updated: string;
  blocks: AnswerBlock[];
}

export const ANSWERS: Answer[] = [
  {
    slug: "ugc-ads-vs-studio-product-ads",
    division: "creative",
    title: "UGC Ads vs Studio Product Ads: Which Should You Run?",
    h1: "UGC ads or studio product ads?",
    question: "Should you run UGC ads or studio product ads?",
    answer:
      "Run both, and let the placement decide the split. UGC earns attention because it looks like the feed it interrupts; studio product work earns trust at the moment someone decides. Accounts that plateau are almost always running only one of the two.",
    description:
      "UGC ads or studio product ads? Run both — UGC earns the attention, studio work earns the trust. How to split them, how many variations to test, and the mistake that stalls accounts.",
    keywords: [
      "UGC ads vs product ads",
      "UGC ad creative",
      "studio product ads",
      "paid social creative strategy",
      "creative testing",
      "Meta ads creative",
      "TikTok ad creative",
    ],
    updated: "2026-09-23",
    blocks: [
      {
        h: "What counts as a UGC ad?",
        p: [
          "An ad shot the way a person films themselves: a phone, a room, a voice talking to camera, imperfect light. The format signals that a human is talking rather than a brand broadcasting, and that signal is what buys the first second of attention in a feed of other humans.",
          "It is a style, not a supply chain. UGC can be filmed by a creator you pay, a customer who already loves the product, or a studio that knows how to make a controlled shoot look uncontrolled. What matters to the algorithm and to the viewer is that it reads as native.",
        ],
      },
      {
        h: "What studio product work does that UGC cannot",
        p: [
          "It makes the product look worth the money. Controlled light, real macro detail, a texture you can almost feel — that is the register in which someone justifies a price to themselves, and a handheld clip in a kitchen cannot reach it.",
          "It also carries the brand. UGC is borrowed credibility; studio work is the thing the credibility is about. A feed with only UGC in it eventually reads as a brand with nothing behind the testimonials.",
        ],
      },
      {
        h: "How should you split them?",
        p: [
          "By where the ad runs and who sees it. A rough working split most accounts land near:",
        ],
        list: [
          {
            t: "Cold traffic, feed and Reels",
            d: "Weighted to UGC and demo. The job is to stop the scroll and make the problem legible in three seconds.",
          },
          {
            t: "Retargeting and consideration",
            d: "Weighted to studio product work, demos and detail. The viewer already knows what it is; now they are deciding whether it is good.",
          },
          {
            t: "Brand and launch moments",
            d: "Brand film and hero product spots. Fewer placements, longer life, and the asset the rest of the year borrows from.",
          },
        ],
      },
      {
        h: "How many variations should you test?",
        p: [
          "More than feels reasonable, from fewer shoots than you think. The expensive part is production; the cheap part is the twentieth cut of footage you already own. One shoot should leave you with a set of hooks, lengths and aspect ratios that can be run against each other rather than a single hero file that either works or does not.",
          "Test the hook hardest. In paid social the first three seconds decide almost everything downstream, and two ads with an identical body and different openings routinely perform nothing alike.",
        ],
      },
      {
        h: "The mistake that stalls accounts",
        p: [
          "Treating creative as a delivery rather than a supply. An account does not fail because one ad was bad; it fails because nothing new arrived while the winning ad burned out, and fatigue is a certainty rather than a risk.",
          "The second mistake is judging a format by one execution. \"UGC does not work for us\" almost always means one creator, one script, one hook — which is a sample size of one, not a finding.",
        ],
      },
    ],
  },
  {
    slug: "custom-website-vs-template",
    division: "web",
    title: "Custom Website vs Template: What Actually Differs",
    h1: "Custom website or template?",
    question: "What is the real difference between a custom website and a template?",
    answer:
      "Speed to launch versus speed to improve. A template is faster and cheaper to stand up and slower to change; a custom build costs more at the start and stops costing you conversions every month afterwards. Which is right depends on whether the site is a brochure or the business.",
    description:
      "Custom website or template? A template is faster to launch and slower to improve. What each actually gives you, where templates cost you, and when a template is genuinely the right call.",
    keywords: [
      "custom website vs template",
      "custom website design",
      "website templates",
      "conversion-focused web design",
      "ecommerce website design",
      "website redesign",
      "site speed and SEO",
    ],
    updated: "2026-09-23",
    blocks: [
      {
        h: "What a template actually gives you",
        p: [
          "A layout somebody already solved, and the speed that comes with it. For a business that needs to exist online this month, that is a real answer, and pretending otherwise would be dishonest.",
          "What you are buying is a set of decisions made in advance by someone who had never heard of your business. That is the trade, and it is fine right up until one of those decisions is the thing standing between a visitor and a purchase.",
        ],
      },
      {
        h: "Where templates cost you",
        p: ["Three places, consistently:"],
        list: [
          {
            t: "Speed",
            d: "A template carries every feature its author shipped for everyone, whether or not you use it. That arrives as script the browser must download, parse and run, and page speed is both a ranking input and a conversion input.",
          },
          {
            t: "Sameness",
            d: "If you can recognise the template, so can your customer — and the competitor two tabs over is on it too. In a category where everything looks alike, price becomes the only difference left.",
          },
          {
            t: "A ceiling",
            d: "The day you learn something real about your buyers, you want to change the page that taught you. On a template, the change you want is frequently the one the template will not make.",
          },
        ],
      },
      {
        h: "What does custom actually mean?",
        p: [
          "That the page is built around what the business needs a visitor to do, and nothing else is in the way. In practice: a layout designed for your product rather than adapted to it, only the code the page actually uses, and the freedom to change any part of it later without fighting someone else's system.",
          "It should also mean the technical work is finished rather than promised — a performance score of 90 or higher, clean headings, metadata and structured data on every page, a sitemap, and content that is in the HTML rather than locked behind script where neither a search engine nor an AI assistant can read it.",
        ],
      },
      {
        h: "When is a template the right answer?",
        p: [
          "When the site is a formality. If people find you by word of mouth, buy in person, and the site exists to prove you are real and list a phone number, a template is the correct and adult decision. Spend the money where the customers actually come from.",
          "Custom earns its cost when the site is the sales floor: when traffic is paid for, when the page is what converts it, and when a percentage point of conversion is worth more than the build.",
        ],
      },
      {
        h: "What to ask before you commit",
        p: [
          "Ask what happens after launch, and listen for whether iteration is included or sold back to you. Ask what the performance target is and whether it is measured. Ask to see the site on a mid-range phone on a normal connection, not a demo on a laptop.",
          "And ask who owns it. A site you cannot leave with is a subscription, whatever it was called on the invoice.",
        ],
      },
    ],
  },
  {
    slug: "what-ai-automation-can-replace",
    division: "ai",
    title: "What AI Automation Can and Cannot Replace",
    h1: "What can AI automation actually replace?",
    question: "What can AI automation actually replace in a business?",
    answer:
      "Judgement that repeats. If a person makes the same decision hundreds of times a week from information a system can already see, that is automatable now. If the decision is rare, high-stakes, or depends on context nobody has written down, it is not — and pretending otherwise is how automation projects fail.",
    description:
      "What AI automation can and cannot replace in a business: the repeat test, what automates well today, what does not, and why the plumbing matters more than the model you pick.",
    keywords: [
      "what AI automation can replace",
      "AI automation for business",
      "workflow automation with AI",
      "AI agents for business",
      "multi-agent orchestration",
      "business process automation",
      "AI implementation",
    ],
    updated: "2026-09-23",
    blocks: [
      {
        h: "The test: does the decision repeat?",
        p: [
          "Count how many times a week somebody makes the same call, and ask what they look at to make it. If the answer is \"four hundred times\" and \"these three screens\", you are looking at the best automation candidate in the building. If it is \"twice a quarter\" and \"experience\", leave it alone.",
          "Frequency is what pays for the build, and legibility is what makes the build possible. A decision that repeats but depends on something nobody has ever written down is not ready yet — the first piece of work is writing it down.",
        ],
      },
      {
        h: "What automates well today",
        p: ["The work that sits between systems rather than inside anyone's head:"],
        list: [
          {
            t: "Catalog and content operations",
            d: "Descriptions, variants, tagging, translations, keeping the same product accurate in five places at once.",
          },
          {
            t: "Intake, routing and triage",
            d: "Reading what arrived, deciding what it is, putting it where it goes, and telling the right person it is there.",
          },
          {
            t: "Reporting and reconciliation",
            d: "Pulling the same numbers from the same places on the same day, and flagging only what moved.",
          },
          {
            t: "Production pipelines",
            d: "The mechanical steps between a file existing and a file being usable — renaming, versioning, transcoding, checking.",
          },
        ],
      },
      {
        h: "What does not automate well",
        p: [
          "Anything where being wrong is expensive and rare: pricing exceptions, hiring, anything legal, anything a customer will remember for years. Not because a model cannot produce an answer, but because you cannot buy enough confidence in the answer to stop checking it — and a step you still check is a step you have not removed.",
          "Also anything undefined. \"Automate our operations\" is not a workflow; it is a department. Systems get built around specific, boring, nameable sequences.",
        ],
      },
      {
        h: "Why the plumbing matters more than the model",
        p: [
          "The model is the part that changes every few months. Everything around it — how work arrives, how it is checked, what happens when a step fails, where it hands back to a person, what gets logged — is the part you actually live with, and it is where a project succeeds or quietly stops being used.",
          "Build so the model can be swapped without rebuilding the system around it. Anything else is a bet on a vendor's roadmap, made with your operations.",
        ],
      },
      {
        h: "How do you pick the first workflow?",
        p: [
          "Pick the one that is annoying, frequent, and low-stakes when it is wrong. You are not trying to capture the biggest prize first; you are trying to learn how your own business behaves when a system starts doing part of its work, while the cost of being wrong is a shrug.",
          "Then measure the thing you meant to fix — hours, error rate, time-to-response — before and after. An automation nobody can prove worked will be switched off the first time it is inconvenient.",
        ],
      },
    ],
  },
];

export const answerBySlug = (slug: string) => ANSWERS.find((a) => a.slug === slug);
export const answersFor = (division: FaqDivision) => ANSWERS.filter((a) => a.division === division);

import type { Metadata } from "next";

/**
 * One place for everything search engines and link previews read.
 *
 * Every page draws its <title>, description, keywords, canonical, Open Graph
 * and Twitter card from the entry below, and renders its own JSON-LD (a
 * WebPage with breadcrumbs, plus a Service for the three divisions). The
 * root layout carries the Organization and WebSite nodes the pages point at.
 *
 * Rules kept here: titles lead with what someone would search for and end
 * with the brand (under 60 characters); descriptions are one sentence of
 * plain claims a visitor can verify on the page (under 155); nothing is
 * stated in structured data that is not true of the business — no ratings,
 * no fabricated reviews, no address or hours we do not publish.
 */

export const SITE = {
  name: "Triseno Systems",
  url: "https://trisenosystems.com",
  email: "Tristen@trisenosystems.com",
  instagram: "https://instagram.com/trisenosystems",
  ink: "#0b0b0d",
  /**
   * Where the studio is. A service business is found locally long before it
   * is found nationally — "ad creative agency los angeles" is a search a
   * small studio can actually win, where "ad creative agency" is not — so the
   * city is stated in the organisation data, the descriptions and the copy,
   * and served alongside a Google Business Profile.
   */
  /**
   * The number on the Google Business Profile, in the profile's own format
   * and in E.164 for machines. Name, area and phone must read the same on the
   * profile and on the site: mismatched details are one of the things Google
   * checks when it decides whether a service-area business is what it says.
   */
  phone: "(661) 476-0505",
  phoneE164: "+16614760505",
  city: "Los Angeles",
  region: "CA",
  country: "US",
  /**
   * Google Search Console, "HTML tag" method: the content value of the
   * <meta name="google-site-verification"> it hands out. Paste it here (or
   * set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION); empty means no tag is emitted.
   */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "",
  description:
    "Three divisions, one standard: paid-social ad creative, custom conversion-built websites, and AI infrastructure for business operations.",
} as const;

export type PageKey = "home" | "studio" | "web" | "ai" | "work" | "portfolio" | "contact";

interface PageSeo {
  path: string;
  /** the <title>: search intent first, brand last, under 60 characters */
  title: string;
  /** the meta description, under 155 characters */
  description: string;
  /** what the page can rank for; the first few are what the copy says out loud */
  keywords: string[];
  /** 1200x630, under /public/og */
  og: string;
  ogAlt: string;
  /** breadcrumb label */
  crumb: string;
  /** schema.org page type */
  type: "WebPage" | "CollectionPage" | "ContactPage";
  /** for the divisions: the schema.org Service */
  service?: { name: string; serviceType: string[]; description: string };
}

const CORE_KEYWORDS = [
  "Triseno Systems",
  "creative agency Los Angeles",
  "ad creative agency",
  "custom website design",
  "AI infrastructure consulting",
];

export const PAGES: Record<PageKey, PageSeo> = {
  home: {
    path: "/",
    title: "Triseno Systems | Ad Creative, Web Design & AI Infrastructure",
    description:
      "A Los Angeles studio in three divisions: paid-social ad creative, custom conversion-built websites, and AI infrastructure for business operations.",
    keywords: [
      ...CORE_KEYWORDS,
      "paid social creative",
      "UGC video ads",
      "conversion-built websites",
      "AI automation for business",
      "creative agency for DTC brands",
    ],
    og: "/og/default.png",
    ogAlt: "Triseno Systems — ad creative, web design, AI infrastructure",
    crumb: "Home",
    type: "WebPage",
  },
  studio: {
    path: "/studio",
    title: "Paid Social Ad Creative & UGC Video Ads | Triseno Studio",
    description:
      "Performance ad creative for Instagram, TikTok and YouTube: UGC ads, product demos, ASMR and direct-response reels, and cinematic brand films, delivered in days.",
    keywords: [
      "paid social ad creative",
      "UGC video ads",
      "TikTok ad creative",
      "Instagram Reels ads",
      "Meta ads creative",
      "product demo video",
      "direct response video ads",
      "ASMR product video",
      "brand film production",
      "DTC video ads",
      "ecommerce video ads",
      "video ad studio",
      "creative testing ad variations",
      "Triseno Studio",
      "ad creative agency Los Angeles",
      "UGC ads agency Los Angeles",
    ],
    og: "/og/studio.png",
    ogAlt: "Triseno Studio — paid social ad creative",
    crumb: "Studio",
    type: "WebPage",
    service: {
      name: "Paid social ad creative",
      serviceType: [
        "Video ad production",
        "UGC ad creative",
        "Product demo video",
        "Direct-response video ads",
        "Brand film production",
      ],
      description:
        "Performance product ad creative for Instagram, TikTok and YouTube — UGC ads, product demos, ASMR and direct-response reels, and cinematic brand films.",
    },
  },
  web: {
    path: "/web-design-division",
    title: "Custom Conversion-Built Website Design | Triseno Systems",
    description:
      "Custom websites built to convert: strategy, design and build with 90+ performance scores, SEO-ready structure, integrations and ongoing iteration. No templates.",
    keywords: [
      "custom website design",
      "conversion-focused web design",
      "conversion rate optimized website",
      "ecommerce website design",
      "DTC website design",
      "Shopify website design",
      "Next.js web development agency",
      "landing page design",
      "website redesign agency",
      "high-performance websites",
      "SEO-ready web design",
      "web design division",
      "Triseno Systems web design",
      "web design agency Los Angeles",
      "website designer Los Angeles",
    ],
    og: "/og/web-design.png",
    ogAlt: "Triseno Web Design Division — custom, conversion-built websites",
    crumb: "Web Design",
    type: "WebPage",
    service: {
      name: "Custom conversion-built websites",
      serviceType: [
        "Website design",
        "Web development",
        "Ecommerce website design",
        "Landing page design",
        "Website performance optimization",
      ],
      description:
        "Custom, conversion-built websites: strategy, design and build, 90+ performance scores, SEO-ready structure, integrations and ongoing iteration.",
    },
  },
  ai: {
    path: "/ai-infrastructure",
    title: "AI Infrastructure Consulting & Implementation | Triseno Systems",
    description:
      "AI consulting, architecture and implementation for business operations: multi-agent orchestration, workflow automation and decision-layer systems, built to run.",
    keywords: [
      "AI infrastructure consulting",
      "AI implementation partner",
      "AI systems integration",
      "multi-agent orchestration",
      "AI agents for business",
      "workflow automation with AI",
      "AI automation consulting",
      "LLM integration services",
      "AI architecture consulting",
      "business process automation AI",
      "decision automation",
      "Triseno AI Infrastructure",
      "AI consultant Los Angeles",
      "AI automation agency Los Angeles",
    ],
    og: "/og/ai-infrastructure.png",
    ogAlt: "Triseno AI Infrastructure — consulting, architecture, implementation",
    crumb: "AI Infrastructure",
    type: "WebPage",
    service: {
      name: "AI infrastructure consulting, architecture and implementation",
      serviceType: [
        "AI consulting",
        "AI systems architecture",
        "AI implementation",
        "Workflow automation",
        "Multi-agent orchestration",
      ],
      description:
        "AI infrastructure consulting, architecture and implementation — the operational intelligence layer a business runs on: multi-agent orchestration, workflow compression and decision-layer automation.",
    },
  },
  work: {
    path: "/work",
    title: "Work: Ad Formats, Concept Sites & AI Systems | Triseno Systems",
    description:
      "An index of what Triseno Systems builds across its three divisions: paid-social ad formats, concept websites for fictional brands, and AI system concepts.",
    keywords: [
      ...CORE_KEYWORDS,
      "ad creative examples",
      "website design concepts",
      "AI system concepts",
      "creative formats",
    ],
    og: "/og/default.png",
    ogAlt: "Triseno Systems — work across three divisions",
    crumb: "Work",
    type: "CollectionPage",
  },
  portfolio: {
    path: "/portfolio",
    title: "Product Ad Reels: UGC, Demo & Direct Response | Triseno Studio",
    description:
      "Product ad reels from Triseno Studio — product hero, UGC, direct-response, apparel try-on, ASMR and demo formats, built to perform on Instagram, TikTok and YouTube.",
    keywords: [
      "product ad reels",
      "UGC ad examples",
      "product demo video examples",
      "direct response ad examples",
      "apparel try-on video",
      "ASMR unboxing ad",
      "TikTok ad examples",
      "Triseno Studio reels",
    ],
    og: "/og/studio.png",
    ogAlt: "Triseno Studio — product ad reels",
    crumb: "Reels",
    type: "CollectionPage",
  },
  contact: {
    path: "/contact",
    title: "Contact Triseno Systems | Start a Conversation",
    description:
      "Talk to Triseno Systems about ad creative, a conversion-built website or AI infrastructure. Based in Los Angeles, working with brands anywhere. We reply within one business day.",
    keywords: [
      ...CORE_KEYWORDS,
      "hire ad creative agency",
      "web design quote",
      "AI consulting inquiry",
      "contact Triseno Systems",
    ],
    og: "/og/default.png",
    ogAlt: "Contact Triseno Systems",
    crumb: "Contact",
    type: "ContactPage",
  },
};

/** The Metadata a page exports, built from its entry. */
export function pageMetadata(key: PageKey): Metadata {
  const p = PAGES[key];
  const url = `${SITE.url}${p.path}`;
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: p.path },
    openGraph: {
      title: p.title,
      description: p.description,
      url,
      siteName: SITE.name,
      type: "website",
      locale: "en_US",
      images: [{ url: p.og, width: 1200, height: 630, alt: p.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.description,
      images: [p.og],
    },
  };
}

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

/** The page's own structured data: the page, its breadcrumbs, its service. */
export function pageJsonLd(key: PageKey): Record<string, unknown> {
  const p = PAGES[key];
  const url = `${SITE.url}${p.path}`;
  const crumbs: Array<{ "@type": "ListItem"; position: number; name: string; item: string }> = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
  ];
  if (key !== "home") crumbs.push({ "@type": "ListItem", position: 2, name: p.crumb, item: url });
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": p.type,
      "@id": `${url}#webpage`,
      url,
      name: p.title,
      description: p.description,
      isPartOf: { "@id": SITE_ID },
      about: { "@id": ORG_ID },
      primaryImageOfPage: { "@type": "ImageObject", url: `${SITE.url}${p.og}`, width: 1200, height: 630 },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      inLanguage: "en-US",
    },
    { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: crumbs },
  ];
  if (p.service) {
    graph.push({
      "@type": "Service",
      "@id": `${url}#service`,
      name: p.service.name,
      serviceType: p.service.serviceType,
      description: p.service.description,
      provider: { "@id": ORG_ID },
      areaServed: [
        { "@type": "City", name: "Los Angeles" },
        { "@type": "Country", name: "United States" },
      ],
      url,
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** The nodes every page points at, rendered once in the root layout. */
export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE.name,
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/icon.png`,
        width: 512,
        height: 512,
      },
      image: `${SITE.url}/og/default.png`,
      description:
        "Three separate divisions: paid-social ad creative, custom conversion-built websites, and AI infrastructure consulting, architecture and implementation.",
      email: SITE.email,
      telephone: SITE.phoneE164,
      sameAs: [SITE.instagram],
      // city level only: a service-area studio, no shopfront to send anyone to
      address: {
        "@type": "PostalAddress",
        addressLocality: SITE.city,
        addressRegion: SITE.region,
        addressCountry: SITE.country,
      },
      areaServed: [
        { "@type": "City", name: "Los Angeles" },
        { "@type": "AdministrativeArea", name: "California" },
        { "@type": "Country", name: "United States" },
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          email: SITE.email,
          telephone: SITE.phoneE164,
          url: `${SITE.url}/contact`,
          availableLanguage: ["en"],
        },
      ],
      knowsAbout: [
        "Paid social advertising creative",
        "Video ad production",
        "Conversion-focused web design",
        "Web development",
        "AI infrastructure",
        "Workflow automation",
      ],
      department: [
        { "@type": "Organization", name: "Triseno Studio", url: `${SITE.url}/studio`, parentOrganization: { "@id": ORG_ID } },
        { "@type": "Organization", name: "Triseno Web Design Division", url: `${SITE.url}/web-design-division`, parentOrganization: { "@id": ORG_ID } },
        { "@type": "Organization", name: "Triseno AI Infrastructure", url: `${SITE.url}/ai-infrastructure`, parentOrganization: { "@id": ORG_ID } },
      ],
    },
    {
      "@type": "WebSite",
      "@id": SITE_ID,
      url: SITE.url,
      name: SITE.name,
      publisher: { "@id": ORG_ID },
      inLanguage: "en-US",
    },
  ],
};

/** JSON-LD, serialised so nothing in it can close the script tag. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

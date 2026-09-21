// /work — an index of what the studio can build, across the three divisions.
// It is NOT a portfolio of past clients (CLAUDE.md: the site is the demo).
// Every entry is a format, a concept site with a fictional brand, or a system
// concept; each one routes to the division page where the component lives.

export type WorkDivision = "creative" | "web" | "ai";

export interface WorkMedia {
  kind: "video" | "image";
  src: string;
  /** still shown before a clip starts (and as the phone poster) */
  poster?: string;
  /** object-position for the crop inside the preview */
  position?: string;
}

export interface WorkItem {
  id: string;
  division: WorkDivision;
  title: string;
  /** what kind of thing this is — "Format", "Concept site", "System concept" */
  kind: string;
  /** one short line: what it is, never what it "achieved" */
  line: string;
  media: WorkMedia;
}

const clip = (name: string, position?: string): WorkMedia => ({
  kind: "video",
  src: `/videos/${name}.mp4`,
  poster: `/posters/${name}.jpg`,
  position,
});
const concept = (slug: string, position?: string): WorkMedia => ({
  kind: "image",
  src: `/concepts/${slug}.webp`,
  position,
});
const plate = (src: string, position?: string): WorkMedia => ({ kind: "image", src, position });

export const WORK: WorkItem[] = [
  // ── Creative: the formats the Studio shoots ──
  { id: "hypermotion", division: "creative", title: "Hypermotion", kind: "Format", line: "Speed-ramped product motion cut to the beat.", media: clip("pickleball-hypermotion") },
  { id: "direct-response", division: "creative", title: "Direct Response", kind: "Format", line: "Hook, problem, product, offer. Built for the first three seconds.", media: clip("direct-response") },
  { id: "product-demo", division: "creative", title: "Product Demo", kind: "Format", line: "The product doing the job, start to finish, in one take.", media: clip("demo-sneaker-cleaner") },
  { id: "ugc", division: "creative", title: "UGC", kind: "Format", line: "Handheld, first person, shot to feel found rather than made.", media: clip("ugc-watch-unbox") },
  { id: "try-on", division: "creative", title: "Try-On", kind: "Format", line: "Apparel on a body, moving, in the places it gets worn.", media: clip("apparel-tryon") },
  { id: "visual-appeal", division: "creative", title: "Visual Appeal", kind: "Format", line: "Texture, light and colour carrying the product with no voice.", media: clip("visual-appeal") },
  { id: "asmr", division: "creative", title: "ASMR", kind: "Format", line: "Close sound and slow hands. The unboxing as a sensation.", media: clip("asmr-unbox") },
  { id: "product-hero", division: "creative", title: "Product Hero", kind: "Format", line: "One object, lit like a film set, for the top of a funnel.", media: clip("product-hero") },

  // ── Web: the concept sites (fictional brands) ──
  { id: "mesa-tordo", division: "web", title: "Mesa Tordo", kind: "Concept site · Restaurant", line: "A dining room sold on atmosphere, with the booking one tap away.", media: concept("mesa-tordo", "62% 50%") },
  { id: "ironvale-build", division: "web", title: "Ironvale Build", kind: "Concept site · Construction", line: "A contractor site that leads with scope, schedule and a quote form.", media: concept("ironvale-build", "40% 50%") },
  { id: "solenne", division: "web", title: "Solenne Aesthetics", kind: "Concept site · Med spa", line: "Treatments explained in plain language, booked in two steps.", media: concept("solenne-aesthetics", "42% 62%") },
  { id: "harrow-pike", division: "web", title: "Harrow & Pike", kind: "Concept site · Law", line: "Practice areas, attorneys and a consult request, nothing else.", media: concept("harrow-pike") },
  { id: "tavo-supply", division: "web", title: "Tavo Supply", kind: "Concept site · E-commerce", line: "A product-first store with the cart never more than a scroll away.", media: concept("tavo-supply") },
  { id: "kilo-club", division: "web", title: "Kilo Club", kind: "Concept site · Fitness", line: "Class schedule, coaches and a trial pass above the fold.", media: concept("kilo-club") },
  { id: "alder-quay", division: "web", title: "Alder & Quay", kind: "Concept site · Real estate", line: "Listings as editorial, with the viewing request built in.", media: concept("alder-quay") },
  { id: "caliber-nine", division: "web", title: "Caliber Nine", kind: "Concept site · Automotive", line: "Builds, specs and a configurator-style inquiry flow.", media: concept("caliber-nine") },
  { id: "fennick-rowe", division: "web", title: "Fennick & Rowe", kind: "Concept rebuild · Home services", line: "A dated trade site rebuilt around the call button.", media: concept("fennick-rowe-van") },

  // ── AI: the systems, named as capabilities (system concepts) ──
  { id: "orchestration", division: "ai", title: "Multi-Agent Orchestration", kind: "System concept", line: "Research, analysis, generation and validation as parallel agents under one orchestrator.", media: plate("/worlds/ai-station3.webp", "50% 56%") },
  { id: "compression", division: "ai", title: "Workflow Compression", kind: "System concept", line: "A twelve-step manual process redesigned as a two-layer agent system.", media: plate("/worlds/ai-station2.webp", "50% 56%") },
  { id: "decision-layer", division: "ai", title: "Decision-Layer Automation", kind: "System concept", line: "Routing, approvals and exceptions decided by rules and agents, logged end to end.", media: plate("/worlds/ai-desktop.webp", "50% 56%") },
  { id: "catalog", division: "ai", title: "Catalog Intelligence", kind: "System concept", line: "A catalog that understands specifications, compatibility and context.", media: plate("/worlds/ai-station2.webp", "18% 60%") },
  { id: "revenue-ops", division: "ai", title: "Revenue Operations", kind: "System concept", line: "Lead qualification and pipeline work driven by a model of the sales process.", media: plate("/worlds/ai-desktop.webp", "82% 50%") },
  { id: "broadcast", division: "ai", title: "Broadcast & Production AI", kind: "System concept", line: "Metadata, routing and asset orchestration for a live control room.", media: plate("/worlds/ai-station3.webp", "22% 44%") },
];

export const FILTERS: { key: "all" | WorkDivision; label: string }[] = [
  { key: "all", label: "All" },
  { key: "creative", label: "Creative" },
  { key: "web", label: "Web" },
  { key: "ai", label: "AI" },
];

export const INTRO = {
  label: "Index — formats, concept sites, systems",
  title: ["What we", "can build"],
  body: "One index across the three divisions. Every entry is a demonstration: fictional brands, concept work and system concepts, each one built to show range. Open any entry to travel to its division.",
};

export const GATE = {
  label: "Next — Contact",
  title: "Name the thing you need built",
  body: "Pick a division, answer a few questions, and you get a scope and a date before anything is designed.",
};

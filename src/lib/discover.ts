/* ─────────────────────────────────────────────────────────────────────────
   DISCOVER — the site as a hunt: forty pieces to find.

   The site is the portfolio, so every section is an exhibit, and the counter
   in the chrome (world/Discovery.tsx) tells the visitor how many they have
   found. Three ways to find one:

     seen     the section has held the screen for a moment
     touch    the visitor pressed, clicked or dragged inside it
     special  a component reports it itself — discover("ai-dive") — for the
              hidden moves (diving into the core, opening a museum case...)

   seen/touch finds are matched by page and the section's data-rail label, so
   no section has to know about the hunt. Found ids live in localStorage on
   this browser (try/catch: a blocked store just means a fresh hunt).
   ───────────────────────────────────────────────────────────────────────── */

export type FindMode = "seen" | "touch" | "special";

export interface Find {
  id: string;
  /** route the find lives on */
  page: string;
  /** shown once found */
  name: string;
  /** shown while it is still hidden: a nudge, never the answer */
  hint: string;
  mode: FindMode;
  /** the section's data-rail label (seen / touch) */
  rail?: string;
  /**
   * The cue that shows the piece is alive: a small pulsing chip pinned to
   * the element you play with (at: a selector), saying what to do, until the
   * piece is found. The same words label the cursor over it on a desktop.
   */
  cue?: { at: string; say: string; pos?: CuePos };
}

/** where the cue sits on its element: a top corner, the middle, above it, or its foot */
export type CuePos = "corner" | "center" | "above" | "foot";

export const PAGES: Array<{ path: string; name: string }> = [
  { path: "/", name: "The studio" },
  { path: "/web-design-division", name: "Web design" },
  { path: "/ai-infrastructure", name: "AI infrastructure" },
  { path: "/studio", name: "Ad creative" },
  { path: "/work", name: "Work" },
  { path: "/contact", name: "Contact" },
];

export const FINDS: Find[] = [
  // the studio (home)
  { id: "home-hall", page: "/", rail: "Divisions", mode: "seen", name: "The hall", hint: "Where it all starts" },
  { id: "home-operator", page: "/", mode: "special", name: "The operator", hint: "Someone in the hall wants to be clicked" },
  { id: "home-door-web", page: "/", rail: "Web Design", mode: "seen", name: "The first door", hint: "Scroll down the hall" },
  { id: "home-door-creative", page: "/", rail: "Creative", mode: "seen", name: "The ring door", hint: "Keep walking" },
  { id: "home-door-ai", page: "/", rail: "AI Infrastructure", mode: "seen", name: "The prism door", hint: "Further still" },
  { id: "home-gate", page: "/", rail: "Gate", mode: "seen", name: "The light rain", hint: "The end of the hall" },
  { id: "menu", page: "*", mode: "special", name: "The world menu", hint: "Top right, on any page" },

  // web design
  { id: "web-shutter", page: "/web-design-division", rail: "Hero", mode: "seen", name: "Shutter headline", hint: "The way in" },
  { id: "web-rewrite", page: "/web-design-division", rail: "Rewrite", mode: "seen", name: "The rewrite", hint: "A word that will not sit still" },
  { id: "web-demo", page: "/web-design-division", rail: "Demo", mode: "touch", name: "Live demo frame", hint: "A site inside the site. Use it", cue: { at: ".web-demo__stage", say: "Lean it · hold it", pos: "corner" } },
  { id: "web-compare", page: "/web-design-division", rail: "Before / After", mode: "touch", name: "Before and after", hint: "Something here can be dragged", cue: { at: ".web-compare__stage", say: "Drag the split", pos: "center" } },
  { id: "web-crystal", page: "/web-design-division", rail: "Deliverables", mode: "seen", name: "The crystal hall", hint: "Seven of something" },
  { id: "web-crystal-pick", page: "/web-design-division", mode: "special", name: "Thread pulled", hint: "Pick a colour in the crystal", cue: { at: ".web-prism__bands", say: "Pick a colour", pos: "corner" } },
  { id: "web-range", page: "/web-design-division", rail: "Range", mode: "touch", name: "The range", hint: "Hover and press around the gallery", cue: { at: ".web-range__row", say: "Hover · tap a site", pos: "corner" } },
  { id: "web-gate", page: "/web-design-division", rail: "Gate", mode: "seen", name: "Web gate", hint: "The bottom of the page" },

  // AI infrastructure
  { id: "ai-splash", page: "/ai-infrastructure", rail: "Capabilities", mode: "seen", name: "Ferrofluid splash", hint: "Arrive and wait" },
  { id: "ai-core", page: "/ai-infrastructure", rail: "Layer", mode: "seen", name: "The chrome core", hint: "A globe and a swarm" },
  { id: "ai-dive", page: "/ai-infrastructure", mode: "special", name: "Through the skin", hint: "Hold something down. Do not let go", cue: { at: ".ai-hero__fig", say: "Press and hold", pos: "center" } },
  { id: "ai-compression", page: "/ai-infrastructure", rail: "Compression", mode: "touch", name: "Mercury beads", hint: "Pull one", cue: { at: ".ai-merc__stage", say: "Pull a bead", pos: "center" } },
  { id: "ai-scale", page: "/ai-infrastructure", rail: "Scale", mode: "seen", name: "Designed to scale", hint: "Liquid again, further down" },
  { id: "ai-stack", page: "/ai-infrastructure", rail: "Stack", mode: "touch", name: "Four layers", hint: "Tap a layer", cue: { at: ".ai-sf__stage", say: "Tap a layer", pos: "center" } },
  { id: "ai-museum", page: "/ai-infrastructure", rail: "Industries", mode: "seen", name: "The museum", hint: "Four glass cases" },
  { id: "ai-case", page: "/ai-infrastructure", mode: "special", name: "Inside a case", hint: "Step into one", cue: { at: ".ai-mus__stage", say: "Step into a case", pos: "foot" } },
  { id: "ai-slip", page: "/ai-infrastructure", mode: "special", name: "The routing slip", hint: "One case stops and asks for a person" },
  { id: "ai-process", page: "/ai-infrastructure", rail: "Process", mode: "touch", name: "Process rail", hint: "Drag the handle", cue: { at: "[data-rail=\"Process\"] [role=\"slider\"]", say: "Drag", pos: "above" } },
  { id: "ai-built", page: "/ai-infrastructure", rail: "Built by", mode: "seen", name: "Built by", hint: "Who makes it" },
  { id: "ai-why", page: "/ai-infrastructure", rail: "Why", mode: "touch", name: "The flip", hint: "Turn something over", cue: { at: ".wf-switch", say: "Flip them", pos: "above" } },
  { id: "ai-questions", page: "/ai-infrastructure", rail: "Questions", mode: "seen", name: "AI questions", hint: "Before you ask" },
  { id: "ai-gate", page: "/ai-infrastructure", rail: "Gate", mode: "touch", name: "The ticket", hint: "Tear it", cue: { at: ".ai-gate__figure", say: "Tear the ticket", pos: "center" } },

  // ad creative
  { id: "studio-reel", page: "/studio", rail: "Showreel", mode: "seen", name: "The showreel", hint: "It opens up" },
  { id: "studio-formats", page: "/studio", rail: "Formats", mode: "touch", name: "The filmstrip", hint: "Play a frame", cue: { at: ".sx-frame__media", say: "Play", pos: "center" } },
  { id: "studio-behind", page: "/studio", rail: "Behind", mode: "seen", name: "Behind the shot", hint: "Look behind it" },
  { id: "studio-proof", page: "/studio", rail: "Proof", mode: "seen", name: "The marquee", hint: "Faces that keep moving" },
  { id: "studio-questions", page: "/studio", rail: "Questions", mode: "seen", name: "Studio questions", hint: "Near the end" },
  { id: "studio-gate", page: "/studio", rail: "Gate", mode: "seen", name: "Studio gate", hint: "The bottom of the page" },

  // work
  { id: "work-index", page: "/work", rail: "Index", mode: "touch", name: "The index", hint: "Hover the list", cue: { at: ".work-row__head", say: "Open one", pos: "corner" } },
  { id: "work-gate", page: "/work", rail: "Gate", mode: "seen", name: "Work gate", hint: "The bottom of the page" },

  // contact
  { id: "contact-inquiry", page: "/contact", rail: "Inquiry", mode: "touch", name: "One question at a time", hint: "Start answering" },
  { id: "contact-direct", page: "/contact", rail: "Direct", mode: "seen", name: "The direct line", hint: "Below the form" },
  { id: "contact-seal", page: "/contact", mode: "special", name: "The hidden seal", hint: "Something on this page is hiding" },
];

export const TOTAL = FINDS.length;
const KEY = "triseno:found";

let found: Set<string> | null = null;
const listeners = new Set<(id: string | null) => void>();

function load(): Set<string> {
  if (found) return found;
  found = new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) for (const id of JSON.parse(raw) as string[]) if (FINDS.some((f) => f.id === id)) found.add(id);
  } catch {
    // storage blocked: a fresh hunt for this page load
  }
  return found;
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...load()]));
  } catch {
    // storage blocked: the count still holds until the page closes
  }
}

/** mark a find; true the first time */
export function discover(id: string): boolean {
  if (typeof window === "undefined") return false;
  const set = load();
  if (set.has(id) || !FINDS.some((f) => f.id === id)) return false;
  set.add(id);
  save();
  listeners.forEach((cb) => cb(id));
  return true;
}

export function isFound(id: string): boolean {
  return typeof window !== "undefined" && load().has(id);
}

export function foundCount(): number {
  return typeof window === "undefined" ? 0 : load().size;
}

/** cb(id) on each new find; cb(null) once on subscribe, with the stored state */
export function onDiscover(cb: (id: string | null) => void): () => void {
  listeners.add(cb);
  cb(null);
  return () => listeners.delete(cb);
}

/** ask the counter to open its map (the home hero's line uses this) */
export const OPEN_MAP_EVENT = "triseno:open-map";
export function openMap() {
  window.dispatchEvent(new Event(OPEN_MAP_EVENT));
}

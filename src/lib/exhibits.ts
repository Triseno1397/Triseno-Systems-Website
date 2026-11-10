/* ─────────────────────────────────────────────────────────────────────────
   THE COLLECTION — every section of the site as an exhibit.

   One entry per [data-rail] section, in site order. Each says what the piece
   is, how it moves, and what a business would use it for, so a visitor sees
   the site as a catalogue of what their own website could do. Read by the
   guided tour (world/Tour.tsx) and by inspect mode (world/Inspect.tsx).

   `at` is where in the section the tour stops (0 = its top, 1 = its bottom
   edge at the top of the screen): pinned sections are long, and the moment
   worth showing is partway through. `dwell` is how long the tour holds there.
   ───────────────────────────────────────────────────────────────────────── */

export interface Exhibit {
  page: string;
  rail: string;
  title: string;
  /** what the piece is, in a few words */
  kind: string;
  /** how it moves or responds */
  mechanic: string;
  /** what a business would use it for */
  goodFor: string;
  /** the tour's one line about it */
  caption: string;
  /** hands-on: what to do with it */
  tryIt?: string;
  at?: number;
  dwell?: number;
  /** the tour passes this one by */
  skipTour?: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────
   THE TOUR — only the showpieces, each one played rather than parked on.

   A stop glides to the top of its section, then PLAYS it: the page scrolls
   slowly from `play[0]` to `play[1]` of the section's scroll travel (pin
   included) over `ms`, so pinned scenes run in front of the visitor instead
   of being skipped. `through` plays on to the top of another section (the
   home doors). `act` lets the tour press the piece's own buttons.
   ───────────────────────────────────────────────────────────────────────── */

export interface TourStop {
  page: string;
  rail: string;
  title: string;
  caption: string;
  /** fractions of the section's scroll travel to play between */
  play?: [number, number];
  /** play on until this section's top reaches the top of the screen */
  through?: string;
  /** how long the stop lasts, from arrival (the plate's own time comes on top) */
  ms: number;
  act?: "prism" | "case";
  /** a rendered still (public/tour/plate-<name>.webp) that opens the stop:
   *  it pushes in slowly, then dissolves into the live piece */
  plate?: string;
}

export const TOUR: TourStop[] = [
  {
    page: "/",
    rail: "Divisions",
    title: "The hall",
    caption: "A live 3D world, rendered in your browser as you watch. Nothing here is a video.",
    ms: 6000,
  },
  {
    page: "/",
    rail: "Web Design",
    through: "Gate",
    title: "The hall of doors",
    caption: "Your scroll is the camera. It dollies down the hall, slowing at each door.",
    ms: 12000,
  },
  {
    page: "/web-design-division",
    rail: "Hero",
    title: "The shutter",
    caption: "The headline opens like a camera shutter as the page arrives.",
    ms: 4500,
  },
  {
    page: "/web-design-division",
    rail: "Demo",
    play: [0, 1],
    title: "A site inside the site",
    caption: "A complete concept website, live on a 3D card that turns as you scroll.",
    ms: 9000,
  },
  {
    page: "/web-design-division",
    rail: "Deliverables",
    title: "The crystal hall",
    caption: "Raymarched live, sixty times a second, on your own device. Each colour is a deliverable.",
    ms: 11000,
    act: "prism",
  },
  {
    page: "/studio",
    rail: "Showreel",
    play: [0, 1],
    title: "The showreel",
    caption: "Scroll opens the iris on the reel. The timecode and f-stop count with you.",
    ms: 8500,
  },
  {
    page: "/studio",
    rail: "Cases",
    title: "The gallery",
    caption: "Four businesses under glass, all moving. The camera flies into one to show its ad.",
    ms: 12000,
    act: "case",
  },
  {
    page: "/studio",
    rail: "Behind",
    play: [0, 1],
    title: "Behind the shot",
    caption: "A story told one print at a time, dealt onto the table as you scroll.",
    ms: 9500,
  },
];

export const TOUR_PAGES = ["/", "/web-design-division", "/studio"] as const;
export const TOUR_TOTAL = TOUR.length;
export const tourStops = (page: string) => TOUR.filter((s) => s.page === page);

export const PAGE_NAMES: Record<string, string> = {
  "/": "The studio",
  "/web-design-division": "Web Design",
  "/studio": "Creative",
  "/work": "Work",
  "/contact": "Contact",
};

export const EXHIBITS: Exhibit[] = [
  // the studio (home)
  {
    page: "/",
    rail: "Divisions",
    title: "The hall",
    kind: "Interactive 3D world",
    mechanic: "A real-time 3D scene with a character who answers a click",
    goodFor: "Flagship homepages, launches, products that deserve a stage",
    caption: "A live 3D world, rendered in your browser. The menu lights the scene in each division's colour.",
    tryIt: "Click the operator",
    at: 0,
    dwell: 6000,
  },
  {
    page: "/",
    rail: "The demo",
    title: "The statement",
    kind: "Frosted glass over a live scene",
    mechanic: "The world holds still while one panel says the one thing",
    goodFor: "A manifesto, an offer, the one line every visitor must read",
    caption: "Everything on this site is a component we built, so the site itself is the sample.",
    at: 0.05,
    dwell: 6000,
  },
  {
    page: "/",
    rail: "Web Design",
    title: "Door one",
    kind: "Scroll-driven camera",
    mechanic: "Scrolling dollies a camera down a hall of doors",
    goodFor: "Storytelling homepages, guided product tours, step-by-step services",
    caption: "Your scroll is the camera. The hall slows at each door so its card can be read.",
    at: 0.5,
    dwell: 5000,
  },
  {
    page: "/",
    rail: "Creative",
    title: "Door two",
    kind: "Scroll-driven camera",
    mechanic: "The same dolly, a new door, a new colour",
    goodFor: "Service lines, locations, product families",
    caption: "Each door carries its own colour and glyph, so every service gets its own world.",
    at: 0.5,
    dwell: 4000,
    skipTour: true,
  },
  {
    page: "/",
    rail: "Work",
    title: "Door three",
    kind: "Scroll-driven camera",
    mechanic: "The last door opens on the index of everything",
    goodFor: "Portfolios, catalogues, menus",
    caption: "The last door leads to the index of everything we make.",
    at: 0.5,
    dwell: 4000,
    skipTour: true,
  },
  {
    page: "/",
    rail: "Gate",
    title: "The light rain",
    kind: "Closing call to action",
    mechanic: "Beams of light land on a wet floor around one button",
    goodFor: "The last screen: booking, a quote, a phone call",
    caption: "Every page ends on one clear next step, staged so it feels like an arrival.",
    at: 0,
    dwell: 5000,
  },

  // web design
  {
    page: "/web-design-division",
    rail: "Hero",
    title: "Shutter headline",
    kind: "Kinetic type",
    mechanic: "The headline opens like a shutter as the page arrives",
    goodFor: "First impressions, launches, a bold one-line promise",
    caption: "Type that performs. The first screen is a moment, not a banner.",
    at: 0,
    dwell: 5000,
  },
  {
    page: "/web-design-division",
    rail: "Rewrite",
    title: "The rewrite",
    kind: "Animated copy",
    mechanic: "A beam of light sweeps one word and rewrites it",
    goodFor: "Showing every job your product does, in one sentence",
    caption: "One sentence, many endings. A light beam rewrites the word as you watch.",
    at: 0.1,
    dwell: 6000,
  },
  {
    page: "/web-design-division",
    rail: "Demo",
    title: "Live demo frame",
    kind: "A working site inside the site",
    mechanic: "A real concept site on a 3D card that leans with your hand",
    goodFor: "App and product showcases, portfolio pieces, before you launch",
    caption: "A complete concept site, live inside this one. Lean it, hold it, scroll inside it.",
    tryIt: "Lean it · hold it",
    at: 0.3,
    dwell: 6500,
  },
  {
    page: "/web-design-division",
    rail: "Before / After",
    title: "Before and after",
    kind: "Drag-to-compare",
    mechanic: "One handle splits two versions of the same page",
    goodFor: "Renovations, detailing, redesigns, any transformation",
    caption: "Drag the split and the old site turns into the new one under your finger.",
    tryIt: "Drag the split",
    at: 0.15,
    dwell: 6000,
  },
  {
    page: "/web-design-division",
    rail: "Deliverables",
    title: "The crystal hall",
    kind: "Live shader",
    mechanic: "A hall of crystal raymarched in real time, one colour per deliverable",
    goodFor: "A services list that feels like an event, luxury and tech brands",
    caption: "Not a video: this crystal hall is drawn live, sixty times a second, on your device.",
    tryIt: "Pick a colour",
    at: 0,
    dwell: 7000,
  },
  {
    page: "/web-design-division",
    rail: "Range",
    title: "The range",
    kind: "Style gallery",
    mechanic: "Tiles in a dozen voices that wake under the pointer",
    goodFor: "Portfolios, menus, product lines, anything with many faces",
    caption: "Any industry, its own voice. Every tile is a different look we can build.",
    tryIt: "Hover · tap a site",
    at: 0.15,
    dwell: 6000,
  },
  {
    page: "/web-design-division",
    rail: "Gate",
    title: "Web gate",
    kind: "Closing call to action",
    mechanic: "Layered frames that settle around one button",
    goodFor: "Quote requests, bookings, discovery calls",
    caption: "The page closes on one button, with nothing competing for the click.",
    at: 0,
    dwell: 4000,
    skipTour: true,
  },

  // creative
  {
    page: "/studio",
    rail: "Showreel",
    title: "The showreel",
    kind: "Scroll-opened video",
    mechanic: "An aperture opens on the reel as you scroll, with live camera readouts",
    goodFor: "Video-first brands, restaurants, venues, anything better seen moving",
    caption: "Scroll opens the iris. The timecode and f-stop count with you.",
    at: 0.45,
    dwell: 6000,
  },
  {
    page: "/studio",
    rail: "Cases",
    title: "The gallery",
    kind: "Click-in scene",
    mechanic: "Four living miniatures; a click flies the camera inside one",
    goodFor: "Industries you serve, locations, product categories",
    caption: "Four businesses under glass, all moving. Step into one to see the ad we would make.",
    tryIt: "Step into a case",
    at: 0,
    dwell: 7000,
  },
  {
    page: "/studio",
    rail: "Behind",
    title: "Behind the shot",
    kind: "Pinned story",
    mechanic: "Scroll deals prints onto a table, one story beat per print",
    goodFor: "Founder stories, about pages, how you work",
    caption: "A story told one print at a time. Scrolling deals the next one onto the table.",
    at: 0.45,
    dwell: 6000,
  },
  {
    page: "/studio",
    rail: "Proof",
    title: "The marquee",
    kind: "Testimonial marquee",
    mechanic: "Two rows of reviews moving against each other",
    goodFor: "Reviews, press mentions, client logos",
    caption: "Reviews that never stop moving, two rows running against each other.",
    at: 0.1,
    dwell: 5000,
  },
  {
    page: "/studio",
    rail: "Questions",
    title: "Before you ask",
    kind: "Answers",
    mechanic: "Questions that open in place",
    goodFor: "Objections, pricing questions, answers Google can read",
    caption: "The questions every buyer asks, answered before they have to.",
    at: 0,
    dwell: 4000,
    skipTour: true,
  },
  {
    page: "/studio",
    rail: "Gate",
    title: "Studio gate",
    kind: "Closing call to action",
    mechanic: "The aperture stops down around one button",
    goodFor: "Bookings, quotes, the last screen of a campaign page",
    caption: "The iris closes on one next step.",
    at: 0.2,
    dwell: 4000,
    skipTour: true,
  },

  // work
  {
    page: "/work",
    rail: "Index",
    title: "The index",
    kind: "Reveal list",
    mechanic: "A list that opens a preview of each entry under the pointer",
    goodFor: "Case lists, menus, inventory, team pages",
    caption: "Every concept site and ad format, side by side. Hover one to see it.",
    tryIt: "Open one",
    at: 0.05,
    dwell: 6000,
  },
  {
    page: "/work",
    rail: "Gate",
    title: "Work gate",
    kind: "Closing call to action",
    mechanic: "A diamond that assembles around one button",
    goodFor: "The end of any catalogue",
    caption: "And the index ends where every page does: one button to start yours.",
    at: 0,
    dwell: 5000,
  },

  // contact
  {
    page: "/contact",
    rail: "Inquiry",
    title: "One question at a time",
    kind: "Conversational form",
    mechanic: "A form that asks one thing at a time",
    goodFor: "Quotes, bookings, lead capture that people finish",
    caption: "A form that feels like a conversation.",
    tryIt: "Start answering",
  },
  {
    page: "/contact",
    rail: "Direct",
    title: "The direct line",
    kind: "Contact card",
    mechanic: "Phone, email and hours, nothing in the way",
    goodFor: "Every business",
    caption: "For people who would rather just call.",
  },
];

/** site-wide exhibit number, 1-based, in site order */
export const exhibitNo = (e: Exhibit) => EXHIBITS.indexOf(e) + 1;

export const exhibitFor = (page: string, rail: string | null) =>
  rail ? EXHIBITS.find((e) => e.page === page && e.rail === rail) ?? null : null;


/** which explore mode is showing: the guided tour by default;
 *  ?explore=tour|inspect|off forces one and sticks for the session */
export type ExploreVariant = "tour" | "inspect" | "none";
export function exploreVariant(): ExploreVariant {
  if (typeof window === "undefined") return "none";
  try {
    const q = new URLSearchParams(window.location.search).get("explore");
    if (q === "tour" || q === "inspect" || q === "off") window.sessionStorage.setItem("triseno:explore", q);
    const kept = window.sessionStorage.getItem("triseno:explore");
    if (kept === "tour" || kept === "inspect") return kept;
    if (kept === "off") return "none";
  } catch {
    // storage blocked: the default stands
  }
  // the guided tour is the site's own; inspect mode stays behind ?explore=inspect
  return "tour";
}

import type { SiteTemplate } from "./ConceptWheel";

/* The concept sites orbiting the hero's browser. Every one is a fictional
   business (CLAUDE.md), captured from the concept sites this page already
   builds in HTML (design-loop/_rc*.mjs), 16:10 like the browser view. */
const t = (key: string, name: string, url: string): SiteTemplate => ({
  key,
  name,
  url,
  card: `/templates/${key}-card.webp`,
  full: `/templates/${key}.webp`,
});

export const SITE_TEMPLATES: SiteTemplate[] = [
  // the moving one: a live concept site over a loop from the studio's reel
  {
    key: "carbon-forge",
    name: "Carbon Forge",
    url: "carbonforge.example",
    card: "/templates/carbon-forge-poster.webp",
    full: "/templates/carbon-forge-poster.webp",
    live: "carbon-forge",
  },
  t("caliber-nine", "Caliber Nine", "calibernine.example"),
  t("mesa-tordo", "Mesa Tordo", "mesatordo.example"),
  t("kilo-club", "Kilo Club", "kiloclub.example"),
  t("solenne", "Solenne", "solenne.example"),
  t("ironvale-build", "Ironvale Build", "ironvalebuild.example"),
  t("hotel-quillon", "Hotel Quillon", "hotelquillon.example"),
  t("alder-quay", "Alder & Quay", "alderandquay.example"),
  t("harrow-pike", "Harrow & Pike", "harrowpike.example"),
  t("tavo-supply", "Tavo Supply", "tavosupply.example"),
  t("fennick-rowe", "Fennick & Rowe", "fennickrowe.example"),
  t("vale-hollis", "Vale & Hollis", "valeandhollis.example"),
];

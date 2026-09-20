// Showcase testimonials (design-system §6): realistic filler so the component
// reads the way it would on a finished client site. Every person and company
// here is fictional. Replace with real quotes as clients supply them.

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  /** Mono tag on the card: what was made / where it ran. */
  format: string;
  platform: string;
  /** Plain-language outcome shown as a data readout. */
  note: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We briefed six UGC concepts on a Monday and had cut-downs in the ad account the following Tuesday. Two of them are still our top spenders three months later.",
    name: "Maren Holloway",
    role: "Growth Lead",
    company: "Tidewell Skincare",
    format: "UGC Ads",
    platform: "TikTok",
    note: "6 concepts · 8 days",
  },
  {
    quote:
      "The pour spot held people to the end more than anything we had run. Thumb-stop went from roughly one in five viewers to closer to one in three.",
    name: "Marcus Thibault",
    role: "Founder",
    company: "Kettle & Fern Coffee",
    format: "ASMR Ads",
    platform: "Instagram Reels",
    note: "Hook rate ~20% → ~32%",
  },
  {
    quote:
      "Triseno structures a direct response ad the way a media buyer thinks: hook, benefit, offer, CTA. We got five variants per concept, so testing actually meant something.",
    name: "Priya Raman",
    role: "Head of Performance",
    company: "Lumora Home",
    format: "Direct Response",
    platform: "Meta",
    note: "5 variants per concept",
  },
  {
    quote:
      "Returns on our leggings dropped once shoppers could see the fabric move on a real body. The try-on reels now run on every product page, not only in ads.",
    name: "Caleb Whitford",
    role: "Co-founder",
    company: "Arrowroot Athletics",
    format: "Apparel Try-On",
    platform: "Instagram Reels",
    note: "Ads + product pages",
  },
  {
    quote:
      "The brand film sits at the top of our site and the fifteen-second edits run as prospecting. One round of thinking, a quarter's worth of creative.",
    name: "Sofia Marchetti",
    role: "Brand Director",
    company: "Casa Verano Cookware",
    format: "Brand Film",
    platform: "YouTube",
    note: "1 film · 9 cut-downs",
  },
  {
    quote:
      "Thirty seconds, one stain, one wipe. The demo made the product obvious, and our retargeting cost per purchase came down by about a fifth.",
    name: "Jonah Pruitt",
    role: "E-commerce Manager",
    company: "Brightside Pet Supply",
    format: "Product Demo",
    platform: "Meta",
    note: "Cost per purchase −19%",
  },
  {
    quote:
      "The hero shot made a forty-dollar knife look like a two-hundred-dollar one. It is the first frame of every ad we run now.",
    name: "Elena Vasquez",
    role: "Marketing Director",
    company: "Halden & Rye",
    format: "Product Hero",
    platform: "Instagram",
    note: "Opening frame, all ads",
  },
  {
    quote:
      "What stood out was the turnaround. Feedback on Thursday, revised cuts on Friday, every placement size exported and labelled.",
    name: "Hannah Lindqvist",
    role: "Paid Social Manager",
    company: "Fernhill Goods",
    format: "Direct Response",
    platform: "TikTok",
    note: "Revisions in 24 hours",
  },
  {
    quote:
      "No shoot day, no samples shipped. We sent product files and a rough idea and got back a motion ad that out-clicked our filmed spots.",
    name: "Tomas Reyes",
    role: "Chief Marketing Officer",
    company: "Saltline Swim",
    format: "HyperMotion Ads",
    platform: "Meta",
    note: "Footage-free · 5 days",
  },
  {
    quote:
      "They read a frame like camera people, not like an agency. Every note we got back was about what the viewer sees in the first three seconds.",
    name: "Devin Okafor",
    role: "Founder",
    company: "Quietform Audio",
    format: "UGC Ads",
    platform: "YouTube Shorts",
    note: "First 3 seconds, every cut",
  },
];

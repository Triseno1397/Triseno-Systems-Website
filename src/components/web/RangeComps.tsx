import type { ReactNode } from "react";

/**
 * Eight small concept comps, one per industry. Live HTML/CSS in container
 * units (crisp at any panel size). Fictional brands; each has its own layout
 * and typographic voice. Depicted content — palettes belong to the comps.
 */

export interface RangeItem {
  industry: string;
  brand: string;
  note: string;
  comp: ReactNode;
}

export const RANGE: RangeItem[] = [
  {
    industry: "Restaurants",
    brand: "Mesa Tordo",
    note: "Reservation first",
    comp: (
      <div className="rc rc-rest">
        <span className="rc-rest__nav">
          <span>Menu</span>
          <span>Mesa Tordo</span>
          <span>Book</span>
        </span>
        <span className="rc-rest__plate" aria-hidden="true" />
        <span className="rc-rest__h">
          Fire, salt, <em>patience.</em>
        </span>
        <span className="rc-rest__bar">
          <span>Tonight</span>
          <span>2 guests</span>
          <span>19:30</span>
          <b>Find a table</b>
        </span>
      </div>
    ),
  },
  {
    industry: "Construction",
    brand: "Ironvale Build",
    note: "Bid request",
    comp: (
      <div className="rc rc-con">
        <span className="rc-con__stripe" aria-hidden="true" />
        <span className="rc-con__logo">Ironvale Build</span>
        <span className="rc-con__h">Built on time. On the number.</span>
        <span className="rc-con__stats">
          <span>
            <b>142</b>projects delivered
          </span>
          <span>
            <b>96%</b>on schedule
          </span>
          <span>
            <b>0</b>lost-time incidents
          </span>
        </span>
        <span className="rc-con__cta">Request a bid</span>
      </div>
    ),
  },
  {
    industry: "Med spa",
    brand: "Solenne Aesthetics",
    note: "Consult booking",
    comp: (
      <div className="rc rc-spa">
        <span className="rc-spa__arch" aria-hidden="true" />
        <span className="rc-spa__copy">
          <span className="rc-spa__logo">Solenne</span>
          <span className="rc-spa__h">
            Skin, <em>unhurried.</em>
          </span>
          <span className="rc-spa__p">Physician-led treatments. A plan before a price list.</span>
          <span className="rc-spa__cta">Book a consult</span>
        </span>
      </div>
    ),
  },
  {
    industry: "Law",
    brand: "Harrow & Pike LLP",
    note: "Case review intake",
    comp: (
      <div className="rc rc-law">
        <span className="rc-law__top">
          <span>Harrow &amp; Pike LLP</span>
          <span>Free case review</span>
        </span>
        <span className="rc-law__h">Employment disputes, settled or tried.</span>
        <span className="rc-law__cols">
          <span>
            <b>I.</b>Wrongful dismissal
          </span>
          <span>
            <b>II.</b>Wage and hour claims
          </span>
          <span>
            <b>III.</b>Executive contracts
          </span>
        </span>
        <span className="rc-law__foot">Reply within one business day</span>
      </div>
    ),
  },
  {
    industry: "E-commerce",
    brand: "Tavo Supply",
    note: "Product grid",
    comp: (
      <div className="rc rc-shop">
        <span className="rc-shop__top">
          <span>Tavo Supply</span>
          <span>Bag (2)</span>
        </span>
        <span className="rc-shop__grid">
          <span>
            <i className="rc-shop__p rc-shop__p--a" />
            <b>Field Mug</b>28
          </span>
          <span>
            <i className="rc-shop__p rc-shop__p--b" />
            <b>Canvas Tote</b>46
          </span>
          <span>
            <i className="rc-shop__p rc-shop__p--c" />
            <b>Brass Key Loop</b>19
          </span>
        </span>
        <span className="rc-shop__bar">Free shipping over 60 · Add to bag</span>
      </div>
    ),
  },
  {
    industry: "Fitness",
    brand: "Kilo Club",
    note: "Class schedule",
    comp: (
      <div className="rc rc-fit">
        <span className="rc-fit__h">Kilo Club</span>
        <span className="rc-fit__side">Strength · 6 coaches · 1 floor</span>
        <span className="rc-fit__rows">
          <span>
            <b>06:00</b>Barbell basics<i>4 left</i>
          </span>
          <span>
            <b>12:15</b>Lunch lift<i>Open</i>
          </span>
          <span>
            <b>18:30</b>Heavy singles<i>Waitlist</i>
          </span>
        </span>
        <span className="rc-fit__cta">First week free</span>
      </div>
    ),
  },
  {
    industry: "Real estate",
    brand: "Alder & Quay Estates",
    note: "Listing search",
    comp: (
      <div className="rc rc-home">
        <span className="rc-home__img" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="rc-home__card">
          <span className="rc-home__tag">New · Alder &amp; Quay</span>
          <span className="rc-home__price">1,240,000</span>
          <span className="rc-home__addr">18 Wharf Lane, Eastbank</span>
          <span className="rc-home__meta">
            <span>4 bed</span>
            <span>3 bath</span>
            <span>212 m²</span>
          </span>
          <span className="rc-home__cta">Book a viewing</span>
        </span>
      </div>
    ),
  },
  {
    industry: "Automotive",
    brand: "Caliber Nine Detailing",
    note: "Quote builder",
    comp: (
      <div className="rc rc-auto">
        <span className="rc-auto__lines" aria-hidden="true" />
        <span className="rc-auto__logo">Caliber Nine</span>
        <span className="rc-auto__h">Ceramic. Corrected. Sealed.</span>
        <span className="rc-auto__table">
          <span>
            <b>Paint correction</b>2 stage
          </span>
          <span>
            <b>Ceramic coat</b>5 year
          </span>
          <span>
            <b>Turnaround</b>48 h
          </span>
        </span>
        <span className="rc-auto__cta">Build a quote</span>
      </div>
    ),
  },
];

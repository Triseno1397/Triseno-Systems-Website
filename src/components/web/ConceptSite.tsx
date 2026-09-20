/**
 * Concept site shown inside the demo frame. Fictional brand ("Hotel Quillon"),
 * live HTML/CSS sized in container-query units so it stays crisp at any frame
 * width. Depicted content: it carries its own palette and typographic voice.
 */

export const CONCEPT_SECTIONS = ["Arrival", "Rooms", "Numbers", "Table", "Offer"];

const ROOMS = [
  { name: "Harbour Room", meta: "24 m² · sea view", price: "from 180", tone: "a" },
  { name: "Loft Suite", meta: "41 m² · terrace", price: "from 260", tone: "b" },
  { name: "Garden Studio", meta: "29 m² · courtyard", price: "from 210", tone: "c" },
];

export default function ConceptSite() {
  return (
    <div className="cs">
      <section data-concept-section className="cs-hero">
        <nav className="cs-nav">
          <span className="cs-logo">Quillon</span>
          <span className="cs-links">
            <span>Rooms</span>
            <span>Table</span>
            <span>Harbour</span>
            <span>Journal</span>
          </span>
          <span className="cs-btn cs-btn--ink">Book a stay</span>
        </nav>
        <div className="cs-hero__body">
          <div className="cs-hero__copy">
            <p className="cs-kicker">Hotel Quillon · Old Harbour</p>
            <p className="cs-display">
              Forty rooms above <em>the old harbour.</em>
            </p>
            <p className="cs-text">
              A former sail loft, rebuilt room by room. Breakfast until noon, the ferry six minutes away.
            </p>
          </div>
          <div aria-hidden="true" className="cs-hero__art">
            <span className="cs-arch" />
            <span className="cs-arch cs-arch--small" />
          </div>
        </div>
        <div className="cs-booking">
          <span>
            <b>Check in</b>Fri 14 Mar
          </span>
          <span>
            <b>Check out</b>Sun 16 Mar
          </span>
          <span>
            <b>Guests</b>2 adults
          </span>
          <span className="cs-btn cs-btn--clay">Check availability</span>
        </div>
      </section>

      <section data-concept-section className="cs-rooms">
        <div className="cs-rooms__head">
          <p className="cs-display cs-display--sm">Rooms</p>
          <p className="cs-text">Three kinds of room, one rate that includes breakfast and the bikes.</p>
        </div>
        <div className="cs-rooms__grid">
          {ROOMS.map((room) => (
            <div key={room.name} className="cs-room">
              <span aria-hidden="true" className={`cs-room__img cs-room__img--${room.tone}`} />
              <span className="cs-room__name">{room.name}</span>
              <span className="cs-room__meta">{room.meta}</span>
              <span className="cs-room__price">{room.price}</span>
            </div>
          ))}
        </div>
      </section>

      <section data-concept-section className="cs-numbers">
        <span>
          <b>4.9</b>from 312 reviewed stays
        </span>
        <span>
          <b>40</b>rooms, no two alike
        </span>
        <span>
          <b>6 min</b>walk to the ferry
        </span>
      </section>

      <section data-concept-section className="cs-table">
        <div aria-hidden="true" className="cs-table__art">
          <i />
          <i />
          <i />
        </div>
        <div className="cs-table__copy">
          <p className="cs-kicker">Quillon Table</p>
          <p className="cs-display cs-display--sm">
            Dinner cooked <em>over vine wood.</em>
          </p>
          <ul className="cs-hours">
            <li>
              <span>Breakfast</span>
              <span>07:00 – 12:00</span>
            </li>
            <li>
              <span>Dinner</span>
              <span>18:30 – 22:00</span>
            </li>
            <li>
              <span>Sunday lunch</span>
              <span>12:30 – 16:00</span>
            </li>
          </ul>
          <span className="cs-btn cs-btn--ink">Reserve a table</span>
        </div>
      </section>

      <section data-concept-section className="cs-offer">
        <p className="cs-kicker">Winter offer</p>
        <p className="cs-display">
          Stay two nights, <em>the third is ours.</em>
        </p>
        <span className="cs-btn cs-btn--clay">See winter dates</span>
        <p className="cs-foot">Concept site · fictional brand · built for this demo by Triseno Web Design</p>
      </section>
    </div>
  );
}

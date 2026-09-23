import Glyph from "@/components/world/Glyph";
import { DIVISIONS } from "@/lib/divisions";
import { answersFor } from "@/lib/answers";
import { FAQ, type FaqDivision } from "@/lib/faq";
import { jsonLdHtml } from "@/lib/seo";

/**
 * The questions block that closes each division page, just before its gate.
 *
 * A server component on purpose: every question and answer is in the HTML a
 * crawler receives, with no script in the way. Native <details> keeps the page
 * short without hiding the text from the document — the answer is in the DOM
 * whether or not it is open, which is what both search and answer engines
 * read. One is open on arrival so the pattern is obvious.
 *
 * It carries FAQPage structured data as well. Google rarely shows FAQ rich
 * results any more (they were cut back to health and government sites), so
 * that is not why it is here: it is the cleanest way to hand an assistant a
 * question and its answer as a pair.
 *
 * Styling lives in world.css (`.faq-*`) and takes the division's hue from the
 * `--hue` custom property each division's <main> already sets.
 */
export default function FaqSection({ division }: { division: FaqDivision }) {
  const items = FAQ[division];
  const reading = answersFor(division);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section data-rail="Questions" aria-labelledby={`faq-${division}-title`} className="faq-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <div className="faq-wrap">
        <header className="faq-head">
          <p className="faq-label">
            <Glyph kind={DIVISIONS[division].glyph} size={12} color="currentColor" strokeWidth={1.25} />
            <span>Questions</span>
          </p>
          <h2 id={`faq-${division}-title`} className="faq-title font-display font-semibold uppercase">
            Before you ask
          </h2>
          <p className="faq-lead">
            The six we are asked most. Anything that is not here, ask us directly — we reply within one business day.
          </p>
        </header>

        <div className="faq-list">
          {items.map((item, i) => (
            <details key={item.q} className="faq-item" name={`faq-${division}`} open={i === 0}>
              <summary className="faq-q">
                <span className="faq-q__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="faq-q__text">{item.q}</span>
                <span className="faq-q__mark" aria-hidden="true" />
              </summary>
              <div className="faq-a">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>

        {/* the longer answers, linked from the question that raises them: a
            contextual link is worth more than a nav entry, and at this point
            in the page it is the route a reader actually wants */}
        {reading.length ? (
          <div className="faq-more">
            <p className="faq-more__label">The longer answer</p>
            <ul>
              {reading.map((answer) => (
                <li key={answer.slug}>
                  <a href={"/answers/" + answer.slug} className="faq-more__link world-underline">
                    {answer.h1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
